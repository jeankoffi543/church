//! CHR-101 — Tauri v2 desktop shell.
//!
//! This is the thin control-plane host: it opens the window (React chrome lives
//! in `../ui`) and exposes the **capability contract** the frontend uses to build
//! its UI module-agnostically. Right now there is no media plane, so
//! `get_capabilities` returns [`studio_core::Capabilities::none`] — the honest
//! "no sources / no outputs" answer. The frontend renders that as "aucun module
//! média", proving the negotiation works at empty. When CHR-102+ modules register,
//! this command reports them and the UI lights up with **zero frontend changes**.
//!
//! CHR-102 adds the media plane: the `studio-media` crate runs the GStreamer
//! compositor under a glib `MainLoop` on its own thread; here we expose it via the
//! `start_preview` / `media_status` commands and probe real encoders for
//! `get_capabilities`. It is behind the `media` feature — off ⇒ the shell still
//! runs and reports zero encoders (CHR-101 behaviour).
//!
//! CHR-104 adds the screen-capture source's hot lifecycle: `start_preview` now
//! always starts just the background test pattern (no more "prefer screen at
//! startup" special-casing); `start_screen_source`/`stop_screen_source` attach
//! and detach mod-screen-capture live, while the pipeline keeps running, and
//! `screen_status` surfaces whether it's active plus the reason if it was
//! auto-detached (a capture failure) — the "partage arrêté" parity for the web
//! app's `captureActive`/`ended` events.
//!
//! CHR-102 backfill (persistence): the `studio` module makes the pure
//! `studio-core` document durable. `get_studio_state` / `apply_command` route
//! every scene/layer edit through [`studio_core::Studio::apply`], persisting the
//! result to `studio.json` in the OS app-data dir. It is feature-independent —
//! the scene document survives a restart whether or not any media module is
//! compiled in.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
use studio_core::Capabilities;

/// Wire-format of [`Capabilities`] for the IPC boundary. Layer kinds are sent as
/// their stable string ids (`"screen"`, `"camera"`, …) so the frontend keys off
/// strings, never a Rust enum representation.
#[derive(Debug, Serialize)]
struct CapabilitiesDto {
    sources: Vec<String>,
    outputs: Vec<String>,
    encoders: Vec<String>,
}

impl From<Capabilities> for CapabilitiesDto {
    fn from(c: Capabilities) -> Self {
        CapabilitiesDto {
            sources: c.sources.iter().map(|k| k.as_str().to_string()).collect(),
            outputs: c.outputs,
            encoders: c.encoders,
        }
    }
}

/// The live capabilities. With the `media` feature the encoder list is REAL —
/// probed from the GStreamer elements actually present (CHR-102). Without it, the
/// honest empty answer (CHR-101). Sources/outputs stay empty until CHR-103+ modules.
fn current_capabilities() -> Capabilities {
    #[allow(unused_mut)]
    let mut caps = Capabilities::none();
    #[cfg(feature = "media")]
    {
        caps.encoders = studio_media::probe_encoders();
    }
    #[cfg(feature = "screen")]
    {
        if mod_screen_capture::is_available() {
            caps.sources.push(studio_core::LayerKind::Screen);
        }
    }
    #[cfg(feature = "camera")]
    {
        if mod_camera::is_available() {
            caps.sources.push(studio_core::LayerKind::Camera);
        }
    }
    #[cfg(feature = "overlays")]
    {
        // Overlays are pure render — always available when compiled. They add the
        // text/bible/song kinds to the "+" menu.
        caps.sources.push(studio_core::LayerKind::Text);
        caps.sources.push(studio_core::LayerKind::Bible);
        caps.sources.push(studio_core::LayerKind::Song);
    }
    #[cfg(feature = "record")]
    {
        if mod_output_record::is_available() {
            caps.outputs.push("record".into());
        }
    }
    #[cfg(feature = "broadcast")]
    {
        if mod_output_broadcast::is_available() {
            caps.outputs.push("broadcast".into());
        }
    }
    caps
}

/// The capability contract the frontend builds its UI from.
#[tauri::command]
fn get_capabilities() -> CapabilitiesDto {
    CapabilitiesDto::from(current_capabilities())
}

/// Media-plane commands (CHR-102). Compiled only with the `media` feature; when
/// it is off these commands simply do not exist and the frontend never sees them.
#[cfg(feature = "media")]
mod media {
    use serde::Serialize;
    use std::sync::Mutex;
    use studio_media::MediaEngine;

    /// The running engine, if any. Managed by Tauri; the glib MainLoop lives on
    /// the engine's own thread (see studio-media).
    #[derive(Default)]
    pub struct MediaState(pub Mutex<Option<MediaEngine>>);

    /// The running audio mixer, if any (CHR-107). Its own engine/glib loop,
    /// independent of the video plane — managed separately when `audio` is on.
    #[cfg(feature = "audio")]
    #[derive(Default)]
    pub struct AudioState(pub Mutex<Option<mod_audio_mixer::AudioMixer>>);

    /// The current encoder settings (CHR-111), shared by every Output. Outputs
    /// read this when they attach, so the record + broadcast bins encode with the
    /// selected encoder/bitrate/preset.
    #[derive(Default)]
    pub struct EncoderState(pub Mutex<mod_encoder::EncoderConfig>);

    #[derive(Serialize)]
    pub struct MediaStatus {
        pub running: bool,
        pub frames: u64,
    }

    #[tauri::command]
    pub fn start_preview(state: tauri::State<'_, MediaState>) -> Result<(), String> {
        let mut guard = state.0.lock().map_err(|_| "media state poisoned")?;
        if guard.is_none() {
            *guard = Some(MediaEngine::start().map_err(|e| e.to_string())?);
        }
        Ok(())
    }

    #[tauri::command]
    pub fn stop_preview(state: tauri::State<'_, MediaState>) {
        if let Ok(mut guard) = state.0.lock() {
            if let Some(engine) = guard.take() {
                engine.stop();
            }
        }
    }

    #[tauri::command]
    pub fn media_status(state: tauri::State<'_, MediaState>) -> MediaStatus {
        match state
            .0
            .lock()
            .ok()
            .and_then(|g| g.as_ref().map(|e| e.frames()))
        {
            Some(frames) => MediaStatus {
                running: true,
                frames,
            },
            None => MediaStatus {
                running: false,
                frames: 0,
            },
        }
    }
    /// The latest preview frame as a `data:image/jpeg;base64,…` URL the webview can
    /// drop straight into an `<img>`. `None` until the engine is running and has
    /// produced a frame. This is the embedded preview — no native-window surgery.
    #[tauri::command]
    pub fn preview_frame(state: tauri::State<'_, MediaState>) -> Option<String> {
        use base64::Engine;
        let bytes = state.0.lock().ok()?.as_ref()?.latest_frame()?;
        let b64 = base64::engine::general_purpose::STANDARD.encode(bytes);
        Some(format!("data:image/jpeg;base64,{b64}"))
    }

    /// Move/resize a source's layer live, in programme-canvas pixels (see
    /// `studio_media::MediaEngine::set_layer_transform`). The frontend expresses
    /// drags/resizes as fractions of the canvas so it never needs to know the
    /// exact resolution; it multiplies by `canvas_size` before calling this.
    #[tauri::command]
    pub fn set_layer_transform(
        state: tauri::State<'_, MediaState>,
        id: String,
        xpos: i32,
        ypos: i32,
        width: i32,
        height: i32,
    ) -> Result<(), String> {
        let guard = state.0.lock().map_err(|_| "media state poisoned")?;
        let engine = guard.as_ref().ok_or("no media engine running")?;
        engine
            .set_layer_transform(&id, xpos, ypos, width, height)
            .map_err(|e| e.to_string())
    }

    /// The programme canvas resolution (1920×1080 today) — the frontend maps its
    /// draggable overlay's fractional coordinates through this before calling
    /// `set_layer_transform`, instead of hardcoding the resolution twice.
    #[tauri::command]
    pub fn canvas_size() -> (u32, u32) {
        studio_media::canvas_size()
    }

    // ── Hot sources: screen (CHR-104), camera (CHR-105), overlays (CHR-106) ──
    //
    // Every source command is present whenever `media` is compiled; its body
    // compiles to the real implementation only when that source module's feature
    // is on, else a clear "module not compiled" error. This keeps ONE handler
    // list (no per-source combinatorial `cfg` arms — which would explode as
    // audio/record/whip land) while preserving per-module compile removal: the
    // optional crate is still only linked when its feature is enabled.

    const SCREEN_SOURCE_ID: &str = "screen";
    const CAMERA_SOURCE_ID: &str = "camera";

    /// captureActive/ended status for a hot source. `active` mirrors the engine;
    /// `ended_reason` is the once-read auto-detach reason (device gone / EOS).
    #[derive(Serialize)]
    pub struct SourceStatus {
        pub active: bool,
        pub ended_reason: Option<String>,
    }

    /// A camera device for the UI picker — a shell DTO so the command signature
    /// never depends on the (optional) camera module being compiled.
    #[derive(Serialize)]
    pub struct CameraDeviceDto {
        pub id: String,
        pub label: String,
    }

    /// Read a source's live status from the engine.
    fn read_status(state: &tauri::State<'_, MediaState>, id: &str) -> SourceStatus {
        let guard = state.0.lock().ok();
        let engine = guard.as_ref().and_then(|g| g.as_ref());
        SourceStatus {
            active: engine.map(|e| e.is_source_active(id)).unwrap_or(false),
            ended_reason: engine.and_then(|e| e.take_ended_reason(id)),
        }
    }

    /// Detach a source by id (shared by the stop_* / hide_* commands).
    fn drop_source(state: &tauri::State<'_, MediaState>, id: &str) -> Result<(), String> {
        let guard = state.0.lock().map_err(|_| "media state poisoned")?;
        let engine = guard.as_ref().ok_or("no media engine running")?;
        engine.remove_source(id).map_err(|e| e.to_string())
    }

    /// Attach the screen-capture source, live (CHR-104 hot-add). Fails if the
    /// engine isn't running, it's already active, or no capture element exists.
    #[tauri::command]
    pub fn start_screen_source(state: tauri::State<'_, MediaState>) -> Result<(), String> {
        #[cfg(feature = "screen")]
        {
            let guard = state.0.lock().map_err(|_| "media state poisoned")?;
            let engine = guard.as_ref().ok_or("no media engine running")?;
            engine
                .add_source(SCREEN_SOURCE_ID, Box::new(mod_screen_capture::add_source))
                .map_err(|e| e.to_string())
        }
        #[cfg(not(feature = "screen"))]
        {
            let _ = state;
            Err("module écran non compilé".into())
        }
    }

    #[tauri::command]
    pub fn stop_screen_source(state: tauri::State<'_, MediaState>) -> Result<(), String> {
        drop_source(&state, SCREEN_SOURCE_ID)
    }

    #[tauri::command]
    pub fn screen_status(state: tauri::State<'_, MediaState>) -> SourceStatus {
        read_status(&state, SCREEN_SOURCE_ID)
    }

    /// The connected cameras for the UI picker (empty if the module is absent).
    #[tauri::command]
    pub fn list_cameras() -> Vec<CameraDeviceDto> {
        #[cfg(feature = "camera")]
        {
            mod_camera::list_cameras()
                .into_iter()
                .map(|c| CameraDeviceDto {
                    id: c.id,
                    label: c.label,
                })
                .collect()
        }
        #[cfg(not(feature = "camera"))]
        {
            Vec::new()
        }
    }

    /// Attach the camera source, live, for the chosen device (`None` = first).
    #[tauri::command]
    pub fn start_camera_source(
        state: tauri::State<'_, MediaState>,
        device_id: Option<String>,
    ) -> Result<(), String> {
        #[cfg(feature = "camera")]
        {
            let guard = state.0.lock().map_err(|_| "media state poisoned")?;
            let engine = guard.as_ref().ok_or("no media engine running")?;
            engine
                .add_source(
                    CAMERA_SOURCE_ID,
                    Box::new(move || mod_camera::build_source(device_id)),
                )
                .map_err(|e| e.to_string())
        }
        #[cfg(not(feature = "camera"))]
        {
            let _ = (state, device_id);
            Err("module caméra non compilé".into())
        }
    }

    #[tauri::command]
    pub fn stop_camera_source(state: tauri::State<'_, MediaState>) -> Result<(), String> {
        drop_source(&state, CAMERA_SOURCE_ID)
    }

    #[tauri::command]
    pub fn camera_status(state: tauri::State<'_, MediaState>) -> SourceStatus {
        read_status(&state, CAMERA_SOURCE_ID)
    }

    /// Render a text/bible/song layer from the store and show it on the
    /// compositor, live (CHR-106). Re-shows (re-renders) if already visible, so a
    /// content/style edit takes effect. The overlay source id is `overlay:<id>`.
    #[tauri::command]
    pub fn show_overlay(
        state: tauri::State<'_, MediaState>,
        studio: tauri::State<'_, crate::studio::StudioState>,
        layer_id: String,
    ) -> Result<(), String> {
        #[cfg(feature = "overlays")]
        {
            let (layer, verse) = {
                let s = studio.studio.lock().map_err(|_| "studio poisoned")?;
                let layer = s
                    .current_scene()
                    .get(&layer_id)
                    .cloned()
                    .ok_or("no such layer in the current scene")?;
                (layer, s.bible_verse.clone())
            };
            if !mod_overlays::renders(layer.kind) {
                return Err("le calque n'est pas un overlay (texte/bible/chant)".into());
            }
            let guard = state.0.lock().map_err(|_| "media state poisoned")?;
            let engine = guard.as_ref().ok_or("no media engine running")?;
            let id = format!("overlay:{layer_id}");
            let _ = engine.remove_source(&id); // rebuild if already shown
                                               // The layer's entrance, to play once the pad is attached (CHR-110).
            let effect = layer.style.animation.clone();
            let duration = layer.style.anim_duration.max(0.0) as u64;
            let easing = layer.style.anim_easing.as_name();
            engine
                .add_source(
                    id.clone(),
                    Box::new(move || mod_overlays::build_source(&layer, verse.as_ref())),
                )
                .map_err(|e| e.to_string())?;
            // Best-effort: an unknown/`none` effect just snaps into place.
            let _ = engine.animate_layer(&id, &effect, duration, easing);
            Ok(())
        }
        #[cfg(not(feature = "overlays"))]
        {
            let _ = (state, studio, layer_id);
            Err("module overlays non compilé".into())
        }
    }

    #[tauri::command]
    pub fn hide_overlay(
        state: tauri::State<'_, MediaState>,
        layer_id: String,
    ) -> Result<(), String> {
        drop_source(&state, &format!("overlay:{layer_id}"))
    }

    #[tauri::command]
    pub fn overlay_active(state: tauri::State<'_, MediaState>, layer_id: String) -> bool {
        state
            .0
            .lock()
            .ok()
            .and_then(|g| {
                g.as_ref()
                    .map(|e| e.is_source_active(&format!("overlay:{layer_id}")))
            })
            .unwrap_or(false)
    }

    // ── encoder settings (CHR-111) ──────────────────────────────────────────

    /// The H.264 encoders this machine can run (hardware first), e.g.
    /// `["vaapi", "x264"]`. The UI offers these plus `"auto"`.
    #[tauri::command]
    pub fn list_encoders() -> Vec<String> {
        mod_encoder::list_h264()
    }

    /// The current encoder settings, and what `kind` (honouring `auto`) actually
    /// resolves to on this machine — so the UI can show "auto → x264".
    #[derive(Serialize)]
    pub struct EncoderInfo {
        pub config: mod_encoder::EncoderConfig,
        pub resolved: Option<String>,
    }

    #[tauri::command]
    pub fn get_encoder_config(enc: tauri::State<'_, EncoderState>) -> EncoderInfo {
        let config = enc.0.lock().map(|c| c.clone()).unwrap_or_default();
        let resolved = mod_encoder::resolve_kind(&config.kind);
        EncoderInfo { config, resolved }
    }

    #[tauri::command]
    pub fn set_encoder_config(
        enc: tauri::State<'_, EncoderState>,
        config: mod_encoder::EncoderConfig,
    ) -> Result<(), String> {
        let mut c = enc.0.lock().map_err(|_| "encoder state poisoned")?;
        *c = config;
        Ok(())
    }

    /// Read the active encoder config (or the default if unset/poisoned).
    fn current_encoder(enc: &tauri::State<'_, EncoderState>) -> mod_encoder::EncoderConfig {
        enc.0.lock().map(|c| c.clone()).unwrap_or_default()
    }

    // ── local recording output (CHR-108) ────────────────────────────────────
    const RECORD_ID: &str = "record";

    /// Start recording the programme feed to `path` (or a generated one under the
    /// home dir), tapping the compositor `tee`. Returns the file path. The
    /// muxer finalises natively on stop — no duration patch needed.
    #[tauri::command]
    pub fn start_recording(
        state: tauri::State<'_, MediaState>,
        enc: tauri::State<'_, EncoderState>,
        path: Option<String>,
    ) -> Result<String, String> {
        #[cfg(feature = "record")]
        {
            if !mod_output_record::is_available() {
                return Err("encodeur/muxer d'enregistrement indisponible".into());
            }
            let cfg = current_encoder(&enc);
            let path = path.unwrap_or_else(|| {
                let base = std::env::var("HOME")
                    .or_else(|_| std::env::var("USERPROFILE"))
                    .unwrap_or_else(|_| std::env::temp_dir().to_string_lossy().into_owned());
                let ts = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .map(|d| d.as_secs())
                    .unwrap_or(0);
                format!("{base}/culte-{ts}.mp4")
            });
            let guard = state.0.lock().map_err(|_| "media state poisoned")?;
            let engine = guard.as_ref().ok_or("no media engine running")?;
            let p = std::path::PathBuf::from(&path);
            engine
                .attach_output(
                    RECORD_ID,
                    Box::new(move || mod_output_record::build_record_bin(&p, &cfg)),
                )
                .map_err(|e| e.to_string())?;
            Ok(path)
        }
        #[cfg(not(feature = "record"))]
        {
            let _ = (state, enc, path);
            Err("module enregistrement non compilé".into())
        }
    }

    /// Stop recording — finalises the file (EOS → muxer trailer) then detaches.
    #[tauri::command]
    pub fn stop_recording(state: tauri::State<'_, MediaState>) -> Result<(), String> {
        let guard = state.0.lock().map_err(|_| "media state poisoned")?;
        let engine = guard.as_ref().ok_or("no media engine running")?;
        engine.detach_output(RECORD_ID).map_err(|e| e.to_string())
    }

    #[tauri::command]
    pub fn recording_active(state: tauri::State<'_, MediaState>) -> bool {
        state
            .0
            .lock()
            .ok()
            .and_then(|g| g.as_ref().map(|e| e.is_output_active(RECORD_ID)))
            .unwrap_or(false)
    }

    // ── external broadcast output (CHR-109) ─────────────────────────────────
    const BROADCAST_ID: &str = "broadcast";

    /// Go live to `rtmp_url` (RTMPS direct to Facebook), tapping the programme
    /// `tee`. With `sandbox = true` it's **Test mode** (CHR-112): the same encode
    /// runs but terminates in a fakesink — real encoder stats, no network, no
    /// Facebook. If a live connection later drops, the engine auto-detaches this
    /// output and keeps the programme + preview running (reason via
    /// `broadcast_status`).
    #[tauri::command]
    pub fn start_broadcast(
        state: tauri::State<'_, MediaState>,
        enc: tauri::State<'_, EncoderState>,
        rtmp_url: String,
        sandbox: bool,
    ) -> Result<(), String> {
        #[cfg(feature = "broadcast")]
        {
            if !mod_output_broadcast::is_available() {
                return Err("chaîne de diffusion RTMP indisponible".into());
            }
            let cfg = current_encoder(&enc);
            let guard = state.0.lock().map_err(|_| "media state poisoned")?;
            let engine = guard.as_ref().ok_or("no media engine running")?;
            let builder: studio_media::OutputBuilder = if sandbox {
                Box::new(move || mod_output_broadcast::build_sandbox_bin(&cfg))
            } else {
                if rtmp_url.trim().is_empty() {
                    return Err("URL RTMP vide".into());
                }
                Box::new(move || mod_output_broadcast::build_broadcast_bin(&rtmp_url, &cfg))
            };
            engine
                .attach_output(BROADCAST_ID, builder)
                .map_err(|e| e.to_string())
        }
        #[cfg(not(feature = "broadcast"))]
        {
            let _ = (state, enc, rtmp_url, sandbox);
            Err("module diffusion non compilé".into())
        }
    }

    /// Stop the broadcast — finalises the RTMP stream (EOS) then detaches.
    #[tauri::command]
    pub fn stop_broadcast(state: tauri::State<'_, MediaState>) -> Result<(), String> {
        let guard = state.0.lock().map_err(|_| "media state poisoned")?;
        let engine = guard.as_ref().ok_or("no media engine running")?;
        engine
            .detach_output(BROADCAST_ID)
            .map_err(|e| e.to_string())
    }

    /// Whether the broadcast is live, plus the reason it last dropped (connection
    /// lost), read once. The captureActive/ended parity for the output side.
    #[tauri::command]
    pub fn broadcast_status(state: tauri::State<'_, MediaState>) -> SourceStatus {
        read_status(&state, BROADCAST_ID)
    }

    // ── encoder stats (CHR-112) ─────────────────────────────────────────────

    /// Cumulative encoded-stream counters for an output (`"record"` /
    /// `"broadcast"`), or `None` if it isn't active. The UI derives live
    /// fps/bitrate from the delta between successive polls.
    #[derive(Serialize)]
    pub struct OutputStatsDto {
        pub frames: u64,
        pub bytes: u64,
        pub elapsed_ms: u64,
    }

    #[tauri::command]
    pub fn output_stats(state: tauri::State<'_, MediaState>, id: String) -> Option<OutputStatsDto> {
        let guard = state.0.lock().ok()?;
        let engine = guard.as_ref()?;
        engine.output_stats(&id).map(|s| OutputStatsDto {
            frames: s.frames,
            bytes: s.bytes,
            elapsed_ms: s.elapsed_ms,
        })
    }

    // ── audio mixer (CHR-107) ───────────────────────────────────────────────
    // Gated on `audio` (separate engine/state). The audio mixer replaces the
    // web AudioContext: per-channel fader/mute/gain/balance + real VU meters.

    /// Start the audio mixer (idempotent) — master bus + silent base channel.
    #[cfg(feature = "audio")]
    #[tauri::command]
    pub fn start_audio(state: tauri::State<'_, AudioState>) -> Result<(), String> {
        let mut guard = state.0.lock().map_err(|_| "audio state poisoned")?;
        if guard.is_none() {
            *guard = Some(mod_audio_mixer::AudioMixer::start().map_err(|e| e.to_string())?);
        }
        Ok(())
    }

    #[cfg(feature = "audio")]
    #[tauri::command]
    pub fn stop_audio(state: tauri::State<'_, AudioState>) {
        if let Ok(mut guard) = state.0.lock() {
            if let Some(mixer) = guard.take() {
                mixer.stop();
            }
        }
    }

    /// Add a demo tone channel (v1 — real per-source audio + file channels are a
    /// follow-up). `freq` Hz; the channel id keys its fader/VU.
    #[cfg(feature = "audio")]
    #[tauri::command]
    pub fn add_audio_tone(
        state: tauri::State<'_, AudioState>,
        id: String,
        freq: f64,
    ) -> Result<(), String> {
        let guard = state.0.lock().map_err(|_| "audio state poisoned")?;
        let mixer = guard.as_ref().ok_or("audio mixer not running")?;
        mixer
            .add_channel(
                id,
                mod_audio_mixer::ChannelSettings::default(),
                Box::new(move || mod_audio_mixer::tone_source(freq)),
            )
            .map_err(|e| e.to_string())
    }

    #[cfg(feature = "audio")]
    #[tauri::command]
    pub fn remove_audio_channel(
        state: tauri::State<'_, AudioState>,
        id: String,
    ) -> Result<(), String> {
        let guard = state.0.lock().map_err(|_| "audio state poisoned")?;
        let mixer = guard.as_ref().ok_or("audio mixer not running")?;
        mixer.remove_channel(&id).map_err(|e| e.to_string())
    }

    /// Set a channel's fader (0–100) / mute / gain (dB) / balance (−100…+100), live.
    #[cfg(feature = "audio")]
    #[tauri::command]
    #[allow(clippy::too_many_arguments)]
    pub fn set_audio_channel(
        state: tauri::State<'_, AudioState>,
        id: String,
        fader: f64,
        muted: bool,
        gain_db: f64,
        balance: f64,
    ) -> Result<(), String> {
        let guard = state.0.lock().map_err(|_| "audio state poisoned")?;
        let mixer = guard.as_ref().ok_or("audio mixer not running")?;
        mixer
            .set_channel(
                &id,
                mod_audio_mixer::ChannelSettings {
                    fader,
                    muted,
                    gain_db,
                    balance,
                },
            )
            .map_err(|e| e.to_string())
    }

    /// Latest peak level (dB) per channel id (+ `"master"`) — the real VU, read
    /// off the GStreamer `level` elements (never via the DOM/webaudio).
    #[cfg(feature = "audio")]
    #[tauri::command]
    pub fn audio_levels(
        state: tauri::State<'_, AudioState>,
    ) -> std::collections::HashMap<String, f64> {
        state
            .0
            .lock()
            .ok()
            .and_then(|g| g.as_ref().map(|m| m.levels()))
            .unwrap_or_default()
    }
}

/// The scene document + persistence (CHR-102). This is the pure `studio-core`
/// store made durable: the shell loads it from the app-data dir on start, routes
/// every IPC mutation through [`studio_core::Studio::apply`], and writes it back
/// after each change. It is **feature-independent** — the studio document lives
/// whether or not any media module is compiled in (the "core runs with no media
/// plane" guarantee, now with persistence).
mod studio {
    use std::path::{Path, PathBuf};
    use std::sync::Mutex;

    use studio_core::{Command, Studio};

    /// Load the persisted studio, or a fresh one if the file is absent or
    /// unreadable/corrupt (never fails — a broken file must not brick the app).
    pub fn load_studio(path: &Path) -> Studio {
        std::fs::read_to_string(path)
            .ok()
            .and_then(|s| serde_json::from_str::<Studio>(&s).ok())
            .unwrap_or_default()
    }

    /// Write the studio to disk (pretty JSON), best-effort. Creates the parent
    /// dir if needed. A failed write is logged-by-return, never a panic.
    pub fn persist_studio(path: &Path, studio: &Studio) -> std::io::Result<()> {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let json = serde_json::to_string_pretty(studio)
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e))?;
        std::fs::write(path, json)
    }

    /// The managed studio: the in-memory document + where it persists.
    pub struct StudioState {
        pub studio: Mutex<Studio>,
        pub path: PathBuf,
    }

    impl StudioState {
        pub fn load(path: PathBuf) -> Self {
            StudioState {
                studio: Mutex::new(load_studio(&path)),
                path,
            }
        }
    }

    /// The current studio document — the frontend renders scenes/layers from it.
    #[tauri::command]
    pub fn get_studio_state(state: tauri::State<'_, StudioState>) -> Result<Studio, String> {
        Ok(state.studio.lock().map_err(|_| "studio poisoned")?.clone())
    }

    /// Apply a command to the store, persist the result, and hand the new
    /// document back so the UI re-renders. Events (for the media plane) are
    /// produced by `apply` and dropped here for now — later branches (overlays /
    /// audio) will route them to the compositor.
    #[tauri::command]
    pub fn apply_command(
        state: tauri::State<'_, StudioState>,
        command: Command,
    ) -> Result<Studio, String> {
        let mut guard = state.studio.lock().map_err(|_| "studio poisoned")?;
        let _events = guard.apply(command);
        // Persistence is best-effort: an edit still takes effect in-memory even
        // if the disk write fails (read-only FS, etc.).
        let _ = persist_studio(&state.path, &guard);
        Ok(guard.clone())
    }

    #[cfg(test)]
    mod tests {
        use super::*;
        use studio_core::{Command, LayerKind};

        fn temp_path(tag: &str) -> PathBuf {
            let mut p = std::env::temp_dir();
            p.push(format!(
                "studio-native-test-{tag}-{}.json",
                std::process::id()
            ));
            p
        }

        #[test]
        fn missing_file_loads_a_fresh_studio() {
            let p = temp_path("missing");
            let _ = std::fs::remove_file(&p);
            let s = load_studio(&p);
            assert_eq!(s.scenes.len(), 1);
        }

        #[test]
        fn a_layer_added_then_persisted_survives_a_reload() {
            // The CHR-102 acceptance: "CRUD calques persisté". Add a layer, write
            // to disk, reload from that same file → the layer is still there.
            let p = temp_path("persist");
            let _ = std::fs::remove_file(&p);

            let mut studio = load_studio(&p); // fresh
            studio.apply(Command::AddLayer {
                kind: LayerKind::Text,
                id: "t-1".into(),
                parent_id: None,
            });
            persist_studio(&p, &studio).expect("write");

            let reloaded = load_studio(&p);
            assert_eq!(reloaded, studio);
            assert!(reloaded.current_scene().get("t-1").is_some());

            let _ = std::fs::remove_file(&p);
        }

        #[test]
        fn a_corrupt_file_degrades_to_a_fresh_studio() {
            let p = temp_path("corrupt");
            std::fs::write(&p, b"{ not valid json").unwrap();
            let s = load_studio(&p); // must not panic
            assert_eq!(s.scenes.len(), 1);
            let _ = std::fs::remove_file(&p);
        }
    }
}

fn main() {
    use tauri::Manager;

    let builder = tauri::Builder::default().setup(|app| {
        // The studio document persists in the OS app-data dir; fall back to a
        // temp path if it can't be resolved (headless/dev), so the app still runs.
        let path = app
            .path()
            .app_data_dir()
            .unwrap_or_else(|_| std::env::temp_dir())
            .join("studio.json");
        app.manage(studio::StudioState::load(path));
        Ok(())
    });

    // With `media`, every source command is present (bodies cfg-gated per module
    // inside `mod media`). The audio mixer has its own state, so it's the one
    // axis that adds a handler arm; a macro keeps the big common list DRY.
    // Without `media`, just the studio document (persistence with zero media).
    #[cfg(feature = "media")]
    macro_rules! media_handler {
        ($($extra:path),* $(,)?) => {
            tauri::generate_handler![
                get_capabilities,
                studio::get_studio_state,
                studio::apply_command,
                media::start_preview,
                media::stop_preview,
                media::media_status,
                media::preview_frame,
                media::set_layer_transform,
                media::canvas_size,
                media::start_screen_source,
                media::stop_screen_source,
                media::screen_status,
                media::list_cameras,
                media::start_camera_source,
                media::stop_camera_source,
                media::camera_status,
                media::show_overlay,
                media::hide_overlay,
                media::overlay_active,
                media::start_recording,
                media::stop_recording,
                media::recording_active,
                media::start_broadcast,
                media::stop_broadcast,
                media::broadcast_status,
                media::output_stats,
                media::list_encoders,
                media::get_encoder_config,
                media::set_encoder_config
                $(, $extra)*
            ]
        };
    }

    #[cfg(all(feature = "media", feature = "audio"))]
    let builder = builder
        .manage(media::MediaState::default())
        .manage(media::AudioState::default())
        .manage(media::EncoderState::default())
        .invoke_handler(media_handler![
            media::start_audio,
            media::stop_audio,
            media::add_audio_tone,
            media::remove_audio_channel,
            media::set_audio_channel,
            media::audio_levels,
        ]);

    #[cfg(all(feature = "media", not(feature = "audio")))]
    let builder = builder
        .manage(media::MediaState::default())
        .manage(media::EncoderState::default())
        .invoke_handler(media_handler![]);

    #[cfg(not(feature = "media"))]
    let builder = builder.invoke_handler(tauri::generate_handler![
        get_capabilities,
        studio::get_studio_state,
        studio::apply_command
    ]);

    builder
        .run(tauri::generate_context!())
        .expect("échec du démarrage de l'application Tauri");
}

#[cfg(test)]
mod tests {
    use super::*;
    use studio_core::LayerKind;

    #[test]
    fn none_capabilities_map_to_empty_dto() {
        let dto = CapabilitiesDto::from(Capabilities::none());
        assert!(dto.sources.is_empty());
        assert!(dto.outputs.is_empty());
        assert!(dto.encoders.is_empty());
    }

    #[test]
    fn layer_kinds_serialise_as_stable_string_ids() {
        let caps = Capabilities {
            sources: vec![LayerKind::Screen, LayerKind::Camera],
            outputs: vec!["record".into(), "whip".into()],
            encoders: vec!["x264".into()],
        };
        let dto = CapabilitiesDto::from(caps);
        assert_eq!(dto.sources, vec!["screen", "camera"]);
        assert_eq!(dto.outputs, vec!["record", "whip"]);
        assert_eq!(dto.encoders, vec!["x264"]);
    }

    #[test]
    fn dto_json_shape_is_the_frontend_contract() {
        let json = serde_json::to_value(CapabilitiesDto::from(Capabilities::none())).unwrap();
        assert!(json.get("sources").unwrap().is_array());
        assert!(json.get("outputs").unwrap().is_array());
        assert!(json.get("encoders").unwrap().is_array());
    }
}
