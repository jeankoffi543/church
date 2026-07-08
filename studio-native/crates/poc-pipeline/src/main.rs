//! CHR-100 — headless media de-risking spike.
//!
//! Builds, **programmatically** (not via `gst-launch`), the exact shape of
//! pipeline the native studio will rely on:
//!
//! ```text
//!   videotestsrc(smpte) ─┐
//!                        ├─ compositor ─ x264enc ─ mp4mux ─ filesink
//!   videotestsrc(ball) ──┘   (2 positioned layers → 1 program frame)
//! ```
//!
//! It proves, on real bytes we can inspect:
//!   1. gstreamer-rs links and drives a pipeline from Rust,
//!   2. the `compositor` composites two positioned/sized layers (the future
//!      scene → pad-property mapping — request pads + xpos/ypos/width/height),
//!   3. `x264enc` encodes,
//!   4. `mp4mux` **finalises the file with a real duration** on clean EOS — which
//!      is why the web app's `webm-duration-fix` byte-surgery becomes unnecessary
//!      in the nominal case.
//!
//! Then it re-opens the produced file with the pbutils `Discoverer` and asserts
//! the duration is what we recorded — the empirical proof, not a claim.

use anyhow::{bail, Context, Result};
use gst::prelude::*;
use gstreamer as gst;
use gstreamer_pbutils as gst_pbutils;

const FPS: i32 = 30;
const SECONDS: i32 = 3;
const OUT_W: i32 = 1280;
const OUT_H: i32 = 720;

fn main() -> Result<()> {
    gst::init().context("gst::init")?;

    let out_path = std::env::temp_dir().join("studio_poc.mp4");
    let _ = std::fs::remove_file(&out_path);

    let pipeline = build_pipeline(&out_path)?;

    println!("▶  pipeline PLAYING — enregistrement de {SECONDS}s ({OUT_W}x{OUT_H}@{FPS})…");
    pipeline
        .set_state(gst::State::Playing)
        .context("set Playing")?;

    run_until_eos(&pipeline)?;

    pipeline.set_state(gst::State::Null).context("set Null")?;

    // ── Empirical verification: re-open the finalised file and read its duration.
    verify_output(&out_path)?;

    println!("✅  POC OK — {}", out_path.display());
    Ok(())
}

/// Build the compositing → encode → mux → file graph with programmatic request
/// pads and per-pad geometry (the pattern dynamic sources will use).
fn build_pipeline(out_path: &std::path::Path) -> Result<gst::Pipeline> {
    let pipeline = gst::Pipeline::with_name("poc-pipeline");
    let num_buffers = FPS * SECONDS;

    // Two sources at fixed sizes; different test patterns so the two layers are
    // visually distinct in the output.
    let (src_bg, caps_bg) = source("smpte", OUT_W, OUT_H, num_buffers)?;
    let (src_pip, caps_pip) = source("ball", 320, 180, num_buffers)?;

    let compositor = gst::ElementFactory::make("compositor")
        .property_from_str("background", "black")
        .build()
        .context("make compositor")?;

    let caps_out = gst::ElementFactory::make("capsfilter")
        .property(
            "caps",
            gst::Caps::builder("video/x-raw")
                .field("width", OUT_W)
                .field("height", OUT_H)
                .build(),
        )
        .build()?;
    let convert = gst::ElementFactory::make("videoconvert").build()?;
    let encoder = gst::ElementFactory::make("x264enc")
        .property("bitrate", 2000u32)
        .property_from_str("speed-preset", "ultrafast")
        .build()
        .context("make x264enc")?;
    let muxer = gst::ElementFactory::make("mp4mux")
        .build()
        .context("make mp4mux")?;
    let sink = gst::ElementFactory::make("filesink")
        .property("location", out_path.to_string_lossy().as_ref())
        .build()?;

    pipeline.add_many([
        &src_bg,
        &caps_bg,
        &src_pip,
        &caps_pip,
        &compositor,
        &caps_out,
        &convert,
        &encoder,
        &muxer,
        &sink,
    ])?;

    gst::Element::link_many([&src_bg, &caps_bg])?;
    gst::Element::link_many([&src_pip, &caps_pip])?;
    gst::Element::link_many([&compositor, &caps_out, &convert, &encoder, &muxer, &sink])?;

    // Request one compositor sink pad per layer and position it — this is the
    // exact API the scene→graph mapping will drive (a Layer's pose becomes these
    // pad properties). Background fills the frame; the "ball" sits PiP-style in
    // the bottom-right, proving true compositing (not just passthrough).
    link_layer(&caps_bg, &compositor, 0, 0, OUT_W, OUT_H, 0)?;
    link_layer(
        &caps_pip,
        &compositor,
        OUT_W - 340,
        OUT_H - 200,
        320,
        180,
        1,
    )?;

    Ok(pipeline)
}

fn source(pattern: &str, w: i32, h: i32, num_buffers: i32) -> Result<(gst::Element, gst::Element)> {
    let src = gst::ElementFactory::make("videotestsrc")
        .property("num-buffers", num_buffers)
        .property("is-live", false)
        .property_from_str("pattern", pattern)
        .build()
        .with_context(|| format!("make videotestsrc({pattern})"))?;
    let caps = gst::ElementFactory::make("capsfilter")
        .property(
            "caps",
            gst::Caps::builder("video/x-raw")
                .field("width", w)
                .field("height", h)
                .field("framerate", gst::Fraction::new(FPS, 1))
                .build(),
        )
        .build()?;
    Ok((src, caps))
}

/// Link a source chain's src pad to a freshly requested compositor sink pad and
/// set its geometry + z-order.
fn link_layer(
    upstream: &gst::Element,
    compositor: &gst::Element,
    xpos: i32,
    ypos: i32,
    width: i32,
    height: i32,
    zorder: u32,
) -> Result<()> {
    let sink_pad = compositor
        .request_pad_simple("sink_%u")
        .context("compositor request pad")?;
    sink_pad.set_property("xpos", xpos);
    sink_pad.set_property("ypos", ypos);
    sink_pad.set_property("width", width);
    sink_pad.set_property("height", height);
    sink_pad.set_property("zorder", zorder);
    let src_pad = upstream.static_pad("src").context("upstream src pad")?;
    src_pad.link(&sink_pad).context("link layer → compositor")?;
    Ok(())
}

/// Pump the bus until EOS (clean finish → muxer finalises the file) or Error.
fn run_until_eos(pipeline: &gst::Pipeline) -> Result<()> {
    let bus = pipeline.bus().context("pipeline bus")?;
    for msg in bus.iter_timed(gst::ClockTime::NONE) {
        use gst::MessageView;
        match msg.view() {
            MessageView::Eos(_) => {
                println!("⏹  EOS — fichier finalisé par mp4mux.");
                return Ok(());
            }
            MessageView::Error(err) => {
                let _ = pipeline.set_state(gst::State::Null);
                bail!(
                    "erreur pipeline sur {:?}: {} ({:?})",
                    err.src().map(|s| s.path_string()),
                    err.error(),
                    err.debug()
                );
            }
            _ => {}
        }
    }
    Ok(())
}

/// Re-open the produced file and assert its duration matches what we recorded —
/// the proof that mp4mux wrote a real, seekable duration natively.
fn verify_output(out_path: &std::path::Path) -> Result<()> {
    let meta = std::fs::metadata(out_path)
        .with_context(|| format!("fichier de sortie absent: {}", out_path.display()))?;
    if meta.len() == 0 {
        bail!("fichier de sortie vide");
    }

    let uri = format!("file://{}", out_path.to_string_lossy());
    let discoverer = gst_pbutils::Discoverer::new(gst::ClockTime::from_seconds(15))
        .context("Discoverer::new")?;
    let info = discoverer
        .discover_uri(&uri)
        .context("discover_uri (fichier illisible ?)")?;

    let dur = info
        .duration()
        .context("aucune durée dans le fichier (mux non finalisé ?)")?;
    let secs = dur.nseconds() as f64 / 1_000_000_000.0;
    println!(
        "🔎  relecture: taille={} o, durée={:.3}s, {} flux vidéo",
        meta.len(),
        secs,
        info.video_streams().len()
    );
    for s in info.video_streams() {
        println!("     vidéo: {}x{}", s.width(), s.height());
    }

    // Duration must be present AND within a frame or two of the recorded length —
    // this is exactly the check the web WebM had to hack around.
    let expected = SECONDS as f64;
    if (secs - expected).abs() > 0.25 {
        bail!("durée inattendue: {secs:.3}s (attendu ≈ {expected}s)");
    }
    if info.video_streams().is_empty() {
        bail!("aucun flux vidéo dans le fichier");
    }
    Ok(())
}
