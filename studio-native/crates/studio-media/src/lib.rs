//! # studio-media (CHR-102)
//!
//! The media runtime. It owns the GStreamer pipeline and runs a **glib
//! `MainLoop` on a dedicated thread** — the concrete realisation of the glib↔tokio
//! split we designed: Tauri keeps the main thread for its own event loop, the
//! media plane lives entirely here, and the two talk through channels + shared
//! state (never a shared `&mut`).
//!
//! CHR-102 scope:
//!   * [`probe_encoders`] — real capability probe (which H.264 encoder elements
//!     actually exist on this machine), feeding the module-agnostic UI negotiation.
//!   * [`MediaEngine`] — starts a `compositor` pipeline and exposes its output as
//!     **JPEG preview frames** (compositor → downscale → `jpegenc` → `appsink`).
//!     The frames are pushed to the webview as a data-URL — an embedded,
//!     cross-platform preview that needs no native-window surgery. (The zero-copy
//!     GPU path to the *encoder/WHIP* is a later, program-feed concern.)

use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{mpsc, Arc, Mutex};
use std::thread::JoinHandle;

use anyhow::{anyhow, bail, Context, Result};
use gst::glib;
use gst::prelude::*;
use gstreamer as gst;
use gstreamer_app as gst_app;

/// The latest encoded preview frame (JPEG bytes), shared between the appsink
/// callback (streaming thread) and the reader (Tauri command thread).
type FrameSlot = Arc<Mutex<Option<Vec<u8>>>>;

/// A pluggable video source. Given the pipeline, it adds its own elements and
/// returns the tail element whose `src` pad feeds a compositor layer. This is the
/// seam every source module (CHR-103 screen, CHR-104 camera, …) plugs into — the
/// engine never hardcodes what produces the pixels. Runs on the media thread.
pub type SourceBuilder = Box<dyn FnOnce(&gst::Pipeline) -> Result<gst::Element> + Send>;

/// Preview downscale target — small + cheap; a monitor, not the program feed.
const PREVIEW_W: i32 = 640;
const PREVIEW_H: i32 = 360;

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

/// Handles handed back from the media thread once the pipeline is `Playing`.
struct Ready {
    main_loop: glib::MainLoop,
    frames: Arc<AtomicU64>,
    latest: FrameSlot,
}

/// A running media engine: a `compositor` pipeline pumped by a glib `MainLoop` on
/// its own thread, publishing JPEG preview frames. Dropping or
/// [`MediaEngine::stop`]-ping it tears the loop down.
pub struct MediaEngine {
    main_loop: glib::MainLoop,
    frames: Arc<AtomicU64>,
    latest: FrameSlot,
    thread: Option<JoinHandle<()>>,
}

impl MediaEngine {
    /// Start with the built-in test-pattern source.
    pub fn start() -> Result<MediaEngine> {
        Self::start_with_source(Box::new(default_source))
    }

    /// Start with a pluggable [`SourceBuilder`] (e.g. screen capture). Blocks only
    /// until the media thread has the pipeline in `Playing` (or errors during
    /// setup), then returns while frames flow.
    pub fn start_with_source(source: SourceBuilder) -> Result<MediaEngine> {
        let (ready_tx, ready_rx) = mpsc::channel::<Result<Ready, String>>();

        let thread = std::thread::Builder::new()
            .name("studio-media".into())
            .spawn(move || {
                if let Err(e) = run_media_thread(&ready_tx, source) {
                    // If we failed before signalling ready, report it back.
                    let _ = ready_tx.send(Err(e.to_string()));
                }
            })
            .context("spawn media thread")?;

        match ready_rx.recv() {
            Ok(Ok(r)) => Ok(MediaEngine {
                main_loop: r.main_loop,
                frames: r.frames,
                latest: r.latest,
                thread: Some(thread),
            }),
            Ok(Err(e)) => bail!("media engine setup: {e}"),
            Err(_) => bail!("media thread died before signalling ready"),
        }
    }

    /// Frames encoded so far (proof the pipeline is actually running).
    pub fn frames(&self) -> u64 {
        self.frames.load(Ordering::Relaxed)
    }

    /// The most recent preview frame as JPEG bytes, if one has been produced.
    pub fn latest_frame(&self) -> Option<Vec<u8>> {
        self.latest.lock().ok().and_then(|g| g.clone())
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
    ready: &mpsc::Sender<Result<Ready, String>>,
    source: SourceBuilder,
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
        let latest: FrameSlot = Arc::new(Mutex::new(None));
        let pipeline = build_preview_pipeline(source, &frames, &latest)?;

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

        // Hand the control handle + shared state back to the engine, then run.
        ready
            .send(Ok(Ready {
                main_loop: main_loop.clone(),
                frames: frames.clone(),
                latest: latest.clone(),
            }))
            .map_err(|_| anyhow!("engine dropped before ready"))?;

        main_loop.run();

        pipeline.set_state(gst::State::Null).context("set Null")?;
        Ok(())
    })
    .map_err(|e| anyhow!("with_thread_default: {e}"))?
}

/// The built-in test-pattern source (used when no module provides one). Adds its
/// elements to `pipeline` and returns the tail element feeding the compositor.
fn default_source(pipeline: &gst::Pipeline) -> Result<gst::Element> {
    let src = gst::ElementFactory::make("videotestsrc")
        .property("is-live", true)
        .property_from_str("pattern", "smpte")
        .build()
        .context("make videotestsrc")?;
    let caps_in = gst::ElementFactory::make("capsfilter")
        .property(
            "caps",
            gst::Caps::builder("video/x-raw")
                .field("width", 1280i32)
                .field("height", 720i32)
                .field("framerate", gst::Fraction::new(30, 1))
                .build(),
        )
        .build()?;
    pipeline.add_many([&src, &caps_in])?;
    gst::Element::link_many([&src, &caps_in])?;
    Ok(caps_in)
}

/// <source> → compositor → convert → scale → jpegenc → appsink.
/// The appsink callback stores each JPEG frame in `latest` and bumps `frames`.
/// One source for now; CHR-104+ request/release compositor pads per scene layer.
fn build_preview_pipeline(
    source: SourceBuilder,
    frames: &Arc<AtomicU64>,
    latest: &FrameSlot,
) -> Result<gst::Pipeline> {
    let pipeline = gst::Pipeline::with_name("studio-preview");

    // The pluggable source adds its own elements and hands back its tail.
    let source_tail = source(&pipeline).context("build source")?;

    let compositor = gst::ElementFactory::make("compositor")
        .property_from_str("background", "black")
        .build()
        .context("make compositor")?;
    let convert = gst::ElementFactory::make("videoconvert").build()?;
    let scale = gst::ElementFactory::make("videoscale").build()?;
    let caps_out = gst::ElementFactory::make("capsfilter")
        .property(
            "caps",
            gst::Caps::builder("video/x-raw")
                .field("width", PREVIEW_W)
                .field("height", PREVIEW_H)
                .build(),
        )
        .build()?;
    let jpeg = gst::ElementFactory::make("jpegenc")
        .property("quality", 70i32)
        .build()
        .context("make jpegenc")?;

    let appsink = gst_app::AppSink::builder()
        .caps(&gst::Caps::builder("image/jpeg").build())
        .max_buffers(1)
        .drop(true)
        .sync(true)
        .build();

    pipeline.add_many([&compositor, &convert, &scale, &caps_out, &jpeg])?;
    pipeline.add(&appsink).context("add appsink")?;
    gst::Element::link_many([&compositor, &convert, &scale, &caps_out, &jpeg])?;
    jpeg.link(&appsink).context("link jpegenc → appsink")?;

    // Request a compositor pad and link the source's tail to it (the same API the
    // scene→graph mapping drives per layer).
    let comp_pad = compositor
        .request_pad_simple("sink_%u")
        .ok_or_else(|| anyhow!("compositor request pad failed"))?;
    source_tail
        .static_pad("src")
        .ok_or_else(|| anyhow!("source tail src pad"))?
        .link(&comp_pad)
        .context("link source → compositor")?;

    // Pull each encoded JPEG into the shared slot; count them (head-less proof).
    let f = frames.clone();
    let slot = latest.clone();
    appsink.set_callbacks(
        gst_app::AppSinkCallbacks::builder()
            .new_sample(move |sink| {
                let sample = sink.pull_sample().map_err(|_| gst::FlowError::Eos)?;
                if let Some(buffer) = sample.buffer() {
                    if let Ok(map) = buffer.map_readable() {
                        if let Ok(mut g) = slot.lock() {
                            *g = Some(map.as_slice().to_vec());
                        }
                        f.fetch_add(1, Ordering::Relaxed);
                    }
                }
                Ok(gst::FlowSuccess::Ok)
            })
            .build(),
    );

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
    fn engine_produces_jpeg_preview_frames() {
        let engine = MediaEngine::start().expect("engine start");
        // Poll up to ~2s for the first encoded frame.
        let mut frame = None;
        for _ in 0..40 {
            std::thread::sleep(Duration::from_millis(50));
            if let Some(f) = engine.latest_frame() {
                frame = Some(f);
                break;
            }
        }
        let n = engine.frames();
        engine.stop();

        let frame = frame.expect("no preview frame produced");
        assert!(n > 0, "no frames counted");
        // JPEG SOI marker — proves the compositor→jpegenc→appsink path is real.
        assert_eq!(&frame[..2], &[0xFF, 0xD8], "not a JPEG (bad magic bytes)");
    }
}
