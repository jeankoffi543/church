//! Scene / layer domain model — the Rust mirror of the web app's `StudioLayer` /
//! `StudioScene` (`studio-layers.ts`). Pure data + operations, no media. The
//! media plane (studio-media / mod-*) consumes this model to drive the GStreamer
//! graph; it never lives here. This is what lets the whole app run — edit scenes,
//! reorder, persist — with the entire media stack absent or removed.
//!
//! CHR-102 backfill: the layer now carries its FULL state (style + every
//! per-type field the web `StudioLayer` has), so downstream modules read one
//! source of truth instead of re-inventing bits of the model and drifting.

use serde::{Deserialize, Serialize};

use crate::reaction::StylePatch;
use crate::style::Style;

/// Every source type the studio understands — mirror of `StudioLayerType`.
/// Whether a given kind is actually *available* at runtime is a capability
/// question answered by the media plane (see [`Capabilities`]); the model knows
/// the full vocabulary regardless.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
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

/// Image fit (`fill`): a full-bleed background (`cover`) or a movable framed box.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Fill {
    Cover,
    Frame,
}

/// Per-source cut-replay override (CHR-56). `Auto` follows the global "animer à
/// chaque CUT" toggle; `Always`/`Never` force it for this source.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ReplayMode {
    Auto,
    Always,
    Never,
}

/// Audio input origin for an audio layer (`audioSourceType`, CHR-42).
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AudioSourceType {
    Device,
    File,
}

/// One stanza of a song layer (CHR-39).
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Stanza {
    pub name: String,
    pub content: String,
}

/// A Bible verse — mirror of the web `ScriptureVerse`. The bible layer's on-air
/// content (owned by the orchestrator / store, not the layer). `reference` and
/// `text` are the only guaranteed fields; the rest are optional metadata.
#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct ScriptureVerse {
    pub id: Option<i64>,
    pub book: Option<String>,
    pub chapter: Option<i64>,
    pub verse: Option<i64>,
    pub reference: String,
    pub text: String,
    pub translation: Option<String>,
    /// Per-translation texts (`texts`), when the verse carries several versions.
    pub texts: Option<std::collections::HashMap<String, String>>,
}

/// One layer in a scene — the full Rust `StudioLayer`. Z-order is the position
/// in [`Scene::layers`] (front = index 0, matching the web dock where the top
/// row is front). Every field past the core five is `Option`/defaulted so a
/// layer only carries what its kind needs, and older persisted scenes missing a
/// field still load (`#[serde(default)]`).
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Layer {
    pub id: String,
    pub kind: LayerKind,
    pub name: String,
    pub visible: bool,
    /// Full per-layer style. The bible layer ignores this and uses the
    /// orchestrator's real on-air settings (see the store, CHR-102 PR2).
    pub style: Style,

    // text / song (`content` holds song lyrics, one line per row).
    pub content: Option<String>,
    pub sub: Option<String>,

    // image
    pub image_url: Option<String>,
    pub image_hue: Option<f64>,
    pub fill: Option<Fill>,

    // video / embed (external link)
    pub feed_url: Option<String>,
    pub loop_playback: Option<bool>,

    // camera / capture (device)
    pub device_id: Option<String>,
    pub device_label: Option<String>,
    pub audio_device_id: Option<String>,
    /// Hear the capture audio locally (off by default — anti-Larsen).
    pub listen_local: Option<bool>,

    // screen (getDisplayMedia): operator INTENT that this source is live.
    pub capture_active: Option<bool>,

    // bible: excluded from the antenne when false, still shown in preview.
    pub bible_on_air: Option<bool>,

    // CHR-56 replay-on-cut
    pub replay_on_cut: Option<ReplayMode>,

    // CHR-57 inter-source reaction
    pub react_to: Option<String>,
    pub react_style: Option<StylePatch>,
    pub react_transition_ms: Option<f64>,

    // CHR-59 entry sound
    pub entry_sound_enabled: Option<bool>,
    pub entry_sound_url: Option<String>,
    pub entry_sound_name: Option<String>,
    pub entry_sound_volume: Option<f64>,

    // CHR-39 song stanzas
    pub stanzas: Option<Vec<Stanza>>,
    pub active_stanza_index: Option<usize>,
    pub song_live_active: Option<bool>,

    // CHR-41 groups (children are flat layers carrying `parent_id`)
    pub layers: Option<Vec<Layer>>,
    pub group_live_active: Option<bool>,
    pub parent_id: Option<String>,

    // audio mixer (embed / video / audio / camera / screen)
    pub audio_level: Option<f64>,
    pub audio_muted: Option<bool>,
    pub audio_gain: Option<f64>,
    pub audio_balance: Option<f64>,

    // CHR-42 audio file config
    pub audio_source_type: Option<AudioSourceType>,
    pub audio_file_url: Option<String>,
    pub audio_file_name: Option<String>,
    pub audio_loop: Option<bool>,
    pub audio_speed: Option<f64>,
    pub audio_playing: Option<bool>,
    pub audio_live_active: Option<bool>,
}

impl Default for Layer {
    fn default() -> Self {
        Layer {
            id: String::new(),
            kind: LayerKind::Text,
            name: String::new(),
            visible: true,
            style: Style::default(),
            content: None,
            sub: None,
            image_url: None,
            image_hue: None,
            fill: None,
            feed_url: None,
            loop_playback: None,
            device_id: None,
            device_label: None,
            audio_device_id: None,
            listen_local: None,
            capture_active: None,
            bible_on_air: None,
            replay_on_cut: None,
            react_to: None,
            react_style: None,
            react_transition_ms: None,
            entry_sound_enabled: None,
            entry_sound_url: None,
            entry_sound_name: None,
            entry_sound_volume: None,
            stanzas: None,
            active_stanza_index: None,
            song_live_active: None,
            layers: None,
            group_live_active: None,
            parent_id: None,
            audio_level: None,
            audio_muted: None,
            audio_gain: None,
            audio_balance: None,
            audio_source_type: None,
            audio_file_url: None,
            audio_file_name: None,
            audio_loop: None,
            audio_speed: None,
            audio_playing: None,
            audio_live_active: None,
        }
    }
}

impl Layer {
    /// Whether this layer carries an audio channel shown in the mixer.
    pub fn has_audio(&self) -> bool {
        self.kind.has_audio()
    }

    /// Whether the audio channel is actually producing sound right now — mirror
    /// of `isAudioActive`. Drives the animated VU meter so it only moves when the
    /// source is genuinely on.
    pub fn is_audio_active(&self) -> bool {
        if !self.has_audio() || !self.visible || self.audio_muted.unwrap_or(false) {
            return false;
        }
        match self.kind {
            LayerKind::Camera => self.device_id.as_deref().is_some_and(|d| !d.is_empty()),
            LayerKind::Screen => self.capture_active.unwrap_or(false),
            LayerKind::Audio => {
                self.audio_playing.unwrap_or(false)
                    && self
                        .audio_file_url
                        .as_deref()
                        .is_some_and(|u| !u.is_empty())
            }
            _ => self
                .feed_url
                .as_deref()
                .is_some_and(|u| !u.trim().is_empty()),
        }
    }

    /// Whether this layer replays its entrance on a re-CUT (CHR-56). Per-source
    /// override wins; `Auto` follows the global default. The bible is never in
    /// this set — it re-animates on a VERSE change, not a plain re-CUT.
    pub fn replays_on_cut(&self, global_default: bool) -> bool {
        if self.kind == LayerKind::Bible {
            return false;
        }
        match self.replay_on_cut.unwrap_or(ReplayMode::Auto) {
            ReplayMode::Always => true,
            ReplayMode::Never => false,
            ReplayMode::Auto => global_default,
        }
    }

    /// Background layers fill the whole frame and sit behind overlays — an image
    /// whose fill is not the framed (movable) box. Mirror of `isBackgroundLayer`.
    pub fn is_background(&self) -> bool {
        self.kind == LayerKind::Image && self.fill != Some(Fill::Frame)
    }

    /// Audio has no visual output — it never renders on a monitor.
    pub fn is_compositable(&self) -> bool {
        self.kind != LayerKind::Audio
    }

    /// A song layer's on-air lyrics: the active stanza, else the raw content.
    pub fn song_text(&self) -> &str {
        if let (Some(stanzas), Some(i)) = (&self.stanzas, self.active_stanza_index) {
            if let Some(s) = stanzas.get(i) {
                return &s.content;
            }
        }
        self.content.as_deref().unwrap_or("")
    }
}

/// A scene = an ordered stack of layers.
#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
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

/// Static presentation metadata for a layer kind — mirror of `LAYER_META`.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct LayerMeta {
    pub label: &'static str,
    pub color: &'static str,
    pub type_label: &'static str,
}

/// Label / accent colour / long type label for a kind (mirror of `LAYER_META`).
pub fn layer_meta(kind: LayerKind) -> LayerMeta {
    match kind {
        LayerKind::Bible => LayerMeta {
            label: "Bible",
            color: "#e2b85f",
            type_label: "Bible · Écriture",
        },
        LayerKind::Text => LayerMeta {
            label: "Texte",
            color: "#60a5fa",
            type_label: "Texte surimpression",
        },
        LayerKind::Song => LayerMeta {
            label: "Chant",
            color: "#b270ff",
            type_label: "Chant · Paroles",
        },
        LayerKind::Image => LayerMeta {
            label: "Image / Fond",
            color: "#34d399",
            type_label: "Image / Fond",
        },
        LayerKind::Camera => LayerMeta {
            label: "Caméra / Capture",
            color: "#c89af0",
            type_label: "Caméra · webcam / capture",
        },
        LayerKind::Screen => LayerMeta {
            label: "Capture d'écran",
            color: "#5eb0d0",
            type_label: "Écran · fenêtre / onglet",
        },
        LayerKind::Video => LayerMeta {
            label: "Vidéo",
            color: "#f0a868",
            type_label: "Vidéo · lien ou fichier",
        },
        LayerKind::Embed => LayerMeta {
            label: "Direct externe",
            color: "#ff6b6b",
            type_label: "YouTube / Facebook",
        },
        LayerKind::Audio => LayerMeta {
            label: "Audio",
            color: "#86d0e0",
            type_label: "Entrée audio",
        },
        LayerKind::Group => LayerMeta {
            label: "Groupe",
            color: "#d0c090",
            type_label: "Groupe de calques",
        },
    }
}

/// Source kinds offered in the "+" menu, in order — mirror of `ADD_TYPES`. Bible
/// is included but capped at one per scene (the broadcast anchor); the dock hides
/// it once a scene has one.
pub const ADD_TYPES: [LayerKind; 10] = [
    LayerKind::Bible,
    LayerKind::Text,
    LayerKind::Song,
    LayerKind::Image,
    LayerKind::Embed,
    LayerKind::Camera,
    LayerKind::Screen,
    LayerKind::Video,
    LayerKind::Audio,
    LayerKind::Group,
];

/// The default [`Style`] for a freshly-added layer of `kind` — mirror of
/// `defaultLayerStyle`. Per-type overrides on top of [`Style::default`].
pub fn default_layer_style(kind: LayerKind) -> Style {
    let mut s = Style::default();
    match kind {
        LayerKind::Text => {
            s.font_body.family = "Plus Jakarta Sans".into();
            s.font_body.weight = "700".into();
        }
        LayerKind::Song => {
            s.animation = "none".into();
            s.font_body.family = "Plus Jakarta Sans".into();
            s.font_body.weight = "700".into();
        }
        LayerKind::Image => {
            s.animation = "none".into();
            s.container_shape = crate::style::ContainerShape::Transparent;
            s.position_mode = crate::style::PositionMode::Custom;
            s.custom_x = 28.0;
            s.custom_y = 18.0;
            s.custom_width = 44.0;
            s.custom_height = 55.0;
        }
        LayerKind::Screen => {
            s.animation = "none".into();
            s.container_shape = crate::style::ContainerShape::Transparent;
            s.position_mode = crate::style::PositionMode::Custom;
            s.custom_x = 0.0;
            s.custom_y = 0.0;
            s.custom_width = 100.0;
            s.custom_height = 100.0;
        }
        LayerKind::Embed | LayerKind::Video | LayerKind::Camera => {
            s.animation = "none".into();
            s.container_shape = crate::style::ContainerShape::Transparent;
            s.position_mode = crate::style::PositionMode::Custom;
            s.custom_x = 8.0;
            s.custom_y = 8.0;
            s.custom_width = 84.0;
            s.custom_height = 78.0;
        }
        LayerKind::Group => {
            s.animation = "none".into();
        }
        LayerKind::Bible | LayerKind::Audio => {}
    }
    s
}

/// Build a fresh layer of `kind` with the web's per-type defaults — mirror of
/// `createLayer`. `id` is supplied by the caller (the pure core generates no ids
/// / uses no clock); `existing_count` seeds the display name like the web.
pub fn create_layer(kind: LayerKind, existing_count: usize, id: impl Into<String>) -> Layer {
    let n = existing_count + 1;
    let mut l = Layer {
        id: id.into(),
        kind,
        name: format!("{} {}", layer_meta(kind).label, n),
        visible: true,
        style: default_layer_style(kind),
        ..Layer::default()
    };
    match kind {
        LayerKind::Text => {
            l.content = Some("Nouveau texte de surimpression".into());
            l.sub = Some(String::new());
        }
        LayerKind::Song => {
            let first = "Première ligne du chant\nDeuxième ligne";
            l.content = Some(first.into());
            l.stanzas = Some(vec![
                Stanza {
                    name: "Couplet 1".into(),
                    content: first.into(),
                },
                Stanza {
                    name: "Refrain".into(),
                    content: "Ceci est le refrain\nChanté en chœur".into(),
                },
            ]);
            l.active_stanza_index = Some(0);
            l.song_live_active = Some(false);
            l.style.font_body.style = crate::style::FontStyleKind::Italic;
            l.style.font_body.size = 102.0;
        }
        LayerKind::Image => {
            l.fill = Some(Fill::Frame);
            l.image_hue = Some(0.0); // caller may randomise; web uses a random hue
            l.image_url = Some(String::new());
        }
        LayerKind::Video => {
            l.feed_url = Some(String::new());
            l.loop_playback = Some(true);
        }
        LayerKind::Embed => {
            l.feed_url = Some(String::new());
        }
        LayerKind::Camera => {
            l.device_id = Some(String::new());
            l.listen_local = Some(false);
        }
        LayerKind::Screen => {
            l.capture_active = Some(false);
            l.listen_local = Some(false);
        }
        LayerKind::Audio => {
            l.audio_source_type = Some(AudioSourceType::File);
            l.audio_level = Some(80.0);
            l.audio_muted = Some(false);
            l.audio_gain = Some(0.0);
            l.audio_balance = Some(0.0);
            l.audio_loop = Some(false);
            l.audio_speed = Some(1.0);
            l.audio_playing = Some(false);
            l.audio_live_active = Some(false);
        }
        LayerKind::Group => {
            l.group_live_active = Some(false);
        }
        LayerKind::Bible => {}
    }
    // Any audio-bearing source gets default mixer values (mirror of the web's
    // trailing `if (hasAudio(base))`).
    if kind.has_audio() {
        l.audio_level.get_or_insert(80.0);
        l.audio_muted.get_or_insert(false);
        l.audio_gain.get_or_insert(0.0);
        l.audio_balance.get_or_insert(0.0);
    }
    l
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

    fn layer(id: &str, kind: LayerKind) -> Layer {
        create_layer(kind, 0, id)
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

    #[test]
    fn create_layer_seeds_web_defaults_per_type() {
        let song = create_layer(LayerKind::Song, 2, "song-x");
        assert_eq!(song.name, "Chant 3"); // existing_count + 1
        assert_eq!(song.stanzas.as_ref().unwrap().len(), 2);
        assert_eq!(song.active_stanza_index, Some(0));
        assert_eq!(song.style.font_body.size, 102.0);
        assert_eq!(song.style.animation, "none");

        let screen = create_layer(LayerKind::Screen, 0, "scr");
        assert_eq!(screen.capture_active, Some(false));
        assert_eq!(screen.style.custom_width, 100.0); // full-frame default
        assert_eq!(screen.audio_level, Some(80.0)); // has_audio → mixer defaults

        let audio = create_layer(LayerKind::Audio, 0, "au");
        assert_eq!(audio.audio_source_type, Some(AudioSourceType::File));
        assert_eq!(audio.audio_speed, Some(1.0));
    }

    #[test]
    fn replays_on_cut_matches_the_web_truth_table() {
        let mut cam = create_layer(LayerKind::Camera, 0, "c");
        // Auto follows the global default.
        cam.replay_on_cut = Some(ReplayMode::Auto);
        assert!(cam.replays_on_cut(true));
        assert!(!cam.replays_on_cut(false));
        // Overrides win.
        cam.replay_on_cut = Some(ReplayMode::Always);
        assert!(cam.replays_on_cut(false));
        cam.replay_on_cut = Some(ReplayMode::Never);
        assert!(!cam.replays_on_cut(true));
        // Bible never replays on a plain re-CUT.
        let bible = create_layer(LayerKind::Bible, 0, "b");
        assert!(!bible.replays_on_cut(true));
    }

    #[test]
    fn is_audio_active_gates_on_input_and_state() {
        let mut cam = create_layer(LayerKind::Camera, 0, "c");
        assert!(!cam.is_audio_active()); // no device yet
        cam.device_id = Some("dev-1".into());
        assert!(cam.is_audio_active());
        cam.audio_muted = Some(true);
        assert!(!cam.is_audio_active()); // muted
        cam.audio_muted = Some(false);
        cam.visible = false;
        assert!(!cam.is_audio_active()); // hidden
    }

    #[test]
    fn is_background_only_for_covering_images() {
        let mut img = create_layer(LayerKind::Image, 0, "i");
        assert_eq!(img.fill, Some(Fill::Frame));
        assert!(!img.is_background()); // framed image overlays, not background
        img.fill = Some(Fill::Cover);
        assert!(img.is_background());
    }

    #[test]
    fn full_layer_round_trips_through_json() {
        // A rich layer with reaction + song + audio survives serialise→deserialise.
        let mut l = create_layer(LayerKind::Song, 0, "song-1");
        l.react_to = Some("cam-1".into());
        l.react_style = Some(crate::reaction::pick_reaction_style(&Style::default()));
        l.react_transition_ms = Some(600.0);
        let json = serde_json::to_string(&l).unwrap();
        let back: Layer = serde_json::from_str(&json).unwrap();
        assert_eq!(l, back);
    }

    #[test]
    fn layer_json_omitting_new_fields_still_loads() {
        // An older/minimal persisted layer (only the core fields) deserialises,
        // with every optional field defaulting — the forward-compat guarantee.
        let minimal = r#"{"id":"x","kind":"text","name":"T","visible":true}"#;
        let l: Layer = serde_json::from_str(minimal).unwrap();
        assert_eq!(l.kind, LayerKind::Text);
        assert_eq!(l.style, Style::default());
        assert!(l.content.is_none());
    }
}
