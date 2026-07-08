//! # studio-core
//!
//! The pure domain layer of the native studio (Tauri + Rust + GStreamer port of
//! our web régie). It contains ZERO media dependencies on purpose:
//!
//!  * [`easing`] — cubic-bézier timing, ported 1:1 from `EASING_BEZIER`.
//!  * [`reaction`] — CHR-57 pose blending, ported 1:1 from `blendReactionStyles`.
//!  * [`model`] — scene/layer model + runtime [`model::Capabilities`] for the
//!    module-agnostic UI negotiation.
//!
//! ## Why this crate has no dependencies
//!
//! The modular architecture guarantees "remove a module, the app still runs".
//! The strongest form of that guarantee is: the domain logic compiles and is
//! testable with nothing but a Rust toolchain — no GStreamer, no Tauri, no OS
//! capture API. Everything media-shaped (the `Source`/`Output` traits that hand
//! back a `gst::Bin`, the compositor, the encoder) lives in downstream crates
//! that depend on this one, never the reverse.

pub mod easing;
pub mod model;
pub mod reaction;

pub use easing::{ease, Cubic, UnitBezier};
pub use model::{Capabilities, Layer, LayerKind, Scene};
pub use reaction::{blend, Pose, PosePatch, PositionMode, Shape};
