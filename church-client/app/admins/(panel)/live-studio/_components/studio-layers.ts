import { DEFAULT_STUDIO_SETTINGS, type ScriptureVerse, type StudioSettings } from "@/lib/studio";

/**
 * Scene/layer model for the régie compositor. The Bible layer is special — its
 * verse + style + version are the REAL broadcast state owned by the
 * orchestrator (`preview`/`settings`/`defaultVersion`) so diffusion and
 * persistence keep working. Every other layer type is a front-end composite
 * (text / image / camera / video) that overlays the preview by z-order.
 */
export type StudioLayerType =
  | "bible"
  | "text"
  | "song"
  | "image"
  | "camera"
  | "video"
  | "embed"
  | "audio"
  | "group";

export type StudioLayer = {
  id: string;
  type: StudioLayerType;
  name: string;
  visible: boolean;
  /** Per-layer style for non-bible layers. The bible layer ignores this and
   *  uses the orchestrator's real `settings`. */
  style: StudioSettings;
  // text / song (song stores its lyrics in `content`, one line per row)
  content?: string;
  sub?: string;
  // image
  imageUrl?: string;
  imageHue?: number;
  fill?: "cover" | "frame";
  // camera / video / embed (external YouTube/Facebook/HLS link)
  feedUrl?: string;
  // audio input (audio source device)
  device?: string;
  // song stanzas (feature/CHR-39)
  stanzas?: Array<{ name: string; content: string }>;
  activeStanzaIndex?: number;
  songLiveActive?: boolean;
  // group child layers (feature/CHR-41)
  layers?: StudioLayer[];
  groupLiveActive?: boolean;
  parentId?: string;
  // audio mixer config (embed / video / audio sources)
  audioLevel?: number; // 0-100 fader
  audioMuted?: boolean;
  audioGain?: number; // -20..+20 dB
  audioBalance?: number; // -100 (L) .. +100 (R)
  // audio file configuration (feature/CHR-42)
  audioSourceType?: "device" | "file";
  audioFileUrl?: string;
  audioFileName?: string;
  audioLoop?: boolean;
  audioSpeed?: number;
  audioPlaying?: boolean;
  audioLiveActive?: boolean;
  // video transport (video source)
  loop?: boolean;
};

/** Sources that carry an audio channel shown in the mixer. */
export function hasAudio(l: StudioLayer): boolean {
  return l.type === "embed" || l.type === "video" || l.type === "audio" || l.type === "camera";
}

/**
 * Whether an audio channel is actually producing sound right now: the source
 * must be visible (not masked), not muted, and have a real input — a feed link
 * for embed/video, a device for audio. Drives the animated VU meter so it only
 * moves when the source is genuinely on.
 */
export function isAudioActive(l: StudioLayer): boolean {
  if (!hasAudio(l) || !l.visible || l.audioMuted) return false;
  if (l.type === "audio") {
    return !!l.audioPlaying && !!l.audioFileUrl;
  }
  return !!l.feedUrl?.trim();
}

export type StudioScene = {
  id: string;
  name: string;
  layers: StudioLayer[];
};

export type InspTab = "contenu" | "layout" | "typo" | "container" | "anim" | "presets";

export const LAYER_META: Record<
  StudioLayerType,
  { label: string; color: string; typeLabel: string }
> = {
  bible: { label: "Bible", color: "#e2b85f", typeLabel: "Bible · Écriture" },
  text: { label: "Texte", color: "#60a5fa", typeLabel: "Texte surimpression" },
  song: { label: "Chant", color: "#b270ff", typeLabel: "Chant · Paroles" },
  image: { label: "Image / Fond", color: "#34d399", typeLabel: "Image / Fond" },
  camera: { label: "Caméra NDI", color: "#c89af0", typeLabel: "Caméra NDI" },
  video: { label: "Vidéo", color: "#f0a868", typeLabel: "Vidéo · lien ou fichier" },
  embed: { label: "Direct externe", color: "#ff6b6b", typeLabel: "YouTube / Facebook" },
  audio: { label: "Audio", color: "#86d0e0", typeLabel: "Entrée audio" },
  group: { label: "Groupe", color: "#d0c090", typeLabel: "Groupe de calques" },
};

/** Source types offered in the "+" menu (bible excluded — one real bible layer). */
export const ADD_TYPES: StudioLayerType[] = [
  "text",
  "song",
  "image",
  "embed",
  "camera",
  "video",
  "audio",
  "group",
];

/** Background layers fill the whole frame and sit behind overlays. */
export function isBackgroundLayer(l: StudioLayer): boolean {
  return l.type === "camera" || (l.type === "image" && l.fill !== "frame");
}

/** Audio has no visual output — it never renders on a monitor. */
export function isCompositable(l: StudioLayer): boolean {
  return l.type !== "audio";
}

export function layerTabs(type: StudioLayerType): InspTab[] {
  switch (type) {
    case "bible":
    case "text":
    case "song":
    case "group":
      return ["contenu", "layout", "typo", "container", "anim", "presets"];
    case "image":
      return ["contenu", "layout", "container", "anim", "presets"];
    case "camera":
    case "video":
    case "embed":
      return ["contenu", "layout", "anim", "presets"];
    case "audio":
      return ["contenu"];
  }
}

export function defaultLayerStyle(type: StudioLayerType): StudioSettings {
  if (type === "text") {
    return { ...DEFAULT_STUDIO_SETTINGS, fontBodyFamily: "Plus Jakarta Sans", fontBodyWeight: "700" };
  }
  if (type === "image") {
    return {
      ...DEFAULT_STUDIO_SETTINGS,
      animation: "none",
      containerShape: "transparent",
      positionMode: "custom",
      customX: 28,
      customY: 18,
      customWidth: 44,
      customHeight: 55,
    };
  }
  if (type === "song") {
    return {
      ...DEFAULT_STUDIO_SETTINGS,
      animation: "none",
      fontBodyFamily: "Plus Jakarta Sans",
      fontBodyWeight: "700",
    };
  }
  if (type === "embed" || type === "video") {
    // A movable / resizable video window (PiP-style); set it full-frame via the
    // "Plein écran" layout preset.
    return {
      ...DEFAULT_STUDIO_SETTINGS,
      containerShape: "transparent",
      positionMode: "custom",
      customX: 8,
      customY: 8,
      customWidth: 84,
      customHeight: 78,
    };
  }
  if (type === "group") {
    return {
      ...DEFAULT_STUDIO_SETTINGS,
      animation: "none",
    };
  }
  return { ...DEFAULT_STUDIO_SETTINGS };
}

let layerSeq = 0;
export function createLayer(type: StudioLayerType, existingCount: number): StudioLayer {
  layerSeq += 1;
  const n = existingCount + 1;
  const base: StudioLayer = {
    id: `layer-${Date.now()}-${layerSeq}`,
    type,
    name: `${LAYER_META[type].label} ${n}`,
    visible: true,
    style: defaultLayerStyle(type),
  };
  if (type === "text") {
    base.content = "Nouveau texte de surimpression";
    base.sub = "";
  }
  if (type === "song") {
    base.content = "Première ligne du chant\nDeuxième ligne";
    base.stanzas = [
      { name: "Couplet 1", content: "Première ligne du chant\nDeuxième ligne" },
      { name: "Refrain", content: "Ceci est le refrain\nChanté en chœur" }
    ];
    base.activeStanzaIndex = 0;
    base.songLiveActive = false;
    base.style = { ...base.style, fontBodyStyle: "italic", fontBodySize: 34 };
  }
  if (type === "image") {
    // Default to a framed (movable + resizable) overlay; switch to "cover" in
    // the inspector for a full-bleed background.
    base.fill = "frame";
    base.imageHue = Math.floor(Math.random() * 360);
    base.imageUrl = "";
  }
  if (type === "camera" || type === "video" || type === "embed") {
    base.feedUrl = "";
  }
  if (type === "video") {
    base.loop = true;
  }
  if (type === "audio") {
    base.audioSourceType = "file";
    base.audioLevel = 80;
    base.audioMuted = false;
    base.audioGain = 0;
    base.audioBalance = 0;
    base.audioLoop = false;
    base.audioSpeed = 1.0;
    base.audioPlaying = false;
    base.audioLiveActive = false;
  }
  if (type === "group") {
    base.layers = [
      {
        id: `layer-${Date.now()}-group-child-1`,
        type: "text",
        name: "Texte du groupe",
        visible: true,
        style: { ...DEFAULT_STUDIO_SETTINGS, fontBodySize: 28, fontBodyColor: "#ffffff" },
        content: "Ceci est un calque texte groupé",
      }
    ];
    base.groupLiveActive = false;
  }
  if (hasAudio(base)) {
    base.audioLevel = 80;
    base.audioMuted = false;
    base.audioGain = 0;
    base.audioBalance = 0;
  }
  return base;
}

/** A diagonal hatch placeholder for an image layer with no source yet. */
export function imageHatch(hue: number): string {
  return `repeating-linear-gradient(135deg, hsla(${hue},45%,55%,.22) 0 16px, hsla(${hue},45%,42%,.34) 16px 32px)`;
}

export type { ScriptureVerse };
