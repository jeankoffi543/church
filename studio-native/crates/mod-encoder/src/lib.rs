//! # mod-encoder (CHR-111)
//!
//! The H.264 encoder authority: it picks the best encoder this machine can run
//! and **falls back** to software x264 when the requested (or auto-selected)
//! hardware encoder isn't there — the "isolation des pannes" principle applied to
//! encoding. Every Output (record CHR-108, broadcast CHR-109) builds its encoder
//! through here instead of hardcoding `x264enc`, so a single knob (bitrate,
//! preset, keyframe interval) drives them all and hardware acceleration lights up
//! automatically where available.
//!
//! ## Selection
//!
//! `kind = "auto"` (the default) walks a hardware-first priority list and takes
//! the first element that actually registered — an encoder only registers if its
//! device/driver is present (`nvh264enc` needs NVIDIA, `vah264enc` a VA device,
//! `qsvh264enc` Intel, …), so "auto" is genuinely adaptive. A specific `kind`
//! that isn't available degrades to x264 rather than failing to build.
//!
//! ## Settings mapping
//!
//! Bitrate/keyframe/preset are expressed once, in neutral units, and mapped to
//! each encoder's own properties. Numeric properties are set through [`set_num`],
//! which reads the property's *actual* GType and coerces — so we never panic on
//! an encoder that types `bitrate` as `u32` vs `i32`, across GStreamer versions.
//! Bitrate is passed in **kbps** (correct for x264/VAAPI/QSV/NVENC); AMD/AMF and
//! VideoToolbox may want a different unit — a hardware-specific follow-up, since
//! those paths can't be exercised on the dev box. x264 is the always-present,
//! fully-tested path.

use anyhow::{anyhow, Result};
use gst::prelude::*;
use gstreamer as gst;
use serde::{Deserialize, Serialize};

/// Encoder speed/quality trade-off, mapped per-encoder in [`build_h264`].
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "kebab-case")]
pub enum EncoderPreset {
    /// Lowest latency / CPU — live-first.
    Speed,
    #[default]
    Balanced,
    /// Best quality per bit — heavier.
    Quality,
}

/// How an Output should encode. Neutral across encoders; [`build_h264`] resolves
/// `kind` (honouring `"auto"` + fallback) and applies the rest.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct EncoderConfig {
    /// `"auto"` | `"nvenc"` | `"qsv"` | `"vaapi"` | `"amf"` | `"videotoolbox"` | `"x264"`.
    pub kind: String,
    pub bitrate_kbps: u32,
    pub preset: EncoderPreset,
    /// Max frames between keyframes (GOP). ~2 s at 60 fps by default.
    pub keyframe_interval: u32,
}

impl Default for EncoderConfig {
    fn default() -> Self {
        EncoderConfig {
            kind: "auto".into(),
            bitrate_kbps: 4000,
            preset: EncoderPreset::Balanced,
            keyframe_interval: 120,
        }
    }
}

/// (capability id, element name), hardware first, x264 last as the universal
/// software fallback. Mirrors [`studio_media::probe_encoders`]'s taxonomy.
const CANDIDATES: &[(&str, &str)] = &[
    ("nvenc", "nvh264enc"),
    ("qsv", "qsvh264enc"),
    ("vaapi", "vah264enc"),
    ("vaapi", "vaapih264enc"),
    ("amf", "amfh264enc"),
    ("videotoolbox", "vtenc_h264"),
    ("x264", "x264enc"),
];

/// The H.264 encoder capability ids actually available here, best (hardware)
/// first, de-duplicated (`vaapi` maps to two possible elements).
pub fn list_h264() -> Vec<String> {
    let _ = gst::init();
    let mut out: Vec<String> = Vec::new();
    for (id, element) in CANDIDATES {
        if gst::ElementFactory::find(element).is_some() && !out.iter().any(|e| e == id) {
            out.push((*id).to_string());
        }
    }
    out
}

/// The element name for a capability id whose element is present, if any.
fn element_for(id: &str) -> Option<&'static str> {
    CANDIDATES
        .iter()
        .find(|(cap, el)| *cap == id && gst::ElementFactory::find(el).is_some())
        .map(|(_, el)| *el)
}

/// What `requested` (a `kind`, or `"auto"`/empty) resolves to given what's
/// installed: the requested id if available, else x264, else the best available,
/// else `None` (no H.264 encoder at all). Lets the UI show "auto → x264" without
/// building anything.
pub fn resolve_kind(requested: &str) -> Option<String> {
    let _ = gst::init();
    let available = list_h264();
    if !requested.is_empty() && requested != "auto" && available.iter().any(|e| e == requested) {
        return Some(requested.to_string());
    }
    if requested.is_empty() || requested == "auto" {
        // hardware-first: first non-x264, else x264.
        if let Some(hw) = available.iter().find(|e| e.as_str() != "x264") {
            return Some(hw.clone());
        }
    }
    available
        .iter()
        .find(|e| e.as_str() == "x264")
        .cloned()
        .or_else(|| available.first().cloned())
}

/// Build a configured H.264 encoder element, resolving `kind` (with fallback) and
/// applying bitrate/preset/keyframe. Errors only if no H.264 encoder exists at all.
pub fn build_h264(cfg: &EncoderConfig) -> Result<gst::Element> {
    let _ = gst::init();
    let kind = resolve_kind(&cfg.kind).ok_or_else(|| anyhow!("no H.264 encoder available"))?;
    let element = element_for(&kind).ok_or_else(|| anyhow!("encoder {kind} vanished"))?;
    let enc = gst::ElementFactory::make(element)
        .build()
        .map_err(|e| anyhow!("make {element}: {e}"))?;

    let bitrate = cfg.bitrate_kbps as i64;
    let gop = cfg.keyframe_interval as i64;
    // Bitrate: kbps on the elements we can verify.
    set_num(&enc, "bitrate", bitrate);
    // Keyframe interval under both common property names.
    set_num(&enc, "key-int-max", gop);
    set_num(&enc, "gop-size", gop);

    match kind.as_str() {
        "x264" => {
            // Known-stable enum nicks — safe to set by string.
            set_str(&enc, "speed-preset", x264_speed_preset(cfg.preset));
            set_str(&enc, "tune", "zerolatency");
        }
        "vaapi" | "qsv" => {
            // target-usage: 1 (quality) … 7 (speed).
            set_num(&enc, "target-usage", vaqsv_target_usage(cfg.preset));
        }
        // NVENC/AMF/VideoToolbox: bitrate + GOP already applied above; their
        // preset enums vary too much by version to set blind. A hardware-tuning
        // follow-up (these can't be exercised on the dev box).
        _ => {}
    }
    Ok(enc)
}

fn x264_speed_preset(p: EncoderPreset) -> &'static str {
    match p {
        EncoderPreset::Speed => "superfast",
        EncoderPreset::Balanced => "veryfast",
        EncoderPreset::Quality => "medium",
    }
}

fn vaqsv_target_usage(p: EncoderPreset) -> i64 {
    match p {
        EncoderPreset::Speed => 7,
        EncoderPreset::Balanced => 4,
        EncoderPreset::Quality => 1,
    }
}

/// Set a numeric property to `n`, coercing to the property's *actual* GType so we
/// never panic on a u32-vs-i32 (or 64-bit, or float) mismatch across encoders.
/// No-ops if the property is absent or non-numeric.
fn set_num(el: &gst::Element, name: &str, n: i64) {
    use gst::glib::Type;
    let Some(pspec) = el.find_property(name) else {
        return;
    };
    let vt = pspec.value_type();
    let value = if vt == Type::I32 {
        (n as i32).to_value()
    } else if vt == Type::U32 {
        (n.max(0) as u32).to_value()
    } else if vt == Type::I64 {
        n.to_value()
    } else if vt == Type::U64 {
        (n.max(0) as u64).to_value()
    } else if vt == Type::F64 {
        (n as f64).to_value()
    } else if vt == Type::F32 {
        (n as f32).to_value()
    } else {
        return;
    };
    el.set_property_from_value(name, &value);
}

/// Set an enum/string property by nick, only if it exists. Caller guarantees the
/// nick is valid for that element (we only use it for known-stable x264 props).
fn set_str(el: &gst::Element, name: &str, nick: &str) {
    if el.find_property(name).is_some() {
        el.set_property_from_str(name, nick);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn x264_is_always_listed_and_auto_resolves_to_something_buildable() {
        let list = list_h264();
        assert!(
            list.iter().any(|e| e == "x264"),
            "x264 must be present on a dev box"
        );
        let auto = resolve_kind("auto").expect("auto should resolve");
        assert!(
            list.contains(&auto),
            "auto must resolve to an available encoder, got {auto}"
        );
        assert!(
            element_for(&auto).is_some(),
            "resolved kind must have a real element"
        );
    }

    #[test]
    fn an_unavailable_encoder_falls_back_to_x264() {
        // A bogus/likely-absent kind must degrade, never fail.
        assert_eq!(
            resolve_kind("definitely-not-an-encoder").as_deref(),
            Some("x264")
        );
        // If NVENC isn't on this box, requesting it also falls back.
        if !list_h264().iter().any(|e| e == "nvenc") {
            assert_eq!(resolve_kind("nvenc").as_deref(), Some("x264"));
        }
    }

    #[test]
    fn build_applies_settings_without_panicking() {
        let cfg = EncoderConfig {
            kind: "x264".into(),
            bitrate_kbps: 6000,
            preset: EncoderPreset::Quality,
            keyframe_interval: 90,
        };
        let enc = build_h264(&cfg).expect("build x264");
        // x264enc types both as guint — set_num coerces to the real GType.
        assert_eq!(enc.property::<u32>("bitrate"), 6000, "kbps set on x264");
        assert_eq!(enc.property::<u32>("key-int-max"), 90, "GOP set on x264");
    }

    /// The x264 path must actually encode: videotestsrc → convert → enc →
    /// h264parse → fakesink, pulled to a handful of buffers. Deterministic
    /// (x264 is always present); proves the built encoder is wired-in correctly.
    #[test]
    fn built_x264_actually_encodes_frames() {
        let _ = gst::init();
        let enc = build_h264(&EncoderConfig {
            kind: "x264".into(),
            bitrate_kbps: 2000,
            ..Default::default()
        })
        .expect("build x264");

        let pipeline = gst::Pipeline::new();
        let src = gst::ElementFactory::make("videotestsrc")
            .property("num-buffers", 15i32)
            .build()
            .unwrap();
        let convert = gst::ElementFactory::make("videoconvert").build().unwrap();
        let parse = gst::ElementFactory::make("h264parse").build().unwrap();
        let sink = gst::ElementFactory::make("fakesink").build().unwrap();
        pipeline
            .add_many([&src, &convert, &enc, &parse, &sink])
            .unwrap();
        gst::Element::link_many([&src, &convert, &enc, &parse, &sink]).unwrap();

        pipeline.set_state(gst::State::Playing).unwrap();
        let bus = pipeline.bus().unwrap();
        let mut reached_eos = false;
        for msg in bus.iter_timed(gst::ClockTime::from_seconds(10)) {
            match msg.view() {
                gst::MessageView::Eos(_) => {
                    reached_eos = true;
                    break;
                }
                gst::MessageView::Error(e) => panic!("encode pipeline error: {}", e.error()),
                _ => {}
            }
        }
        pipeline.set_state(gst::State::Null).unwrap();
        assert!(reached_eos, "the x264 encode pipeline should reach EOS");
    }
}
