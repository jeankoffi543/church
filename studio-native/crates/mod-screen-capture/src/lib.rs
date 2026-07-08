//! # mod-screen-capture (CHR-103)
//!
//! The first real [`studio_media::SourceBuilder`] — the OBS-style "Capture
//! d'écran" source, ported from the web app's `getDisplayMedia`. It plugs a
//! platform screen-capture element into a compositor layer:
//!
//! ```text
//!   <platform capture> → videoconvert → videoscale → videorate → caps(1280x720)
//! ```
//!
//! It is a **removable module**: if the crate (feature) is absent, or no capture
//! element exists on this machine, the source simply never shows up in the UI —
//! the capability negotiation handles it, no other code changes.

use anyhow::{Context, Result};
use gst::prelude::*;
use gstreamer as gst;

/// The best available screen-capture element for this platform, if any.
///
/// * Linux/X11 — `ximagesrc` (works under any X server, including Xvfb).
/// * Linux/Wayland — `pipewiresrc` (via the ScreenCast portal).
/// * Windows — `d3d11screencapturesrc`.
/// * macOS — `avfvideosrc` (ScreenCaptureKit-backed).
///
/// Only the elements actually installed are considered — a real probe, not a
/// hardcoded assumption.
fn capture_element() -> Option<&'static str> {
    const CANDIDATES: &[&str] = &[
        "ximagesrc",
        "pipewiresrc",
        "d3d11screencapturesrc",
        "avfvideosrc",
    ];
    let _ = gst::init();
    CANDIDATES
        .iter()
        .copied()
        .find(|e| gst::ElementFactory::find(e).is_some())
}

/// Whether this machine can capture the screen at all (drives the UI capability).
pub fn is_available() -> bool {
    capture_element().is_some()
}

/// Build the screen-capture source into `pipeline` and return its tail element
/// (whose `src` pad feeds a compositor layer). Matches [`studio_media::SourceBuilder`].
pub fn add_source(pipeline: &gst::Pipeline) -> Result<gst::Element> {
    let element = capture_element().context("no screen-capture element on this platform")?;

    let mut src = gst::ElementFactory::make(element);
    if element == "ximagesrc" {
        // Full-frame grabs, no damage-event deltas — simpler and reliable.
        src = src.property("use-damage", false);
    }
    let src = src.build().with_context(|| format!("make {element}"))?;

    let convert = gst::ElementFactory::make("videoconvert").build()?;
    let scale = gst::ElementFactory::make("videoscale").build()?;
    let rate = gst::ElementFactory::make("videorate").build()?;
    let caps = gst::ElementFactory::make("capsfilter")
        .property(
            "caps",
            gst::Caps::builder("video/x-raw")
                .field("width", 1280i32)
                .field("height", 720i32)
                .field("framerate", gst::Fraction::new(30, 1))
                .build(),
        )
        .build()?;

    pipeline.add_many([&src, &convert, &scale, &rate, &caps])?;
    gst::Element::link_many([&src, &convert, &scale, &rate, &caps])?;
    Ok(caps)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;

    #[test]
    fn probe_is_stable() {
        // Never panics; returns a consistent answer for this machine.
        let _ = is_available();
    }

    /// End-to-end capture proof. Needs a real display, so it self-skips when
    /// `DISPLAY` is unset (headless `cargo test`); run it under `xvfb-run` to
    /// exercise the actual ximagesrc → compositor → jpegenc path.
    #[test]
    fn captures_real_frames_under_a_display() {
        if std::env::var("DISPLAY").is_err() {
            eprintln!("skip: no DISPLAY (run under xvfb-run to exercise capture)");
            return;
        }
        if !is_available() {
            eprintln!("skip: no screen-capture element installed");
            return;
        }

        let engine = studio_media::MediaEngine::start_with_source(Box::new(add_source))
            .expect("engine with screen source");
        let mut frame = None;
        for _ in 0..60 {
            std::thread::sleep(Duration::from_millis(50));
            if let Some(f) = engine.latest_frame() {
                frame = Some(f);
                break;
            }
        }
        let n = engine.frames();
        engine.stop();

        let frame = frame.expect("no captured frame produced");
        assert!(n > 0, "no frames counted");
        assert_eq!(&frame[..2], &[0xFF, 0xD8], "not a JPEG (bad magic bytes)");
    }
}
