//! # mod-camera (CHR-105)
//!
//! The "Caméra / Capture" [`studio_media::SourceBuilder`] — a local video-input
//! device (webcam, HDMI→USB capture card, or an NDI feed exposed as a virtual
//! webcam). The web app consumed these with `getUserMedia` + device
//! enumeration; the native parity uses GStreamer's **device monitor** so the
//! same "pick a camera" UX works cross-platform:
//!
//! ```text
//!   <device src> → videoconvert → videoscale → videorate → caps(1920x1080@60)
//! ```
//!
//! Device discovery goes through [`list_cameras`] (a `gst::DeviceMonitor`
//! snapshot of the `Video/Source` class), and [`build_source`] builds the chosen
//! device's element via `Device::create_element` — the platform-correct source
//! (`v4l2src` on Linux, `avfvideosrc` on macOS, `mf`/`ksvideosrc` on Windows)
//! configured for that exact device, without hardcoding any of them.
//!
//! It is a **removable module**: if the crate (feature) is absent, or no camera
//! is present, the source never shows up in the UI — capability negotiation
//! handles it, no other code changes. Its hot lifecycle (add/remove while the
//! pipeline runs, auto-detach on unplug) is the same one CHR-104 built in
//! `studio_media::MediaEngine`; the shell drives it via `add_source("camera",…)`.
//!
//! Scope note: v1 exposes ONE active camera at a time (source id `"camera"`,
//! with a selectable device), mirroring the screen source. Several simultaneous
//! cameras (one per layer) is a later épaississement — the store already models
//! multiple camera layers.

use anyhow::{anyhow, Context, Result};
use gst::prelude::*;
use gstreamer as gst;
use serde::Serialize;

/// The programme canvas caps a camera is normalised to before the compositor —
/// same target as the screen source, so every layer feeds the mixer uniformly.
/// The compositor pad ultimately controls the on-screen size/position.
const OUT_W: i32 = 1920;
const OUT_H: i32 = 1080;
const OUT_FPS: i32 = 60;

/// A selectable video-input device — the IPC payload behind the UI's camera
/// picker. `id` is the device's display name (what the monitor reports); it is
/// re-resolved against the live device list at [`build_source`] time.
#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
pub struct CameraDevice {
    pub id: String,
    pub label: String,
}

/// Snapshot the currently-connected `Video/Source` devices. Starts a short-lived
/// `DeviceMonitor`, reads the list, stops it — no background monitoring.
fn video_devices() -> Vec<gst::Device> {
    if gst::init().is_err() {
        return Vec::new();
    }
    let monitor = gst::DeviceMonitor::new();
    // Only real camera/capture inputs, not every video device class.
    monitor.add_filter(Some("Video/Source"), None);
    if monitor.start().is_err() {
        return Vec::new();
    }
    let devices: Vec<gst::Device> = monitor.devices().into_iter().collect();
    monitor.stop();
    devices
}

/// The connected cameras, for the UI picker. Empty when none are present (the
/// source then never appears — the removable-module guarantee).
pub fn list_cameras() -> Vec<CameraDevice> {
    video_devices()
        .into_iter()
        .map(|d| {
            let name = d.display_name().to_string();
            CameraDevice {
                id: name.clone(),
                label: name,
            }
        })
        .collect()
}

/// Whether this machine has at least one camera/capture device right now.
pub fn is_available() -> bool {
    !video_devices().is_empty()
}

/// Build the camera source as a self-contained `gst::Bin` with a ghost `src`
/// pad. `device_id` selects a specific device (by the [`CameraDevice::id`] from
/// [`list_cameras`]); `None` (or an id no longer present) falls back to the first
/// available device. Errors if there is no camera at all. Matches
/// [`studio_media::SourceBuilder`] — the shell hands
/// `move || build_source(device_id.clone())` to `MediaEngine::add_source`.
pub fn build_source(device_id: Option<String>) -> Result<gst::Bin> {
    let devices = video_devices();
    if devices.is_empty() {
        return Err(anyhow!("no camera/capture device on this machine"));
    }
    // Prefer the requested device; otherwise the first one.
    let device = device_id
        .as_deref()
        .and_then(|want| {
            devices
                .iter()
                .find(|d| d.display_name().as_str() == want)
                .cloned()
        })
        .unwrap_or_else(|| devices[0].clone());

    let src = device
        .create_element(None)
        .context("create camera source element for the selected device")?;
    wrap_camera_bin(src)
}

/// Wrap a raw camera source element into the normalised compositor-layer bin
/// (`src → videoconvert → videoscale → videorate → caps → ghost src`). Split out
/// so the plumbing is testable with any element (a `videotestsrc` stand-in) even
/// where no real camera exists (headless CI).
fn wrap_camera_bin(src: gst::Element) -> Result<gst::Bin> {
    let convert = gst::ElementFactory::make("videoconvert").build()?;
    let scale = gst::ElementFactory::make("videoscale").build()?;
    let rate = gst::ElementFactory::make("videorate").build()?;
    let caps = gst::ElementFactory::make("capsfilter")
        .property(
            "caps",
            gst::Caps::builder("video/x-raw")
                .field("width", OUT_W)
                .field("height", OUT_H)
                .field("framerate", gst::Fraction::new(OUT_FPS, 1))
                .build(),
        )
        .build()?;

    let bin = gst::Bin::new();
    bin.add_many([&src, &convert, &scale, &rate, &caps])
        .context("add camera elements to bin")?;
    gst::Element::link_many([&src, &convert, &scale, &rate, &caps]).context("link camera chain")?;
    let tail_pad = caps
        .static_pad("src")
        .ok_or_else(|| anyhow!("capsfilter has no src pad"))?;
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
    fn enumeration_is_stable_and_never_panics() {
        // Never panics; the availability answer is consistent with the list.
        let cams = list_cameras();
        assert_eq!(is_available(), !cams.is_empty());
    }

    #[test]
    fn wrap_camera_bin_produces_a_bin_with_a_ghost_src_pad() {
        // Plumbing test with a synthetic source — no camera hardware needed, so
        // it runs everywhere (headless CI included).
        let _ = gst::init();
        let src = gst::ElementFactory::make("videotestsrc")
            .property("is-live", true)
            .build()
            .expect("videotestsrc");
        let bin = wrap_camera_bin(src).expect("wrap");
        assert!(bin.static_pad("src").is_some(), "bin must expose a src pad");
    }

    #[test]
    fn build_source_errors_cleanly_when_no_camera_exists() {
        // On a box with no camera, build_source fails with a clear error rather
        // than panicking — the shell surfaces it as "camera unavailable".
        if is_available() {
            eprintln!("skip: a real camera is present on this machine");
            return;
        }
        assert!(build_source(None).is_err());
    }

    /// End-to-end capture proof through the CHR-104 hot-attach path. Needs a real
    /// camera, so it self-skips when none is present (headless CI). With a webcam
    /// connected it exercises the actual device → compositor → jpegenc path.
    #[test]
    fn captures_real_frames_from_a_camera() {
        if !is_available() {
            eprintln!("skip: no camera device (connect a webcam to exercise this)");
            return;
        }
        let engine = studio_media::MediaEngine::start().expect("engine start");
        engine
            .add_source("camera", Box::new(|| build_source(None)))
            .expect("hot-attach camera source");

        let mut frame = None;
        for _ in 0..100 {
            std::thread::sleep(Duration::from_millis(50));
            if let Some(f) = engine.latest_frame() {
                frame = Some(f);
                break;
            }
        }
        let n = engine.frames();
        engine.remove_source("camera").expect("hot-detach camera");
        engine.stop();

        let frame = frame.expect("no camera frame produced");
        assert!(n > 0, "no frames counted");
        assert_eq!(&frame[..2], &[0xFF, 0xD8], "not a JPEG (bad magic bytes)");
    }
}
