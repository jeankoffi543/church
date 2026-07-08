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
//! The GStreamer glib `MainLoop` ↔ tokio integration is intentionally NOT here
//! yet: there is no media plane to drive. It arrives in CHR-102 (compositor), run
//! on a dedicated thread — see [`media_thread`].

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
use studio_core::Capabilities;

mod media_thread;

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

/// The single IPC contract of CHR-101. Deterministic and media-free.
#[tauri::command]
fn get_capabilities() -> CapabilitiesDto {
    // CHR-101: no media plane wired yet → the truthful empty answer.
    CapabilitiesDto::from(Capabilities::none())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![get_capabilities])
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
