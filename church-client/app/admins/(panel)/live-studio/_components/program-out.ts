/**
 * Program-out compositor — the browser-side equivalent of OBS's scene renderer.
 *
 * The régie stacks layers as DOM (`composite-layer.tsx`). A browser can't capture
 * a DOM subtree to video, so to push the program to Facebook (RTMPS via the
 * bridge) we re-draw the scene onto ONE `<canvas>` and mix the layers' audio into
 * ONE track. `canvas.captureStream()` + the mixed audio give a single flat
 * `MediaStream` — everything "burned in", exactly like OBS hands Facebook a flat
 * picture.
 *
 * v1 scope: camera / capture, image (background or framed) and video layers,
 * drawn in their final (static) position. Text / bible / song overlays and
 * entrance animations are v2/v3. Embeds (cross-origin iframes) are never
 * drawable and are skipped.
 *
 * Cross-origin caveat: drawing a cross-origin `<video>`/`<img>` taints the canvas
 * and makes `captureStream()` throw. Sources therefore load with
 * `crossOrigin="anonymous"` — uploads served from `/studio/media` must send CORS
 * headers, and external links without CORS simply won't appear.
 */

import { assetUrl } from "@/lib/asset-url";
import { getAudioContext, getAudioController } from "./studio-audio";
import { getCameraStream, subscribeCameraStreams } from "./studio-camera";
import {
  drawBibleLayer,
  drawContainerBox,
  drawContentLayer,
  drawImageLayer,
  drawScrollLayer,
  drawVideoFrame,
} from "./program-out-text";
import { computeEntrance, cubicBezier, type AnimResult } from "./program-out-anim";
import { EASING_BEZIER, type AnimSourceKind } from "@/lib/studio-animations";
import { getVideoController } from "./studio-video";
import {
  blendReactionStyles,
  isBackgroundLayer,
  type ScriptureVerse,
  type StudioLayer,
} from "./studio-layers";
import type { StudioSettings } from "@/lib/studio";

/** On-air bible verse + its style (owned by the console, not the layer). */
export type BibleContext = { verse: ScriptureVerse | null; style: StudioSettings } | null;

/* ── URL + geometry helpers (mirror composite-layer / studio-style) ──────── */

/** Resolve a stored media path for THIS tenant (same rule as the DOM renderer's
 *  `getImageUrl`): a same-origin `/tenancy/assets/…` URL (CHR-154). */
function resolveMediaUrl(url: string | undefined | null): string {
  return assetUrl(url) ?? "";
}

type Box = { x: number; y: number; w: number; h: number };

/** Numeric mirror of `getPredefinedAbsolutePosition` (0..1 fractions, right-anchored
 *  presets converted to left). */
const PREDEFINED_BOX: Record<string, Box> = {
  lower_third_left: { x: 0.06, y: 0.72, w: 0.4, h: 0.2 },
  lower_third_right: { x: 0.54, y: 0.72, w: 0.4, h: 0.2 },
  centered_top: { x: 0.1, y: 0.08, w: 0.8, h: 0.2 },
  ticker: { x: 0, y: 0.86, w: 1, h: 0.14 },
  banner_top: { x: 0, y: 0, w: 1, h: 0.14 },
  full_screen_cinema: { x: 0.1, y: 0.1, w: 0.8, h: 0.8 },
  full_screen: { x: 0, y: 0, w: 1, h: 1 },
  pip_top_left: { x: 0.04, y: 0.05, w: 0.34, h: 0.34 },
  pip_top_right: { x: 0.62, y: 0.05, w: 0.34, h: 0.34 },
  pip_bottom_left: { x: 0.04, y: 0.61, w: 0.34, h: 0.34 },
  pip_bottom_right: { x: 0.62, y: 0.61, w: 0.34, h: 0.34 },
  centered_bottom: { x: 0.1, y: 0.72, w: 0.8, h: 0.2 },
};

/** Box as 0..1 fractions of the frame from a style (mirror of `getOverlayBoxStyle`). */
function boxFromStyle(s: StudioSettings): Box {
  if (s.positionMode === "custom") {
    return {
      x: (s.customX ?? 0) / 100,
      y: (s.customY ?? 0) / 100,
      w: (s.customWidth ?? 100) / 100,
      h: (s.customHeight ?? 100) / 100,
    };
  }
  return PREDEFINED_BOX[s.predefinedPosition || "centered_bottom"] ?? PREDEFINED_BOX.centered_bottom;
}

/** Layer box: full-frame backgrounds, else the layer's own style geometry. */
function layerBox(layer: StudioLayer): Box {
  if (isBackgroundLayer(layer)) return { x: 0, y: 0, w: 1, h: 1 };
  return boxFromStyle(layer.style);
}

/** A song layer's on-air lyrics: the active stanza, else the raw content. */
function layerSongText(layer: StudioLayer): string {
  if (layer.stanzas && layer.activeStanzaIndex !== undefined) {
    return layer.stanzas[layer.activeStanzaIndex]?.content ?? "";
  }
  return layer.content ?? "";
}

/** `object-fit: cover` draw of a media source clipped to a pixel box. */
function drawCover(
  ctx: CanvasRenderingContext2D,
  media: CanvasImageSource,
  sw: number,
  sh: number,
  bx: number,
  by: number,
  bw: number,
  bh: number,
): void {
  if (!sw || !sh || bw <= 0 || bh <= 0) return;
  const scale = Math.max(bw / sw, bh / sh);
  const dw = sw * scale;
  const dh = sh * scale;
  const dx = bx + (bw - dw) / 2;
  const dy = by + (bh - dh) / 2;
  ctx.save();
  ctx.beginPath();
  ctx.rect(bx, by, bw, bh);
  ctx.clip();
  ctx.drawImage(media, dx, dy, dw, dh);
  ctx.restore();
}

const dbToLinear = (db: number): number => Math.pow(10, db / 20);

/** Apply an animation's transform to the context (caller wraps in
 *  save/restore). Shared by every layer draw — media AND text overlays. */
function applyEntranceTransform(
  ctx: CanvasRenderingContext2D,
  a: AnimResult,
  box: { x: number; y: number; w: number; h: number },
): void {
  ctx.globalAlpha = a.alpha;
  // ctx.filter participates in save/restore, so the blur ends with the layer.
  if (a.blur && a.blur > 0.5) ctx.filter = `blur(${Math.round(a.blur)}px)`;
  if (a.tx || a.ty) ctx.translate(a.tx, a.ty);
  const sx = (a.scaleX ?? 1) * a.scale;
  const sy = (a.scaleY ?? 1) * a.scale;
  if (sx !== 1 || sy !== 1 || a.rotate) {
    // 3D flips hinge on an edge (origin left/top); everything else on center.
    const ox = a.origin === "left" ? box.x : box.x + box.w / 2;
    const oy = a.origin === "top" ? box.y : box.y + box.h / 2;
    ctx.translate(ox, oy);
    if (a.rotate) ctx.rotate(a.rotate);
    if (sx !== 1 || sy !== 1) ctx.scale(sx, sy);
    ctx.translate(-ox, -oy);
  }
  if (a.clip) {
    const p = Math.max(0, Math.min(1, a.clip.p));
    ctx.beginPath();
    if (a.clip.kind === "left") {
      ctx.rect(box.x, box.y, box.w * p, box.h);
    } else if (a.clip.kind === "right") {
      ctx.rect(box.x + box.w * (1 - p), box.y, box.w * p, box.h);
    } else if (a.clip.kind === "up") {
      ctx.rect(box.x, box.y + box.h * (1 - p), box.w, box.h * p);
    } else if (a.clip.kind === "down") {
      ctx.rect(box.x, box.y, box.w, box.h * p);
    } else if (a.clip.kind === "center") {
      ctx.rect(box.x + (box.w * (1 - p)) / 2, box.y, box.w * p, box.h);
    } else {
      // iris — a circle growing from the box center to cover its diagonal.
      const r = (Math.hypot(box.w, box.h) / 2) * p;
      ctx.arc(box.x + box.w / 2, box.y + box.h / 2, Math.max(0.001, r), 0, Math.PI * 2);
    }
    ctx.clip();
  }
}

/** The image-typewriter sweep bar (CHR-56 P2) — drawn AFTER the layer's
 *  save/restore so the clip doesn't cut the cursor in half at the reveal edge. */
function drawRevealCursor(
  ctx: CanvasRenderingContext2D,
  a: AnimResult,
  box: { x: number; y: number; w: number; h: number },
  scale: number,
): void {
  if (!a.clip?.cursor || a.clip.p >= 1) return;
  const x = box.x + box.w * a.clip.p;
  const w = Math.max(2, 3 * scale);
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = "#e2b85f";
  ctx.fillRect(x - w / 2, box.y, w, box.h);
  ctx.restore();
}

/* ── Per-layer render sources ────────────────────────────────────────────── */

type DrawKind = "camera" | "screen" | "video" | "image" | "audio";

type Source = {
  kind: DrawKind;
  /** The element sampled every frame (`<video>`/`<img>`), or the mixed `<audio>`. */
  el: HTMLVideoElement | HTMLImageElement | HTMLAudioElement;
  /** Current source key (deviceId / feedUrl / imageUrl) to detect changes. */
  key: string;
  /** Audio nodes for video / camera channels (null for images). */
  audio?: {
    node: AudioNode;
    gain: GainNode;
    pan: StereoPannerNode;
  };
  /** Camera only: the shared stream currently bound, to detect replacement. */
  camStream?: MediaStream;
};

/** The source (visual or audio-only) a layer needs in the program feed, if any. */
function drawableKey(layer: StudioLayer): { kind: DrawKind; key: string } | null {
  // Audio has no visual — it feeds the mix only when "Mode de diffusion direct
  // (Antenne)" is on (audioLiveActive); otherwise it stays a local-only preview.
  if (layer.type === "audio") {
    return layer.audioFileUrl && layer.audioLiveActive
      ? { kind: "audio", key: `aud:${layer.audioFileUrl}` }
      : null;
  }
  if (!layer.visible) return null;
  if (layer.type === "camera") {
    return layer.deviceId ? { kind: "camera", key: `dev:${layer.deviceId}` } : null;
  }
  if (layer.type === "screen") {
    // No persistable id — the truth is the shared-stream registry. Only drawable
    // when a getDisplayMedia stream is actually live (a stale captureActive flag
    // after a reload has no stream, so nothing is drawn). The stream-replacement
    // stale check (below) rebinds if the operator re-shares.
    return getCameraStream(layer.id) ? { kind: "screen", key: `scr:${layer.id}` } : null;
  }
  if (layer.type === "video") {
    const url = (layer.feedUrl || "").trim();
    return url ? { kind: "video", key: `vid:${url}` } : null;
  }
  if (layer.type === "image") {
    return layer.imageUrl ? { kind: "image", key: `img:${layer.imageUrl}` } : null;
  }
  return null; // text / bible / song / embed — not drawn
}

export type ProgramOut = {
  /** The flat program feed: one video track (canvas) + one mixed audio track. */
  readonly stream: MediaStream;
  /** The backing canvas (handy to mirror the outgoing feed in a preview). */
  readonly canvas: HTMLCanvasElement;
  /** Update the composited scene (ordered bottom→top) + the on-air bible verse.
   *  `replaySet` (default null = replay all) is the set of layer ids that replay
   *  their entrance on a CUT (animNonce bump); a layer outside it still animates
   *  on first appearance. The bible always replays on a verse change. */
  setScene: (
    layers: StudioLayer[],
    bible?: BibleContext,
    animNonce?: number,
    replaySet?: ReadonlySet<string> | null,
    activeTriggers?: ReadonlySet<string> | null,
  ) => void;
  /** Tear down the loop, media elements and audio graph. */
  stop: () => void;
};

/**
 * Start a program-out compositor. Call on a user gesture (the "Passer en live" /
 * "Diffuser sur Facebook" click) so unmuted playback and the AudioContext are
 * allowed to run.
 */
export function startProgramOut(opts?: {
  width?: number;
  height?: number;
  fps?: number;
  /** Text px scale = canvas height ÷ preview-stage height, so burned-in overlays
   *  match the size the operator tuned in the (smaller) preview. */
  scale?: number;
}): ProgramOut {
  const width = opts?.width ?? 1280;
  const height = opts?.height ?? 720;
  const fps = opts?.fps ?? 30;
  const textScale = opts?.scale && opts.scale > 0 ? opts.scale : 1;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: false })!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const audioCtx = getAudioContext();
  const mixDest = audioCtx?.createMediaStreamDestination() ?? null;

  // Keep a continuous silent source feeding the mix so the outgoing stream carries
  // an audio track from t=0. Without it, camera audio can start a few seconds in,
  // the RTMP relay then maps no audio, and Facebook drops a video-only stream.
  let keepAlive: ConstantSourceNode | null = null;
  if (audioCtx && mixDest) {
    keepAlive = audioCtx.createConstantSource();
    keepAlive.offset.value = 0;
    keepAlive.connect(mixDest);
    keepAlive.start();
  }
  void audioCtx?.resume().catch(() => {});

  // The scene, ordered bottom→top, kept between frames.
  let scene: StudioLayer[] = [];
  let bibleContext: BibleContext = null;
  // CHR-57 — the trigger ids currently on air, and each reacting layer's
  // transition phase (target 0/1 + the blend value it started from) so the pose
  // interpolates smoothly, even when the trigger flips mid-transition.
  let activeTriggerIds: ReadonlySet<string> | null = null;
  const reactPhase = new Map<string, { active: boolean; at: number; from: number }>();
  // When each layer entered the scene, to time its entrance animation.
  const animStart = new Map<string, number>();
  // The last on-air verse, so a new verse re-triggers the bible's entrance.
  let lastBibleSig = "";
  // Program animation nonce — the console bumps it on CUT / advance / on-air edit
  // (the DOM replays via a key change); we replay all entrances when it changes.
  let lastAnimNonce = -1;
  const sources = new Map<string, Source>();

  function makeVideoEl(): HTMLVideoElement {
    const el = document.createElement("video");
    el.crossOrigin = "anonymous";
    el.playsInline = true;
    el.autoplay = true;
    return el;
  }

  /** Wire a layer's audio into the mix (fader / mute / gain / pan). */
  function connectAudio(node: AudioNode) {
    if (!audioCtx || !mixDest) return undefined;
    const gain = audioCtx.createGain();
    const pan = audioCtx.createStereoPanner();
    node.connect(gain);
    gain.connect(pan);
    pan.connect(mixDest);
    return { node, gain, pan };
  }

  /**
   * Entry sound cue (CHR-59): a one-shot clip mixed straight into the REAL
   * program audio (`mixDest`) — the same graph every other source uses, so it
   * reaches Facebook and the site's WHEP player exactly like a camera's mic.
   * Fire-and-forget: the element (and its Web Audio node) is discarded once
   * playback ends. Best-effort — a blocked/failed play must never break the
   * compositor.
   */
  function playEntrySound(layer: StudioLayer) {
    if (!layer.entrySoundEnabled || !layer.entrySoundUrl || !audioCtx || !mixDest) return;
    const el = document.createElement("audio");
    el.crossOrigin = "anonymous";
    el.src = resolveMediaUrl(layer.entrySoundUrl);
    let audio: ReturnType<typeof connectAudio> | undefined;
    try {
      audio = connectAudio(audioCtx.createMediaElementSource(el));
    } catch {
      return; // CORS-tainted source or unsupported — skip silently, best-effort.
    }
    if (audio) audio.gain.gain.value = Math.max(0, Math.min(1, (layer.entrySoundVolume ?? 80) / 100));
    const cleanup = () => {
      try {
        audio?.node.disconnect();
        audio?.gain.disconnect();
        audio?.pan.disconnect();
      } catch {
        /* noop */
      }
      el.removeAttribute("src");
      el.load();
    };
    el.addEventListener("ended", cleanup, { once: true });
    void el.play().catch(cleanup);
  }

  function applyAudioLevels(layer: StudioLayer, src: Source) {
    if (!src.audio) return;
    const muted = layer.audioMuted ?? false;
    const level = (layer.audioLevel ?? 80) / 100;
    const gainDb = layer.audioGain ?? 0;
    const target = muted ? 0 : level * dbToLinear(gainDb);
    const pan = Math.max(-1, Math.min(1, (layer.audioBalance ?? 0) / 100));
    // Ramp instead of an abrupt assignment — a stepped gain clicks/crackles.
    const t = audioCtx?.currentTime ?? 0;
    src.audio.gain.gain.setTargetAtTime(target, t, 0.02);
    src.audio.pan.pan.setTargetAtTime(pan, t, 0.02);
  }

  function ensureSource(layer: StudioLayer, kind: DrawKind, key: string): Source | null {
    const existing = sources.get(layer.id);
    if (existing && existing.key === key) {
      // Camera/screen keys don't change with the underlying stream — rebuild when
      // the shared stream is replaced (re-acquired) so we bind the live one.
      const streamStale =
        (kind === "camera" || kind === "screen") &&
        existing.camStream !== (getCameraStream(layer.id) ?? undefined);
      if (!streamStale) {
        applyAudioLevels(layer, existing);
        return existing;
      }
    }
    if (existing) disposeSource(layer.id, existing);

    let src: Source | null = null;
    if (kind === "camera" || kind === "screen") {
      const shared = getCameraStream(layer.id);
      if (!shared) return null;
      // Clone the tracks so we never touch the Preview's live stream or its audio
      // node — attaching the shared MediaStream to a 2nd <video> AND a 2nd
      // MediaStreamAudioSourceNode froze the Preview element (Chrome). Clones are
      // independent consumers of the same device.
      const cloned = new MediaStream(shared.getTracks().map((t) => t.clone()));
      const el = makeVideoEl();
      el.muted = true; // audio taken via the mix, not the element output
      el.srcObject = cloned;
      void el.play().catch(() => {});
      const audio =
        audioCtx && cloned.getAudioTracks().length > 0
          ? connectAudio(audioCtx.createMediaStreamSource(cloned))
          : undefined;
      src = { kind, el, key, audio, camStream: shared };
    } else if (kind === "video") {
      const el = makeVideoEl();
      el.loop = layer.loop ?? true;
      el.src = resolveMediaUrl(layer.feedUrl);
      void el.play().catch(() => {});
      // Routing through a MediaElementSource silences the element locally and
      // sends its audio only to the mix (never to ctx.destination).
      let audio: Source["audio"];
      if (audioCtx) {
        try {
          audio = connectAudio(audioCtx.createMediaElementSource(el));
        } catch {
          audio = undefined;
        }
      }
      src = { kind, el, key, audio };
    } else if (kind === "audio") {
      // Audio file source → its own element (CORS so Web Audio isn't tainted) →
      // mix. Silent locally (never routed to ctx.destination); synced to the
      // master transport in the interval below.
      const el = document.createElement("audio");
      el.crossOrigin = "anonymous";
      el.preload = "auto";
      el.loop = layer.audioLoop ?? false;
      el.src = resolveMediaUrl(layer.audioFileUrl);
      void el.play().catch(() => {});
      let audio: Source["audio"];
      if (audioCtx) {
        try {
          audio = connectAudio(audioCtx.createMediaElementSource(el));
        } catch {
          audio = undefined;
        }
      }
      src = { kind, el, key, audio };
    } else {
      const el = new Image();
      el.crossOrigin = "anonymous";
      el.src = resolveMediaUrl(layer.imageUrl);
      src = { kind, el, key };
    }
    sources.set(layer.id, src);
    applyAudioLevels(layer, src);
    return src;
  }

  function disposeSource(id: string, src: Source) {
    try {
      src.audio?.node.disconnect();
      src.audio?.gain.disconnect();
      src.audio?.pan.disconnect();
    } catch {
      /* noop */
    }
    if (src.el instanceof HTMLMediaElement) {
      const streamObj = src.el instanceof HTMLVideoElement ? src.el.srcObject : null;
      src.el.pause();
      if (src.el instanceof HTMLVideoElement) src.el.srcObject = null;
      // Stop our own cloned camera tracks (independent of the Preview's stream).
      if (streamObj instanceof MediaStream) {
        streamObj.getTracks().forEach((t) => t.stop());
      }
      src.el.removeAttribute("src");
      src.el.load();
    }
    sources.delete(id);
  }

  function setScene(
    layers: StudioLayer[],
    bible?: BibleContext,
    animNonce = 0,
    replaySet: ReadonlySet<string> | null = null,
    activeTriggers: ReadonlySet<string> | null = null,
  ) {
    scene = layers;
    bibleContext = bible ?? null;
    activeTriggerIds = activeTriggers;
    const live = new Set<string>();
    for (const layer of layers) {
      const d = drawableKey(layer);
      if (!d) continue;
      live.add(layer.id);
      ensureSource(layer, d.kind, d.key);
    }
    // Drop sources whose layer disappeared or is no longer drawable.
    for (const [id, src] of sources) {
      if (!live.has(id)) disposeSource(id, src);
    }
    // Start an entrance animation when a layer first appears on the program
    // (matches the DOM, which animates on mount); reset it when it leaves so a
    // re-appearance (e.g. after a black cut) plays again.
    const now = performance.now();
    const present = new Set<string>();
    for (const layer of layers) {
      if (!layer.visible) continue;
      present.add(layer.id);
      if (!animStart.has(layer.id)) {
        animStart.set(layer.id, now);
        // Entry sound fires HERE — true first appearance only, never on the
        // CUT-replay branch below (that would re-trigger the cue every CUT).
        playEntrySound(layer);
      }
    }
    for (const id of animStart.keys()) {
      if (!present.has(id)) animStart.delete(id);
    }
    // The console's program nonce bumps on CUT / advance / on-air edit — replay
    // every entrance so operators see the animation on air (and on Facebook).
    // The bible is excluded: its on-air verse/style arrives a tick later (async
    // pushLive), so a nonce-driven replay would play the PREVIOUS verse first —
    // it re-triggers on the verse change (bibleSig) below instead.
    // On a CUT (nonce bump) replay the entrance ONLY for the layers in the frozen
    // replaySet (null = all). Layers outside it still animate on first APPEARANCE
    // (animStart above) but a re-CUT of the same scene doesn't re-trigger them.
    if (animNonce !== lastAnimNonce) {
      lastAnimNonce = animNonce;
      for (const id of present) {
        // Camera/video replay their entrance too (CHR-56 — parity with the DOM's
        // imperative replay): the transform is purely visual and never touches
        // el.currentTime, so playback is undisturbed. The bible is excluded — its
        // on-air verse/style arrives a tick later (async pushLive), so a nonce
        // replay would flash the PREVIOUS verse; it re-triggers on the verse
        // change (bibleSig) below instead.
        const t = layers.find((x) => x.id === id)?.type;
        if (t === "bible") continue;
        if (replaySet && !replaySet.has(id)) continue;
        animStart.set(id, now);
      }
    }
    // A new verse also re-triggers the bible layer's entrance animation.
    const bibleSig = bibleContext?.verse
      ? `${bibleContext.verse.reference}|${bibleContext.verse.text}`
      : "";
    if (bibleSig && bibleSig !== lastBibleSig) {
      const bibleLayer = layers.find((l) => l.type === "bible" && l.visible);
      if (bibleLayer) animStart.set(bibleLayer.id, now);
    }
    lastBibleSig = bibleSig;
  }

  // CHR-57 — the reaction blend (0 = base pose, 1 = reaction pose) for a layer,
  // eased like the DOM CSS transition. Tracks each layer's phase so a trigger
  // flip mid-transition continues smoothly from the current blend.
  const easeReact = cubicBezier(EASING_BEZIER["ease-out"]);
  function reactionBlend(layer: StudioLayer, now: number): number {
    if (!layer.reactStyle) return 0;
    const active = !!(layer.reactTo && activeTriggerIds?.has(layer.reactTo));
    let ph = reactPhase.get(layer.id);
    if (!ph) {
      ph = { active, at: now, from: active ? 1 : 0 };
      reactPhase.set(layer.id, ph);
    }
    const dur = Math.max(1, layer.reactTransitionMs ?? 600);
    const cur = () => {
      const p = easeReact(Math.min(1, (now - ph!.at) / dur));
      const target = ph!.active ? 1 : 0;
      return ph!.from + (target - ph!.from) * p;
    };
    if (ph.active !== active) {
      const from = cur();
      ph.active = active;
      ph.at = now;
      ph.from = from;
    }
    return cur();
  }

  function drawFrame() {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, width, height);
    const now = performance.now();
    // A group hides its children with it (mirror the DOM's visible filter).
    const hiddenGroups = new Set(scene.filter((l) => !l.visible).map((l) => l.id));
    // Painter's order = bottom→top. The DOM assigns z = length-idx (index 0 on
    // top), so draw the array in REVERSE — otherwise a full-frame camera (bottom
    // of the list) would paint over the overlays.
    for (let i = scene.length - 1; i >= 0; i -= 1) {
      const layer = scene[i];
      if (!layer.visible) continue;
      if (layer.parentId && hiddenGroups.has(layer.parentId)) continue;

      // The bible's real geometry + style is the on-air one, not the snapshot's.
      // CHR-57: blend in the reaction pose (position/size/shape/frame) if this
      // layer reacts to a trigger that is on air — same easing as the DOM.
      const rb = reactionBlend(layer, now);
      const baseStyle = layer.type === "bible" ? bibleContext?.style : layer.style;
      const style = baseStyle ? blendReactionStyles(baseStyle, layer.reactStyle, rb) : baseStyle;
      const b =
        layer.type === "bible" && style
          ? boxFromStyle(style)
          : isBackgroundLayer(layer)
            ? { x: 0, y: 0, w: 1, h: 1 }
            : boxFromStyle(style ?? layer.style);
      const box = { x: b.x * width, y: b.y * height, w: b.w * width, h: b.h * height };

      const src = sources.get(layer.id);
      if (src) {
        // Images + videos are overlays: entrance animation + their frame/style.
        if (layer.type === "image" || layer.type === "video") {
          if (!(src.el instanceof (layer.type === "image" ? HTMLImageElement : HTMLVideoElement))) {
            continue;
          }
          const ready =
            src.el instanceof HTMLImageElement
              ? src.el.complete && src.el.naturalWidth > 0
              : src.el.readyState >= 2 && src.el.videoWidth > 0;
          if (!ready) continue;
          const a = computeEntrance(
            layer.style.animation,
            now - (animStart.get(layer.id) ?? now),
            layer.style.animDuration ?? 500,
            layer.style.animEasing ?? "ease-out",
            textScale,
            layer.type as AnimSourceKind,
          );
          ctx.save();
          applyEntranceTransform(ctx, a, box);
          if (src.el instanceof HTMLImageElement) {
            drawImageLayer(
              ctx,
              src.el,
              src.el.naturalWidth,
              src.el.naturalHeight,
              box,
              style ?? layer.style,
              textScale,
              !isBackgroundLayer(layer),
            );
          } else {
            drawVideoFrame(ctx, src.el, src.el.videoWidth, src.el.videoHeight, box, textScale);
          }
          ctx.restore();
          // Image typewriter (CHR-56): the sweep cursor sits ON the reveal edge,
          // outside the clip — drawn after restore.
          drawRevealCursor(ctx, a, box, textScale);
          continue;
        }
        // Camera / screen: animated like the DOM preview (CHR-56). Safe on CUT:
        // its animStart survives scene pushes (set on APPEARANCE only, and the
        // nonce-driven replay skips cameras) — so a settled camera stays at
        // identity instead of vanishing like the old per-CUT fade did.
        if (src.el instanceof HTMLVideoElement && src.el.readyState >= 2 && src.el.videoWidth > 0) {
          const a = computeEntrance(
            layer.style.animation,
            now - (animStart.get(layer.id) ?? now),
            layer.style.animDuration ?? 500,
            layer.style.animEasing ?? "ease-out",
            textScale,
            layer.type as AnimSourceKind,
          );
          ctx.save();
          applyEntranceTransform(ctx, a, box);
          drawCover(ctx, src.el, src.el.videoWidth, src.el.videoHeight, box.x, box.y, box.w, box.h);
          ctx.restore();
        }
        continue;
      }

      // Group = a styled panel behind its children (which are separate layers).
      if (layer.type === "group") {
        const a = computeEntrance(
          layer.style.animation,
          now - (animStart.get(layer.id) ?? now),
          layer.style.animDuration ?? 500,
          layer.style.animEasing ?? "ease-out",
          textScale,
          "group",
        );
        ctx.save();
        applyEntranceTransform(ctx, a, box);
        drawContainerBox(ctx, box, style ?? layer.style, textScale);
        ctx.restore();
        continue;
      }

      if (layer.type !== "text" && layer.type !== "song" && layer.type !== "bible") continue;

      const variant = style?.animation ?? "none";
      const content =
        layer.type === "bible"
          ? (bibleContext?.verse?.text ?? "")
          : layer.type === "song"
            ? layerSongText(layer)
            : (layer.content ?? "");

      // Scroll ticker (continuous) — its own clip, no entrance transform. Gated
      // by the SAME per-source condition as the DOM (`resolveAnimation`): on a
      // non-text layer a persisted scroll_* degrades to "none" on both sides.
      if (variant.startsWith("scroll_") && layer.type === "text") {
        const dur = style?.animDuration ?? 500;
        const loopMs = dur > 100 ? dur * 12 : 12000;
        const phase = (now % loopMs) / loopMs;
        drawScrollLayer(ctx, box, style ?? layer.style, content, textScale, variant, phase);
        continue;
      }

      // Animation transform (entrances + continuous loops) — overlays only.
      const anim = computeEntrance(
        variant,
        now - (animStart.get(layer.id) ?? now),
        style?.animDuration ?? 500,
        style?.animEasing ?? "ease-out",
        textScale,
        layer.type as AnimSourceKind,
      );
      ctx.save();
      applyEntranceTransform(ctx, anim, box);

      if (layer.type === "bible" && bibleContext?.verse && style) {
        drawBibleLayer(ctx, box, style, bibleContext.verse, textScale, anim.reveal);
      } else if (layer.type === "text") {
        drawContentLayer(ctx, box, style ?? layer.style, content, textScale, layer.sub, anim.reveal);
      } else if (layer.type === "song") {
        drawContentLayer(ctx, box, style ?? layer.style, content, textScale, undefined, anim.reveal);
      }

      ctx.restore();
    }
  }

  // Auto-capture at a steady frame rate — when the tab is VISIBLE this reliably
  // captures continuous motion (scroll / typewriter). When the tab is HIDDEN the
  // browser throttles both rAF and the canvas presentation, so the audio clock
  // (unthrottled) keeps drawing and we force each frame with `requestFrame()` —
  // the feed (and its animations) never freezes, and the operator can switch
  // tabs freely.
  const captured = canvas.captureStream(fps);
  const captureTrack = captured.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack | undefined;

  let lastDraw = 0;
  const minInterval = 1000 / fps - 2;
  function tick() {
    const now = performance.now();
    if (now - lastDraw < minInterval) return;
    lastDraw = now;
    drawFrame();
    // Foreground: auto-capture handles it. Background: force the frame.
    if (typeof document !== "undefined" && document.hidden) {
      captureTrack?.requestFrame?.();
    }
  }

  // rAF drives smooth frames while the tab is visible…
  let raf = requestAnimationFrame(function loop() {
    tick();
    raf = requestAnimationFrame(loop);
  });

  // …and an AudioContext-based clock keeps ticking when it isn't (audio isn't
  // throttled in background tabs, unlike rAF/timers), so the broadcast survives
  // the operator switching windows to check Facebook.
  let clock: ScriptProcessorNode | null = null;
  if (audioCtx) {
    clock = audioCtx.createScriptProcessor(1024, 1, 1);
    clock.onaudioprocess = () => tick();
    clock.connect(audioCtx.destination);
  }

  // Re-resolve when a camera stream is (re)acquired after the scene was set —
  // the snapshot array reference doesn't change, so we refresh here instead.
  const unsubCameras = subscribeCameraStreams(() => setScene(scene, bibleContext));

  // Keep each video/audio source in step with the operator's transport (play/
  // pause/seek drive the Preview's master controller) so what airs on Facebook
  // mirrors the studio. Falls back to independent playback when no master exists.
  const transportSync = setInterval(() => {
    for (const [id, src] of sources) {
      if (!(src.el instanceof HTMLMediaElement)) continue;
      const master =
        src.kind === "video"
          ? getVideoController(id)
          : src.kind === "audio"
            ? getAudioController(id)
            : undefined;
      if (!master) continue;
      const st = master.getState();
      if (!st.ready) continue;
      // Only VIDEO position-syncs (visual match matters). Seeking AUDIO on every
      // small drift crackles — a soundtrack just needs the play/pause state.
      if (src.kind === "video" && Math.abs(src.el.currentTime - st.currentTime) > 0.4) {
        src.el.currentTime = st.currentTime;
      }
      if (st.paused && !src.el.paused) src.el.pause();
      else if (!st.paused && src.el.paused) void src.el.play().catch(() => {});
    }
  }, 250);

  // Combine the canvas video track with the mixed audio track (silence when no
  // audio layer is connected — the destination always exposes one track).
  const stream = captured;
  if (mixDest) {
    for (const t of mixDest.stream.getAudioTracks()) stream.addTrack(t);
  }

  return {
    stream,
    canvas,
    setScene,
    stop() {
      cancelAnimationFrame(raf);
      clearInterval(transportSync);
      if (clock) {
        clock.onaudioprocess = null;
        try {
          clock.disconnect();
        } catch {
          /* noop */
        }
      }
      unsubCameras();
      try {
        keepAlive?.stop();
        keepAlive?.disconnect();
      } catch {
        /* noop */
      }
      for (const [id, src] of sources) disposeSource(id, src);
      for (const t of stream.getTracks()) t.stop();
    },
  };
}
