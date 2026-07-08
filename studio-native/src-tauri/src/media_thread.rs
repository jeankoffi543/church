//! Placeholder for the media control thread (CHR-102+).
//!
//! Tauri drives its own event loop on the main thread; GStreamer wants a glib
//! `MainLoop` to pump element messages/signals. The two must not share a thread.
//! The plan, wired when the compositor lands in CHR-102:
//!
//! ```text
//!   main thread            dedicated media thread
//!   ───────────            ──────────────────────
//!   Tauri event loop  ──►  glib::MainLoop::run()   (owns the GStreamer pipeline)
//!        ▲   │                    │
//!        │   └── commands ───────►│  (channel: UI → media)
//!        └────── events ──────────┘  (channel: media → UI, via AppHandle::emit)
//! ```
//!
//! Nothing runs here yet — CHR-101 has no media plane. Keeping the module (and its
//! contract) present now means CHR-102 slots the glib loop in without reshaping
//! the shell.

/// Spawn the media control thread. No-op in CHR-101 (no pipeline to host).
/// Returns once the thread's glib `MainLoop` is ready (future CHR-102 behaviour).
#[allow(dead_code)]
pub fn start() {
    // CHR-102: std::thread::spawn(|| { let l = glib::MainLoop::new(None, false); l.run(); })
}
