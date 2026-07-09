import {
  BookOpen,
  Type,
  Music,
  ImageIcon,
  Radio,
  Video,
  Film,
  MonitorUp,
  Volume2,
  Folder,
  type LucideIcon,
} from "lucide-react";

// Ported 1:1 from church-client studio-layers.ts. Our domain LayerKind
// serialises to these exact strings (snake_case), so we key by the kind string.
export type StudioLayerType =
  | "bible"
  | "text"
  | "song"
  | "image"
  | "camera"
  | "screen"
  | "video"
  | "embed"
  | "audio"
  | "group";

export const LAYER_META: Record<StudioLayerType, { label: string; color: string; typeLabel: string }> = {
  bible: { label: "Bible", color: "#e2b85f", typeLabel: "Bible · Écriture" },
  text: { label: "Texte", color: "#60a5fa", typeLabel: "Texte surimpression" },
  song: { label: "Chant", color: "#b270ff", typeLabel: "Chant · Paroles" },
  image: { label: "Image / Fond", color: "#34d399", typeLabel: "Image / Fond" },
  camera: { label: "Caméra / Capture", color: "#c89af0", typeLabel: "Caméra · webcam / capture" },
  screen: { label: "Capture d'écran", color: "#5eb0d0", typeLabel: "Écran · fenêtre / onglet" },
  video: { label: "Vidéo", color: "#f0a868", typeLabel: "Vidéo · lien ou fichier" },
  embed: { label: "Direct externe", color: "#ff6b6b", typeLabel: "YouTube / Facebook" },
  audio: { label: "Audio", color: "#86d0e0", typeLabel: "Entrée audio" },
  group: { label: "Groupe", color: "#d0c090", typeLabel: "Groupe de calques" },
};

export const ADD_TYPES: StudioLayerType[] = [
  "bible",
  "text",
  "song",
  "image",
  "embed",
  "camera",
  "screen",
  "video",
  "audio",
  "group",
];

export const TYPE_ICON: Record<StudioLayerType, LucideIcon> = {
  bible: BookOpen,
  text: Type,
  song: Music,
  image: ImageIcon,
  embed: Radio,
  camera: Video,
  screen: MonitorUp,
  video: Film,
  audio: Volume2,
  group: Folder,
};

/** Audio-bearing source kinds — the mixer's channels (church-client hasAudio). */
export function hasAudioKind(kind: string): boolean {
  return kind === "embed" || kind === "video" || kind === "audio" || kind === "camera" || kind === "screen";
}

/** Safe meta lookup by kind string (unknown kinds get a neutral fallback). */
export function layerMeta(kind: string) {
  return LAYER_META[kind as StudioLayerType] ?? { label: kind, color: "#9aa", typeLabel: kind };
}
export function layerIcon(kind: string): LucideIcon {
  return TYPE_ICON[kind as StudioLayerType] ?? Folder;
}
