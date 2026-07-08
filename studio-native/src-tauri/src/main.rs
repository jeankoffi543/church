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
}

fn main() {
    let builder = tauri::Builder::default();

    #[cfg(feature = "media")]
    let builder =
        builder
            .manage(media::MediaState::default())
            .invoke_handler(tauri::generate_handler![
                get_capabilities,
                media::start_preview,
                media::stop_preview,
                media::media_status,
                media::preview_frame
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
