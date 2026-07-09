//! The studio store — the Rust port of the web console's state machine
//! (`live-studio-console.tsx`). It owns the multi-scene document, the current
//! selection, and the **preview → programme** broadcast machine (CUT, the anim
//! nonces, the per-source replay set and tokens, the black-screen toggle).
//!
//! It is driven by [`Command`]s and answers with [`Event`]s: the media plane and
//! the UI both react to events, never to a shared `&mut`. Pure and serialisable
//! — the shell (src-tauri) turns IPC calls into commands, persists the [`Studio`]
//! to disk (CHR-102 PR3), and performs the side effects an event asks for (e.g.
//! actually diffusing a bible verse on [`Event::BibleOnAir`]).
//!
//! Fidelity notes vs the web console:
//!  * The **CUT** ([`Studio::cut`]) is `sendToProgram` ported 1:1 — freeze the
//!    current scene onto the programme, gate an off-air bible to hidden, compute
//!    the replay set with [`Layer::replays_on_cut`], bump the per-source tokens
//!    and the programme anim nonce, and decide whether a bible goes on air.
//!  * The bible's separate preview/on-air *style* split (editing the preview
//!    while live) stays a bible-module concern; the store carries one on-air
//!    `bible_style` + `bible_verse` and emits [`Event::BibleOnAir`] /
//!    [`Event::BibleHidden`] for the shell to broadcast.

use std::collections::{HashMap, HashSet};

use serde::{Deserialize, Serialize};

use crate::model::{create_layer, Layer, LayerKind, Scene, ScriptureVerse};
use crate::style::Style;

/// One-step reorder direction for [`Command::ReorderLayer`].
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MoveDir {
    /// Toward the front (index − 1, drawn on top).
    Forward,
    /// Toward the back (index + 1).
    Backward,
}

/// The on-air snapshot — frozen at CUT, independent of further preview edits.
/// Mirror of the console's `programLayers` / `programSceneId` / `programReplay` /
/// `programTokens` / `programAnimNonce` / `programBlack`.
#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Program {
    /// The layers as they were at CUT (a deep copy; off-air bible gated hidden).
    pub layers: Vec<Layer>,
    pub scene_id: String,
    /// Which source ids replay their entrance on this cut (CHR-56), frozen so a
    /// later settings toggle can't retroactively re-trigger.
    pub replay: HashSet<String>,
    /// Per-source replay token — bumped each time a source replays, so the
    /// renderer can tell "same nonce, new token" apart.
    pub tokens: HashMap<String, u64>,
    /// Bumped on every CUT (and on un-black) to replay entrances.
    pub anim_nonce: u64,
    /// The whole programme monitor is blacked out.
    pub black: bool,
}

/// The full studio document + live state. Always holds at least one scene.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Studio {
    pub scenes: Vec<Scene>,
    pub current_scene_id: String,
    pub selected_layer_id: Option<String>,
    /// Global "animer à chaque CUT" default (CHR-56). Web default: on.
    pub replay_on_cut: bool,
    /// Bumped on a preview-side edit that should replay the preview entrance.
    pub preview_anim_nonce: u64,
    /// The bible verse loaded as the on-air candidate (the web `preview`).
    pub bible_verse: Option<ScriptureVerse>,
    /// The on-air bible style (the web `onAirSettings`).
    pub bible_style: Style,
    pub program: Program,
}

impl Default for Studio {
    fn default() -> Self {
        Studio::new()
    }
}

/// A command mutating the store. Serialisable so the frontend sends one straight
/// over IPC (internally tagged: `{ "type": "addLayer", "kind": "text", … }`).
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum Command {
    // ── scenes ──
    AddScene {
        id: String,
    },
    RenameScene {
        id: String,
        name: String,
    },
    DeleteScene {
        id: String,
    },
    ReorderScene {
        drag_id: String,
        target_id: String,
    },
    SelectScene {
        id: String,
    },
    // ── layers (current scene) ──
    AddLayer {
        kind: LayerKind,
        id: String,
        #[serde(default)]
        parent_id: Option<String>,
    },
    RemoveLayer {
        id: String,
    },
    /// Full-layer replace by id — the field-edit path (the UI mutates a layer it
    /// already holds and sends it back). Mirror of the web `patchLayerById` merge.
    ReplaceLayer {
        layer: Box<Layer>,
    },
    /// One-step reorder (front/back buttons).
    ReorderLayer {
        id: String,
        dir: MoveDir,
    },
    /// Drag-and-drop reorder onto a target, with the group parenting rule
    /// (drop onto a group → become its child; onto a grouped layer → same group;
    /// else ungroup) — mirror of the web `reorderLayer`.
    ReorderLayerTo {
        drag_id: String,
        target_id: String,
    },
    ToggleVisible {
        id: String,
    },
    SelectLayer {
        id: Option<String>,
    },
    // ── programme / cut ──
    /// Freeze the current scene onto the programme (the web `sendToProgram`).
    Cut,
    /// Toggle the programme black-out (the web `blackScreen`).
    BlackScreen,
    SetReplayOnCut(bool),
    /// Bump the preview anim nonce (an on-air edit that should replay preview).
    BumpPreviewAnim,
    // ── bible ──
    /// Load / clear the on-air bible candidate + its style.
    SetBible {
        #[serde(default)]
        verse: Option<ScriptureVerse>,
        #[serde(default)]
        style: Option<Box<Style>>,
    },
}

/// Something that happened. The media plane / shell react to these.
#[derive(Clone, Debug, PartialEq)]
pub enum Event {
    SceneAdded(String),
    SceneRenamed(String),
    SceneDeleted(String),
    ScenesReordered,
    SceneSelected(String),
    LayerAdded {
        scene_id: String,
        id: String,
    },
    LayerRemoved {
        scene_id: String,
        id: String,
    },
    LayerReplaced {
        scene_id: String,
        id: String,
    },
    LayerReordered {
        scene_id: String,
    },
    LayerVisibilityChanged {
        id: String,
        visible: bool,
    },
    LayerSelected(Option<String>),
    /// A CUT happened: the programme snapshot changed. Carries the new nonce and
    /// the ids that replay their entrance.
    ProgramCut {
        anim_nonce: u64,
        replay: Vec<String>,
    },
    BlackScreenToggled(bool),
    ReplayOnCutChanged(bool),
    PreviewNonceBumped(u64),
    /// A bible verse should go on air — the shell diffuses it for real.
    BibleOnAir {
        verse: ScriptureVerse,
        style: Box<Style>,
    },
    /// Any live bible should be hidden.
    BibleHidden,
}

impl Studio {
    /// A fresh studio: one empty scene, nothing selected, replay-on-cut on.
    pub fn new() -> Self {
        let scene = Scene::new("scene-1", "Scène 1");
        Studio {
            current_scene_id: scene.id.clone(),
            scenes: vec![scene],
            selected_layer_id: None,
            replay_on_cut: true,
            preview_anim_nonce: 0,
            bible_verse: None,
            bible_style: Style::default(),
            program: Program::default(),
        }
    }

    /// The current scene (falls back to the first — the store always has one).
    pub fn current_scene(&self) -> &Scene {
        self.scenes
            .iter()
            .find(|s| s.id == self.current_scene_id)
            .unwrap_or(&self.scenes[0])
    }

    fn current_scene_mut(&mut self) -> &mut Scene {
        let id = self.current_scene_id.clone();
        let idx = self.scenes.iter().position(|s| s.id == id).unwrap_or(0);
        &mut self.scenes[idx]
    }

    /// The currently-selected layer, if any.
    pub fn selected_layer(&self) -> Option<&Layer> {
        let id = self.selected_layer_id.as_deref()?;
        self.current_scene().get(id)
    }

    /// Apply a command, returning the events it produced. The single mutation
    /// entry point — the shell routes every IPC call through here.
    pub fn apply(&mut self, cmd: Command) -> Vec<Event> {
        match cmd {
            Command::AddScene { id } => self.add_scene(id),
            Command::RenameScene { id, name } => self.rename_scene(&id, name),
            Command::DeleteScene { id } => self.delete_scene(&id),
            Command::ReorderScene { drag_id, target_id } => {
                self.reorder_scene(&drag_id, &target_id)
            }
            Command::SelectScene { id } => self.select_scene(&id),
            Command::AddLayer {
                kind,
                id,
                parent_id,
            } => self.add_layer(kind, id, parent_id),
            Command::RemoveLayer { id } => self.remove_layer(&id),
            Command::ReplaceLayer { layer } => self.replace_layer(*layer),
            Command::ReorderLayer { id, dir } => self.reorder_layer(&id, dir),
            Command::ReorderLayerTo { drag_id, target_id } => {
                self.reorder_layer_to(&drag_id, &target_id)
            }
            Command::ToggleVisible { id } => self.toggle_visible(&id),
            Command::SelectLayer { id } => {
                self.selected_layer_id = id.clone();
                vec![Event::LayerSelected(id)]
            }
            Command::Cut => self.cut(),
            Command::BlackScreen => self.black_screen(),
            Command::SetReplayOnCut(v) => {
                self.replay_on_cut = v;
                vec![Event::ReplayOnCutChanged(v)]
            }
            Command::BumpPreviewAnim => {
                self.preview_anim_nonce += 1;
                vec![Event::PreviewNonceBumped(self.preview_anim_nonce)]
            }
            Command::SetBible { verse, style } => {
                self.bible_verse = verse;
                if let Some(s) = style {
                    self.bible_style = *s;
                }
                vec![]
            }
        }
    }

    // ── scenes ──────────────────────────────────────────────────────────────

    fn add_scene(&mut self, id: String) -> Vec<Event> {
        let name = format!("Scène {}", self.scenes.len() + 1);
        self.scenes.push(Scene::new(id.clone(), name));
        self.current_scene_id = id.clone();
        self.selected_layer_id = None;
        vec![Event::SceneAdded(id.clone()), Event::SceneSelected(id)]
    }

    fn rename_scene(&mut self, id: &str, name: String) -> Vec<Event> {
        if let Some(s) = self.scenes.iter_mut().find(|s| s.id == id) {
            s.name = name;
            vec![Event::SceneRenamed(id.to_string())]
        } else {
            vec![]
        }
    }

    /// Never deletes the last scene (mirror of `confirmDeleteScene`). If the
    /// current scene goes, selection falls back to another scene's first layer.
    fn delete_scene(&mut self, id: &str) -> Vec<Event> {
        if self.scenes.len() <= 1 || !self.scenes.iter().any(|s| s.id == id) {
            return vec![];
        }
        let mut events = vec![Event::SceneDeleted(id.to_string())];
        if self.current_scene_id == id {
            if let Some(fallback) = self.scenes.iter().find(|s| s.id != id) {
                self.current_scene_id = fallback.id.clone();
                self.selected_layer_id = fallback.layers.first().map(|l| l.id.clone());
                events.push(Event::SceneSelected(self.current_scene_id.clone()));
            }
        }
        self.scenes.retain(|s| s.id != id);
        events
    }

    fn reorder_scene(&mut self, drag_id: &str, target_id: &str) -> Vec<Event> {
        if drag_id == target_id {
            return vec![];
        }
        let from = self.scenes.iter().position(|s| s.id == drag_id);
        let to = self.scenes.iter().position(|s| s.id == target_id);
        if let (Some(from), Some(to)) = (from, to) {
            let moved = self.scenes.remove(from);
            self.scenes.insert(to, moved);
            vec![Event::ScenesReordered]
        } else {
            vec![]
        }
    }

    fn select_scene(&mut self, id: &str) -> Vec<Event> {
        if !self.scenes.iter().any(|s| s.id == id) {
            return vec![];
        }
        self.current_scene_id = id.to_string();
        self.selected_layer_id = self.current_scene().layers.first().map(|l| l.id.clone());
        vec![Event::SceneSelected(id.to_string())]
    }

    // ── layers ──────────────────────────────────────────────────────────────

    fn add_layer(&mut self, kind: LayerKind, id: String, parent_id: Option<String>) -> Vec<Event> {
        let count = self.current_scene().layers.len();
        let mut layer = create_layer(kind, count, id.clone());
        // Group child: inherit the parent's style + record the parent id.
        if let Some(pid) = parent_id {
            if let Some(parent) = self.current_scene().get(&pid) {
                layer.style = parent.style.clone();
            }
            layer.parent_id = Some(pid);
        }
        let scene_id = self.current_scene_id.clone();
        self.current_scene_mut().add_front(layer);
        self.selected_layer_id = Some(id.clone());
        vec![
            Event::LayerAdded {
                scene_id,
                id: id.clone(),
            },
            Event::LayerSelected(Some(id)),
        ]
    }

    fn remove_layer(&mut self, id: &str) -> Vec<Event> {
        let scene_id = self.current_scene_id.clone();
        if self.current_scene_mut().remove(id).is_some() {
            if self.selected_layer_id.as_deref() == Some(id) {
                self.selected_layer_id = None;
            }
            vec![Event::LayerRemoved {
                scene_id,
                id: id.to_string(),
            }]
        } else {
            vec![]
        }
    }

    fn replace_layer(&mut self, layer: Layer) -> Vec<Event> {
        let scene_id = self.current_scene_id.clone();
        let scene = self.current_scene_mut();
        if let Some(idx) = scene.index_of(&layer.id) {
            let id = layer.id.clone();
            scene.layers[idx] = layer;
            vec![Event::LayerReplaced { scene_id, id }]
        } else {
            vec![]
        }
    }

    fn reorder_layer(&mut self, id: &str, dir: MoveDir) -> Vec<Event> {
        let scene_id = self.current_scene_id.clone();
        let moved = match dir {
            MoveDir::Forward => self.current_scene_mut().move_forward(id),
            MoveDir::Backward => self.current_scene_mut().move_backward(id),
        };
        if moved {
            vec![Event::LayerReordered { scene_id }]
        } else {
            vec![]
        }
    }

    /// Drag-drop reorder with grouping (mirror of the web `reorderLayer`).
    fn reorder_layer_to(&mut self, drag_id: &str, target_id: &str) -> Vec<Event> {
        if drag_id == target_id {
            return vec![];
        }
        let scene_id = self.current_scene_id.clone();
        let scene = self.current_scene_mut();
        let from = match scene.index_of(drag_id) {
            Some(f) => f,
            None => return vec![],
        };
        if scene.index_of(target_id).is_none() {
            return vec![];
        }
        let mut moved = scene.layers.remove(from);
        // Re-parenting rule based on the drop target (found in the list minus the
        // moved layer). Cloning the parent style keeps a child visually grouped.
        let target = scene.layers.iter().find(|l| l.id == target_id).cloned();
        if let Some(target) = target {
            if target.kind == LayerKind::Group {
                moved.parent_id = Some(target.id.clone());
                moved.style = target.style.clone();
            } else if let Some(pid) = target.parent_id.clone() {
                if let Some(parent) = scene.layers.iter().find(|l| l.id == pid) {
                    moved.style = parent.style.clone();
                }
                moved.parent_id = Some(pid);
            } else {
                moved.parent_id = None;
            }
        }
        // Re-find the target index after the removal shifted things.
        let insert_at = scene
            .index_of(target_id)
            .map(|t| if from < t { t + 1 } else { t })
            .unwrap_or_else(|| scene.layers.len());
        scene
            .layers
            .insert(insert_at.min(scene.layers.len()), moved);
        vec![Event::LayerReordered { scene_id }]
    }

    fn toggle_visible(&mut self, id: &str) -> Vec<Event> {
        match self.current_scene_mut().toggle_visible(id) {
            Some(visible) => vec![Event::LayerVisibilityChanged {
                id: id.to_string(),
                visible,
            }],
            None => vec![],
        }
    }

    // ── programme / cut ─────────────────────────────────────────────────────

    /// The CUT — `sendToProgram` ported 1:1. No-op if the whole scene is hidden.
    fn cut(&mut self) -> Vec<Event> {
        let layers = self.current_scene().layers.clone();
        if layers.iter().all(|l| !l.visible) {
            return vec![]; // nothing to send
        }
        self.program.black = false;
        // Freeze the scene; an off-air bible stays in preview but goes hidden.
        self.program.layers = layers
            .iter()
            .map(|l| {
                let mut c = l.clone();
                if l.kind == LayerKind::Bible && l.bible_on_air == Some(false) {
                    c.visible = false;
                }
                c
            })
            .collect();
        self.program.scene_id = self.current_scene_id.clone();

        // Which sources replay on THIS cut (frozen), + bump their tokens.
        let replaying: Vec<String> = layers
            .iter()
            .filter(|l| l.replays_on_cut(self.replay_on_cut))
            .map(|l| l.id.clone())
            .collect();
        self.program.replay = replaying.iter().cloned().collect();
        for id in &replaying {
            *self.program.tokens.entry(id.clone()).or_insert(0) += 1;
        }
        self.program.anim_nonce += 1;

        let mut events = vec![Event::ProgramCut {
            anim_nonce: self.program.anim_nonce,
            replay: replaying,
        }];

        // A visible, on-air bible with a loaded verse goes out for real.
        let bible_on_air = layers
            .iter()
            .any(|l| l.kind == LayerKind::Bible && l.visible && l.bible_on_air != Some(false))
            && self.bible_verse.is_some();
        if bible_on_air {
            events.push(Event::BibleOnAir {
                verse: self.bible_verse.clone().unwrap(),
                style: Box::new(self.bible_style.clone()),
            });
        } else {
            events.push(Event::BibleHidden);
        }
        events
    }

    /// Toggle the programme black-out (mirror of `blackScreen`). Going black
    /// hides any live scripture; un-blacking bumps the nonce to replay entrances.
    fn black_screen(&mut self) -> Vec<Event> {
        self.program.black = !self.program.black;
        let mut events = vec![Event::BlackScreenToggled(self.program.black)];
        if self.program.black {
            events.push(Event::BibleHidden);
        } else {
            self.program.anim_nonce += 1;
            events.push(Event::ProgramCut {
                anim_nonce: self.program.anim_nonce,
                replay: self.program.replay.iter().cloned().collect(),
            });
        }
        events
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn verse() -> ScriptureVerse {
        ScriptureVerse {
            reference: "Jean 3:16".into(),
            text: "Car Dieu a tant aimé le monde…".into(),
            ..Default::default()
        }
    }

    #[test]
    fn new_studio_has_one_scene_and_no_selection() {
        let s = Studio::new();
        assert_eq!(s.scenes.len(), 1);
        assert_eq!(s.current_scene_id, "scene-1");
        assert!(s.selected_layer_id.is_none());
        assert!(s.replay_on_cut);
    }

    #[test]
    fn add_layer_prepends_and_selects() {
        let mut s = Studio::new();
        s.apply(Command::AddLayer {
            kind: LayerKind::Camera,
            id: "cam-1".into(),
            parent_id: None,
        });
        s.apply(Command::AddLayer {
            kind: LayerKind::Screen,
            id: "scr-1".into(),
            parent_id: None,
        });
        assert_eq!(s.current_scene().layers[0].id, "scr-1"); // last added is front
        assert_eq!(s.selected_layer_id.as_deref(), Some("scr-1"));
    }

    #[test]
    fn delete_never_removes_the_last_scene() {
        let mut s = Studio::new();
        let ev = s.apply(Command::DeleteScene {
            id: "scene-1".into(),
        });
        assert!(ev.is_empty());
        assert_eq!(s.scenes.len(), 1);
    }

    #[test]
    fn deleting_the_current_scene_falls_back() {
        let mut s = Studio::new();
        s.apply(Command::AddScene {
            id: "scene-2".into(),
        });
        assert_eq!(s.current_scene_id, "scene-2");
        s.apply(Command::DeleteScene {
            id: "scene-2".into(),
        });
        assert_eq!(s.current_scene_id, "scene-1");
        assert_eq!(s.scenes.len(), 1);
    }

    #[test]
    fn cut_is_a_noop_when_the_whole_scene_is_hidden() {
        let mut s = Studio::new();
        s.apply(Command::AddLayer {
            kind: LayerKind::Image,
            id: "img".into(),
            parent_id: None,
        });
        s.apply(Command::ToggleVisible { id: "img".into() }); // hide the only layer
        let ev = s.apply(Command::Cut);
        assert!(ev.is_empty());
        assert_eq!(s.program.anim_nonce, 0);
    }

    #[test]
    fn cut_freezes_the_scene_and_bumps_the_nonce_and_replay_set() {
        let mut s = Studio::new();
        s.apply(Command::AddLayer {
            kind: LayerKind::Camera,
            id: "cam".into(),
            parent_id: None,
        });
        let ev = s.apply(Command::Cut);
        assert_eq!(s.program.anim_nonce, 1);
        assert_eq!(s.program.scene_id, "scene-1");
        assert_eq!(s.program.layers.len(), 1);
        // replay_on_cut is on by default and camera has no override → it replays.
        assert!(s.program.replay.contains("cam"));
        assert_eq!(s.program.tokens.get("cam"), Some(&1));
        assert!(matches!(ev[0], Event::ProgramCut { anim_nonce: 1, .. }));
        // No bible → the cut emits BibleHidden.
        assert!(ev.iter().any(|e| matches!(e, Event::BibleHidden)));
    }

    #[test]
    fn cut_puts_a_loaded_on_air_bible_on_air() {
        let mut s = Studio::new();
        s.apply(Command::AddLayer {
            kind: LayerKind::Bible,
            id: "bib".into(),
            parent_id: None,
        });
        s.apply(Command::SetBible {
            verse: Some(verse()),
            style: None,
        });
        let ev = s.apply(Command::Cut);
        assert!(ev.iter().any(
            |e| matches!(e, Event::BibleOnAir { verse, .. } if verse.reference == "Jean 3:16")
        ));
    }

    #[test]
    fn an_off_air_bible_is_frozen_hidden_but_stays_in_preview() {
        let mut s = Studio::new();
        s.apply(Command::AddLayer {
            kind: LayerKind::Bible,
            id: "bib".into(),
            parent_id: None,
        });
        // Also add a visible camera so the scene isn't all-hidden.
        s.apply(Command::AddLayer {
            kind: LayerKind::Camera,
            id: "cam".into(),
            parent_id: None,
        });
        // Gate the bible off-air.
        let mut bible = s.current_scene().get("bib").unwrap().clone();
        bible.bible_on_air = Some(false);
        s.apply(Command::ReplaceLayer {
            layer: Box::new(bible),
        });
        s.apply(Command::SetBible {
            verse: Some(verse()),
            style: None,
        });
        let ev = s.apply(Command::Cut);
        // The programme copy of the bible is hidden…
        let prog_bible = s.program.layers.iter().find(|l| l.id == "bib").unwrap();
        assert!(!prog_bible.visible);
        // …but the preview (current scene) copy is still visible.
        assert!(s.current_scene().get("bib").unwrap().visible);
        // …and it did NOT go on air.
        assert!(ev.iter().any(|e| matches!(e, Event::BibleHidden)));
    }

    #[test]
    fn replace_layer_is_the_field_edit_path() {
        let mut s = Studio::new();
        s.apply(Command::AddLayer {
            kind: LayerKind::Text,
            id: "t".into(),
            parent_id: None,
        });
        let mut edited = s.current_scene().get("t").unwrap().clone();
        edited.content = Some("Édité".into());
        let ev = s.apply(Command::ReplaceLayer {
            layer: Box::new(edited),
        });
        assert!(matches!(&ev[0], Event::LayerReplaced { id, .. } if id == "t"));
        assert_eq!(
            s.current_scene().get("t").unwrap().content.as_deref(),
            Some("Édité")
        );
    }

    #[test]
    fn black_screen_toggles_and_replays_on_un_black() {
        let mut s = Studio::new();
        s.apply(Command::AddLayer {
            kind: LayerKind::Camera,
            id: "cam".into(),
            parent_id: None,
        });
        s.apply(Command::Cut); // nonce 1
        let ev_black = s.apply(Command::BlackScreen); // black on
        assert!(s.program.black);
        assert_eq!(s.program.anim_nonce, 1); // no bump on black-out
        assert!(ev_black
            .iter()
            .any(|e| matches!(e, Event::BlackScreenToggled(true))));
        let ev_unblack = s.apply(Command::BlackScreen); // black off
        assert!(!s.program.black);
        assert_eq!(s.program.anim_nonce, 2); // bumped on un-black
        assert!(ev_unblack
            .iter()
            .any(|e| matches!(e, Event::ProgramCut { anim_nonce: 2, .. })));
    }

    #[test]
    fn add_layer_into_a_group_inherits_the_group_style() {
        let mut s = Studio::new();
        s.apply(Command::AddLayer {
            kind: LayerKind::Group,
            id: "grp".into(),
            parent_id: None,
        });
        // Give the group a distinctive style.
        let mut grp = s.current_scene().get("grp").unwrap().clone();
        grp.style.custom_x = 42.0;
        s.apply(Command::ReplaceLayer {
            layer: Box::new(grp),
        });
        s.apply(Command::AddLayer {
            kind: LayerKind::Text,
            id: "child".into(),
            parent_id: Some("grp".into()),
        });
        let child = s.current_scene().get("child").unwrap();
        assert_eq!(child.parent_id.as_deref(), Some("grp"));
        assert_eq!(child.style.custom_x, 42.0);
    }

    #[test]
    fn commands_deserialise_from_the_ipc_json_shape() {
        // The frontend sends a tagged command object.
        let cmd: Command =
            serde_json::from_str(r#"{"type":"addLayer","kind":"screen","id":"s1"}"#).unwrap();
        assert_eq!(
            cmd,
            Command::AddLayer {
                kind: LayerKind::Screen,
                id: "s1".into(),
                parent_id: None,
            }
        );
        let cut: Command = serde_json::from_str(r#"{"type":"cut"}"#).unwrap();
        assert_eq!(cut, Command::Cut);
    }

    #[test]
    fn whole_studio_round_trips_through_json() {
        let mut s = Studio::new();
        s.apply(Command::AddLayer {
            kind: LayerKind::Song,
            id: "song".into(),
            parent_id: None,
        });
        s.apply(Command::Cut);
        let json = serde_json::to_string(&s).unwrap();
        let back: Studio = serde_json::from_str(&json).unwrap();
        assert_eq!(s, back);
    }
}
