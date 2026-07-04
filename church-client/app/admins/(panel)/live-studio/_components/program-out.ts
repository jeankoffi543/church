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

import { getAudioContext } from "./studio-audio";
import { getCameraStream, subscribeCameraStreams } from "./studio-camera";
import {
  drawBibleLayer,
  drawContentLayer,
  drawImageLayer,
  drawScrollLayer,
  drawVideoFrame,
} from "./program-out-text";
import { computeEntrance } from "./program-out-anim";
import { getVideoController } from "./studio-video";
import { isBackgroundLayer, type ScriptureVerse, type StudioLayer } from "./studio-layers";
import type { StudioSettings } from "@/lib/studio";

/** On-air bible verse + its style (owned by the console, not the layer). */
export type BibleContext = { verse: ScriptureVerse | null; style: StudioSettings } | null;

/* ── URL + geometry helpers (mirror composite-layer / studio-style) ──────── */

/** Resolve a backend-relative path to an absolute URL (same rule as the DOM
 *  renderer's `getImageUrl`). */
function resolveMediaUrl(url: string | undefined | null): string {
  if (!url) return "";
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
  const backendUrl = apiUrl ? apiUrl.replace("/api/v1", "") : "http://127.0.0.1:8000";
  return url.startsWith("/") ? `${backendUrl}${url}` : url;
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

/** Apply an entrance animation's transform to the context (caller wraps in
 *  save/restore). Shared by the image + video overlay draws. */
function applyEntranceTransform(
  ctx: CanvasRenderingContext2D,
  a: { alpha: number; tx: number; ty: number; scale: number; clipRevealX?: number },
  box: { x: number; y: number; w: number; h: number },
): void {
  ctx.globalAlpha = a.alpha;
  if (a.tx || a.ty) ctx.translate(a.tx, a.ty);
  if (a.scale !== 1) {
    const cx = box.x + box.w / 2;
    const cy = box.y + box.h / 2;
    ctx.translate(cx, cy);
    ctx.scale(a.scale, a.scale);
    ctx.translate(-cx, -cy);
  }
  if (a.clipRevealX !== undefined) {
    ctx.beginPath();
    ctx.rect(box.x, box.y, box.w * a.clipRevealX, box.h);
    ctx.clip();
  }
}

/* ── Per-layer render sources ────────────────────────────────────────────── */

type DrawKind = "camera" | "video" | "image";

type Source = {
  kind: DrawKind;
  /** The element sampled every frame (`<video>` or `<img>`). */
  el: HTMLVideoElement | HTMLImageElement;
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

/** Whether a layer is drawable by the v1 compositor and has a real source. */
function drawableKey(layer: StudioLayer): { kind: DrawKind; key: string } | null {
  if (!layer.visible) return null;
  if (layer.type === "camera") {
    return layer.deviceId ? { kind: "camera", key: `dev:${layer.deviceId}` } : null;
  }
  if (layer.type === "video") {
    const url = (layer.feedUrl || "").trim();
    return url ? { kind: "video", key: `vid:${url}` } : null;
  }
  if (layer.type === "image") {
    return layer.imageUrl ? { kind: "image", key: `img:${layer.imageUrl}` } : null;
  }
  return null; // text / bible / song / embed / audio — not drawn in v1
}

export type ProgramOut = {
  /** The flat program feed: one video track (canvas) + one mixed audio track. */
  readonly stream: MediaStream;
  /** The backing canvas (handy to mirror the outgoing feed in a preview). */
  readonly canvas: HTMLCanvasElement;
  /** Update the composited scene (ordered bottom→top) + the on-air bible verse. */
  setScene: (layers: StudioLayer[], bible?: BibleContext, animNonce?: number) => void;
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

  function applyAudioLevels(layer: StudioLayer, src: Source) {
    if (!src.audio) return;
    const muted = layer.audioMuted ?? false;
    const level = (layer.audioLevel ?? 80) / 100;
    const gainDb = layer.audioGain ?? 0;
    src.audio.gain.gain.value = muted ? 0 : level * dbToLinear(gainDb);
    src.audio.pan.pan.value = Math.max(-1, Math.min(1, (layer.audioBalance ?? 0) / 100));
  }

  function ensureSource(layer: StudioLayer, kind: DrawKind, key: string): Source | null {
    const existing = sources.get(layer.id);
    if (existing && existing.key === key) {
      // Camera keys don't change with the underlying stream — rebuild when the
      // shared stream is replaced (re-acquired) so we bind the live one.
      const streamStale =
        kind === "camera" && existing.camStream !== (getCameraStream(layer.id) ?? undefined);
      if (!streamStale) {
        applyAudioLevels(layer, existing);
        return existing;
      }
    }
    if (existing) disposeSource(layer.id, existing);

    let src: Source | null = null;
    if (kind === "camera") {
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
    if (src.el instanceof HTMLVideoElement) {
      const streamObj = src.el.srcObject;
      src.el.pause();
      src.el.srcObject = null;
      // Stop our own cloned camera tracks (independent of the Preview's stream).
      if (streamObj instanceof MediaStream) {
        streamObj.getTracks().forEach((t) => t.stop());
      }
      src.el.removeAttribute("src");
      src.el.load();
    }
    sources.delete(id);
  }

  function setScene(layers: StudioLayer[], bible?: BibleContext, animNonce = 0) {
    scene = layers;
    bibleContext = bible ?? null;
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
      if (!animStart.has(layer.id)) animStart.set(layer.id, now);
    }
    for (const id of animStart.keys()) {
      if (!present.has(id)) animStart.delete(id);
    }
    // The console's program nonce bumps on CUT / advance / on-air edit — replay
    // every entrance so operators see the animation on air (and on Facebook).
    // The bible is excluded: its on-air verse/style arrives a tick later (async
    // pushLive), so a nonce-driven replay would play the PREVIOUS verse first —
    // it re-triggers on the verse change (bibleSig) below instead.
    if (animNonce !== lastAnimNonce) {
      lastAnimNonce = animNonce;
      for (const id of present) {
        // Bible replays on verse change; media (camera/video) only on appearance
        // (a re-CUT must not restart the video) — like the DOM's stable key.
        const t = layers.find((x) => x.id === id)?.type;
        if (t === "bible" || t === "video" || t === "camera") continue;
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

  function drawFrame() {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, width, height);
    const now = performance.now();
    // Painter's order = bottom→top. The DOM assigns z = length-idx (index 0 on
    // top), so draw the array in REVERSE — otherwise a full-frame camera (bottom
    // of the list) would paint over the overlays.
    for (let i = scene.length - 1; i >= 0; i -= 1) {
      const layer = scene[i];
      if (!layer.visible) continue;

      // The bible's real geometry + style is the on-air one, not the snapshot's.
      const style = layer.type === "bible" ? bibleContext?.style : layer.style;
      const b = layer.type === "bible" && style ? boxFromStyle(style) : layerBox(layer);
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
              layer.style,
              textScale,
              !isBackgroundLayer(layer),
            );
          } else {
            drawVideoFrame(ctx, src.el, src.el.videoWidth, src.el.videoHeight, box, textScale);
          }
          ctx.restore();
          continue;
        }
        // Camera: drawn straight, WITHOUT an entrance transform — the default
        // fade_slide made the camera vanish on every CUT.
        if (src.el instanceof HTMLVideoElement && src.el.readyState >= 2 && src.el.videoWidth > 0) {
          drawCover(ctx, src.el, src.el.videoWidth, src.el.videoHeight, box.x, box.y, box.w, box.h);
        }
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

      // Scroll ticker (continuous) — its own clip, no entrance transform.
      if (variant.startsWith("scroll_")) {
        const dur = style?.animDuration ?? 500;
        const loopMs = dur > 100 ? dur * 12 : 12000;
        const phase = (now % loopMs) / loopMs;
        drawScrollLayer(ctx, box, style ?? layer.style, content, textScale, variant, phase);
        continue;
      }

      // Entrance animation transform (v3) — overlays only.
      const anim = computeEntrance(
        variant,
        now - (animStart.get(layer.id) ?? now),
        style?.animDuration ?? 500,
        style?.animEasing ?? "ease-out",
        textScale,
      );
      ctx.save();
      ctx.globalAlpha = anim.alpha;
      if (anim.tx || anim.ty) ctx.translate(anim.tx, anim.ty);
      if (anim.scale !== 1) {
        const cx = box.x + box.w / 2;
        const cy = box.y + box.h / 2;
        ctx.translate(cx, cy);
        ctx.scale(anim.scale, anim.scale);
        ctx.translate(-cx, -cy);
      }
      if (anim.clipRevealX !== undefined) {
        ctx.beginPath();
        ctx.rect(box.x, box.y, box.w * anim.clipRevealX, box.h);
        ctx.clip();
      }

      if (layer.type === "bible" && bibleContext?.verse && style) {
        drawBibleLayer(ctx, box, style, bibleContext.verse, textScale, anim.reveal);
      } else if (layer.type === "text") {
        drawContentLayer(ctx, box, layer.style, content, textScale, layer.sub, anim.reveal);
      } else if (layer.type === "song") {
        drawContentLayer(ctx, box, layer.style, content, textScale, undefined, anim.reveal);
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

  // Keep each video source in step with the operator's transport (play/pause/
  // seek drive the Preview's master controller) so what airs on Facebook mirrors
  // the studio. Falls back to independent playback when no master is registered.
  const videoSync = setInterval(() => {
    for (const [id, src] of sources) {
      if (src.kind !== "video" || !(src.el instanceof HTMLVideoElement)) continue;
      const master = getVideoController(id);
      if (!master) continue;
      const st = master.getState();
      if (!st.ready) continue;
      if (Math.abs(src.el.currentTime - st.currentTime) > 0.4) src.el.currentTime = st.currentTime;
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
      clearInterval(videoSync);
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
