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

// Minimal mirror of studio_core::Studio (we type the fields the régie renders).
export type StudioLayer = {
  id: string;
  kind: string;
  name: string;
  visible: boolean;
  parent_id?: string | null;
};
export type StudioScene = { id: string; name: string; layers: StudioLayer[] };
export type StudioDoc = {
  scenes: StudioScene[];
  currentSceneId: string;
  selectedLayerId: string | null;
  program?: { black: boolean };
};
export type StudioCommand = Record<string, unknown> & { type: string };

// ── capabilities & engine ──────────────────────────────────────────────────
export const getCapabilities = () => invoke<Capabilities>("get_capabilities");
export const canvasSize = () => invoke<[number, number]>("canvas_size");
export const startPreview = () => invoke("start_preview");
export const stopPreview = () => invoke("stop_preview");
export const mediaStatus = () => invoke<MediaStatus>("media_status");
export const previewFrame = () => invoke<string | null>("preview_frame");

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
export const setLayerTransform = (
  id: string,
  xpos: number,
  ypos: number,
  width: number,
  height: number,
) => invoke("set_layer_transform", { id, xpos, ypos, width, height });

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
