"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Play,
  Pause,
  X,
  Volume2,
  Volume1,
  VolumeX,
  Headphones,
  SkipBack,
  SkipForward,
  RotateCcw,
  RotateCw,
  Gauge,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { formatTime, isSoundCloudUrl } from "@/lib/media";
import { MEDIA_EVENTS, emitMedia, onMedia } from "@/lib/media-bus";

const SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const;
const SKIP = 15;
import { loadSoundCloudApi, soundCloudEmbedSrc, type SCWidget } from "@/lib/soundcloud";

export type AudioTrack = {
  id?: number | string;
  title: string;
  speaker?: string;
  src: string;
  cover?: string | null;
};

type AudioContextValue = {
  current: AudioTrack | null;
  isPlaying: boolean;
  hasPrev: boolean;
  hasNext: boolean;
  play: (track: AudioTrack, queue?: AudioTrack[]) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  close: () => void;
  isCurrent: (id?: number | string) => boolean;
};

const AudioPlayerContext = createContext<AudioContextValue | null>(null);

export function useAudioPlayer(): AudioContextValue {
  const ctx = useContext(AudioPlayerContext);
  if (!ctx) throw new Error("useAudioPlayer must be used within <AudioPlayerProvider>");
  return ctx;
}

const sameTrack = (a: AudioTrack, b: AudioTrack) => a.src === b.src && a.id === b.id;

/**
 * Global, persistent audio player (mounted at the root layout). A single HTML5
 * `<audio>` element handles files & direct links; SoundCloud links stream
 * through a hidden Widget iframe. Playback survives navigation.
 */
export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const scIframeRef = useRef<HTMLIFrameElement | null>(null);
  const scWidgetRef = useRef<SCWidget | null>(null);
  const backendRef = useRef<"html5" | "soundcloud">("html5");
  // The hidden SoundCloud player is mounted lazily (only once a SoundCloud
  // track actually plays) to avoid a useless `?url=` 404 on every page.
  const scLoadedRef = useRef<(() => void) | null>(null);
  const [scSrc, setScSrc] = useState<string | null>(null);

  const [queue, setQueue] = useState<AudioTrack[]>([]);
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [backend, setBackend] = useState<"html5" | "soundcloud">("html5");
  const [error, setError] = useState(false);

  const current = queue[index] ?? null;

  /* ── SoundCloud backend ─────────────────────────────────────────── */
  const ensureScWidget = useCallback(async (firstUrl: string): Promise<SCWidget | null> => {
    const SC = await loadSoundCloudApi();
    if (!SC) return null;
    if (scWidgetRef.current) return scWidgetRef.current;

    // Mount the hidden player (a valid SoundCloud page) and wait for it to load
    // before attaching the Widget API.
    const loaded = new Promise<void>((resolve) => {
      scLoadedRef.current = resolve;
    });
    setScSrc(soundCloudEmbedSrc(firstUrl));
    await loaded;

    const iframe = scIframeRef.current;
    if (!iframe) return null;

    const widget = SC.Widget(iframe);
    scWidgetRef.current = widget;
    const E = SC.Widget.Events;
    widget.bind(E.PLAY, () => setIsPlaying(true));
    widget.bind(E.PAUSE, () => setIsPlaying(false));
    widget.bind(E.FINISH, () => setIsPlaying(false));
    widget.bind(E.PLAY_PROGRESS, (e) => setProgress((e?.currentPosition ?? 0) / 1000));
    widget.bind(E.READY, () => widget.getDuration((ms) => setDuration(ms / 1000)));
    return widget;
  }, []);

  const loadTrack = useCallback(
    async (track: AudioTrack) => {
      setProgress(0);
      setDuration(0);
      setError(false);
      // Audio is taking over — silence any video that is currently playing.
      // Pause mounted <video> elements directly (bulletproof for file videos),
      // and emit the event for embeds we can't reach via the DOM (YouTube).
      if (typeof document !== "undefined") {
        document.querySelectorAll("video").forEach((el) => el.pause());
      }
      emitMedia(MEDIA_EVENTS.pauseVideos);

      if (isSoundCloudUrl(track.src)) {
        backendRef.current = "soundcloud";
        setBackend("soundcloud");
        audioRef.current?.pause();
        const widget = await ensureScWidget(track.src);
        widget?.load(track.src, {
          auto_play: true,
          visual: false,
          callback: () => {
            widget.setVolume((muted ? 0 : volume) * 100);
            widget.getDuration((ms) => setDuration(ms / 1000));
          },
        });
      } else {
        backendRef.current = "html5";
        setBackend("html5");
        scWidgetRef.current?.pause();
        const a = audioRef.current;
        if (a) {
          a.src = track.src;
          a.playbackRate = speed;
          a.load();
          void a.play().catch(() => setIsPlaying(false));
        }
      }
    },
    [ensureScWidget, muted, volume, speed]
  );

  // A video took over — pause our audio so the two never overlap.
  useEffect(
    () =>
      onMedia(MEDIA_EVENTS.pauseAudio, () => {
        audioRef.current?.pause();
        scWidgetRef.current?.pause();
        setIsPlaying(false);
      }),
    []
  );

  /* ── Public controls ────────────────────────────────────────────── */
  const play = useCallback(
    (track: AudioTrack, list?: AudioTrack[]) => {
      const nextQueue = list && list.length > 0 ? list : [track];
      const i = Math.max(0, nextQueue.findIndex((t) => sameTrack(t, track)));
      setQueue(nextQueue);
      setIndex(i);
      setMinimized(false);
      void loadTrack(nextQueue[i] ?? track);
    },
    [loadTrack]
  );

  const toggle = useCallback(() => {
    if (!current) return;
    if (backendRef.current === "soundcloud") {
      if (isPlaying) scWidgetRef.current?.pause();
      else scWidgetRef.current?.play();
    } else {
      const a = audioRef.current;
      if (!a) return;
      if (a.paused) void a.play().catch(() => {});
      else a.pause();
    }
  }, [current, isPlaying]);

  const goTo = useCallback(
    (i: number) => {
      if (i < 0 || i >= queue.length) return;
      setIndex(i);
      void loadTrack(queue[i]);
    },
    [queue, loadTrack]
  );

  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);

  const close = useCallback(() => {
    audioRef.current?.pause();
    scWidgetRef.current?.pause();
    setQueue([]);
    setIndex(0);
    setIsPlaying(false);
    setProgress(0);
  }, []);

  const isCurrent = useCallback(
    (id?: number | string) => current != null && id != null && current.id === id,
    [current]
  );

  const seek = (ratio: number) => {
    if (backendRef.current === "soundcloud") {
      if (duration > 0) {
        scWidgetRef.current?.seekTo(ratio * duration * 1000);
        setProgress(ratio * duration);
      }
    } else {
      const a = audioRef.current;
      if (a && Number.isFinite(a.duration)) {
        a.currentTime = ratio * a.duration;
        setProgress(a.currentTime);
      }
    }
  };

  // Apply volume to whichever backend is active.
  useEffect(() => {
    const v = muted ? 0 : volume;
    if (audioRef.current) audioRef.current.volume = v;
    scWidgetRef.current?.setVolume(v * 100);
  }, [volume, muted]);

  // Playback speed (HTML5 only — the SoundCloud widget has no rate control).
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed]);

  const skip = (delta: number) => {
    if (backendRef.current === "soundcloud") {
      if (duration > 0) {
        const t = Math.min(Math.max(0, progress + delta), duration);
        scWidgetRef.current?.seekTo(t * 1000);
        setProgress(t);
      }
    } else {
      const a = audioRef.current;
      if (a) a.currentTime = Math.min(Math.max(0, a.currentTime + delta), a.duration || 0);
    }
  };

  // Stop when a track ends — no auto-advance (the user drives prev/next).
  const onEnded = () => {
    setIsPlaying(false);
    setProgress(0);
  };

  const pct = duration > 0 ? (progress / duration) * 100 : 0;
  const hasPrev = index > 0;
  const hasNext = index < queue.length - 1;
  const VolumeIcon = muted || volume === 0 ? VolumeX : volume <= 0.5 ? Volume1 : Volume2;

  return (
    <AudioPlayerContext.Provider
      value={{ current, isPlaying, hasPrev, hasNext, play, toggle, next, prev, close, isCurrent }}
    >
      {children}

      {/* HTML5 engine (files + direct links) */}
      <audio
        ref={audioRef}
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={onEnded}
        onError={() => {
          if (backendRef.current === "html5") {
            setError(true);
            setIsPlaying(false);
          }
        }}
      />
      {/* SoundCloud engine (hidden, mounted only when a SoundCloud track plays) */}
      {scSrc && (
        <iframe
          ref={scIframeRef}
          title="SoundCloud"
          src={scSrc}
          allow="autoplay"
          onLoad={() => scLoadedRef.current?.()}
          className="pointer-events-none absolute h-0 w-0 border-0 opacity-0"
          aria-hidden
          tabIndex={-1}
        />
      )}

      {current && (
        <div className="fixed inset-x-0 bottom-0 z-[90] animate-in slide-in-from-bottom-5 duration-300">
          <div className="mx-auto max-w-[1200px] px-3 pb-3 sm:px-4 sm:pb-4">
            {minimized ? (
              <button
                type="button"
                onClick={() => setMinimized(false)}
                className="ml-auto flex cursor-pointer items-center gap-2.5 rounded-full border border-white/10 bg-ink/95 py-1.5 pr-3 pl-1.5 text-cream shadow-[0_18px_50px_rgba(22,15,51,0.5)] backdrop-blur-md"
              >
                <Cover track={current} className="size-8" />
                <span className="max-w-[140px] truncate text-[12px] font-bold">{current.title}</span>
                <ChevronUp className="size-4 text-[#9a8fb5]" />
              </button>
            ) : (
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-ink/95 px-3 py-2.5 text-cream shadow-[0_18px_50px_rgba(22,15,51,0.5)] backdrop-blur-md sm:gap-4 sm:px-4 sm:py-3">
                {/* Left: cover + meta */}
                <Cover track={current} className="size-11 shrink-0" />
                <div className="hidden min-w-0 sm:block sm:w-40 lg:w-52">
                  <p className="truncate text-[13px] font-bold text-cream">{current.title}</p>
                  {current.speaker && <p className="truncate text-[11px] text-[#9a8fb5]">{current.speaker}</p>}
                </div>

                {/* Center: transport + progress */}
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <div className="flex items-center justify-center gap-2.5">
                    <button
                      type="button"
                      onClick={prev}
                      disabled={!hasPrev}
                      aria-label="Précédent"
                      className="cursor-pointer text-[#9a8fb5] transition hover:text-cream disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <SkipBack className="size-4 fill-current" />
                    </button>
                    <button
                      type="button"
                      onClick={() => skip(-SKIP)}
                      aria-label={`Reculer de ${SKIP}s`}
                      className="hidden cursor-pointer text-[#9a8fb5] transition hover:text-cream sm:inline-flex"
                    >
                      <RotateCcw className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={toggle}
                      aria-label={isPlaying ? "Pause" : "Lecture"}
                      className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-white text-ink transition hover:scale-105"
                    >
                      {isPlaying ? <Pause className="size-4 fill-ink" /> : <Play className="ml-0.5 size-4 fill-ink" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => skip(SKIP)}
                      aria-label={`Avancer de ${SKIP}s`}
                      className="hidden cursor-pointer text-[#9a8fb5] transition hover:text-cream sm:inline-flex"
                    >
                      <RotateCw className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={next}
                      disabled={!hasNext}
                      aria-label="Suivant"
                      className="cursor-pointer text-[#9a8fb5] transition hover:text-cream disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <SkipForward className="size-4 fill-current" />
                    </button>
                  </div>
                  {error ? (
                    <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-[#ff9a9a]">
                      <AlertCircle className="size-3.5" /> Lecture indisponible (fichier ou lien introuvable)
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="hidden font-mono text-[10px] tabular-nums text-[#9a8fb5] sm:inline">{formatTime(progress)}</span>
                      <div
                        className="group h-1.5 flex-1 cursor-pointer rounded-full bg-white/15"
                        onClick={(e) => {
                          const r = e.currentTarget.getBoundingClientRect();
                          seek((e.clientX - r.left) / r.width);
                        }}
                      >
                        <div className="relative h-full rounded-full bg-gradient-to-r from-gold to-gold-dark" style={{ width: `${pct}%` }}>
                          <span className="absolute top-1/2 right-0 size-2.5 -translate-y-1/2 translate-x-1/2 rounded-full bg-gold opacity-0 shadow transition group-hover:opacity-100" />
                        </div>
                      </div>
                      <span className="hidden font-mono text-[10px] tabular-nums text-[#9a8fb5] sm:inline">{formatTime(duration)}</span>
                    </div>
                  )}
                </div>

                {/* Right: speed + volume + minimize/close */}
                {backend === "html5" && (
                  <button
                    type="button"
                    onClick={() => {
                      const i = SPEEDS.indexOf(speed as (typeof SPEEDS)[number]);
                      setSpeed(SPEEDS[(i + 1) % SPEEDS.length]);
                    }}
                    aria-label="Vitesse de lecture"
                    className="hidden cursor-pointer items-center gap-1 text-[11px] font-bold text-[#9a8fb5] transition hover:text-cream md:inline-flex"
                  >
                    <Gauge className="size-4" /> {speed}x
                  </button>
                )}
                <div className="hidden items-center gap-2 md:flex">
                  <button type="button" onClick={() => setMuted((m) => !m)} className="cursor-pointer text-[#9a8fb5] transition hover:text-cream" aria-label="Volume">
                    <VolumeIcon className="size-4" />
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.02}
                    value={muted ? 0 : volume}
                    onChange={(e) => {
                      setVolume(Number(e.target.value));
                      setMuted(false);
                    }}
                    aria-label="Volume"
                    className="h-1 w-20 cursor-pointer accent-gold"
                  />
                </div>
                <button type="button" onClick={() => setMinimized(true)} aria-label="Réduire" className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-[#9a8fb5] transition hover:bg-white/10 hover:text-cream">
                  <ChevronDown className="size-4" />
                </button>
                <button type="button" onClick={close} aria-label="Fermer le lecteur" className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-[#9a8fb5] transition hover:bg-white/10 hover:text-cream">
                  <X className="size-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </AudioPlayerContext.Provider>
  );
}

function Cover({ track, className }: { track: AudioTrack; className?: string }) {
  if (track.cover) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={track.cover} alt="" className={cn("shrink-0 rounded-xl object-cover", className)} />
    );
  }
  return (
    <div className={cn("flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-gold to-gold-dark text-ink", className)}>
      <Headphones className="size-5" />
    </div>
  );
}
