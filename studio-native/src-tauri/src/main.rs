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

    /// The id mod-screen-capture's source is registered under — shared between
    /// the hot-attach/detach commands below and `ScreenStatus`.
    #[cfg(feature = "screen")]
    const SCREEN_SOURCE_ID: &str = "screen";

    #[cfg(feature = "screen")]
    #[derive(Serialize)]
    pub struct ScreenStatus {
        pub active: bool,
        pub ended_reason: Option<String>,
    }

    /// Attach the screen-capture source, live, while the engine (and its
    /// background layer) keeps running — the CHR-104 "ajout à chaud" path.
    /// Fails if the engine isn't running yet, if it's already active, or if the
    /// platform has no capture element (the unavailable/permission-denied case
    /// on this dev target — see mod-screen-capture's module docs).
    #[cfg(feature = "screen")]
    #[tauri::command]
    pub fn start_screen_source(state: tauri::State<'_, MediaState>) -> Result<(), String> {
        let guard = state.0.lock().map_err(|_| "media state poisoned")?;
        let engine = guard.as_ref().ok_or("no media engine running")?;
        engine
            .add_source(SCREEN_SOURCE_ID, Box::new(mod_screen_capture::add_source))
            .map_err(|e| e.to_string())
    }

    /// Detach the screen-capture source, live, without touching the rest of the
    /// pipeline — the CHR-104 "retrait à chaud" / "stop sharing" path.
    #[cfg(feature = "screen")]
    #[tauri::command]
    pub fn stop_screen_source(state: tauri::State<'_, MediaState>) -> Result<(), String> {
        let guard = state.0.lock().map_err(|_| "media state poisoned")?;
        let engine = guard.as_ref().ok_or("no media engine running")?;
        engine
            .remove_source(SCREEN_SOURCE_ID)
            .map_err(|e| e.to_string())
    }

    /// Whether the screen source is active, plus the reason it was last
    /// auto-detached (a capture failure), if any — read once then cleared. The
    /// CHR-104 parity for the web app's `captureActive`/`ended` events.
    #[cfg(feature = "screen")]
    #[tauri::command]
    pub fn screen_status(state: tauri::State<'_, MediaState>) -> ScreenStatus {
        let guard = state.0.lock().ok();
        let engine = guard.as_ref().and_then(|g| g.as_ref());
        ScreenStatus {
            active: engine
                .map(|e| e.is_source_active(SCREEN_SOURCE_ID))
                .unwrap_or(false),
            ended_reason: engine.and_then(|e| e.take_ended_reason(SCREEN_SOURCE_ID)),
        }
    }
}

fn main() {
    let builder = tauri::Builder::default();

    #[cfg(all(feature = "media", feature = "screen"))]
    let builder =
        builder
            .manage(media::MediaState::default())
            .invoke_handler(tauri::generate_handler![
                get_capabilities,
                media::start_preview,
                media::stop_preview,
                media::media_status,
                media::preview_frame,
                media::set_layer_transform,
                media::canvas_size,
                media::start_screen_source,
                media::stop_screen_source,
                media::screen_status
            ]);

    #[cfg(all(feature = "media", not(feature = "screen")))]
    let builder =
        builder
            .manage(media::MediaState::default())
            .invoke_handler(tauri::generate_handler![
                get_capabilities,
                media::start_preview,
                media::stop_preview,
                media::media_status,
                media::preview_frame,
                media::set_layer_transform,
                media::canvas_size
            ]);

    #[cfg(not(feature = "media"))]
    let builder = builder.invoke_handler(tauri::generate_handler![get_capabilities]);

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
