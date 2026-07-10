//! # mod-overlays (CHR-106)
//!
//! Text / bible / song overlays rendered **without the DOM** — the native parity
//! of the web régie's canvas renderer (`program-out-text.ts`). This is the first
//! module that consumes the full [`studio_core`] model (the CHR-102 payoff): it
//! reads a [`Layer`]'s [`Style`] + content and draws it with **cairo + pango**
//! into an ARGB image, then feeds that as a compositor layer:
//!
//! ```text
//!   appsrc(BGRA still) → imagefreeze → videoconvert → [ghost src]
//! ```
//!
//! `imagefreeze` turns the one rendered frame into a steady stream, so a static
//! overlay costs one render, not one per frame. When the overlay's content/style
//! changes, the shell rebuilds the source (hot remove + add, CHR-104) — the
//! render is re-run with the new [`Layer`].
//!
//! Faithful in v1: the container box (position/size/shape/bg/border), and the
//! text zones (bible reference/verse/version via the three font groups; text
//! content + sub; song lyrics) with per-zone family/weight/style/size/colour/
//! uppercase, word-wrap, padding and H/V alignment. Deferred to later polish /
//! CHR-110: drop shadow, glow border, gradient backgrounds, letter-spacing,
//! the typewriter reveal and box auto-grow.

use anyhow::{anyhow, Context, Result};
use gst::prelude::*;
use gstreamer as gst;
use gstreamer_app as gst_app;

use studio_core::{
    BorderStyle, ContainerShape, FontStyleKind, FontTransform, Layer, LayerKind, PositionMode,
    PredefinedPosition, ScriptureVerse, Style, TextAlign, TextVAlign, TypeStyle,
};

/// The programme canvas the overlay is rendered onto (matches the compositor).
const CANVAS_W: i32 = 1920;
const CANVAS_H: i32 = 1080;
/// Frame rate the (static) overlay's live appsrc declares. The image is repeated;
/// the compositor holds it between frames, so a modest rate keeps the CPU light.
const OVERLAY_FPS: i32 = 30;

/// Whether this module renders a given layer kind (text / bible / song).
pub fn renders(kind: LayerKind) -> bool {
    matches!(kind, LayerKind::Text | LayerKind::Bible | LayerKind::Song)
}

/// A pixel rectangle on the canvas.
#[derive(Clone, Copy, Debug)]
struct Rect {
    x: f64,
    y: f64,
    w: f64,
    h: f64,
}

/// A stacked text block: its text, the font group it uses, and the gap above it.
struct Block<'a> {
    text: String,
    zone: &'a TypeStyle,
    gap_before: f64,
}

/// Named preset boxes as 0..1 fractions of the frame — mirror of `PREDEFINED_BOX`
/// (right-anchored presets already converted to left).
fn predefined_box(p: PredefinedPosition) -> (f64, f64, f64, f64) {
    use PredefinedPosition::*;
    match p {
        LowerThirdLeft => (0.06, 0.72, 0.4, 0.2),
        LowerThirdRight => (0.54, 0.72, 0.4, 0.2),
        CenteredTop => (0.1, 0.08, 0.8, 0.2),
        Ticker => (0.0, 0.86, 1.0, 0.14),
        BannerTop => (0.0, 0.0, 1.0, 0.14),
        FullScreenCinema => (0.1, 0.1, 0.8, 0.8),
        FullScreen => (0.0, 0.0, 1.0, 1.0),
        PipTopLeft => (0.04, 0.05, 0.34, 0.34),
        PipTopRight => (0.62, 0.05, 0.34, 0.34),
        PipBottomLeft => (0.04, 0.61, 0.34, 0.34),
        PipBottomRight => (0.62, 0.61, 0.34, 0.34),
        CenteredBottom => (0.1, 0.72, 0.8, 0.2),
    }
}

/// The layer's pixel box on the canvas — mirror of `boxFromStyle` × canvas size.
fn layer_rect(s: &Style) -> Rect {
    let (fx, fy, fw, fh) = match s.position_mode {
        PositionMode::Custom => (
            s.custom_x / 100.0,
            s.custom_y / 100.0,
            s.custom_width / 100.0,
            s.custom_height / 100.0,
        ),
        PositionMode::Predefined => predefined_box(s.predefined_position),
    };
    Rect {
        x: fx * CANVAS_W as f64,
        y: fy * CANVAS_H as f64,
        w: fw * CANVAS_W as f64,
        h: fh * CANVAS_H as f64,
    }
}

/// Parse a CSS colour (`#rgb`, `#rrggbb`, `rgb(...)`, `rgba(...)`) to cairo RGBA
/// (0..1). Unrecognised (e.g. a gradient keyword) → `None`, and the caller skips
/// that paint. Deliberately small: the studio only emits these forms for solids.
fn parse_color(css: &str) -> Option<(f64, f64, f64, f64)> {
    let c = css.trim();
    if let Some(hex) = c.strip_prefix('#') {
        let n = |s: &str| u8::from_str_radix(s, 16).ok().map(|v| v as f64 / 255.0);
        return match hex.len() {
            3 => {
                let r = n(&hex[0..1].repeat(2))?;
                let g = n(&hex[1..2].repeat(2))?;
                let b = n(&hex[2..3].repeat(2))?;
                Some((r, g, b, 1.0))
            }
            6 => Some((n(&hex[0..2])?, n(&hex[2..4])?, n(&hex[4..6])?, 1.0)),
            8 => Some((
                n(&hex[0..2])?,
                n(&hex[2..4])?,
                n(&hex[4..6])?,
                n(&hex[6..8])?,
            )),
            _ => None,
        };
    }
    if let Some(inner) = c.strip_prefix("rgba(").or_else(|| c.strip_prefix("rgb(")) {
        let inner = inner.trim_end_matches(')');
        let parts: Vec<&str> = inner.split(',').map(|p| p.trim()).collect();
        if parts.len() >= 3 {
            let r = parts[0].parse::<f64>().ok()? / 255.0;
            let g = parts[1].parse::<f64>().ok()? / 255.0;
            let b = parts[2].parse::<f64>().ok()? / 255.0;
            let a = if parts.len() >= 4 {
                parts[3].parse::<f64>().ok()?
            } else {
                1.0
            };
            return Some((r, g, b, a));
        }
    }
    None
}

/// Trace a rounded-rectangle path with per-corner radii (TL, TR, BR, BL).
fn rounded_rect(cr: &cairo::Context, r: Rect, radii: [f64; 4]) {
    let [tl, tr, br, bl] = radii.map(|v| v.max(0.0).min(r.w.min(r.h) / 2.0));
    let (x, y, w, h) = (r.x, r.y, r.w, r.h);
    let pi = std::f64::consts::PI;
    cr.new_path();
    cr.arc(x + w - tr, y + tr, tr, -0.5 * pi, 0.0);
    cr.arc(x + w - br, y + h - br, br, 0.0, 0.5 * pi);
    cr.arc(x + bl, y + h - bl, bl, 0.5 * pi, pi);
    cr.arc(x + tl, y + tl, tl, pi, 1.5 * pi);
    cr.close_path();
}

/// Draw the container box (bg + border) — mirror of `drawContainer`. Shadows and
/// glow are deferred; a `transparent` shape draws nothing.
fn draw_container(cr: &cairo::Context, r: Rect, s: &Style) -> Result<()> {
    if s.container_shape == ContainerShape::Transparent {
        return Ok(());
    }
    let radius = s.container_border_radius;
    let small = 6.0;
    let radii = match s.container_shape {
        ContainerShape::Rectangle => [0.0; 4],
        ContainerShape::Capsule => [r.h / 2.0; 4],
        ContainerShape::Asymmetric => [radius, small, radius, small],
        _ => [radius; 4], // rounded_rectangle (transparent handled above)
    };

    if let Some((br, bg, bb, ba)) = parse_color(&s.container_bg) {
        rounded_rect(cr, r, radii);
        cr.set_source_rgba(br, bg, bb, ba);
        cr.fill().context("fill container bg")?;
    }

    if s.container_border_style != BorderStyle::None && s.container_border_width > 0.0 {
        if let Some((br, bg, bb, ba)) = parse_color(&s.container_border_color) {
            cr.set_line_width(s.container_border_width);
            cr.set_source_rgba(br, bg, bb, ba);
            if s.container_border_style == BorderStyle::Dashed {
                cr.set_dash(&[8.0, 6.0], 0.0);
            } else {
                cr.set_dash(&[], 0.0);
            }
            rounded_rect(cr, r, radii);
            cr.stroke().context("stroke container border")?;
        }
    }
    Ok(())
}

/// Configure a pango font description from a typography group.
fn apply_font(fd: &mut pango::FontDescription, ts: &TypeStyle) {
    fd.set_family(&ts.family);
    fd.set_weight(match ts.weight.parse::<i32>().unwrap_or(400) {
        w if w <= 150 => pango::Weight::Thin,
        w if w <= 250 => pango::Weight::Ultralight,
        w if w <= 350 => pango::Weight::Light,
        w if w <= 450 => pango::Weight::Normal,
        w if w <= 550 => pango::Weight::Medium,
        w if w <= 650 => pango::Weight::Semibold,
        w if w <= 750 => pango::Weight::Bold,
        w if w <= 850 => pango::Weight::Ultrabold,
        _ => pango::Weight::Heavy,
    });
    fd.set_style(match ts.style {
        FontStyleKind::Italic => pango::Style::Italic,
        FontStyleKind::Normal => pango::Style::Normal,
    });
    fd.set_absolute_size(ts.size * pango::SCALE as f64);
}

fn pango_align(a: TextAlign) -> pango::Alignment {
    match a {
        TextAlign::Left => pango::Alignment::Left,
        TextAlign::Center => pango::Alignment::Center,
        TextAlign::Right => pango::Alignment::Right,
    }
}

/// Draw the stacked text blocks inside the box — mirror of `drawBlocks`
/// (padding, wrap, per-zone font/colour, H/V alignment). Pango owns the wrapping
/// and horizontal alignment; we stack vertically and apply the V-alignment.
fn draw_blocks(cr: &cairo::Context, r: Rect, s: &Style, blocks: &[Block]) -> Result<()> {
    let pad_x = s.container_padding_x;
    let pad_y = s.container_padding_y;
    let inner_x = r.x + pad_x;
    let inner_y = r.y + pad_y;
    let inner_w = (r.w - pad_x * 2.0).max(1.0);
    let inner_h = (r.h - pad_y * 2.0).max(1.0);
    let align = pango_align(s.text_align);

    // Build + measure every block first (for the vertical alignment).
    let mut laid = Vec::new();
    let mut total_h = 0.0;
    for block in blocks {
        let layout = pangocairo::functions::create_layout(cr);
        let mut fd = pango::FontDescription::new();
        apply_font(&mut fd, block.zone);
        layout.set_font_description(Some(&fd));
        layout.set_width((inner_w * pango::SCALE as f64) as i32);
        layout.set_alignment(align);
        layout.set_wrap(pango::WrapMode::WordChar);
        let text = if block.zone.transform == FontTransform::Uppercase {
            block.text.to_uppercase()
        } else {
            block.text.clone()
        };
        layout.set_text(&text);
        let (_, h) = layout.pixel_size();
        total_h += block.gap_before + h as f64;
        laid.push((layout, block.zone, block.gap_before));
    }

    let mut y = match s.text_vertical_align {
        TextVAlign::Top => inner_y,
        TextVAlign::Bottom => inner_y + inner_h - total_h,
        TextVAlign::Center => inner_y + (inner_h - total_h) / 2.0,
    };

    for (layout, zone, gap) in laid {
        y += gap;
        if let Some((cr_, cg, cb, ca)) = parse_color(&zone.color) {
            cr.set_source_rgba(cr_, cg, cb, ca);
        } else {
            cr.set_source_rgba(1.0, 1.0, 1.0, 1.0);
        }
        cr.move_to(inner_x, y);
        pangocairo::functions::show_layout(cr, &layout);
        let (_, h) = layout.pixel_size();
        y += h as f64;
    }
    Ok(())
}

/// The version label for a bible verse — mirror of the web's `versionLabel`.
fn version_label(verse: &ScriptureVerse) -> String {
    if let Some(texts) = &verse.texts {
        if let Some(k) = texts.keys().next() {
            return k.clone();
        }
    }
    verse.translation.clone().unwrap_or_else(|| "LSG".into())
}

/// The stacked text blocks for a layer (+ optional on-air bible verse).
fn blocks_for<'a>(layer: &'a Layer, verse: Option<&'a ScriptureVerse>) -> Vec<Block<'a>> {
    let st = &layer.style;
    match layer.kind {
        LayerKind::Bible => match verse {
            Some(v) => vec![
                Block {
                    text: v.reference.clone(),
                    zone: &st.font_ref,
                    gap_before: 0.0,
                },
                Block {
                    text: v.text.clone(),
                    zone: &st.font_body,
                    gap_before: 8.0,
                },
                Block {
                    text: version_label(v),
                    zone: &st.font_ver,
                    gap_before: 4.0,
                },
            ],
            None => Vec::new(),
        },
        LayerKind::Song => vec![Block {
            text: layer.song_text().to_string(),
            zone: &st.font_body,
            gap_before: 0.0,
        }],
        // text (and anything else routed here)
        _ => {
            let mut b = vec![Block {
                text: layer.content.clone().unwrap_or_default(),
                zone: &st.font_body,
                gap_before: 0.0,
            }];
            if let Some(sub) = layer.sub.as_ref().filter(|s| !s.is_empty()) {
                b.push(Block {
                    text: sub.clone(),
                    zone: &st.font_body,
                    gap_before: 6.0,
                });
            }
            b
        }
    }
}

/// Render `layer` to a straight-alpha BGRA buffer (`CANVAS_W`×`CANVAS_H`). Cairo
/// works in premultiplied ARGB32; we un-premultiply on the way out so the
/// compositor blends the anti-aliased edges correctly.
fn render_bgra(layer: &Layer, verse: Option<&ScriptureVerse>) -> Result<Vec<u8>> {
    let mut surface = cairo::ImageSurface::create(cairo::Format::ARgb32, CANVAS_W, CANVAS_H)
        .context("create cairo surface")?;
    let stride = surface.stride() as usize;
    {
        let cr = cairo::Context::new(&surface).context("cairo context")?;
        let r = layer_rect(&layer.style);
        draw_container(&cr, r, &layer.style)?;
        let blocks = blocks_for(layer, verse);
        if !blocks.is_empty() {
            draw_blocks(&cr, r, &layer.style, &blocks)?;
        }
    } // drop cr so the surface is no longer borrowed

    surface.flush();
    let data = surface.data().context("surface data")?;
    let w = CANVAS_W as usize;
    let h = CANVAS_H as usize;
    let mut out = vec![0u8; w * h * 4];
    for row in 0..h {
        for col in 0..w {
            let si = row * stride + col * 4;
            let di = (row * w + col) * 4;
            // cairo ARgb32 little-endian bytes: B, G, R, A — all premultiplied.
            let (b, g, r_, a) = (data[si], data[si + 1], data[si + 2], data[si + 3]);
            let unpre = |c: u8| {
                if a == 0 {
                    0
                } else {
                    ((c as u32 * 255 + a as u32 / 2) / a as u32).min(255) as u8
                }
            };
            out[di] = unpre(b);
            out[di + 1] = unpre(g);
            out[di + 2] = unpre(r_);
            out[di + 3] = a;
        }
    }
    Ok(out)
}

/// Build the overlay as a self-contained `gst::Bin` (ghost `src` pad) rendering
/// `layer`. For a bible layer, pass the on-air `verse`. Matches
/// [`studio_media::SourceBuilder`]; the shell hands
/// `move || build_source(&layer, verse.as_ref())` to `MediaEngine::add_source`.
pub fn build_source(layer: &Layer, verse: Option<&ScriptureVerse>) -> Result<gst::Bin> {
    let _ = gst::init();
    let bytes = render_bgra(layer, verse)?;

    // A LIVE appsrc that REPEATS the one rendered still at the canvas framerate.
    // (Earlier this used `appsrc → imagefreeze` with a one-shot buffer + EOS, but
    // imagefreeze's eager caps negotiation is rejected when the overlay is added
    // to the ALREADY-RUNNING compositor — "not-negotiated" → the source errors and
    // auto-detaches, so no overlay ever reached the Aperçu/Programme. A plain live
    // appsrc negotiates lazily like videotestsrc, which live-adds cleanly.) The
    // 8 MB buffer exceeds appsrc's default `max-bytes`, so pushes self-pace to the
    // compositor's consumption; `clone` is a cheap refcount bump, not a copy.
    let caps = gst::Caps::builder("video/x-raw")
        .field("format", "BGRA")
        .field("width", CANVAS_W)
        .field("height", CANVAS_H)
        .field("framerate", gst::Fraction::new(OVERLAY_FPS, 1))
        .build();
    let appsrc = gst_app::AppSrc::builder()
        .caps(&caps)
        .is_live(true)
        .do_timestamp(true)
        .format(gst::Format::Time)
        .build();

    let buffer = gst::Buffer::from_mut_slice(bytes);
    appsrc.set_callbacks(
        gst_app::AppSrcCallbacks::builder()
            .need_data(move |src, _| {
                let _ = src.push_buffer(buffer.clone());
            })
            .build(),
    );

    let convert = gst::ElementFactory::make("videoconvert").build()?;

    let bin = gst::Bin::new();
    let appsrc_el = appsrc.upcast_ref::<gst::Element>();
    bin.add_many([appsrc_el, &convert])
        .context("add overlay elements to bin")?;
    gst::Element::link_many([appsrc_el, &convert]).context("link overlay chain")?;

    let tail_pad = convert
        .static_pad("src")
        .ok_or_else(|| anyhow!("videoconvert has no src pad"))?;
    let ghost = gst::GhostPad::with_target(&tail_pad).context("create ghost pad")?;
    ghost.set_active(true).context("activate ghost pad")?;
    bin.add_pad(&ghost).context("add ghost pad to bin")?;
    Ok(bin)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;
    use studio_core::create_layer;

    #[test]
    fn renders_only_text_bible_song() {
        assert!(renders(LayerKind::Text));
        assert!(renders(LayerKind::Bible));
        assert!(renders(LayerKind::Song));
        assert!(!renders(LayerKind::Camera));
        assert!(!renders(LayerKind::Image));
    }

    #[test]
    fn parse_color_handles_hex_and_rgba() {
        assert_eq!(parse_color("#ffffff"), Some((1.0, 1.0, 1.0, 1.0)));
        assert_eq!(parse_color("#000"), Some((0.0, 0.0, 0.0, 1.0)));
        let (r, g, b, a) = parse_color("rgba(22, 15, 51, 0.95)").unwrap();
        assert!((r - 22.0 / 255.0).abs() < 1e-9);
        assert!((g - 15.0 / 255.0).abs() < 1e-9);
        assert!((b - 51.0 / 255.0).abs() < 1e-9);
        assert!((a - 0.95).abs() < 1e-9);
        assert_eq!(parse_color("linear-gradient(...)"), None);
    }

    #[test]
    fn render_produces_a_full_canvas_bgra_buffer() {
        // Headless — no display/hardware needed; cairo+pango render in-process.
        let mut layer = create_layer(LayerKind::Text, 0, "t");
        layer.content = Some("Gloire à Dieu".into());
        let bytes = render_bgra(&layer, None).expect("render");
        assert_eq!(bytes.len(), (CANVAS_W * CANVAS_H * 4) as usize);
        // The default text style has a rounded container with an opaque-ish bg,
        // so at least some pixels must be non-transparent (something was drawn).
        assert!(
            bytes.chunks(4).any(|px| px[3] > 0),
            "overlay is fully transparent"
        );
    }

    #[test]
    fn bible_without_a_verse_renders_nothing_but_still_builds() {
        let layer = create_layer(LayerKind::Bible, 0, "b");
        let bytes = render_bgra(&layer, None).expect("render");
        assert_eq!(bytes.len(), (CANVAS_W * CANVAS_H * 4) as usize);
    }

    /// The decisive one: a real TEXT layer with content must PAINT VISIBLE PIXELS
    /// on the PREVIEW compositor — the frame CONTENT must change (staying attached
    /// + a JPEG coming out is not enough; the background provides those). This is
    /// exactly what show_preview_overlay does for a visible text/song source.
    #[test]
    fn a_text_overlay_paints_visible_pixels_on_the_preview() {
        let mut layer = create_layer(LayerKind::Text, 0, "txt");
        layer.content = Some("SALUT L'ÉGLISE — 1234".into());
        let engine = studio_media::MediaEngine::start().expect("engine");
        let mut ok = false;
        for _ in 0..80 {
            std::thread::sleep(Duration::from_millis(50));
            if engine.preview_frame_jpeg().is_some() {
                ok = true;
                break;
            }
        }
        assert!(ok, "preview feed must produce frames");
        std::thread::sleep(Duration::from_millis(250));
        let base = engine.preview_frame_jpeg().unwrap();

        engine
            .add_preview_source("overlay:txt", Box::new(move || build_source(&layer, None)))
            .expect("attach text overlay on preview");

        std::thread::sleep(Duration::from_millis(600));
        let attached = engine.is_preview_source_active("overlay:txt");
        let now = engine.preview_frame_jpeg().unwrap();
        let ended = engine.take_ended_reason("overlay:txt");
        engine.stop();
        assert!(attached, "text overlay must stay attached — reason: {ended:?}");
        assert_ne!(
            base, now,
            "the text overlay must PAINT visible pixels on the preview (frame unchanged ⇒ it renders nothing)"
        );
    }

    /// End-to-end: the overlay bin plugged into the real compositor produces
    /// frames — headless (no camera/display), so it runs everywhere.
    #[test]
    fn overlay_feeds_the_compositor() {
        let layer = create_layer(LayerKind::Bible, 0, "bible");
        let verse = ScriptureVerse {
            reference: "Jean 3:16".into(),
            text: "Car Dieu a tant aimé le monde…".into(),
            ..Default::default()
        };
        let engine = studio_media::MediaEngine::start().expect("engine");
        engine
            .add_source(
                "overlay",
                Box::new(move || build_source(&layer, Some(&verse))),
            )
            .expect("attach overlay");

        let mut frame = None;
        for _ in 0..80 {
            std::thread::sleep(Duration::from_millis(50));
            if let Some(f) = engine.latest_frame() {
                frame = Some(f);
                break;
            }
        }
        let n = engine.frames();
        // The overlay must STAY attached: if its source errored/EOS'd on the live
        // compositor add (the pre-fix bug), it would already be auto-detached here
        // and nothing would ever render. `latest_frame` alone can't catch that —
        // the background feeds the JPEG regardless — so assert activity + presence.
        std::thread::sleep(Duration::from_millis(300));
        let still_attached = engine.is_source_active("overlay");
        let ended = engine.take_ended_reason("overlay");
        engine.stop();
        let frame = frame.expect("no overlay frame produced");
        assert!(n > 0);
        assert_eq!(&frame[..2], &[0xFF, 0xD8], "not a JPEG");
        assert!(
            still_attached,
            "overlay auto-detached (never renders) — reason: {ended:?}"
        );
    }
}
