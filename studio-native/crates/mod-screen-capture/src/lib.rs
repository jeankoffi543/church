//! # mod-screen-capture (CHR-103/104)
//!
//! The first real [`studio_media::SourceBuilder`] — the OBS-style "Capture
//! d'écran" source, ported from the web app's `getDisplayMedia`. It plugs a
//! platform screen-capture element into a compositor layer:
//!
//! ```text
//!   <platform capture> → videoconvert → videoscale → videorate → caps(1920x1080@60)
//! ```
//!
//! It is a **removable module**: if the crate (feature) is absent, or no capture
//! element exists on this machine, the source simply never shows up in the UI —
//! the capability negotiation handles it, no other code changes.
//!
//! CHR-104 adds hot lifecycle: the shell calls
//! [`studio_media::MediaEngine::add_source`] / `remove_source` with this
//! module's [`add_source`] builder to start/stop sharing while the pipeline
//! keeps running (see the shell's `start_screen_source`/`stop_screen_source`
//! commands), and reads back `MediaEngine::take_ended_reason` for the
//! "partage arrêté" event if the capture element itself fails (e.g. the shared
//! display/window goes away).
//!
//! Permissions: on Linux/X11 and Xvfb there is no OS consent gate, so
//! `is_available()`/`add_source` failing (no element found) is the only
//! "denied" signal this dev target can produce. Real per-OS permission
//! handling (macOS ScreenCaptureKit TCC prompt, Windows consent UI) is
//! out of scope here — platform-specific work for whichever OS branch adds it.

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

/// Build the screen-capture source as a self-contained `gst::Bin` with a ghost
/// `src` pad. Matches [`studio_media::SourceBuilder`] — the caller (the Tauri
/// shell) hands this to `MediaEngine::add_source("screen", ...)` to attach it
/// live, and `MediaEngine::remove_source("screen")` to stop sharing, live.
pub fn add_source() -> Result<gst::Bin> {
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
                .field("width", 1920i32)
                .field("height", 1080i32)
                .field("framerate", gst::Fraction::new(60, 1))
                .build(),
        )
        .build()?;

    let bin = gst::Bin::new();
    bin.add_many([&src, &convert, &scale, &rate, &caps])
        .context("add screen-capture elements to bin")?;
    gst::Element::link_many([&src, &convert, &scale, &rate, &caps])
        .context("link screen-capture chain")?;
    let tail_pad = caps
        .static_pad("src")
        .ok_or_else(|| anyhow::anyhow!("capsfilter has no src pad"))?;
    let ghost = gst::GhostPad::with_target(&tail_pad).context("create ghost pad")?;
    ghost.set_active(true).context("activate ghost pad")?;
    bin.add_pad(&ghost).context("add ghost pad to bin")?;
    Ok(bin)
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

    /// End-to-end capture proof, including the CHR-104 hot-attach path: needs a
    /// real display, so it self-skips when `DISPLAY` is unset (headless
    /// `cargo test`); run it under `xvfb-run` to exercise the actual
    /// ximagesrc → compositor → jpegenc path.
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

        let engine = studio_media::MediaEngine::start().expect("engine start");
        engine
            .add_source("screen", Box::new(add_source))
            .expect("hot-attach screen source");

        let mut frame = None;
        for _ in 0..60 {
            std::thread::sleep(Duration::from_millis(50));
            if let Some(f) = engine.latest_frame() {
                frame = Some(f);
                break;
            }
        }
        let n = engine.frames();
        assert!(engine.is_source_active("screen"));

        engine
            .remove_source("screen")
            .expect("hot-detach screen source");
        engine.stop();

        let frame = frame.expect("no captured frame produced");
        assert!(n > 0, "no frames counted");
        assert_eq!(&frame[..2], &[0xFF, 0xD8], "not a JPEG (bad magic bytes)");
    }
}
