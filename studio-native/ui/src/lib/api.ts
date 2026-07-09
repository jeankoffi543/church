// Typed wrappers over the Rust/Tauri commands — the single seam between the régie
// UI and the media engine. Every `invoke` in the app goes through here so the
// command names + payload shapes live in one place (mirrors the src-tauri module).
import { invoke } from "@tauri-apps/api/core";

export type Capabilities = { sources: string[]; outputs: string[]; encoders: string[] };
export type MediaStatus = { running: boolean; frames: number };
export type SourceStatus = { active: boolean; ended_reason: string | null };
export type CameraDevice = { id: string; label: string };

export type EncoderConfig = {
  kind: string;
  bitrate_kbps: number;
  preset: "speed" | "balanced" | "quality";
  keyframe_interval: number;
};
export type EncoderInfo = { config: EncoderConfig; resolved: string | null };
export type OutputStats = { frames: number; bytes: number; elapsed_ms: number };

// Mirror of studio_core (camelCase JSON). We type the fields the inspector edits
// and keep an index signature so unknown fields survive a `{...layer}` spread —
// critical, since ReplaceLayer round-trips the WHOLE layer through the store.
export type TypeStyle = {
  size: number;
  color: string;
  family: string;
  weight: string;
  [k: string]: unknown;
};
export type Style = {
  animation: string;
  animDuration: number;
  animEasing: string;
  positionMode: "predefined" | "custom";
  predefinedPosition: string;
  customX: number;
  customY: number;
  customWidth: number;
  customHeight: number;
  fontBody: TypeStyle;
  fontRef: TypeStyle;
  containerBg: string;
  background: string;
  [k: string]: unknown;
};
export type StudioLayer = {
  id: string;
  kind: string;
  name: string;
  visible: boolean;
  parent_id?: string | null;
  content?: string | null;
  sub?: string | null;
  style: Style;
  // Audio-bearing sources carry these (camelCase, Option in Rust → may be absent).
  audioLevel?: number | null;
  audioMuted?: boolean | null;
  audioGain?: number | null;
  audioBalance?: number | null;
  deviceId?: string | null;
  captureActive?: boolean | null;
  feedUrl?: string | null;
  audioPlaying?: boolean | null;
  audioFileUrl?: string | null;
  [k: string]: unknown;
};

// Entrance effects a compositor pad can render (CHR-110), for the inspector.
export const ANIM_EFFECTS = [
  "none", "fade", "fade_slide", "slide_left", "slide_right",
  "slide_up", "slide_down", "scale", "zoom_out", "pop",
];
export const ANIM_EASINGS = ["linear", "ease-in", "ease-out", "ease-in-out", "bounce", "back-out"];
// PredefinedPosition (snake_case) → French label.
export const POSITIONS: [string, string][] = [
  ["lower_third_left", "Tiers inf. gauche"],
  ["lower_third_right", "Tiers inf. droit"],
  ["centered_bottom", "Bas centré"],
  ["centered_top", "Haut centré"],
  ["ticker", "Bandeau défilant"],
  ["banner_top", "Bandeau haut"],
  ["full_screen_cinema", "Plein écran ciné"],
  ["full_screen", "Plein écran"],
  ["pip_top_left", "PiP haut gauche"],
  ["pip_top_right", "PiP haut droit"],
  ["pip_bottom_left", "PiP bas gauche"],
  ["pip_bottom_right", "PiP bas droit"],
];
export type StudioScene = { id: string; name: string; layers: StudioLayer[] };
export type StudioDoc = {
  scenes: StudioScene[];
  currentSceneId: string;
  selectedLayerId: string | null;
  program?: { black: boolean; sceneId?: string };
};
export type StudioCommand = Record<string, unknown> & { type: string };

// ── capabilities & engine ──────────────────────────────────────────────────
export const getCapabilities = () => invoke<Capabilities>("get_capabilities");
export const canvasSize = () => invoke<[number, number]>("canvas_size");
export const startPreview = () => invoke("start_preview");
export const stopPreview = () => invoke("stop_preview");
export const mediaStatus = () => invoke<MediaStatus>("media_status");
// CHR-115 split: programme = on-air (recorded), preview = edit compositor.
export const programFrame = () => invoke<string | null>("program_frame");
export const previewMonitorFrame = () => invoke<string | null>("preview_monitor_frame");

// ── scene document ─────────────────────────────────────────────────────────
export const getStudioState = () => invoke<StudioDoc>("get_studio_state");
export const applyCommand = (command: StudioCommand) =>
  invoke<StudioDoc>("apply_command", { command });

// ── sources ────────────────────────────────────────────────────────────────
export const startScreen = () => invoke("start_screen_source");
export const stopScreen = () => invoke("stop_screen_source");
export const screenStatus = () => invoke<SourceStatus>("screen_status");
export const listCameras = () => invoke<CameraDevice[]>("list_cameras");
export const startCamera = (deviceId: string | null) =>
  invoke("start_camera_source", { deviceId });
export const stopCamera = () => invoke("stop_camera_source");
export const cameraStatus = () => invoke<SourceStatus>("camera_status");
export const showOverlay = (layerId: string) => invoke("show_overlay", { layerId });
export const hideOverlay = (layerId: string) => invoke("hide_overlay", { layerId });
// CHR-115: overlays on the preview (edit) compositor.
export const showPreviewOverlay = (layerId: string) => invoke("show_preview_overlay", { layerId });
export const hidePreviewOverlay = (layerId: string) => invoke("hide_preview_overlay", { layerId });
export const setLayerTransform = (
  id: string,
  xpos: number,
  ypos: number,
  width: number,
  height: number,
) => invoke("set_layer_transform", { id, xpos, ypos, width, height });
// CHR-118: the drag surface is the preview (edit) compositor.
export const setPreviewLayerTransform = (
  id: string,
  xpos: number,
  ypos: number,
  width: number,
  height: number,
) => invoke("set_preview_layer_transform", { id, xpos, ypos, width, height });

// ── outputs & transitions ──────────────────────────────────────────────────
export const startRecording = (path: string | null) =>
  invoke<string>("start_recording", { path });
export const stopRecording = () => invoke("stop_recording");
export const startBroadcast = (rtmpUrl: string, sandbox: boolean) =>
  invoke("start_broadcast", { rtmpUrl, sandbox });
export const stopBroadcast = () => invoke("stop_broadcast");
export const broadcastStatus = () => invoke<SourceStatus>("broadcast_status");
export const outputStats = (id: string) => invoke<OutputStats | null>("output_stats", { id });
export const setProgramBlack = (black: boolean, fadeMs: number) =>
  invoke("set_program_black", { black, fadeMs });

// ── encoder ────────────────────────────────────────────────────────────────
export const listEncoders = () => invoke<string[]>("list_encoders");
export const getEncoderConfig = () => invoke<EncoderInfo>("get_encoder_config");
export const setEncoderConfig = (config: EncoderConfig) =>
  invoke("set_encoder_config", { config });

// ── audio mixer ────────────────────────────────────────────────────────────
export const startAudio = () => invoke("start_audio");
export const stopAudio = () => invoke("stop_audio");
export const addAudioTone = (id: string, freq: number) =>
  invoke("add_audio_tone", { id, freq });
export const removeAudioChannel = (id: string) => invoke("remove_audio_channel", { id });
export const setAudioChannel = (
  id: string,
  gain: number,
  muted: boolean,
  balance: number,
) => invoke("set_audio_channel", { id, gain, muted, balance });
export const audioLevels = () => invoke<Record<string, number>>("audio_levels");

// CHR-124: the engine audio bus (real audio in outputs + real VU), keyed by layer id.
export const mixerChannelAdd = (id: string, freq: number | null) =>
  invoke("mixer_channel_add", { id, freq });
export const mixerChannelRemove = (id: string) => invoke("mixer_channel_remove", { id });
export const mixerChannelSet = (
  id: string,
  fader: number,
  gainDb: number,
  muted: boolean,
  balance: number,
) => invoke("mixer_channel_set", { id, fader, gainDb, muted, balance });
export const mixerLevels = () => invoke<Record<string, number>>("mixer_levels");

// French labels for source/layer kinds.
export const KIND_LABELS: Record<string, string> = {
  bible: "Bible",
  text: "Texte",
  song: "Chant",
  image: "Image / Fond",
  camera: "Caméra",
  screen: "Écran",
  group: "Groupe",
  video: "Vidéo",
};
export const kindLabel = (k: string) => KIND_LABELS[k] ?? k;
