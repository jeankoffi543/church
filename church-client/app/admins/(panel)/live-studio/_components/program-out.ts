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
import { isBackgroundLayer, type StudioLayer } from "./studio-layers";
import type { StudioSettings } from "@/lib/studio";

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

/** Layer box as 0..1 fractions of the frame (mirror of `getOverlayBoxStyle`). */
function layerBox(layer: StudioLayer): Box {
  if (isBackgroundLayer(layer)) return { x: 0, y: 0, w: 1, h: 1 };
  const s: StudioSettings = layer.style;
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
  /** Update the composited scene (ordered bottom→top). */
  setScene: (layers: StudioLayer[]) => void;
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
}): ProgramOut {
  const width = opts?.width ?? 1280;
  const height = opts?.height ?? 720;
  const fps = opts?.fps ?? 30;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: false })!;

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

  function setScene(layers: StudioLayer[]) {
    scene = layers;
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
  }

  let raf = 0;
  function frame() {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, width, height);
    for (const layer of scene) {
      const src = sources.get(layer.id);
      if (!src) continue;
      const b = layerBox(layer);
      const bx = b.x * width;
      const by = b.y * height;
      const bw = b.w * width;
      const bh = b.h * height;
      if (src.el instanceof HTMLVideoElement) {
        if (src.el.readyState >= 2 && src.el.videoWidth > 0) {
          drawCover(ctx, src.el, src.el.videoWidth, src.el.videoHeight, bx, by, bw, bh);
        }
      } else if (src.el.complete && src.el.naturalWidth > 0) {
        drawCover(ctx, src.el, src.el.naturalWidth, src.el.naturalHeight, bx, by, bw, bh);
      }
    }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  // Re-resolve when a camera stream is (re)acquired after the scene was set —
  // the snapshot array reference doesn't change, so we refresh here instead.
  const unsubCameras = subscribeCameraStreams(() => setScene(scene));

  // Combine the canvas video track with the mixed audio track (silence when no
  // audio layer is connected — the destination always exposes one track).
  const stream = canvas.captureStream(fps);
  if (mixDest) {
    for (const t of mixDest.stream.getAudioTracks()) stream.addTrack(t);
  }

  return {
    stream,
    canvas,
    setScene,
    stop() {
      cancelAnimationFrame(raf);
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
