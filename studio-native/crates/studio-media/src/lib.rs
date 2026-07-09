//! # studio-media (CHR-102/103/104)
//!
//! The media runtime. It owns the GStreamer pipeline and runs a **glib
//! `MainLoop` on a dedicated thread** — the concrete realisation of the glib↔tokio
//! split we designed: Tauri keeps the main thread for its own event loop, the
//! media plane lives entirely here, and the two talk through channels + shared
//! state (never a shared `&mut`).
//!
//! Scope so far:
//!   * [`probe_encoders`] — real capability probe (which H.264 encoder elements
//!     actually exist on this machine), feeding the module-agnostic UI negotiation.
//!   * [`MediaEngine`] — starts a `compositor` pipeline at a fixed 1080p60
//!     programme canvas ([`canvas_size`]) and exposes its output as **JPEG
//!     preview frames** (compositor → downscale → `jpegenc` → `appsink`). The
//!     frames are pushed to the webview as a data-URL — an embedded,
//!     cross-platform preview that needs no native-window surgery. (The
//!     zero-copy GPU path to the *encoder/WHIP* is a later, program-feed
//!     concern.)
//!   * [`MediaEngine::set_layer_transform`] — moves/resizes a source's
//!     compositor pad live, while `Playing`.
//!   * [`MediaEngine::add_source`] / [`MediaEngine::remove_source`] (CHR-104) —
//!     **hot** add/remove of a [`SourceBuilder`] while the pipeline runs, the
//!     harder half of the architecture's "isolation des pannes" principle: each
//!     source is its own `gst::Bin`, plugged into a compositor request pad and
//!     unplugged again without touching the rest of the graph. A source that
//!     **ends** (EOS — the "stop sharing" case) or **errors** (device gone) is
//!     auto-detached the same way, and its reason recorded for
//!     [`MediaEngine::take_ended_reason`] — the `captureActive`/`ended` parity.
//!     The programme keeps running throughout (see the bus watch in
//!     [`run_media_thread`]).

use std::collections::HashMap;
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

/// A pluggable video source: builds a **self-contained** `gst::Bin` with a
/// ghost `src` pad, not yet attached to anything. This is the seam every source
/// module (screen, camera, overlays, …) plugs into — the engine never
/// hardcodes what produces the pixels. Being a standalone `Bin` (rather than
/// loose elements added straight to the pipeline) is what makes a source hot
/// add-/removable: the engine only ever has to add/remove *one* object. Runs on
/// whatever thread calls [`MediaEngine::add_source`] (or the media thread, for
/// the engine's own startup source).
pub type SourceBuilder = Box<dyn FnOnce() -> Result<gst::Bin> + Send>;

/// The compositor's own canvas — this is the "programme" resolution the CHR-103
/// acceptance criteria target (mire/couleur 1080p60 stable). Layer pads
/// (xpos/ypos/width/height) are positioned in THIS coordinate space.
const OUTPUT_W: i32 = 1920;
const OUTPUT_H: i32 = 1080;
const OUTPUT_FPS: i32 = 60;

/// Preview downscale target — small + cheap; a monitor, not the program feed.
/// Independent of `OUTPUT_W`/`OUTPUT_H`: the compositor always runs at full
/// programme resolution, only the JPEG shipped to the webview is shrunk.
const PREVIEW_W: i32 = 960;
const PREVIEW_H: i32 = 540;

/// The id the engine's own always-on background/test-pattern layer is
/// registered under. Reserved — a module's own source id should never collide
/// with it (today only `"screen"`, from mod-screen-capture, is used).
const BACKGROUND_SOURCE_ID: &str = "background";

/// The id of the lazily-attached full-canvas black layer used for the programme
/// fade-to-black transition (CHR-113). Reserved, like the background.
const BLACK_SOURCE_ID: &str = "__transition_black__";

/// Name of the custom `Application` bus message a source's EOS probe posts so
/// the (main-thread) bus watch can auto-detach it — a per-source EOS never
/// reaches the bus on its own. Carries a `source-id` string field.
const SOURCE_ENDED_MSG: &str = "studio-source-ended";

/// The programme canvas resolution — the coordinate space `MediaEngine::
/// set_layer_transform` positions layers in. Exposed so callers (the Tauri
/// shell, tests) never have to hardcode `OUTPUT_W`/`OUTPUT_H` themselves.
pub fn canvas_size() -> (u32, u32) {
    (OUTPUT_W as u32, OUTPUT_H as u32)
}

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

/// A live source: its self-contained bin, and the compositor request pad its
/// ghost `src` pad feeds. Removing a source means tearing down exactly these
/// two things — nothing else in the graph is touched.
struct SourceHandle {
    bin: gst::Bin,
    pad: gst::Pad,
}

type SourceMap = Arc<Mutex<HashMap<String, SourceHandle>>>;
/// Reasons the most recent auto-detach happened, keyed by source id — read
/// (and cleared) via [`MediaEngine::take_ended_reason`]. The CHR-104 parity for
/// the web app's `captureActive`/`ended` events: a source dying no longer takes
/// the whole preview down with it, so the UI needs a way to notice and explain.
type EndedMap = Arc<Mutex<HashMap<String, String>>>;

/// Builds an output branch as a `gst::Bin` with a ghost **sink** pad, consuming
/// the programme feed off a tee request pad. This is the seam every output
/// module plugs into (CHR-108 record, CHR-109 WHIP) — the mirror of
/// [`SourceBuilder`] on the sink side. Runs on the attaching thread.
pub type OutputBuilder = Box<dyn FnOnce() -> Result<gst::Bin> + Send>;

/// Live counters for an output's *encoded* stream (CHR-112), fed by a buffer
/// probe on the output's `stats-tap` element — the `h264parse` carrying encoded
/// H.264, so `bytes` is the real post-compression size, not raw frames.
struct StatsInner {
    frames: AtomicU64,
    bytes: AtomicU64,
    start: std::time::Instant,
}

/// A snapshot of an output's encoded-stream stats: cumulative counters plus how
/// long it's run, so the caller derives live fps/bitrate by delta between polls.
#[derive(Clone, Copy, Debug)]
pub struct OutputStats {
    pub frames: u64,
    pub bytes: u64,
    pub elapsed_ms: u64,
}

/// A live output: its bin + the tee request pad feeding it, plus (if the bin
/// exposed a `stats-tap`) its encoded-stream counters. Detaching finalises (EOS)
/// then releases exactly these — nothing upstream is touched.
struct OutputHandle {
    bin: gst::Bin,
    tee_pad: gst::Pad,
    stats: Option<Arc<StatsInner>>,
}

type OutputMap = Arc<Mutex<HashMap<String, OutputHandle>>>;

/// Handles handed back from the media thread once the pipeline is `Playing`.
struct Ready {
    main_loop: glib::MainLoop,
    frames: Arc<AtomicU64>,
    latest: FrameSlot,
    pipeline: gst::Pipeline,
    compositor: gst::Element,
    tee: gst::Element,
    sources: SourceMap,
    outputs: OutputMap,
    ended: EndedMap,
    // Preview (edit) compositor + its own feed and sources (CHR-115).
    preview_compositor: gst::Element,
    preview_sources: SourceMap,
    preview_frames: Arc<AtomicU64>,
    preview_latest: FrameSlot,
}

/// A running media engine: a `compositor` pipeline pumped by a glib `MainLoop` on
/// its own thread, publishing JPEG preview frames. Dropping or
/// [`MediaEngine::stop`]-ping it tears the loop down.
pub struct MediaEngine {
    main_loop: glib::MainLoop,
    frames: Arc<AtomicU64>,
    latest: FrameSlot,
    pipeline: gst::Pipeline,
    compositor: gst::Element,
    /// The programme tap — outputs (record, WHIP) branch off this.
    tee: gst::Element,
    /// Currently-attached sources, keyed by caller-chosen id (e.g. `"screen"`).
    /// Always contains [`BACKGROUND_SOURCE_ID`] while the engine is alive.
    sources: SourceMap,
    /// Currently-attached outputs, keyed by caller-chosen id (e.g. `"record"`).
    outputs: OutputMap,
    ended: EndedMap,
    /// The preview (edit) compositor + its own feed and sources (CHR-115): a
    /// second monitor showing the scene being built, independent of the programme
    /// (on-air) compositor above. Shares the pipeline/clock.
    preview_compositor: gst::Element,
    preview_sources: SourceMap,
    preview_frames: Arc<AtomicU64>,
    preview_latest: FrameSlot,
    /// Per-source animation epoch (CHR-110). Each new entrance/reaction bumps its
    /// source's counter; a running animation thread stops as soon as its captured
    /// epoch is superseded, so a re-trigger cleanly cancels the previous one.
    anim_epochs: Arc<Mutex<HashMap<String, Arc<AtomicU64>>>>,
    thread: Option<JoinHandle<()>>,
}

impl MediaEngine {
    /// Start with just the built-in background test-pattern source
    /// (`BACKGROUND_SOURCE_ID`). Additional sources (screen, camera, …) attach
    /// afterwards, hot, via [`MediaEngine::add_source`].
    pub fn start() -> Result<MediaEngine> {
        let (ready_tx, ready_rx) = mpsc::channel::<Result<Ready, String>>();

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
            Ok(Ok(r)) => Ok(MediaEngine {
                main_loop: r.main_loop,
                frames: r.frames,
                latest: r.latest,
                pipeline: r.pipeline,
                compositor: r.compositor,
                tee: r.tee,
                sources: r.sources,
                outputs: r.outputs,
                ended: r.ended,
                preview_compositor: r.preview_compositor,
                preview_sources: r.preview_sources,
                preview_frames: r.preview_frames,
                preview_latest: r.preview_latest,
                anim_epochs: Arc::new(Mutex::new(HashMap::new())),
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

    /// The most recent **programme** (on-air) frame as JPEG bytes.
    pub fn latest_frame(&self) -> Option<Vec<u8>> {
        self.latest.lock().ok().and_then(|g| g.clone())
    }

    /// The most recent **preview** (edit) frame as JPEG bytes (CHR-115) — the
    /// second monitor's feed, produced by the preview compositor.
    pub fn preview_frame_jpeg(&self) -> Option<Vec<u8>> {
        self.preview_latest.lock().ok().and_then(|g| g.clone())
    }

    /// Preview-compositor frame count (proof the second feed is running).
    pub fn preview_frames(&self) -> u64 {
        self.preview_frames.load(Ordering::Relaxed)
    }

    /// Attach/detach a source on the **preview** compositor (CHR-115) — the same
    /// hot lifecycle as the programme side, but on the edit monitor. `cut` (in the
    /// shell) copies preview sources onto the programme by re-attaching them there.
    pub fn add_preview_source(&self, id: impl Into<String>, builder: SourceBuilder) -> Result<()> {
        add_source_impl(
            &self.pipeline,
            &self.preview_compositor,
            &self.preview_sources,
            id.into(),
            builder,
        )
    }

    pub fn remove_preview_source(&self, id: &str) -> Result<()> {
        let handle = take_source(&self.preview_sources, id)?;
        detach_source(&self.pipeline, &self.preview_compositor, handle);
        Ok(())
    }

    /// Whether `id` is attached on the preview compositor.
    pub fn is_preview_source_active(&self, id: &str) -> bool {
        self.preview_sources
            .lock()
            .map(|s| s.contains_key(id))
            .unwrap_or(false)
    }

    /// Attach a new source, live, while the pipeline is `Playing`: builds its
    /// self-contained bin, adds it to the pipeline, requests a compositor pad
    /// (default: full-canvas, stacked above whatever is already attached), and
    /// syncs its state with the (already-running) pipeline. Errors if `id` is
    /// already attached, or if the builder itself fails (e.g. the platform has
    /// no capture element — the module-unavailable / permission-denied case).
    pub fn add_source(&self, id: impl Into<String>, builder: SourceBuilder) -> Result<()> {
        add_source_impl(
            &self.pipeline,
            &self.compositor,
            &self.sources,
            id.into(),
            builder,
        )
    }

    /// Detach a source, live, without touching the rest of the pipeline: blocks
    /// its compositor pad, then — once flow has actually stopped — unlinks,
    /// releases the request pad, tears the bin down to `Null`, and removes it.
    /// This is the same teardown a source's own error triggers automatically
    /// (see the bus watch in [`run_media_thread`]); calling it directly is the
    /// UI-initiated "stop sharing" path.
    pub fn remove_source(&self, id: &str) -> Result<()> {
        let handle = take_source(&self.sources, id)?;
        detach_source(&self.pipeline, &self.compositor, handle);
        Ok(())
    }

    /// Attach an output branch to the programme tap, live (CHR-108 record,
    /// CHR-109 WHIP). The builder returns a bin with a ghost **sink** pad; we
    /// request a tee pad, link it, and sync state. Errors if `id` is already
    /// attached or the builder fails.
    pub fn attach_output(&self, id: impl Into<String>, builder: OutputBuilder) -> Result<()> {
        attach_output_impl(&self.pipeline, &self.tee, &self.outputs, id.into(), builder)
    }

    /// Detach an output, live, **finalising it first**: the branch is sent EOS so
    /// its muxer writes a valid trailer (a recording's `moov`/duration), we wait
    /// for that to reach the sink, then unlink + release the tee pad + tear the
    /// bin down. Without this an `.mp4` would be unplayable. Blocks up to a few
    /// seconds for the finalise. No-op-safe if `id` isn't attached.
    pub fn detach_output(&self, id: &str) -> Result<()> {
        let handle = self
            .outputs
            .lock()
            .map_err(|_| anyhow!("outputs lock poisoned"))?
            .remove(id)
            .ok_or_else(|| anyhow!("no such output: {id}"))?;
        finalise_output(&self.pipeline, &self.tee, handle);
        Ok(())
    }

    /// Whether output `id` is currently attached.
    pub fn is_output_active(&self, id: &str) -> bool {
        self.outputs
            .lock()
            .map(|o| o.contains_key(id))
            .unwrap_or(false)
    }

    /// A snapshot of output `id`'s encoded-stream stats (CHR-112), or `None` if
    /// it isn't attached or exposes no `stats-tap`. The caller derives live
    /// fps/bitrate from the delta between successive snapshots.
    pub fn output_stats(&self, id: &str) -> Option<OutputStats> {
        let outputs = self.outputs.lock().ok()?;
        let inner = outputs.get(id)?.stats.as_ref()?;
        Some(OutputStats {
            frames: inner.frames.load(Ordering::Relaxed),
            bytes: inner.bytes.load(Ordering::Relaxed),
            elapsed_ms: inner.start.elapsed().as_millis() as u64,
        })
    }

    /// Whether `id` is currently attached.
    pub fn is_source_active(&self, id: &str) -> bool {
        self.sources
            .lock()
            .map(|s| s.contains_key(id))
            .unwrap_or(false)
    }

    /// Take (and clear) the reason `id` was last auto-detached due to one of
    /// its own elements erroring — `None` if it hasn't happened (or was already
    /// read). Poll this after noticing `is_source_active(id)` went from true to
    /// false without your own `remove_source` call.
    pub fn take_ended_reason(&self, id: &str) -> Option<String> {
        self.ended.lock().ok()?.remove(id)
    }

    /// Move/resize a source's layer within the `OUTPUT_W` × `OUTPUT_H`
    /// programme canvas, live, while the pipeline is `Playing`. This is the
    /// runtime pad manipulation the CHR-103 acceptance criteria call for —
    /// distinct from (harder) dynamic pad add/remove, which CHR-104 covers via
    /// [`MediaEngine::add_source`]/[`MediaEngine::remove_source`].
    pub fn set_layer_transform(
        &self,
        id: &str,
        xpos: i32,
        ypos: i32,
        width: i32,
        height: i32,
    ) -> Result<()> {
        if width <= 0 || height <= 0 {
            bail!("layer width/height must be positive, got {width}x{height}");
        }
        let sources = self
            .sources
            .lock()
            .map_err(|_| anyhow!("sources lock poisoned"))?;
        let handle = sources
            .get(id)
            .ok_or_else(|| anyhow!("no such source: {id}"))?;
        handle.pad.set_property("xpos", xpos);
        handle.pad.set_property("ypos", ypos);
        handle.pad.set_property("width", width);
        handle.pad.set_property("height", height);
        Ok(())
    }

    /// Play an **entrance animation** on a source's compositor pad (CHR-110):
    /// interpolate its `alpha`/geometry from an effect-defined start state to its
    /// configured pose (the pad's current xpos/ypos/width/height) over
    /// `duration_ms`, eased by `easing` (a [`studio_core::easing`] preset name).
    /// The timing logic mirrors the web entrance registry; the *render* is the
    /// compositor-pad automation the README's CHR-110 calls for.
    ///
    /// Supported effects (the ones a compositor pad can express): `fade`,
    /// `fade_slide`, `slide_left`/`right`/`up`/`down`, `scale`/`zoom_out`/`pop`.
    /// `none`/unknown snap straight to the pose (no animation). 3D/shader effects
    /// (flip, door, swirl…) need a GL mixer and stay a later concern.
    ///
    /// Non-blocking: runs on a short-lived thread (GObject `set_property` is
    /// thread-safe), and a re-trigger cancels the previous run via the epoch.
    pub fn animate_layer(
        &self,
        id: &str,
        effect: &str,
        duration_ms: u64,
        easing: &str,
    ) -> Result<()> {
        // Snapshot the pad + its target pose under the sources lock.
        let (pad, target) = {
            let sources = self
                .sources
                .lock()
                .map_err(|_| anyhow!("sources lock poisoned"))?;
            let handle = sources
                .get(id)
                .ok_or_else(|| anyhow!("no such source: {id}"))?;
            let pad = handle.pad.clone();
            let target = TargetPose {
                x: pad.property::<i32>("xpos") as f64,
                y: pad.property::<i32>("ypos") as f64,
                w: pad.property::<i32>("width") as f64,
                h: pad.property::<i32>("height") as f64,
            };
            (pad, target)
        };

        // `none`/unknown or a zero duration → just ensure the final pose + full
        // opacity, no thread.
        if duration_ms == 0 || !effect_is_animatable(effect) {
            apply_pose(&pad, &target, 1.0);
            return Ok(());
        }

        // Bump this source's epoch; the thread stops when it's superseded.
        let epoch_arc = {
            let mut m = self
                .anim_epochs
                .lock()
                .map_err(|_| anyhow!("anim epochs lock poisoned"))?;
            m.entry(id.to_string())
                .or_insert_with(|| Arc::new(AtomicU64::new(0)))
                .clone()
        };
        let my_epoch = epoch_arc.fetch_add(1, Ordering::SeqCst) + 1;
        let effect = effect.to_string();
        let easing = easing.to_string();
        std::thread::spawn(move || {
            run_entrance(
                &pad,
                target,
                &effect,
                duration_ms,
                &easing,
                &epoch_arc,
                my_epoch,
            );
        });
        Ok(())
    }

    /// **Programme fade-to-black transition** (CHR-113). Fades the *whole*
    /// programme to black (`black = true`) or back (`false`) over `ms` — a full
    /// dip when sequenced both ways, or an instant cut-to-black at `ms = 0`. A
    /// full-canvas black layer is lazily attached on top of the compositor and
    /// its pad alpha animated; it stays (transparent) once created, so repeated
    /// black/un-black is just an alpha fade. This is the render half of the
    /// domain's `BlackScreen`/`ProgramCut` events, driven from the shell.
    pub fn set_program_black(&self, black: bool, ms: u64) -> Result<()> {
        if black && !self.is_source_active(BLACK_SOURCE_ID) {
            self.add_source(BLACK_SOURCE_ID, Box::new(black_source))?;
            // Full canvas, on top (added last ⇒ highest zorder), transparent.
            if let Ok(sources) = self.sources.lock() {
                if let Some(handle) = sources.get(BLACK_SOURCE_ID) {
                    handle.pad.set_property("xpos", 0i32);
                    handle.pad.set_property("ypos", 0i32);
                    handle.pad.set_property("width", OUTPUT_W);
                    handle.pad.set_property("height", OUTPUT_H);
                    handle.pad.set_property("alpha", 0.0f64);
                }
            }
        }
        if self.is_source_active(BLACK_SOURCE_ID) {
            self.fade_alpha(BLACK_SOURCE_ID, if black { 1.0 } else { 0.0 }, ms)?;
        }
        Ok(())
    }

    /// Fade a source pad's `alpha` from its current value to `to` over `ms`
    /// (linear), on a short thread; a re-trigger cancels the previous fade via
    /// the same per-source epoch entrances use. `ms = 0` snaps immediately.
    fn fade_alpha(&self, id: &str, to: f64, ms: u64) -> Result<()> {
        let pad = {
            let sources = self
                .sources
                .lock()
                .map_err(|_| anyhow!("sources lock poisoned"))?;
            sources
                .get(id)
                .ok_or_else(|| anyhow!("no such source: {id}"))?
                .pad
                .clone()
        };
        let to = to.clamp(0.0, 1.0);
        if ms == 0 {
            pad.set_property("alpha", to);
            return Ok(());
        }
        let from = pad.property::<f64>("alpha");
        let epoch_arc = {
            let mut m = self
                .anim_epochs
                .lock()
                .map_err(|_| anyhow!("anim epochs lock poisoned"))?;
            m.entry(id.to_string())
                .or_insert_with(|| Arc::new(AtomicU64::new(0)))
                .clone()
        };
        let my_epoch = epoch_arc.fetch_add(1, Ordering::SeqCst) + 1;
        std::thread::spawn(move || {
            let start = std::time::Instant::now();
            loop {
                if epoch_arc.load(Ordering::SeqCst) != my_epoch {
                    return;
                }
                let p = (start.elapsed().as_millis() as f64 / ms as f64).min(1.0);
                pad.set_property("alpha", from + (to - from) * p);
                if p >= 1.0 {
                    break;
                }
                std::thread::sleep(std::time::Duration::from_millis(16));
            }
        });
        Ok(())
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

/// Shared by the engine's own startup add (before `Playing`) and hot adds from
/// any other thread afterwards — same recipe either way, `sync_state_with_parent`
/// is a no-op if the pipeline isn't running yet.
fn add_source_impl(
    pipeline: &gst::Pipeline,
    compositor: &gst::Element,
    sources: &SourceMap,
    id: String,
    builder: SourceBuilder,
) -> Result<()> {
    let zorder = {
        let guard = sources
            .lock()
            .map_err(|_| anyhow!("sources lock poisoned"))?;
        if guard.contains_key(&id) {
            bail!("source '{id}' already active");
        }
        guard.len() as i32
    };

    let bin = builder().with_context(|| format!("build source '{id}'"))?;
    pipeline
        .add(&bin)
        .with_context(|| format!("add source '{id}' to pipeline"))?;

    let comp_pad = compositor
        .request_pad_simple("sink_%u")
        .ok_or_else(|| anyhow!("compositor request pad failed"))?;
    comp_pad.set_property("xpos", 0i32);
    comp_pad.set_property("ypos", 0i32);
    comp_pad.set_property("width", OUTPUT_W);
    comp_pad.set_property("height", OUTPUT_H);
    comp_pad.set_property("zorder", zorder as u32);

    let bin_src = bin
        .static_pad("src")
        .ok_or_else(|| anyhow!("source '{id}' bin has no ghost src pad"))?;
    bin_src
        .link(&comp_pad)
        .with_context(|| format!("link source '{id}' → compositor"))?;

    // Relay a clean end-of-stream from this source to the bus watch. The OS
    // "stop sharing" button ends the capture as EOS, not an error — and a
    // per-source EOS is otherwise invisible (the compositor swallows it until
    // *all* its pads are EOS, so it never reaches the bus). We forward it as a
    // custom application message the watch turns into the same auto-detach the
    // error path uses.
    if let Some(bus) = pipeline.bus() {
        let eos_id = id.clone();
        bin_src.add_probe(gst::PadProbeType::EVENT_DOWNSTREAM, move |_pad, info| {
            if let Some(gst::EventView::Eos(_)) = info.event().map(|e| e.view()) {
                let s = gst::Structure::builder(SOURCE_ENDED_MSG)
                    .field("source-id", eos_id.as_str())
                    .build();
                let _ = bus.post(gst::message::Application::builder(s).build());
            }
            gst::PadProbeReturn::Ok
        });
    }

    bin.sync_state_with_parent()
        .with_context(|| format!("sync source '{id}' state with pipeline"))?;

    sources
        .lock()
        .map_err(|_| anyhow!("sources lock poisoned"))?
        .insert(id, SourceHandle { bin, pad: comp_pad });
    Ok(())
}

/// Removes `id` from the map and hands back its handle for [`detach_source`] —
/// split out so the bus watch (auto-detach on error) and
/// [`MediaEngine::remove_source`] (explicit "stop sharing") share the exact
/// same teardown.
fn take_source(sources: &SourceMap, id: &str) -> Result<SourceHandle> {
    sources
        .lock()
        .map_err(|_| anyhow!("sources lock poisoned"))?
        .remove(id)
        .ok_or_else(|| anyhow!("no such source: {id}"))
}

/// Auto-detach a source that ended (EOS) or errored, recording why. Shared by
/// the bus watch's error and `SOURCE_ENDED_MSG` branches.
///
/// The map removal and the reason recording happen **together under the sources
/// lock**, before the (possibly synchronous) `detach_source`. That ordering
/// matters: after an EOS the source's pad is already idle, so `detach_source`'s
/// `IDLE` probe runs inline — a chunk of pad surgery. If we recorded the reason
/// only after that, an observer polling `is_source_active` (→ false the instant
/// we remove it) could read `take_ended_reason` → `None` in the gap. Doing both
/// atomically means "source gone" always implies "reason available". Removing
/// first also makes a double-signal (EOS *and* error) tear down only once.
fn auto_detach(
    pipeline: &gst::Pipeline,
    compositor: &gst::Element,
    sources: &SourceMap,
    ended: &EndedMap,
    id: &str,
    reason: String,
) {
    let handle = {
        let mut guard = match sources.lock() {
            Ok(g) => g,
            Err(_) => return,
        };
        match guard.remove(id) {
            Some(h) => {
                // Nested sources→ended lock; this ordering is used nowhere in
                // reverse, so it can't deadlock.
                if let Ok(mut e) = ended.lock() {
                    e.insert(id.to_string(), reason);
                }
                h
            }
            None => return,
        }
    };
    detach_source(pipeline, compositor, handle);
}

/// Tears a source out of the live graph without disturbing the rest: an `IDLE`
/// probe on the source's *own* src pad fires the moment that pad carries no
/// data — immediately if the source has already stopped (an errored device, or
/// post-EOS), otherwise between two buffers — then unlinks it, releases the
/// compositor request pad, and drops the bin to `Null`. Nothing downstream (the
/// rest of the compositor, the programme feed) ever sees a torn-down pad
/// mid-buffer.
///
/// Why `IDLE` and not a data/`BLOCK` probe: a block-on-buffer probe only fires
/// when a buffer arrives, so it would hang forever exactly in the cases we care
/// about most — a source that has stopped pushing (device unplugged, or already
/// EOS'd). `IDLE` is the idiom that also covers the stopped-source case.
///
/// Why `call_async` for the state change: the probe may fire on the source's
/// own streaming thread, and setting its state to `Null` joins that thread —
/// the classic GStreamer self-join deadlock. `call_async` hands the state
/// change to a GStreamer-owned worker thread instead.
fn detach_source(pipeline: &gst::Pipeline, compositor: &gst::Element, handle: SourceHandle) {
    let SourceHandle { bin, pad: comp_pad } = handle;
    let src_pad = match bin.static_pad("src") {
        Some(p) => p,
        None => return,
    };
    let pipeline = pipeline.clone();
    let compositor = compositor.clone();
    src_pad.add_probe(gst::PadProbeType::IDLE, move |src_pad, _info| {
        let _ = src_pad.unlink(&comp_pad);
        compositor.release_request_pad(&comp_pad);
        let pipeline = pipeline.clone();
        bin.call_async(move |bin| {
            let _ = bin.set_state(gst::State::Null);
            // `set_state` can return `Async` — the transition isn't necessarily
            // done when it returns. Removing (and dropping) the bin before it
            // has *actually* reached `Null` disposes it mid-transition (a
            // GStreamer-CRITICAL). Safe to block here: this runs on a worker
            // thread, not the streaming thread.
            let _ = bin.state(gst::ClockTime::from_seconds(2));
            let _ = pipeline.remove(bin);
        });
        gst::PadProbeReturn::Remove
    });
}

/// Attach an output branch to the tee: build the bin (ghost sink pad), add it,
/// request a tee src pad, link, sync. Shared by [`MediaEngine::attach_output`].
fn attach_output_impl(
    pipeline: &gst::Pipeline,
    tee: &gst::Element,
    outputs: &OutputMap,
    id: String,
    builder: OutputBuilder,
) -> Result<()> {
    {
        let guard = outputs
            .lock()
            .map_err(|_| anyhow!("outputs lock poisoned"))?;
        if guard.contains_key(&id) {
            bail!("output '{id}' already active");
        }
    }
    let bin = builder().with_context(|| format!("build output '{id}'"))?;
    pipeline
        .add(&bin)
        .with_context(|| format!("add output '{id}' to pipeline"))?;
    let tee_pad = tee
        .request_pad_simple("src_%u")
        .ok_or_else(|| anyhow!("tee request pad (output) failed"))?;
    let bin_sink = bin
        .static_pad("sink")
        .ok_or_else(|| anyhow!("output '{id}' bin has no ghost sink pad"))?;
    tee_pad
        .link(&bin_sink)
        .with_context(|| format!("link tee → output '{id}'"))?;

    // Encoded-stream stats (CHR-112): if the output named its post-encoder
    // parser `stats-tap`, count buffers + bytes off its src pad. Best-effort —
    // an output without the tap simply has no stats.
    let stats = bin
        .by_name("stats-tap")
        .and_then(|el| el.static_pad("src"))
        .map(|pad| {
            let inner = Arc::new(StatsInner {
                frames: AtomicU64::new(0),
                bytes: AtomicU64::new(0),
                start: std::time::Instant::now(),
            });
            let probe = inner.clone();
            pad.add_probe(gst::PadProbeType::BUFFER, move |_pad, info| {
                if let Some(buf) = info.buffer() {
                    probe.frames.fetch_add(1, Ordering::Relaxed);
                    probe.bytes.fetch_add(buf.size() as u64, Ordering::Relaxed);
                }
                gst::PadProbeReturn::Ok
            });
            inner
        });

    bin.sync_state_with_parent()
        .with_context(|| format!("sync output '{id}' state"))?;
    outputs
        .lock()
        .map_err(|_| anyhow!("outputs lock poisoned"))?
        .insert(
            id,
            OutputHandle {
                bin,
                tee_pad,
                stats,
            },
        );
    Ok(())
}

/// Finalise + detach an output branch. **Blocks** the tee pad, injects EOS into
/// the branch so its muxer writes a valid trailer, waits (bounded) for that EOS
/// to reach the terminal sink, then releases the tee pad and tears the bin down.
/// Runs on the caller's thread (the Tauri command thread), never the streaming
/// thread — safe to block.
fn finalise_output(pipeline: &gst::Pipeline, tee: &gst::Element, handle: OutputHandle) {
    let OutputHandle { bin, tee_pad, .. } = handle;
    let bin_sink = match bin.static_pad("sink") {
        Some(p) => p,
        None => {
            let _ = pipeline.remove(&bin);
            return;
        }
    };

    // Watch the branch's terminal sink (the filesink) for EOS — that's when the
    // muxer has flushed its trailer and the file is complete.
    let terminal_sink_pad = bin
        .iterate_sinks()
        .into_iter()
        .flatten()
        .next()
        .and_then(|e| e.static_pad("sink"));
    let done = Arc::new((Mutex::new(false), std::sync::Condvar::new()));
    if let Some(sink_pad) = &terminal_sink_pad {
        let done2 = done.clone();
        sink_pad.add_probe(gst::PadProbeType::EVENT_DOWNSTREAM, move |_pad, info| {
            if let Some(gst::EventView::Eos(_)) = info.event().map(|e| e.view()) {
                let (m, cv) = &*done2;
                if let Ok(mut g) = m.lock() {
                    *g = true;
                    cv.notify_all();
                }
                return gst::PadProbeReturn::Remove;
            }
            gst::PadProbeReturn::Ok
        });
    }

    // Block the tee pad (stop new buffers into the branch), then inject EOS on
    // the branch's sink once. The block keeps the tee from pushing post-EOS
    // buffers (which the EOS'd muxer would error on → false-fatal on the bus).
    let sent = Arc::new(std::sync::atomic::AtomicBool::new(false));
    let bin_sink_for_probe = bin_sink.clone();
    tee_pad.add_probe(gst::PadProbeType::BLOCK_DOWNSTREAM, move |_pad, _info| {
        if !sent.swap(true, Ordering::SeqCst) {
            let _ = bin_sink_for_probe.send_event(gst::event::Eos::new());
        }
        gst::PadProbeReturn::Ok // stay blocked until the pad is released below
    });

    // Wait (bounded) for the EOS to reach the terminal sink.
    if terminal_sink_pad.is_some() {
        let (m, cv) = &*done;
        if let Ok(mut g) = m.lock() {
            let deadline = std::time::Duration::from_secs(5);
            let start = std::time::Instant::now();
            while !*g && start.elapsed() < deadline {
                let remaining = deadline.saturating_sub(start.elapsed());
                match cv.wait_timeout(g, remaining) {
                    Ok((ng, _)) => g = ng,
                    Err(_) => break,
                }
            }
        }
    } else {
        std::thread::sleep(std::time::Duration::from_millis(500));
    }

    // Release the tee pad (drops the block + unlinks the branch), then tear down.
    tee.release_request_pad(&tee_pad);
    let _ = bin.set_state(gst::State::Null);
    let _ = bin.state(gst::ClockTime::from_seconds(2));
    let _ = pipeline.remove(&bin);
}

/// Remove an output from the map, for the error-teardown path in the bus watch.
fn take_output(outputs: &OutputMap, id: &str) -> Result<OutputHandle> {
    outputs
        .lock()
        .map_err(|_| anyhow!("outputs lock poisoned"))?
        .remove(id)
        .ok_or_else(|| anyhow!("no such output: {id}"))
}

/// Tear an output branch down **immediately, without EOS** — for when it has
/// *errored* (the broadcast connection died): there's nothing to finalise, we
/// just unlink, release the tee pad, and drop the bin. (Clean stops go through
/// [`finalise_output`], which EOS-flushes the muxer first.)
fn teardown_output_now(pipeline: &gst::Pipeline, tee: &gst::Element, handle: OutputHandle) {
    let OutputHandle { bin, tee_pad, .. } = handle;
    let pipeline = pipeline.clone();
    let tee = tee.clone();
    tee_pad.add_probe(gst::PadProbeType::IDLE, move |pad, _info| {
        if let Some(peer) = pad.peer() {
            let _ = pad.unlink(&peer);
        }
        tee.release_request_pad(pad);
        let pipeline = pipeline.clone();
        bin.call_async(move |bin| {
            let _ = bin.set_state(gst::State::Null);
            let _ = bin.state(gst::ClockTime::from_seconds(2));
            let _ = pipeline.remove(bin);
        });
        gst::PadProbeReturn::Remove
    });
}

/// A compositor pad's configured pose — the end state of an entrance animation.
#[derive(Clone, Copy)]
struct TargetPose {
    x: f64,
    y: f64,
    w: f64,
    h: f64,
}

/// Whether `effect` is one a compositor pad can render (else: snap, no anim).
fn effect_is_animatable(effect: &str) -> bool {
    matches!(
        effect,
        "fade"
            | "fade_slide"
            | "slide_left"
            | "slide_right"
            | "slide_up"
            | "slide_down"
            | "scale"
            | "zoom_out"
            | "pop"
    )
}

/// Write a pose + alpha onto a compositor pad (geometry rounded, ≥ 1px).
fn set_pad(pad: &gst::Pad, x: f64, y: f64, w: f64, h: f64, alpha: f64) {
    pad.set_property("xpos", x.round() as i32);
    pad.set_property("ypos", y.round() as i32);
    pad.set_property("width", (w.round() as i32).max(1));
    pad.set_property("height", (h.round() as i32).max(1));
    pad.set_property("alpha", alpha.clamp(0.0, 1.0));
}

fn apply_pose(pad: &gst::Pad, t: &TargetPose, alpha: f64) {
    set_pad(pad, t.x, t.y, t.w, t.h, alpha);
}

/// The pad state for an effect at eased progress `p` — the CHR-110 mapping of an
/// entrance to compositor-pad properties (alpha + geometry). Returns
/// (xpos, ypos, width, height, alpha).
fn effect_transform(effect: &str, t: &TargetPose, p: f64) -> (f64, f64, f64, f64, f64) {
    let a = p; // alpha (clamped when written)
    match effect {
        "fade" => (t.x, t.y, t.w, t.h, a),
        // fade + settle downward into place.
        "fade_slide" => (t.x, t.y + (1.0 - p) * t.h * 0.3, t.w, t.h, a),
        // Slides enter fully offset by their own extent, opaque throughout.
        "slide_left" => (t.x + (1.0 - p) * t.w, t.y, t.w, t.h, 1.0),
        "slide_right" => (t.x - (1.0 - p) * t.w, t.y, t.w, t.h, 1.0),
        "slide_up" => (t.x, t.y + (1.0 - p) * t.h, t.w, t.h, 1.0),
        "slide_down" => (t.x, t.y - (1.0 - p) * t.h, t.w, t.h, 1.0),
        // Grow from 60% about the centre; `p` past 1 (back-out) gives a soft pop.
        "scale" | "zoom_out" | "pop" => {
            let s = 0.6 + 0.4 * p;
            let (cx, cy) = (t.x + t.w / 2.0, t.y + t.h / 2.0);
            let (w, h) = (t.w * s, t.h * s);
            (cx - w / 2.0, cy - h / 2.0, w, h, a)
        }
        _ => (t.x, t.y, t.w, t.h, 1.0),
    }
}

/// Interpolate a pad from its effect's start state to `target` over `duration_ms`,
/// ticking ~60 fps. Stops immediately (without snapping) if a newer animation
/// superseded this one (epoch mismatch); otherwise snaps to the final pose.
fn run_entrance(
    pad: &gst::Pad,
    target: TargetPose,
    effect: &str,
    duration_ms: u64,
    easing: &str,
    epoch_arc: &Arc<AtomicU64>,
    my_epoch: u64,
) {
    let start = std::time::Instant::now();
    loop {
        if epoch_arc.load(Ordering::SeqCst) != my_epoch {
            return; // a re-trigger took over — leave the pad to the new run
        }
        let raw = (start.elapsed().as_millis() as f64 / duration_ms as f64).min(1.0);
        let p = studio_core::ease(easing, raw);
        let (x, y, w, h, a) = effect_transform(effect, &target, p);
        set_pad(pad, x, y, w, h, a);
        if raw >= 1.0 {
            break;
        }
        std::thread::sleep(std::time::Duration::from_millis(16));
    }
    if epoch_arc.load(Ordering::SeqCst) == my_epoch {
        apply_pose(pad, &target, 1.0);
    }
}

/// Whether a bus message's source element lives inside (or *is*) `bin` — how
/// the bus watch attributes an `Error` message to one of our tracked sources
/// rather than to the shared compositor/encode chain.
fn belongs_to(src_obj: &gst::Object, bin: &gst::Bin) -> bool {
    let bin_obj: &gst::Object = bin.upcast_ref();
    src_obj == bin_obj || src_obj.has_as_ancestor(bin)
}

/// Runs entirely on the dedicated media thread: build the pipeline, attach it,
/// go `Playing`, signal ready, then run the loop until quit.
fn run_media_thread(ready: &mpsc::Sender<Result<Ready, String>>) -> Result<()> {
    ensure_init()?;

    // Own a MainContext for THIS thread so the bus watch and the MainLoop share it
    // (the classic gstreamer-rs threading contract). `with_thread_default` keeps it
    // as the thread-default for the whole scope — including the blocking run().
    let ctx = glib::MainContext::new();
    ctx.with_thread_default(|| -> Result<()> {
        // `MainLoop::new(None, ..)` would bind to the *global* default context,
        // not this thread's — a classic glib footgun. Passing `ctx` explicitly
        // is what makes `main_loop.run()` actually pump the bus watch's source
        // (attached to `ctx` below), instead of silently running an empty loop
        // forever while bus messages pile up unread.
        let main_loop = glib::MainLoop::new(Some(&ctx), false);

        let frames = Arc::new(AtomicU64::new(0));
        let latest: FrameSlot = Arc::new(Mutex::new(None));
        let sources: SourceMap = Arc::new(Mutex::new(HashMap::new()));
        let outputs: OutputMap = Arc::new(Mutex::new(HashMap::new()));
        let ended: EndedMap = Arc::new(Mutex::new(HashMap::new()));
        let (pipeline, compositor, tee) = build_preview_pipeline(&frames, &latest)?;

        // Second (preview/edit) compositor + feed in the SAME pipeline (CHR-115).
        let preview_frames = Arc::new(AtomicU64::new(0));
        let preview_latest: FrameSlot = Arc::new(Mutex::new(None));
        let preview_sources: SourceMap = Arc::new(Mutex::new(HashMap::new()));
        let preview_compositor = build_edit_branch(&pipeline, &preview_frames, &preview_latest)?;

        add_source_impl(
            &pipeline,
            &compositor,
            &sources,
            BACKGROUND_SOURCE_ID.to_string(),
            Box::new(default_source),
        )
        .context("attach background source")?;
        // The preview compositor gets its own always-on background too.
        add_source_impl(
            &pipeline,
            &preview_compositor,
            &preview_sources,
            BACKGROUND_SOURCE_ID.to_string(),
            Box::new(default_source),
        )
        .context("attach preview background source")?;

        let bus = pipeline
            .bus()
            .ok_or_else(|| anyhow!("pipeline has no bus"))?;
        let loop_for_watch = main_loop.clone();
        let pipeline_for_watch = pipeline.clone();
        let compositor_for_watch = compositor.clone();
        let tee_for_watch = tee.clone();
        let sources_for_watch = sources.clone();
        let outputs_for_watch = outputs.clone();
        let ended_for_watch = ended.clone();
        let preview_compositor_for_watch = preview_compositor.clone();
        let preview_sources_for_watch = preview_sources.clone();
        let _watch = bus
            .add_watch(move |_, msg| {
                use gst::MessageView;
                match msg.view() {
                    MessageView::Eos(_) => {
                        loop_for_watch.quit();
                        glib::ControlFlow::Break
                    }
                    MessageView::Error(err) => {
                        // Does this error belong to one of our tracked, removable
                        // sources (device gone, etc.)? If so, detach just that
                        // source and keep going — the CHR-104 "partage arrêté"
                        // parity — instead of taking the whole programme down.
                        let owner = msg.src().and_then(|src_obj| {
                            sources_for_watch.lock().ok().and_then(|guard| {
                                guard
                                    .iter()
                                    .find(|(_, h)| belongs_to(src_obj, &h.bin))
                                    .map(|(id, _)| id.clone())
                            })
                        });
                        if let Some(id) = owner {
                            auto_detach(
                                &pipeline_for_watch,
                                &compositor_for_watch,
                                &sources_for_watch,
                                &ended_for_watch,
                                &id,
                                err.error().to_string(),
                            );
                            return glib::ControlFlow::Continue;
                        }
                        // Or a tracked OUTPUT (a broadcast connection dropping,
                        // a disk filling)? Tear that output down and keep the
                        // programme + preview alive — a Facebook drop must never
                        // kill the studio. The reason is readable via
                        // `take_ended_reason(output_id)`.
                        let out_owner = msg.src().and_then(|src_obj| {
                            outputs_for_watch.lock().ok().and_then(|guard| {
                                guard
                                    .iter()
                                    .find(|(_, h)| belongs_to(src_obj, &h.bin))
                                    .map(|(id, _)| id.clone())
                            })
                        });
                        if let Some(id) = out_owner {
                            if let Ok(handle) = take_output(&outputs_for_watch, &id) {
                                teardown_output_now(&pipeline_for_watch, &tee_for_watch, handle);
                            }
                            if let Ok(mut e) = ended_for_watch.lock() {
                                e.insert(id, err.error().to_string());
                            }
                            return glib::ControlFlow::Continue;
                        }
                        // Or a PREVIEW-compositor source (CHR-115)? Same resilience:
                        // detach it from the preview compositor, keep everything else.
                        let prev_owner = msg.src().and_then(|src_obj| {
                            preview_sources_for_watch.lock().ok().and_then(|guard| {
                                guard
                                    .iter()
                                    .find(|(_, h)| belongs_to(src_obj, &h.bin))
                                    .map(|(id, _)| id.clone())
                            })
                        });
                        if let Some(id) = prev_owner {
                            auto_detach(
                                &pipeline_for_watch,
                                &preview_compositor_for_watch,
                                &preview_sources_for_watch,
                                &ended_for_watch,
                                &id,
                                err.error().to_string(),
                            );
                            return glib::ControlFlow::Continue;
                        }
                        // Unrecognised (compositor/convert/jpeg chain, pipeline-level)
                        // → fatal, as before.
                        loop_for_watch.quit();
                        glib::ControlFlow::Break
                    }
                    // A source ended cleanly (EOS) — relayed here from its EOS
                    // pad probe (see `add_source_impl`). The "stop sharing" half
                    // of the captureActive/ended parity.
                    MessageView::Application(_) => {
                        if let Some(id) = msg.structure().and_then(|s| {
                            (s.name() == SOURCE_ENDED_MSG)
                                .then(|| s.get::<String>("source-id").ok())
                                .flatten()
                        }) {
                            auto_detach(
                                &pipeline_for_watch,
                                &compositor_for_watch,
                                &sources_for_watch,
                                &ended_for_watch,
                                &id,
                                "flux terminé (partage arrêté)".to_string(),
                            );
                        }
                        glib::ControlFlow::Continue
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
                pipeline: pipeline.clone(),
                compositor: compositor.clone(),
                tee: tee.clone(),
                sources: sources.clone(),
                outputs: outputs.clone(),
                ended: ended.clone(),
                preview_compositor: preview_compositor.clone(),
                preview_sources: preview_sources.clone(),
                preview_frames: preview_frames.clone(),
                preview_latest: preview_latest.clone(),
            }))
            .map_err(|_| anyhow!("engine dropped before ready"))?;

        main_loop.run();

        pipeline.set_state(gst::State::Null).context("set Null")?;
        Ok(())
    })
    .map_err(|e| anyhow!("with_thread_default: {e}"))?
}

/// Wraps a linear chain of elements in a self-contained `gst::Bin` with a ghost
/// `src` pad on the last element — the shape every pluggable [`SourceBuilder`]
/// takes, so the engine can add/remove it as a single object.
fn wrap_in_bin(chain: &[&gst::Element]) -> Result<gst::Bin> {
    let bin = gst::Bin::new();
    bin.add_many(chain.iter().copied())
        .context("add elements to source bin")?;
    gst::Element::link_many(chain.iter().copied()).context("link source chain")?;
    let tail = chain.last().ok_or_else(|| anyhow!("empty source chain"))?;
    let tail_pad = tail
        .static_pad("src")
        .ok_or_else(|| anyhow!("tail element has no src pad"))?;
    let ghost = gst::GhostPad::with_target(&tail_pad).context("create ghost pad")?;
    ghost.set_active(true).context("activate ghost pad")?;
    bin.add_pad(&ghost).context("add ghost pad to bin")?;
    Ok(bin)
}

/// A full-canvas solid **black** source — the programme black-out / fade layer
/// (CHR-113 transitions). Sits on top of the compositor and its pad alpha is
/// animated 0↔1 to fade the whole programme to/from black.
fn black_source() -> Result<gst::Bin> {
    let src = gst::ElementFactory::make("videotestsrc")
        .property("is-live", true)
        .property_from_str("pattern", "black")
        .build()
        .context("make black videotestsrc")?;
    let caps_in = gst::ElementFactory::make("capsfilter")
        .property(
            "caps",
            gst::Caps::builder("video/x-raw")
                .field("width", OUTPUT_W)
                .field("height", OUTPUT_H)
                .field("framerate", gst::Fraction::new(OUTPUT_FPS, 1))
                .build(),
        )
        .build()?;
    wrap_in_bin(&[&src, &caps_in])
}

/// The built-in test-pattern source (the engine's permanent background layer).
fn default_source() -> Result<gst::Bin> {
    let src = gst::ElementFactory::make("videotestsrc")
        .property("is-live", true)
        .property_from_str("pattern", "smpte")
        .build()
        .context("make videotestsrc")?;
    let caps_in = gst::ElementFactory::make("capsfilter")
        .property(
            "caps",
            gst::Caps::builder("video/x-raw")
                .field("width", OUTPUT_W)
                .field("height", OUTPUT_H)
                .field("framerate", gst::Fraction::new(OUTPUT_FPS, 1))
                .build(),
        )
        .build()?;
    wrap_in_bin(&[&src, &caps_in])
}

/// compositor(1080p60 canvas) → caps → convert → scale(preview) → jpegenc →
/// appsink. The compositor always runs at the full `OUTPUT_W` × `OUTPUT_H`
/// programme resolution — the JPEG shrink is a separate, later stage, so
/// moving/resizing a layer pad is expressed in real programme coordinates
/// regardless of how small the webview preview is. No source is attached here;
/// callers add one via [`add_source_impl`]. The appsink callback stores each
/// JPEG frame in `latest` and bumps `frames`.
fn build_preview_pipeline(
    frames: &Arc<AtomicU64>,
    latest: &FrameSlot,
) -> Result<(gst::Pipeline, gst::Element, gst::Element)> {
    let pipeline = gst::Pipeline::with_name("studio-preview");

    let compositor = gst::ElementFactory::make("compositor")
        .property_from_str("background", "black")
        .build()
        .context("make compositor")?;
    // Forces the aggregator's own output to the programme canvas — otherwise it
    // would just inherit whatever size the sink pads negotiate.
    let caps_canvas = gst::ElementFactory::make("capsfilter")
        .property(
            "caps",
            gst::Caps::builder("video/x-raw")
                .field("width", OUTPUT_W)
                .field("height", OUTPUT_H)
                .field("framerate", gst::Fraction::new(OUTPUT_FPS, 1))
                .build(),
        )
        .build()?;
    // The programme TAP: the full-res compositor output fans out here — one
    // branch is the JPEG preview (below), others are outputs (record, later
    // WHIP) attached at runtime via `attach_output`. `allow-not-linked` lets the
    // tee keep running when only the preview is connected.
    let tee = gst::ElementFactory::make("tee")
        .property("allow-not-linked", true)
        .build()
        .context("make tee")?;
    let preview_queue = gst::ElementFactory::make("queue").build()?;
    let convert = gst::ElementFactory::make("videoconvert").build()?;
    let scale = gst::ElementFactory::make("videoscale").build()?;
    let caps_preview = gst::ElementFactory::make("capsfilter")
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

    pipeline.add_many([
        &compositor,
        &caps_canvas,
        &tee,
        &preview_queue,
        &convert,
        &scale,
        &caps_preview,
        &jpeg,
    ])?;
    pipeline.add(&appsink).context("add appsink")?;
    // compositor → caps → tee, then the preview branch off a tee request pad.
    gst::Element::link_many([&compositor, &caps_canvas, &tee])?;
    gst::Element::link_many([&preview_queue, &convert, &scale, &caps_preview, &jpeg])?;
    let tee_preview_pad = tee
        .request_pad_simple("src_%u")
        .ok_or_else(|| anyhow!("tee request pad (preview) failed"))?;
    tee_preview_pad
        .link(
            &preview_queue
                .static_pad("sink")
                .ok_or_else(|| anyhow!("preview queue has no sink pad"))?,
        )
        .context("link tee → preview queue")?;
    jpeg.link(&appsink).context("link jpegenc → appsink")?;

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

    Ok((pipeline, compositor, tee))
}

/// The **preview (edit) compositor** branch (CHR-115): a SECOND compositor added
/// to the same pipeline, monitor-only (no tee, no outputs) — it renders the scene
/// being *edited* while the program compositor (above) carries what's on air.
/// Returns the preview compositor for its own hot source add/remove. Shares one
/// pipeline (hence one clock) with the program side.
fn build_edit_branch(
    pipeline: &gst::Pipeline,
    frames: &Arc<AtomicU64>,
    latest: &FrameSlot,
) -> Result<gst::Element> {
    let compositor = gst::ElementFactory::make("compositor")
        .property_from_str("background", "black")
        .build()
        .context("make preview compositor")?;
    let caps_canvas = gst::ElementFactory::make("capsfilter")
        .property(
            "caps",
            gst::Caps::builder("video/x-raw")
                .field("width", OUTPUT_W)
                .field("height", OUTPUT_H)
                .field("framerate", gst::Fraction::new(OUTPUT_FPS, 1))
                .build(),
        )
        .build()?;
    let convert = gst::ElementFactory::make("videoconvert").build()?;
    let scale = gst::ElementFactory::make("videoscale").build()?;
    let caps_preview = gst::ElementFactory::make("capsfilter")
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
        .build()?;
    let appsink = gst_app::AppSink::builder()
        .caps(&gst::Caps::builder("image/jpeg").build())
        .max_buffers(1)
        .drop(true)
        .sync(true)
        .build();

    pipeline.add_many([
        &compositor,
        &caps_canvas,
        &convert,
        &scale,
        &caps_preview,
        &jpeg,
    ])?;
    pipeline.add(&appsink).context("add preview appsink")?;
    gst::Element::link_many([
        &compositor,
        &caps_canvas,
        &convert,
        &scale,
        &caps_preview,
        &jpeg,
    ])?;
    jpeg.link(&appsink).context("link preview jpeg → appsink")?;

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
    Ok(compositor)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;

    /// `cargo test` runs tests in parallel by default; each of these spins up a
    /// real GStreamer pipeline on its own thread, and several of them running
    /// at once starve each other for CPU on a loaded box — timing-sensitive
    /// polls below then occasionally see fewer frames than expected. This
    /// serializes just the pipeline-running tests in this module without
    /// forcing the whole workspace (or other crates) to `--test-threads=1`.
    static ENGINE_TEST_LOCK: Mutex<()> = Mutex::new(());

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
        let _guard = ENGINE_TEST_LOCK.lock().unwrap_or_else(|p| p.into_inner());
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

    #[test]
    fn compositor_canvas_sustains_1080p60_without_stalling() {
        // CHR-103 acceptance: "mire/couleur 1080p60 stable dans la preview". We
        // can't observe the compositor's internal resolution from here (only the
        // downscaled JPEG leaves the pipeline), but a stalled/misnegotiated 1080p60
        // canvas would starve the appsink — so a sustained frame rate over a
        // longer window is the observable proxy for "stable".
        let _guard = ENGINE_TEST_LOCK.lock().unwrap_or_else(|p| p.into_inner());
        let engine = MediaEngine::start().expect("engine start");
        std::thread::sleep(Duration::from_millis(900));
        let n = engine.frames();
        engine.stop();

        // Generous floor (well under 60fps × 0.9s) to absorb CI/dev-box jitter
        // while still failing loudly on an actually-stalled pipeline.
        assert!(
            n >= 15,
            "expected a sustained frame rate, got {n} frames in 900ms"
        );
    }

    #[test]
    fn set_layer_transform_moves_the_live_compositor_pad() {
        let _guard = ENGINE_TEST_LOCK.lock().unwrap_or_else(|p| p.into_inner());
        let engine = MediaEngine::start().expect("engine start");
        for _ in 0..40 {
            std::thread::sleep(Duration::from_millis(50));
            if engine.frames() > 0 {
                break;
            }
        }

        engine
            .set_layer_transform(BACKGROUND_SOURCE_ID, 100, 50, 800, 450)
            .expect("set_layer_transform while Playing");

        let sources = engine.sources.lock().unwrap();
        let pad = &sources.get(BACKGROUND_SOURCE_ID).unwrap().pad;
        let xpos = pad.property::<i32>("xpos");
        let ypos = pad.property::<i32>("ypos");
        let width = pad.property::<i32>("width");
        let height = pad.property::<i32>("height");
        drop(sources);
        engine.stop();

        assert_eq!((xpos, ypos, width, height), (100, 50, 800, 450));
    }

    /// The CHR-110 effect→pad mapping, checked at its endpoints deterministically
    /// (no engine): every effect must land *exactly* on the target pose at p=1,
    /// and start where the effect says at p=0 (faded out, or offset by its own
    /// extent). This pins the entrance geometry without timing races.
    #[test]
    fn entrance_effect_transform_maps_endpoints() {
        let t = TargetPose {
            x: 100.0,
            y: 50.0,
            w: 800.0,
            h: 450.0,
        };
        let approx = |a: f64, b: f64| (a - b).abs() < 1e-6;
        let ends_at_target = |e: &str| {
            let (x, y, w, h, al) = effect_transform(e, &t, 1.0);
            approx(x, t.x) && approx(y, t.y) && approx(w, t.w) && approx(h, t.h) && approx(al, 1.0)
        };
        for e in [
            "fade",
            "fade_slide",
            "slide_left",
            "slide_right",
            "slide_up",
            "slide_down",
            "scale",
            "zoom_out",
            "pop",
        ] {
            assert!(
                ends_at_target(e),
                "{e} must finish exactly on the target pose"
            );
        }

        // Start states: fade/scale open transparent; slides open opaque but offset.
        assert!(
            approx(effect_transform("fade", &t, 0.0).4, 0.0),
            "fade starts transparent"
        );
        assert!(
            approx(effect_transform("scale", &t, 0.0).4, 0.0),
            "scale starts transparent"
        );
        let sl = effect_transform("slide_left", &t, 0.0);
        assert!(
            approx(sl.0, t.x + t.w) && approx(sl.4, 1.0),
            "slide_left starts one width right, opaque"
        );
        let su = effect_transform("slide_up", &t, 0.0);
        assert!(approx(su.1, t.y + t.h), "slide_up starts one height below");
        // scale opens smaller than target, centred.
        let sc = effect_transform("scale", &t, 0.0);
        assert!(sc.2 < t.w && sc.3 < t.h, "scale opens smaller than target");
        assert!(
            approx(sc.0 + sc.2 / 2.0, t.x + t.w / 2.0),
            "scale stays centred"
        );
    }

    /// End-to-end on a live compositor pad: a `fade` entrance must be partway
    /// (alpha < 1) shortly after it starts, then finish fully opaque and snapped
    /// to the configured pose — the pad automation the README's CHR-110 asks for.
    #[test]
    fn animate_layer_fades_in_then_snaps_to_pose() {
        let _guard = ENGINE_TEST_LOCK.lock().unwrap_or_else(|p| p.into_inner());
        let engine = MediaEngine::start().expect("engine start");
        for _ in 0..40 {
            std::thread::sleep(Duration::from_millis(50));
            if engine.frames() > 0 {
                break;
            }
        }

        engine
            .set_layer_transform(BACKGROUND_SOURCE_ID, 100, 50, 800, 450)
            .expect("set target pose");
        engine
            .animate_layer(BACKGROUND_SOURCE_ID, "fade", 400, "ease-out")
            .expect("start fade entrance");

        // ~90 ms into a 400 ms fade → alpha should be well under 1.
        std::thread::sleep(Duration::from_millis(90));
        let mid_alpha = {
            let s = engine.sources.lock().unwrap();
            s.get(BACKGROUND_SOURCE_ID)
                .unwrap()
                .pad
                .property::<f64>("alpha")
        };

        // Let it finish, then read the final pad state.
        std::thread::sleep(Duration::from_millis(450));
        let (alpha, x, y, w, h) = {
            let s = engine.sources.lock().unwrap();
            let pad = &s.get(BACKGROUND_SOURCE_ID).unwrap().pad;
            (
                pad.property::<f64>("alpha"),
                pad.property::<i32>("xpos"),
                pad.property::<i32>("ypos"),
                pad.property::<i32>("width"),
                pad.property::<i32>("height"),
            )
        };
        engine.stop();

        assert!(
            mid_alpha < 0.9,
            "fade should be partway shortly after start, got {mid_alpha}"
        );
        assert!(
            (alpha - 1.0).abs() < 1e-6,
            "fade should finish fully opaque, got {alpha}"
        );
        assert_eq!(
            (x, y, w, h),
            (100, 50, 800, 450),
            "must snap to the target pose"
        );
    }

    /// CHR-113 programme fade-to-black transition: `set_program_black(true)`
    /// lazily attaches a full-canvas black layer on top and fades its alpha up;
    /// `set_program_black(false)` fades it back down — all while the programme
    /// keeps producing frames (a transition never stalls the feed). Headless.
    #[test]
    fn program_fade_to_black_and_back_over_a_live_programme() {
        let _guard = ENGINE_TEST_LOCK.lock().unwrap_or_else(|p| p.into_inner());
        let engine = MediaEngine::start().expect("engine start");
        for _ in 0..40 {
            std::thread::sleep(Duration::from_millis(50));
            if engine.frames() > 0 {
                break;
            }
        }

        // Fade to black over 300 ms.
        engine.set_program_black(true, 300).expect("fade to black");
        assert!(
            engine.is_source_active(BLACK_SOURCE_ID),
            "the black layer should be attached during a fade-to-black"
        );
        std::thread::sleep(Duration::from_millis(450));
        let black_alpha = {
            let s = engine.sources.lock().unwrap();
            s.get(BLACK_SOURCE_ID).unwrap().pad.property::<f64>("alpha")
        };
        let mid_frames = engine.frames();

        // Fade back from black over 300 ms.
        engine
            .set_program_black(false, 300)
            .expect("fade from black");
        std::thread::sleep(Duration::from_millis(450));
        let clear_alpha = {
            let s = engine.sources.lock().unwrap();
            s.get(BLACK_SOURCE_ID).unwrap().pad.property::<f64>("alpha")
        };
        let end_frames = engine.frames();
        engine.stop();

        assert!(
            (black_alpha - 1.0).abs() < 1e-3,
            "programme should be fully black after fade-to-black, alpha={black_alpha}"
        );
        assert!(
            clear_alpha < 1e-3,
            "programme should be clear again after fade-from-black, alpha={clear_alpha}"
        );
        assert!(
            end_frames > mid_frames && mid_frames > 0,
            "the programme must keep producing frames throughout the transition"
        );
    }

    #[test]
    fn set_layer_transform_rejects_non_positive_size() {
        let _guard = ENGINE_TEST_LOCK.lock().unwrap_or_else(|p| p.into_inner());
        let engine = MediaEngine::start().expect("engine start");
        let err = engine.set_layer_transform(BACKGROUND_SOURCE_ID, 0, 0, 0, 100);
        engine.stop();
        assert!(err.is_err(), "expected zero width to be rejected");
    }

    #[test]
    fn set_layer_transform_rejects_unknown_source() {
        let _guard = ENGINE_TEST_LOCK.lock().unwrap_or_else(|p| p.into_inner());
        let engine = MediaEngine::start().expect("engine start");
        let err = engine.set_layer_transform("does-not-exist", 0, 0, 10, 10);
        engine.stop();
        assert!(err.is_err(), "expected an unknown source id to be rejected");
    }

    /// CHR-104's central technical claim: a second source can be plugged into
    /// the compositor *while it is already Playing*, and unplugged again,
    /// without disturbing the background layer's frame production.
    #[test]
    fn add_and_remove_source_hot_keeps_the_pipeline_alive() {
        let _guard = ENGINE_TEST_LOCK.lock().unwrap_or_else(|p| p.into_inner());
        let engine = MediaEngine::start().expect("engine start");
        for _ in 0..40 {
            std::thread::sleep(Duration::from_millis(50));
            if engine.frames() > 0 {
                break;
            }
        }
        let before_add = engine.frames();

        engine
            .add_source(
                "extra",
                Box::new(|| {
                    let src = gst::ElementFactory::make("videotestsrc")
                        .property("is-live", true)
                        .property_from_str("pattern", "ball")
                        .build()?;
                    wrap_in_bin(&[&src])
                }),
            )
            .expect("hot add while Playing");
        assert!(engine.is_source_active("extra"));

        std::thread::sleep(Duration::from_millis(300));
        let after_add = engine.frames();
        assert!(
            after_add > before_add,
            "pipeline should keep producing frames after a hot add"
        );

        engine
            .remove_source("extra")
            .expect("hot remove while Playing");
        assert!(!engine.is_source_active("extra"));

        std::thread::sleep(Duration::from_millis(300));
        let after_remove = engine.frames();
        engine.stop();

        assert!(
            after_remove > after_add,
            "pipeline should keep producing frames after a hot remove"
        );
    }

    /// CHR-104 parity for the web app's captureActive/ended events: a source
    /// whose own element errors gets detached automatically, the engine keeps
    /// running, and the reason is readable exactly once via
    /// `take_ended_reason`.
    #[test]
    fn a_failing_source_is_auto_detached_without_killing_the_programme() {
        let _guard = ENGINE_TEST_LOCK.lock().unwrap_or_else(|p| p.into_inner());
        let engine = MediaEngine::start().expect("engine start");
        for _ in 0..40 {
            std::thread::sleep(Duration::from_millis(50));
            if engine.frames() > 0 {
                break;
            }
        }
        let before = engine.frames();

        let failing_elem: Arc<Mutex<Option<gst::Element>>> = Arc::new(Mutex::new(None));
        let slot = failing_elem.clone();
        engine
            .add_source(
                "flaky",
                Box::new(move || {
                    let src = gst::ElementFactory::make("videotestsrc")
                        .property("is-live", true)
                        .build()?;
                    *slot.lock().unwrap() = Some(src.clone());
                    wrap_in_bin(&[&src])
                }),
            )
            .expect("add the soon-to-fail source");
        assert!(engine.is_source_active("flaky"));

        // Simulate the source's own element hitting a real error, the way a
        // disconnected capture device would.
        let elem = failing_elem.lock().unwrap().take().unwrap();
        elem.post_error_message(gst::error_msg!(
            gst::CoreError::Failed,
            ("synthetic failure for the test")
        ));

        // Give the bus watch a moment to process it and detach the source.
        let mut detached = false;
        for _ in 0..40 {
            std::thread::sleep(Duration::from_millis(50));
            if !engine.is_source_active("flaky") {
                detached = true;
                break;
            }
        }
        assert!(detached, "flaky source should have been auto-detached");

        let reason = engine.take_ended_reason("flaky");
        assert!(
            reason
                .as_deref()
                .is_some_and(|r| r.contains("synthetic failure")),
            "expected the ended reason to mention the synthetic failure, got {reason:?}"
        );
        // Reading it again should come back empty — it's a take, not a peek.
        assert!(engine.take_ended_reason("flaky").is_none());

        std::thread::sleep(Duration::from_millis(300));
        let after = engine.frames();
        engine.stop();

        assert!(
            after > before,
            "the background layer should keep producing frames after another source's error"
        );
    }

    /// The *clean-stop* half of the captureActive/ended parity: a source that
    /// reaches EOS on its own (the GStreamer stand-in for the OS "stop sharing"
    /// button) is auto-detached with a recorded reason, and the programme keeps
    /// running. A per-source EOS never reaches the bus by itself — this proves
    /// the EOS pad-probe → application-message → auto-detach relay works.
    #[test]
    fn a_source_that_reaches_eos_is_auto_detached_with_an_ended_reason() {
        let _guard = ENGINE_TEST_LOCK.lock().unwrap_or_else(|p| p.into_inner());
        let engine = MediaEngine::start().expect("engine start");
        for _ in 0..40 {
            std::thread::sleep(Duration::from_millis(50));
            if engine.frames() > 0 {
                break;
            }
        }
        let before = engine.frames();

        // `num-buffers` makes videotestsrc send EOS after N frames — a source
        // that ends on its own, exactly like a screen share being stopped.
        engine
            .add_source(
                "shortlived",
                Box::new(|| {
                    let src = gst::ElementFactory::make("videotestsrc")
                        .property("is-live", true)
                        .property("num-buffers", 10i32)
                        .build()?;
                    wrap_in_bin(&[&src])
                }),
            )
            .expect("add the short-lived source");
        assert!(engine.is_source_active("shortlived"));

        // It EOSes after ~10 frames; the engine should notice and detach it.
        let mut detached = false;
        for _ in 0..60 {
            std::thread::sleep(Duration::from_millis(50));
            if !engine.is_source_active("shortlived") {
                detached = true;
                break;
            }
        }
        assert!(detached, "an EOS'd source should have been auto-detached");

        let reason = engine.take_ended_reason("shortlived");
        assert!(
            reason.is_some(),
            "expected an ended reason for the EOS'd source, got None"
        );
        // A take, not a peek.
        assert!(engine.take_ended_reason("shortlived").is_none());

        std::thread::sleep(Duration::from_millis(300));
        let after = engine.frames();
        engine.stop();

        assert!(
            after > before,
            "the background layer should keep producing frames after a source EOSes"
        );
    }

    /// CHR-115 preview/program split: the engine runs TWO independent compositors
    /// in one pipeline — both feeds produce frames, and a source added to the
    /// PREVIEW compositor lands on the preview feed without disturbing the
    /// programme. Headless (frame counts; the visual correctness is validated
    /// on-machine). NB: this exercises two live compositors at once, so it holds
    /// the engine lock like the others.
    #[test]
    fn preview_and_program_compositors_run_independently() {
        let _guard = ENGINE_TEST_LOCK.lock().unwrap_or_else(|p| p.into_inner());
        let engine = MediaEngine::start().expect("engine start");
        // Both feeds must come alive.
        let mut ok = false;
        for _ in 0..60 {
            std::thread::sleep(Duration::from_millis(50));
            if engine.frames() > 0 && engine.preview_frames() > 0 {
                ok = true;
                break;
            }
        }
        assert!(
            ok,
            "both the programme and preview compositors should produce frames"
        );

        let prog_before = engine.frames();
        let prev_before = engine.preview_frames();

        // A source on the PREVIEW compositor only.
        engine
            .add_preview_source(
                "prev-src",
                Box::new(|| {
                    let src = gst::ElementFactory::make("videotestsrc")
                        .property("is-live", true)
                        .build()?;
                    wrap_in_bin(&[&src])
                }),
            )
            .expect("add preview source");
        assert!(engine.is_preview_source_active("prev-src"));
        assert!(
            !engine.is_source_active("prev-src"),
            "preview source must NOT be on the programme"
        );

        std::thread::sleep(Duration::from_millis(400));
        engine
            .remove_preview_source("prev-src")
            .expect("remove preview source");
        assert!(!engine.is_preview_source_active("prev-src"));

        std::thread::sleep(Duration::from_millis(200));
        let prog_after = engine.frames();
        let prev_after = engine.preview_frames();
        engine.stop();

        assert!(prog_after > prog_before, "programme feed must keep flowing");
        assert!(
            prev_after > prev_before,
            "preview feed must keep flowing through the add/remove"
        );
    }
}
