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
  // video / embed (external YouTube/Facebook/HLS link)
  feedUrl?: string;
  // camera / capture (getUserMedia device — webcam, capture card, NDI virtual input)
  deviceId?: string;
  deviceLabel?: string;
  audioDeviceId?: string;
  /** Camera only: hear the capture audio locally (off by default — anti-Larsen). */
  listenLocal?: boolean;
  // audio input (audio source device)
  device?: string;
  /** Bible only: when false the bible keeps showing in the PREVIEW but is
   *  excluded from the antenne/diffusion (CUT sends it hidden). Default true. */
  bibleOnAir?: boolean;
  /** Per-source cut-replay override (CHR-56). "auto" (default) follows the
   *  global "Animer à chaque CUT" toggle; "always"/"never" force it for this
   *  source. A source always animates on its FIRST appearance regardless — this
   *  only governs replaying on a re-CUT of the same scene. */
  replayOnCut?: "auto" | "always" | "never";
  /** Inter-source reaction (CHR-57): the id of the TRIGGER source. While that
   *  trigger is on air, THIS (target) source smoothly transitions to `reactStyle`
   *  (a captured geometry/shape/frame pose) and back when the trigger leaves. */
  reactTo?: string;
  /** The captured "reaction" pose — a subset of StudioSettings (REACTION_KEYS
   *  only: position/size/shape/frame). Applied over `style` while `reactTo` is on air. */
  reactStyle?: Partial<StudioSettings>;
  /** Duration (ms) of the base⇄reaction transition (default 600). */
  reactTransitionMs?: number;
  /** Entry sound cue (CHR-59): plays once, mixed into the REAL program audio,
   *  the moment this source first appears ON AIR (not in the preview — see
   *  program-out.ts's `animStart` appearance branch). Never replays on a plain
   *  re-CUT of the same scene. */
  entrySoundEnabled?: boolean;
  entrySoundUrl?: string;
  entrySoundName?: string;
  /** 0-100, mixer-fader convention like `audioLevel` elsewhere. */
  entrySoundVolume?: number;
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

/**
 * Whether a source replays its entrance on a re-CUT (CHR-56). Per-source
 * override wins; "auto" follows the global default. The bible is never in this
 * set — it re-animates on a VERSE change, not on a plain re-CUT. First-appearance
 * animations are unaffected (a source always animates when it first goes on air).
 */
export function replaysOnCut(l: StudioLayer, globalDefault: boolean): boolean {
  if (l.type === "bible") return false;
  const mode = l.replayOnCut ?? "auto";
  return mode === "always" ? true : mode === "never" ? false : globalDefault;
}

/* ── Inter-source reactions (CHR-57) ──────────────────────────────────────
 * A "reaction" lets a target source adopt an alternate pose (geometry / shape /
 * frame) while a chosen TRIGGER source is on air — e.g. the pastor's camera
 * slides aside + shrinks when a bible verse airs. It is a subset of the
 * target's own StudioSettings, so it flows through the SAME renderers (DOM box
 * + canvas box) as any style.
 */

/** The StudioSettings keys a reaction pose captures/overrides (geometry + form
 *  + frame). Deliberately excludes typography/colour-of-text/animation. */
export const REACTION_KEYS: (keyof StudioSettings)[] = [
  "positionMode",
  "predefinedPosition",
  "customX",
  "customY",
  "customWidth",
  "customHeight",
  "containerShape",
  "containerBorderRadius",
  "containerBorderWidth",
  "containerBorderStyle",
  "containerBorderColor",
  "containerBg",
  "containerPaddingX",
  "containerPaddingY",
  "shadowBlur",
  "shadowSpread",
  "shadowOffsetX",
  "shadowOffsetY",
  "shadowColor",
];

/** Numeric reaction keys SMOOTHLY interpolated base⇄reaction (identical on the
 *  DOM and the canvas → no preview/broadcast drift). Discrete keys (shape enum,
 *  colours, positionMode, borderStyle) switch abruptly on both sides. */
export const REACTION_LERP_NUM: (keyof StudioSettings)[] = [
  "customX",
  "customY",
  "customWidth",
  "customHeight",
  "containerBorderRadius",
  "containerBorderWidth",
  "containerPaddingX",
  "containerPaddingY",
  "shadowBlur",
  "shadowSpread",
  "shadowOffsetX",
  "shadowOffsetY",
];

/** Capture the REACTION_KEYS subset of a style (the "reaction pose"). */
export function pickReactionStyle(s: StudioSettings): Partial<StudioSettings> {
  const out: Partial<StudioSettings> = {};
  for (const k of REACTION_KEYS) (out as Record<string, unknown>)[k] = s[k];
  return out;
}

/**
 * Blend a `base` style with a captured `reactStyle` pose at factor `b`
 * (0 = base, 1 = reaction). Numeric pose keys are lerped; discrete keys (shape,
 * colours, positionMode) switch at the half-way point — identical rule on the
 * DOM and the canvas. The DOM passes 0 or 1 (CSS animates the box between them);
 * the canvas passes the eased progress so it interpolates the pose per frame.
 */
export function blendReactionStyles(
  base: StudioSettings,
  reactStyle: Partial<StudioSettings> | undefined,
  b: number,
): StudioSettings {
  if (!reactStyle || b <= 0) return base;
  const to = { ...base, ...reactStyle };
  if (b >= 1) return to;
  const out: StudioSettings = { ...(b < 0.5 ? base : to) };
  for (const k of REACTION_LERP_NUM) {
    const a = base[k] as number;
    const c = to[k] as number;
    if (typeof a === "number" && typeof c === "number") {
      (out as unknown as Record<string, number>)[k as string] = a + (c - a) * b;
    }
  }
  return out;
}

/** The effective style for a layer at reaction blend `b` (uses `layer.style`). */
export function reactionStyle(l: StudioLayer, b: number): StudioSettings {
  return blendReactionStyles(l.style, l.reactStyle, b);
}

/** Sources that carry an audio channel shown in the mixer. */
export function hasAudio(l: StudioLayer): boolean {
  return l.type === "embed" || l.type === "video" || l.type === "audio" || l.type === "camera";
}

/**
 * Whether an audio channel is actually producing sound right now: the source
 * must be visible (not masked), not muted, and have a real input — a feed link
 * for embed/video, a device for audio/camera. Drives the animated VU meter so it
 * only moves when the source is genuinely on.
 */
export function isAudioActive(l: StudioLayer): boolean {
  if (!hasAudio(l) || !l.visible || l.audioMuted) return false;
  if (l.type === "camera") return !!l.deviceId;
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

export type InspTab = "contenu" | "layout" | "typo" | "container" | "anim" | "reaction" | "presets";

export const LAYER_META: Record<
  StudioLayerType,
  { label: string; color: string; typeLabel: string }
> = {
  bible: { label: "Bible", color: "#e2b85f", typeLabel: "Bible · Écriture" },
  text: { label: "Texte", color: "#60a5fa", typeLabel: "Texte surimpression" },
  song: { label: "Chant", color: "#b270ff", typeLabel: "Chant · Paroles" },
  image: { label: "Image / Fond", color: "#34d399", typeLabel: "Image / Fond" },
  camera: { label: "Caméra / Capture", color: "#c89af0", typeLabel: "Caméra · webcam / capture" },
  video: { label: "Vidéo", color: "#f0a868", typeLabel: "Vidéo · lien ou fichier" },
  embed: { label: "Direct externe", color: "#ff6b6b", typeLabel: "YouTube / Facebook" },
  audio: { label: "Audio", color: "#86d0e0", typeLabel: "Entrée audio" },
  group: { label: "Groupe", color: "#d0c090", typeLabel: "Groupe de calques" },
};

/** Source types offered in the "+" menu. Bible is included but capped at one per
 *  scene (it's the broadcast anchor) — the dock hides it once a scene has one. */
export const ADD_TYPES: StudioLayerType[] = [
  "bible",
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
  return l.type === "image" && l.fill !== "frame";
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
      return ["contenu", "layout", "typo", "container", "anim", "reaction", "presets"];
    case "image":
      return ["contenu", "layout", "container", "anim", "reaction", "presets"];
    case "camera":
    case "video":
    case "embed":
      return ["contenu", "layout", "anim", "reaction", "presets"];
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
  if (type === "embed" || type === "video" || type === "camera") {
    // A movable / resizable video window (PiP-style); set it full-frame via the
    // "Plein écran" layout preset. Default to NO entrance so a live camera never
    // fades on a CUT — the operator opts into an effect in the Anim tab (CHR-56).
    return {
      ...DEFAULT_STUDIO_SETTINGS,
      animation: "none",
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
    base.style = { ...base.style, fontBodyStyle: "italic", fontBodySize: 102 };
  }
  if (type === "image") {
    // Default to a framed (movable + resizable) overlay; switch to "cover" in
    // the inspector for a full-bleed background.
    base.fill = "frame";
    base.imageHue = Math.floor(Math.random() * 360);
    base.imageUrl = "";
  }
  if (type === "video" || type === "embed") {
    base.feedUrl = "";
  }
  if (type === "video") {
    base.loop = true;
  }
  if (type === "camera") {
    base.deviceId = "";
    base.listenLocal = false;
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
    // Children are real, flat layers (parentId) added via the Sources "+" — the
    // renderer and drag use that model. A nested `layers` child would never draw.
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
