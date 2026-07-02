/**
 * Live Studio audio engine (browser-side). Bridges the media elements rendered
 * in the monitors and the mixer dock:
 *
 *  - Each audio-bearing source registers an {@link AudioProbe} keyed by its
 *    layer id. The mixer reads `getLevel()` to drive a REAL VU meter.
 *  - Owned media (`<video>` playing a direct/HLS file) is analysed with the Web
 *    Audio API → the meter reflects the ACTUAL waveform (a silent clip stays
 *    flat). The fader/mute route through a GainNode so they truly control sound.
 *  - Cross-origin platform embeds (YouTube) cannot expose their samples to the
 *    page, so we fall back to the YouTube IFrame Player API: the meter tracks
 *    the player STATE (playing / paused / muted / volume). This cannot detect a
 *    "playing but silent" clip — an inherent browser-sandbox limit.
 *
 * Non-YouTube iframes (Facebook / Vimeo) expose no usable signal here, so they
 * register no probe and the mixer shows them as "audio non capté".
 */

export type AudioProbe = {
  /** Instantaneous meter value 0..100, already reflecting fader + mute. */
  getLevel: () => number;
  /** Whether the source is currently producing audible sound. */
  isActive: () => boolean;
};

const probes = new Map<string, AudioProbe>();

/* ── Local monitor mute ───────────────────────────────────────────────
 * Silences ONLY what the operator hears in the studio browser (the Preview
 * monitor). It does not touch per-channel (on-air) mute, and the VU meters keep
 * animating so the operator still sees the audio is playing "en direct". An
 * operator-local preference, persisted in localStorage. */
const MONITOR_MUTE_KEY = "studio_monitor_muted";
let monitorMuted =
  typeof window !== "undefined" && window.localStorage.getItem(MONITOR_MUTE_KEY) === "1";
const monitorListeners = new Set<() => void>();

export function getMonitorMuted(): boolean {
  return monitorMuted;
}

export function setMonitorMuted(value: boolean): void {
  monitorMuted = value;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(MONITOR_MUTE_KEY, value ? "1" : "0");
  }
  monitorListeners.forEach((l) => l());
}

export function subscribeMonitorMuted(cb: () => void): () => void {
  monitorListeners.add(cb);
  return () => monitorListeners.delete(cb);
}

/** Register a probe for a layer id; returns an unregister cleanup. */
export function registerAudioProbe(id: string, probe: AudioProbe): () => void {
  probes.set(id, probe);
  return () => {
    if (probes.get(id) === probe) probes.delete(id);
  };
}

/** Current meter level for a layer, or `null` when no probe is registered. */
export function readAudioLevel(id: string): number | null {
  return probes.get(id)?.getLevel() ?? null;
}

/** Whether a registered source is actively producing sound. */
export function isAudioProbeActive(id: string): boolean {
  return probes.get(id)?.isActive() ?? false;
}

/** Whether ANY probe (real capture / player-state) is registered for a layer. */
export function hasAudioProbe(id: string): boolean {
  return probes.has(id);
}

/* ── Shared Web Audio context ─────────────────────────────────────────── */

let sharedCtx: AudioContext | null = null;
let resumeHookInstalled = false;
/** Browsers start an AudioContext suspended until a user gesture — keep trying
 *  to resume it on every interaction so routed media actually produces sound. */
function installResumeOnGesture(): void {
  if (resumeHookInstalled || typeof window === "undefined") return;
  resumeHookInstalled = true;
  const resume = () => void sharedCtx?.resume().catch(() => {});
  window.addEventListener("pointerdown", resume);
  window.addEventListener("keydown", resume);
}

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedCtx) sharedCtx = new Ctor();
  installResumeOnGesture();
  if (sharedCtx.state === "suspended") void sharedCtx.resume().catch(() => {});
  return sharedCtx;
}

export type MediaMeter = {
  setGain: (level0to100: number, muted: boolean) => void;
  getLevel: () => number;
  isActive: () => boolean;
  dispose: () => void;
};

/**
 * Attach a Web Audio analyser to an owned media element. Routes
 * source → gain → analyser → destination so the meter reads the real signal and
 * the gain node controls playback volume. Returns `null` when Web Audio is
 * unavailable (SSR / unsupported).
 */
export function attachMediaMeter(el: HTMLMediaElement): MediaMeter | null {
  const ctx = getAudioContext();
  if (!ctx) return null;
  let source: MediaElementAudioSourceNode;
  try {
    source = ctx.createMediaElementSource(el);
  } catch {
    return null; // already bound to a context, or blocked
  }
  const gain = ctx.createGain();
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  source.connect(gain);
  gain.connect(analyser);
  analyser.connect(ctx.destination);
  const buf = new Uint8Array(analyser.fftSize);
  let muted = false;

  return {
    setGain(level, isMuted) {
      muted = isMuted;
      gain.gain.value = isMuted ? 0 : Math.max(0, level) / 100;
    },
    getLevel() {
      if (muted) return 0;
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i += 1) {
        const c = (buf[i] - 128) / 128;
        sum += c * c;
      }
      const rms = Math.sqrt(sum / buf.length);
      return Math.max(0, Math.min(100, rms * 220));
    },
    isActive() {
      return !muted && !el.paused && this.getLevel() > 1.5;
    },
    dispose() {
      try {
        source.disconnect();
        gain.disconnect();
        analyser.disconnect();
      } catch {
        /* noop */
      }
    },
  };
}

export type StreamMeter = {
  /** Raw RMS level 0..100 of the stream's audio (not scaled by any fader). */
  getLevel: () => number;
  /** Whether the stream currently carries a live audio track. */
  hasAudio: () => boolean;
  dispose: () => void;
};

/**
 * Analyse a local `MediaStream`'s audio (camera / capture). Same-origin, so the
 * analyser reads the REAL waveform. We only connect source → analyser (never to
 * `destination`) — the `<video>` element plays the audio itself, so we don't
 * double it. Returns `null` when there is no audio track or Web Audio is absent.
 */
export function attachStreamMeter(stream: MediaStream): StreamMeter | null {
  const ctx = getAudioContext();
  if (!ctx || stream.getAudioTracks().length === 0) return null;
  let source: MediaStreamAudioSourceNode;
  try {
    source = ctx.createMediaStreamSource(stream);
  } catch {
    return null;
  }
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  source.connect(analyser);
  const buf = new Uint8Array(analyser.fftSize);

  return {
    getLevel() {
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i += 1) {
        const c = (buf[i] - 128) / 128;
        sum += c * c;
      }
      return Math.max(0, Math.min(100, Math.sqrt(sum / buf.length) * 220));
    },
    hasAudio() {
      return stream.getAudioTracks().some((t) => t.enabled && t.readyState === "live");
    },
    dispose() {
      try {
        source.disconnect();
        analyser.disconnect();
      } catch {
        /* noop */
      }
    },
  };
}

/* ── YouTube IFrame Player API ────────────────────────────────────────── */

type YTPlayer = {
  playVideo: () => void;
  setVolume: (v: number) => void;
  mute: () => void;
  unMute: () => void;
  isMuted: () => boolean;
  getVolume: () => number;
  getPlayerState: () => number;
  getIframe: () => HTMLIFrameElement;
  destroy: () => void;
};

type YTNamespace = {
  Player: new (
    el: HTMLElement | string,
    opts: {
      videoId: string;
      width?: string | number;
      height?: string | number;
      playerVars?: Record<string, string | number>;
      events?: { onReady?: (e: { target: YTPlayer }) => void };
    },
  ) => YTPlayer;
};

let ytPromise: Promise<YTNamespace> | null = null;
function loadYouTubeApi(): Promise<YTNamespace> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  const w = window as unknown as { YT?: YTNamespace; onYouTubeIframeAPIReady?: () => void };
  if (w.YT?.Player) return Promise.resolve(w.YT);
  if (!ytPromise) {
    ytPromise = new Promise((resolve) => {
      const prev = w.onYouTubeIframeAPIReady;
      w.onYouTubeIframeAPIReady = () => {
        prev?.();
        if (w.YT) resolve(w.YT);
      };
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    });
  }
  return ytPromise;
}

/** Extract a YouTube video id from any of its URL forms. */
export function youtubeId(url: string): string | null {
  const u = (url || "").trim();
  return (
    u.match(/[?&]v=([\w-]+)/)?.[1] ??
    u.match(/youtu\.be\/([\w-]+)/)?.[1] ??
    u.match(/youtube\.com\/embed\/([\w-]+)/)?.[1] ??
    null
  );
}

export type YouTubeController = {
  setVolume: (level0to100: number, muted: boolean) => void;
  getLevel: () => number;
  isActive: () => boolean;
  dispose: () => void;
};

/**
 * Build a YouTube player inside `host` (replaced by the API's iframe) and expose
 * volume/mute control + a state-synchronised meter level. Because the audio
 * samples are cross-origin, the level is synthesised from the player state
 * (playing + volume), not the real waveform.
 */
export function attachYouTube(host: HTMLElement, videoId: string): YouTubeController {
  let player: YTPlayer | null = null;
  let disposed = false;
  let peak = 0;
  let pending: { level: number; muted: boolean } | null = { level: 80, muted: false };

  void loadYouTubeApi()
    .then((YT) => {
      if (disposed) return;
      player = new YT.Player(host, {
        videoId,
        width: "100%",
        height: "100%",
        playerVars: {
          autoplay: 1,
          controls: 0,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          fs: 0,
        },
        events: {
          onReady: (e) => {
            const iframe = e.target.getIframe();
            iframe.style.cssText =
              "position:absolute;inset:0;width:100%;height:100%;border:0;pointer-events:none;";
            e.target.playVideo();
            if (pending) {
              e.target.setVolume(pending.level);
              if (pending.muted) e.target.mute();
              else e.target.unMute();
              pending = null;
            }
          },
        },
      });
    })
    .catch(() => {});

  return {
    setVolume(level, muted) {
      if (!player) {
        pending = { level, muted };
        return;
      }
      try {
        player.setVolume(level);
        if (muted) player.mute();
        else player.unMute();
      } catch {
        /* player not ready */
      }
    },
    getLevel() {
      try {
        if (!player?.getPlayerState) return peak * 0.9;
        const playing = player.getPlayerState() === 1; // 1 = PLAYING
        const muted = player.isMuted?.() ?? false;
        const vol = player.getVolume?.() ?? 100;
        const ceiling = playing && !muted ? vol * 0.9 : 0;
        const target = Math.random() * ceiling;
        peak = peak + (target - peak) * 0.5;
        return Math.max(0, Math.min(100, peak));
      } catch {
        return 0;
      }
    },
    isActive() {
      try {
        return player?.getPlayerState?.() === 1 && !(player.isMuted?.() ?? false);
      } catch {
        return false;
      }
    },
    dispose() {
      disposed = true;
      try {
        player?.destroy();
      } catch {
        /* noop */
      }
    },
  };
}
