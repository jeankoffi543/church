//! # studio-core
//!
//! The pure domain layer of the native studio (Tauri + Rust + GStreamer port of
//! our web régie). It contains ZERO media dependencies on purpose:
//!
//!  * [`style`] — the full per-layer style model (`StudioSettings`): typography,
//!    container, shadows, positioning, animation selection, alignment.
//!  * [`easing`] — cubic-bézier timing, ported 1:1 from `EASING_BEZIER`.
//!  * [`reaction`] — CHR-57 pose blending over [`style::Style`], ported 1:1 from
//!    `blendReactionStyles`.
//!  * [`model`] — scene/layer model (the full `StudioLayer`) + runtime
//!    [`model::Capabilities`] for the module-agnostic UI negotiation.
//!  * [`store`] — the [`store::Studio`] document + the preview→programme CUT
//!    machine, driven by [`store::Command`]s answering with [`store::Event`]s
//!    (the web console's state machine, ported).
//!
//! ## Why this crate has no media dependencies
//!
//! The modular architecture guarantees "remove a module, the app still runs".
//! The strongest form of that guarantee is: the domain logic compiles and is
//! testable with nothing but a Rust toolchain — no GStreamer, no Tauri, no OS
//! capture API. Everything media-shaped (the `Source`/`Output` traits that hand
//! back a `gst::Bin`, the compositor, the encoder) lives in downstream crates
//! that depend on this one, never the reverse. The one dependency here — `serde`
//! — is pure Rust; the model is the source of truth CHR-102's persistence
//! serialises (the shell does the file IO).

pub mod easing;
pub mod model;
pub mod reaction;
pub mod store;
pub mod style;

pub use easing::{ease, Cubic, UnitBezier};
pub use model::{
    create_layer, default_layer_style, layer_meta, AudioSourceType, Capabilities, Fill, Layer,
    LayerKind, LayerMeta, ReplayMode, Scene, ScriptureVerse, Stanza, ADD_TYPES,
};
pub use reaction::{blend, pick_reaction_style, StylePatch};
pub use store::{Command, Event, MoveDir, Program, Studio};
pub use style::{
    AnimEasing, BorderStyle, ContainerShape, FontDecoration, FontStyleKind, FontTransform, Layout,
    OverflowDir, PositionMode, PredefinedPosition, Style, TextAlign, TextVAlign, TypeStyle,
};
