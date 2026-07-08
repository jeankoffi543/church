//! Scene / layer domain model — the Rust mirror of the web app's `StudioLayer` /
//! `StudioScene` (`studio-layers.ts`). Pure data + operations, no media. The
//! media plane (studio-media / mod-*) consumes this model to drive the GStreamer
//! graph; it never lives here. This is what lets the whole app run — edit scenes,
//! reorder, persist — with the entire media stack absent or removed.

use crate::reaction::Pose;

/// Every source type the studio understands — mirror of `StudioLayerType`.
/// Whether a given kind is actually *available* at runtime is a capability
/// question answered by the media plane (see [`Capabilities`]); the model knows
/// the full vocabulary regardless.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum LayerKind {
    Bible,
    Text,
    Song,
    Image,
    Camera,
    Screen,
    Video,
    Embed,
    Audio,
    Group,
}

impl LayerKind {
    /// Stable string id used across the IPC boundary (frontend switch keys).
    pub fn as_str(self) -> &'static str {
        match self {
            LayerKind::Bible => "bible",
            LayerKind::Text => "text",
            LayerKind::Song => "song",
            LayerKind::Image => "image",
            LayerKind::Camera => "camera",
            LayerKind::Screen => "screen",
            LayerKind::Video => "video",
            LayerKind::Embed => "embed",
            LayerKind::Audio => "audio",
            LayerKind::Group => "group",
        }
    }

    /// Sources that carry an audio channel shown in the mixer — mirror of
    /// `hasAudio` in the web app.
    pub fn has_audio(self) -> bool {
        matches!(
            self,
            LayerKind::Embed
                | LayerKind::Video
                | LayerKind::Audio
                | LayerKind::Camera
                | LayerKind::Screen
        )
    }
}

/// One layer in a scene. Z-order is the position in [`Scene::layers`] (front =
/// index 0, matching the web dock where the top row is front).
#[derive(Clone, Debug, PartialEq)]
pub struct Layer {
    pub id: String,
    pub kind: LayerKind,
    pub name: String,
    pub visible: bool,
    /// Geometry/form pose fed to the compositor (position, size, shape…).
    pub pose: Pose,
}

/// A scene = an ordered stack of layers.
#[derive(Clone, Debug, Default, PartialEq)]
pub struct Scene {
    pub id: String,
    pub name: String,
    pub layers: Vec<Layer>,
}

impl Scene {
    pub fn new(id: impl Into<String>, name: impl Into<String>) -> Self {
        Scene {
            id: id.into(),
            name: name.into(),
            layers: Vec::new(),
        }
    }

    pub fn index_of(&self, id: &str) -> Option<usize> {
        self.layers.iter().position(|l| l.id == id)
    }

    pub fn get(&self, id: &str) -> Option<&Layer> {
        self.layers.iter().find(|l| l.id == id)
    }

    pub fn get_mut(&mut self, id: &str) -> Option<&mut Layer> {
        self.layers.iter_mut().find(|l| l.id == id)
    }

    /// Insert a new layer at the front (index 0), like the web "+" which prepends.
    pub fn add_front(&mut self, layer: Layer) {
        self.layers.insert(0, layer);
    }

    /// Remove a layer. Returns it if present. The scene stays valid whatever the
    /// id — removing a source never invalidates the rest (modular guarantee).
    pub fn remove(&mut self, id: &str) -> Option<Layer> {
        self.index_of(id).map(|i| self.layers.remove(i))
    }

    pub fn toggle_visible(&mut self, id: &str) -> Option<bool> {
        self.get_mut(id).map(|l| {
            l.visible = !l.visible;
            l.visible
        })
    }

    /// Move a layer one step toward the front (index-1). No-op at the front or if
    /// unknown. Returns whether anything moved.
    pub fn move_forward(&mut self, id: &str) -> bool {
        match self.index_of(id) {
            Some(i) if i > 0 => {
                self.layers.swap(i, i - 1);
                true
            }
            _ => false,
        }
    }

    /// Move a layer one step toward the back (index+1).
    pub fn move_backward(&mut self, id: &str) -> bool {
        match self.index_of(id) {
            Some(i) if i + 1 < self.layers.len() => {
                self.layers.swap(i, i + 1);
                true
            }
            _ => false,
        }
    }
}

/// A source or output identifier surfaced to the frontend for the capability
/// negotiation that makes the UI module-agnostic. The frontend builds its "+"
/// menu and output buttons from what the backend *actually* reports here, so a
/// compiled-out or failed module simply never appears — no frontend change.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Capabilities {
    /// Source kinds the media plane can currently instantiate.
    pub sources: Vec<LayerKind>,
    /// Output ids currently wireable (e.g. "record", "whip").
    pub outputs: Vec<String>,
    /// Encoder ids available, best-first (e.g. "nvenc", "vaapi", "x264").
    pub encoders: Vec<String>,
}

impl Capabilities {
    /// The honest "no media plane" answer — the app still runs, it just cannot
    /// capture or broadcast. This is what CHR-101 returns before any media crate
    /// is wired, and what a machine with no GStreamer degrades to.
    pub fn none() -> Self {
        Capabilities {
            sources: Vec::new(),
            outputs: Vec::new(),
            encoders: Vec::new(),
        }
    }

    pub fn can_add(&self, kind: LayerKind) -> bool {
        self.sources.contains(&kind)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::reaction::{PositionMode, Shape};

    fn pose() -> Pose {
        Pose {
            custom_x: 8.0,
            custom_y: 8.0,
            custom_width: 84.0,
            custom_height: 78.0,
            container_border_radius: 12.0,
            container_border_width: 0.0,
            container_padding_x: 0.0,
            container_padding_y: 0.0,
            shadow_blur: 0.0,
            shadow_spread: 0.0,
            shadow_offset_x: 0.0,
            shadow_offset_y: 0.0,
            shape: Shape::Transparent,
            position_mode: PositionMode::Custom,
        }
    }

    fn layer(id: &str, kind: LayerKind) -> Layer {
        Layer {
            id: id.into(),
            kind,
            name: id.into(),
            visible: true,
            pose: pose(),
        }
    }

    #[test]
    fn add_front_prepends_like_web_dock() {
        let mut s = Scene::new("s1", "Scène 1");
        s.add_front(layer("a", LayerKind::Camera));
        s.add_front(layer("b", LayerKind::Screen));
        assert_eq!(s.layers[0].id, "b"); // last added is front
        assert_eq!(s.layers[1].id, "a");
    }

    #[test]
    fn removing_a_source_keeps_the_scene_valid() {
        let mut s = Scene::new("s1", "Scène 1");
        s.add_front(layer("a", LayerKind::Camera));
        s.add_front(layer("b", LayerKind::Screen));
        s.add_front(layer("c", LayerKind::Image));
        assert_eq!(s.remove("b").unwrap().id, "b");
        assert_eq!(s.layers.len(), 2);
        assert!(s.get("a").is_some() && s.get("c").is_some());
        // Removing an unknown id is a harmless no-op.
        assert!(s.remove("zzz").is_none());
    }

    #[test]
    fn reorder_clamps_at_edges() {
        let mut s = Scene::new("s1", "Scène 1");
        s.add_front(layer("a", LayerKind::Camera));
        s.add_front(layer("b", LayerKind::Screen)); // order: [b, a]
        assert!(!s.move_forward("b")); // already front
        assert!(s.move_forward("a")); // [a, b]
        assert_eq!(s.layers[0].id, "a");
        assert!(!s.move_backward("b")); // already back
    }

    #[test]
    fn toggle_visibility_flips() {
        let mut s = Scene::new("s1", "Scène 1");
        s.add_front(layer("a", LayerKind::Camera));
        assert_eq!(s.toggle_visible("a"), Some(false));
        assert_eq!(s.toggle_visible("a"), Some(true));
        assert_eq!(s.toggle_visible("nope"), None);
    }

    #[test]
    fn screen_and_camera_have_audio_text_does_not() {
        assert!(LayerKind::Screen.has_audio());
        assert!(LayerKind::Camera.has_audio());
        assert!(!LayerKind::Text.has_audio());
        assert!(!LayerKind::Bible.has_audio());
    }

    #[test]
    fn capabilities_none_is_a_running_but_media_less_app() {
        let caps = Capabilities::none();
        assert!(caps.sources.is_empty());
        assert!(!caps.can_add(LayerKind::Screen));
    }
}
