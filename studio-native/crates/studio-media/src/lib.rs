//! # studio-media (CHR-102)
//!
//! The media runtime. It owns the GStreamer pipeline and runs a **glib
//! `MainLoop` on a dedicated thread** — the concrete realisation of the glib↔tokio
//! split we designed: Tauri keeps the main thread for its own event loop, the
//! media plane lives entirely here, and the two talk through channels + shared
//! atomics (never a shared `&mut`).
//!
//! CHR-102 scope:
//!   * [`probe_encoders`] — real capability probe (which H.264 encoder elements
//!     actually exist on this machine), feeding the module-agnostic UI negotiation.
//!   * [`MediaEngine`] — starts a `compositor` pipeline on the media thread and
//!     proves it produces frames (buffer count via a pad probe). The pixels are
//!     currently consumed by a `fakesink` so the engine is verifiable head-less;
//!     docking a real video sink into the Tauri window (raw-window-handle / GTK)
//!     is the display-dependent follow-up.

use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{mpsc, Arc};
use std::thread::JoinHandle;

use anyhow::{anyhow, bail, Context, Result};
use gst::glib;
use gst::prelude::*;
use gstreamer as gst;

/// Ensure GStreamer is initialised (idempotent — safe to call repeatedly).
fn ensure_init() -> Result<()> {
    gst::init().context("gst::init")?;
    Ok(())
}

/// Probe which H.264 encoder elements are actually present, best (hardware) first.
/// This is a **real** capability check (`ElementFactory::find`), not a hardcoded
/// list — so the UI only ever offers what this machine can do. Returned ids match
/// the frontend's expectations ("nvenc", "qsv", "vaapi", "amf", "videotoolbox",
/// "x264").
pub fn probe_encoders() -> Vec<String> {
    if ensure_init().is_err() {
        return Vec::new();
    }
    // (element name, capability id) — hardware encoders first, x264 last as the
    // universal software fallback.
    const CANDIDATES: &[(&str, &str)] = &[
        ("nvh264enc", "nvenc"),
        ("qsvh264enc", "qsv"),
        ("vah264enc", "vaapi"),
        ("vaapih264enc", "vaapi"),
        ("amfh264enc", "amf"),
        ("vtenc_h264", "videotoolbox"),
        ("x264enc", "x264"),
    ];
    let mut out: Vec<String> = Vec::new();
    for (element, id) in CANDIDATES {
        if gst::ElementFactory::find(element).is_some() && !out.iter().any(|e| e == id) {
            out.push((*id).to_string());
        }
    }
    out
}

/// A running media engine: a `compositor` pipeline pumped by a glib `MainLoop` on
/// its own thread. Dropping or [`MediaEngine::stop`]-ping it tears the loop down.
pub struct MediaEngine {
    main_loop: glib::MainLoop,
    frames: Arc<AtomicU64>,
    thread: Option<JoinHandle<()>>,
}

impl MediaEngine {
    /// Start the engine. Blocks only until the media thread has the pipeline in
    /// `Playing` (or errors during setup), then returns while frames flow.
    pub fn start() -> Result<MediaEngine> {
        let (ready_tx, ready_rx) =
            mpsc::channel::<Result<(glib::MainLoop, Arc<AtomicU64>), String>>();

        let thread = std::thread::Builder::new()
            .name("studio-media".into())
            .spawn(move || {
                if let Err(e) = run_media_thread(&ready_tx) {
                    // If we failed before signalling ready, report it back.
                    let _ = ready_tx.send(Err(e.to_string()));
                }
            })
            .context("spawn media thread")?;

        match ready_rx.recv() {
            Ok(Ok((main_loop, frames))) => Ok(MediaEngine {
                main_loop,
                frames,
                thread: Some(thread),
            }),
            Ok(Err(e)) => bail!("media engine setup: {e}"),
            Err(_) => bail!("media thread died before signalling ready"),
        }
    }

    /// Buffers composited so far (proof the pipeline is actually running).
    pub fn frames(&self) -> u64 {
        self.frames.load(Ordering::Relaxed)
    }

    /// Stop the loop and join the media thread. Safe to call once.
    pub fn stop(mut self) {
        self.shutdown();
    }

    fn shutdown(&mut self) {
        self.main_loop.quit();
        if let Some(t) = self.thread.take() {
            let _ = t.join();
        }
    }
}

impl Drop for MediaEngine {
    fn drop(&mut self) {
        self.shutdown();
    }
}

/// Runs entirely on the dedicated media thread: build the pipeline, attach the
/// glib bus watch, go `Playing`, signal ready, then run the loop until quit.
fn run_media_thread(
    ready: &mpsc::Sender<Result<(glib::MainLoop, Arc<AtomicU64>), String>>,
) -> Result<()> {
    ensure_init()?;

    // Own a MainContext for THIS thread so the bus watch and the MainLoop share it
    // (the classic gstreamer-rs threading contract). `with_thread_default` keeps it
    // as the thread-default for the whole scope — including the blocking run().
    let ctx = glib::MainContext::new();
    ctx.with_thread_default(|| -> Result<()> {
        // Picks up `ctx` as the thread-default; the bus watch attaches to it too.
        let main_loop = glib::MainLoop::new(None, false);

        let frames = Arc::new(AtomicU64::new(0));
        let pipeline = build_compositor_pipeline(&frames)?;

        let bus = pipeline
            .bus()
            .ok_or_else(|| anyhow!("pipeline has no bus"))?;
        let loop_for_watch = main_loop.clone();
        let _watch = bus
            .add_watch(move |_, msg| {
                use gst::MessageView;
                match msg.view() {
                    MessageView::Eos(_) | MessageView::Error(_) => {
                        loop_for_watch.quit();
                        glib::ControlFlow::Break
                    }
                    _ => glib::ControlFlow::Continue,
                }
            })
            .context("add bus watch")?;

        pipeline
            .set_state(gst::State::Playing)
            .context("set Playing")?;

        // Hand the control handle + frame counter back to the engine, then run.
        ready
            .send(Ok((main_loop.clone(), frames.clone())))
            .map_err(|_| anyhow!("engine dropped before ready"))?;

        main_loop.run();

        pipeline.set_state(gst::State::Null).context("set Null")?;
        Ok(())
    })
    .map_err(|e| anyhow!("with_thread_default: {e}"))?
}

/// videotestsrc → compositor → convert → fakesink, with a buffer probe on the
/// sink counting composited frames. One source for now; CHR-103+ add/remove
/// compositor pads dynamically per scene layer.
fn build_compositor_pipeline(frames: &Arc<AtomicU64>) -> Result<gst::Pipeline> {
    let pipeline = gst::Pipeline::with_name("studio-preview");

    let src = gst::ElementFactory::make("videotestsrc")
        .property("is-live", true)
        .property_from_str("pattern", "smpte")
        .build()
        .context("make videotestsrc")?;
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
    let compositor = gst::ElementFactory::make("compositor")
        .property_from_str("background", "black")
        .build()
        .context("make compositor")?;
    let convert = gst::ElementFactory::make("videoconvert").build()?;
    let sink = gst::ElementFactory::make("fakesink")
        .property("sync", true)
        .build()
        .context("make fakesink")?;

    pipeline.add_many([&src, &caps, &compositor, &convert, &sink])?;
    gst::Element::link_many([&src, &caps])?;
    gst::Element::link_many([&compositor, &convert, &sink])?;

    // Request a compositor pad and link the source layer to it (the same API the
    // scene→graph mapping drives in CHR-103+).
    let comp_pad = compositor
        .request_pad_simple("sink_%u")
        .ok_or_else(|| anyhow!("compositor request pad failed"))?;
    caps.static_pad("src")
        .ok_or_else(|| anyhow!("caps src pad"))?
        .link(&comp_pad)
        .context("link source → compositor")?;

    // Count composited buffers as they hit the sink — the head-less proof of life.
    let f = frames.clone();
    sink.static_pad("sink")
        .ok_or_else(|| anyhow!("sink pad"))?
        .add_probe(gst::PadProbeType::BUFFER, move |_, _| {
            f.fetch_add(1, Ordering::Relaxed);
            gst::PadProbeReturn::Ok
        });

    Ok(pipeline)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;

    #[test]
    fn probe_encoders_finds_at_least_x264_on_a_dev_box() {
        // The CI/dev machine has gst-plugins-ugly (x264). If this ever returns
        // empty, the media plane genuinely can't encode → worth failing loudly.
        let enc = probe_encoders();
        assert!(
            enc.iter().any(|e| e == "x264"),
            "expected x264 among encoders, got {enc:?}"
        );
    }

    #[test]
    fn engine_composites_frames() {
        let engine = MediaEngine::start().expect("engine start");
        // Live source at 30fps → a few hundred ms yields several frames.
        std::thread::sleep(Duration::from_millis(500));
        let n = engine.frames();
        engine.stop();
        assert!(n > 0, "compositor produced no frames");
    }
}
