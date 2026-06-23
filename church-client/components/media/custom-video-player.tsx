"use client";

import { useEffect, useRef, useState } from "react";
import {
  Play,
  Pause,
  Volume2,
  Volume1,
  VolumeX,
  VideoOff,
  RotateCcw,
  RotateCw,
  Maximize,
  Gauge,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { extractYouTubeId, extractVimeoId, formatTime } from "@/lib/media";
import { MEDIA_EVENTS, emitMedia, onMedia } from "@/lib/media-bus";
import { loadYouTubeApi, type YTPlayer } from "@/lib/youtube";
import type { SermonMediaType } from "@/lib/data";

const SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const;
const SKIP = 10;

/* ── Playback resume (localStorage) ──────────────────────────────────── */
function readResume(key?: string): number {
  if (!key || typeof window === "undefined") return 0;
  const v = Number(window.localStorage.getItem(key));
  return Number.isFinite(v) && v > 0 ? v : 0;
}
function saveResume(key: string | undefined, time: number, duration: number): void {
  if (!key || typeof window === "undefined") return;
  // Skip trivial starts; treat near-completion as finished.
  if (time < 5 || (duration > 0 && time > duration - 8)) {
    window.localStorage.removeItem(key);
  } else {
    window.localStorage.setItem(key, String(Math.floor(time)));
  }
}
function clearResume(key?: string): void {
  if (key && typeof window !== "undefined") window.localStorage.removeItem(key);
}

/**
 * Universal in-place video player. External YouTube links use the official JS
 * API (end / error detection); other files render a native `<video>` driven
 * entirely by custom branded controls — never the browser defaults.
 */
export function CustomVideoPlayer({
  mediaType,
  src,
  title,
  autoPlay = false,
  onEnded,
  resumeKey,
}: {
  mediaType: SermonMediaType;
  src: string | null;
  title?: string;
  autoPlay?: boolean;
  onEnded?: () => void;
  /** When set, playback position is saved/restored via localStorage. */
  resumeKey?: string;
}) {
  const [error, setError] = useState(false);

  const ytId = mediaType === "video_url" && src ? extractYouTubeId(src) : null;
  const vimeoId = mediaType === "video_url" && src ? extractVimeoId(src) : null;
  const fileSrc =
    mediaType === "video_file" ? src : mediaType === "video_url" && !ytId && !vimeoId ? src : null;

  if (error || (!ytId && !vimeoId && !fileSrc)) {
    return <VideoError />;
  }

  if (ytId) {
    return <YouTubeEmbed videoId={ytId} title={title} onEnded={onEnded} onError={() => setError(true)} resumeKey={resumeKey} />;
  }

  if (vimeoId) {
    const params = new URLSearchParams({ autoplay: "1", title: "0", byline: "0", portrait: "0" });
    return (
      <div className="aspect-video w-full overflow-hidden rounded-2xl shadow-2xl [&_iframe]:absolute [&_iframe]:inset-0 [&_iframe]:size-full relative">
        <iframe
          src={`https://player.vimeo.com/video/${vimeoId}?${params}`}
          title={title ?? "Vidéo"}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <FileVideoPlayer
      src={fileSrc as string}
      autoPlay={autoPlay}
      title={title}
      onEnded={onEnded}
      onError={() => setError(true)}
      resumeKey={resumeKey}
    />
  );
}

/* ── Error state ─────────────────────────────────────────────────────── */
function VideoError() {
  return (
    <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-2xl bg-ink text-cream">
      <VideoOff className="size-9 text-[#ff9a9a]" />
      <p className="text-sm font-bold">Lecture impossible</p>
      <p className="max-w-xs text-center text-xs text-[#9a8fb5]">
        Cette vidéo est introuvable, indisponible ou dans un format non pris en charge.
      </p>
    </div>
  );
}

/* ── YouTube (JS API) ────────────────────────────────────────────────── */
function YouTubeEmbed({
  videoId,
  title,
  onEnded,
  onError,
  resumeKey,
}: {
  videoId: string;
  title?: string;
  onEnded?: () => void;
  onError?: () => void;
  resumeKey?: string;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YTPlayer | null>(null);

  useEffect(() => {
    let cancelled = false;
    let saveTimer: ReturnType<typeof setInterval> | null = null;
    const resumeAt = readResume(resumeKey);

    (async () => {
      const YT = await loadYouTubeApi();
      if (cancelled || !YT || !hostRef.current) {
        if (!YT) onError?.();
        return;
      }
      playerRef.current = new YT.Player(hostRef.current, {
        videoId,
        playerVars: {
          autoplay: 1,
          controls: 1,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          iv_load_policy: 3,
          enablejsapi: 1,
          playsinline: 1,
          // Resume where the viewer left off.
          start: resumeAt > 0 ? resumeAt : 0,
        },
        events: {
          onStateChange: (e) => {
            if (e.data === YT.PlayerState.ENDED) {
              clearResume(resumeKey);
              onEnded?.();
            }
          },
          onError: () => onError?.(),
        },
      });

      // Persist the position periodically so a refresh/close resumes cleanly.
      if (resumeKey) {
        saveTimer = setInterval(() => {
          try {
            const p = playerRef.current;
            if (p) saveResume(resumeKey, p.getCurrentTime(), p.getDuration());
          } catch {
            /* player not ready */
          }
        }, 5000);
      }
    })();

    return () => {
      cancelled = true;
      if (saveTimer) clearInterval(saveTimer);
      try {
        playerRef.current?.destroy();
      } catch {
        /* already gone */
      }
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  // Pause the embed when the audio player takes over.
  useEffect(
    () =>
      onMedia(MEDIA_EVENTS.pauseVideos, () => {
        try {
          playerRef.current?.pauseVideo();
        } catch {
          /* player not ready */
        }
      }),
    []
  );

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-2xl [&_iframe]:absolute [&_iframe]:inset-0 [&_iframe]:size-full">
      <div ref={hostRef} className="size-full" aria-label={title} />
    </div>
  );
}

/* ── Native file player with full custom controls ────────────────────── */
function FileVideoPlayer({
  src,
  autoPlay,
  title,
  onEnded,
  onError,
  resumeKey,
}: {
  src: string;
  autoPlay?: boolean;
  title?: string;
  onEnded?: () => void;
  onError?: () => void;
  resumeKey?: string;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [speedOpen, setSpeedOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  // Transient "+10 s / -10 s" feedback shown over the video after a skip.
  const [skipHint, setSkipHint] = useState<number | null>(null);
  const skipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    let cancelled = false;
    setFailed(false);

    // Next.js can aggressively reuse DOM nodes; force the element to re-read the
    // <source> whenever the URL changes, otherwise it keeps the stale stream.
    v.load();

    if (autoPlay) {
      void (async () => {
        try {
          await v.play();
        } catch {
          // Browsers block autoplay with sound; retry muted so the video still
          // visibly starts (the user can unmute via the volume control).
          try {
            v.muted = true;
            setMuted(true);
            await v.play();
          } catch {
            /* awaiting a user gesture */
          }
        }
        // Unmounted while play() was pending → make sure it doesn't keep going.
        if (cancelled) v.pause();
      })();
    }

    return () => {
      // A detached <video> keeps playing its audio unless paused. The flag also
      // covers the case where play() resolves after this cleanup runs.
      cancelled = true;
      v.pause();
    };
  }, [autoPlay, src]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    // Drive the element's own `muted` flag — not just volume — so unmuting after
    // a muted autoplay actually restores sound.
    v.muted = muted;
    v.volume = volume;
  }, [volume, muted]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = speed;
  }, [speed]);

  // Stop playback when the audio player takes over (single-medium coordination).
  useEffect(() => onMedia(MEDIA_EVENTS.pauseVideos, () => videoRef.current?.pause()), []);

  useEffect(() => () => { if (skipTimer.current) clearTimeout(skipTimer.current); }, []);

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) void v.play().catch(() => {});
    else v.pause();
  };

  const seek = (ratio: number) => {
    const v = videoRef.current;
    if (v && Number.isFinite(v.duration)) v.currentTime = ratio * v.duration;
  };

  const skip = (delta: number) => {
    const v = videoRef.current;
    if (v) v.currentTime = Math.min(Math.max(0, v.currentTime + delta), v.duration || 0);
    setSkipHint(delta);
    if (skipTimer.current) clearTimeout(skipTimer.current);
    skipTimer.current = setTimeout(() => setSkipHint(null), 800);
  };

  const onProgress = () => {
    const v = videoRef.current;
    if (v && v.buffered.length > 0) setBuffered(v.buffered.end(v.buffered.length - 1));
  };

  const toggleFullscreen = () => {
    const el = wrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    else void el.requestFullscreen().catch(() => {});
  };

  const pct = duration > 0 ? (progress / duration) * 100 : 0;
  const bufferedPct = duration > 0 ? (buffered / duration) * 100 : 0;
  const VolumeIcon = muted || volume === 0 ? VolumeX : volume <= 0.5 ? Volume1 : Volume2;

  return (
    <div ref={wrapRef} className="group relative aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-2xl">
      <video
        ref={videoRef}
        title={title}
        crossOrigin="anonymous"
        playsInline
        preload="metadata"
        controls={false}
        onClick={toggle}
        onPlay={() => {
          setIsPlaying(true);
          // This video is now playing — silence the floating audio player.
          emitMedia(MEDIA_EVENTS.pauseAudio);
        }}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={(e) => {
          setProgress(e.currentTarget.currentTime);
          saveResume(resumeKey, e.currentTarget.currentTime, e.currentTarget.duration);
        }}
        onProgress={onProgress}
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          setDuration(v.duration);
          // Resume where the viewer left off (if a meaningful position exists).
          const resumeAt = readResume(resumeKey);
          if (resumeAt > 0 && resumeAt < v.duration - 8) v.currentTime = resumeAt;
        }}
        onEnded={() => {
          setIsPlaying(false);
          clearResume(resumeKey);
          onEnded?.();
        }}
        onError={() => {
          // The <source>/<video> fires transient error events with a null
          // MediaError (e.g. load() aborts); only surface genuine failures.
          const mediaError = videoRef.current?.error;
          if (!mediaError) return;
          console.warn("Lecture vidéo impossible :", mediaError.code, mediaError.message);
          setFailed(true);
          onError?.();
        }}
        className="size-full bg-black object-contain"
      >
        <source src={src} type="video/mp4" />
        Votre navigateur ne supporte pas la lecture de cette vidéo.
      </video>

      {/* Central play/pause */}
      <button
        type="button"
        onClick={toggle}
        aria-label={isPlaying ? "Pause" : "Lecture"}
        className={cn(
          "absolute inset-0 m-auto flex size-20 cursor-pointer items-center justify-center rounded-full bg-[#e2b85f] text-white shadow-xl backdrop-blur-md transition-all duration-300 hover:scale-105",
          isPlaying ? "opacity-0 group-hover:opacity-100" : "opacity-100"
        )}
      >
        {isPlaying ? <Pause className="size-8 fill-white" /> : <Play className="ml-1 size-8 fill-white" />}
      </button>

      {/* Muted-autoplay hint — one click restores sound. Hidden if the video
          isn't actually playable (no loaded content / failed source). */}
      {isPlaying && muted && !failed && duration > 0 && (
        <button
          type="button"
          onClick={() => setMuted(false)}
          className="absolute top-4 right-4 z-10 flex animate-pulse cursor-pointer items-center gap-2 rounded-full bg-[#e2b85f] px-4 py-2 text-sm font-bold text-white shadow-lg backdrop-blur-md transition hover:brightness-105"
        >
          <Volume2 className="size-4" /> Activer le son
        </button>
      )}

      {/* Skip feedback — "+10 s / -10 s" flash on seek. */}
      {skipHint !== null && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <div className="flex items-center gap-2 rounded-2xl bg-black/70 px-5 py-3 text-white shadow-xl backdrop-blur-md duration-200 animate-in fade-in zoom-in-95">
            {skipHint < 0 ? <RotateCcw className="size-5" /> : <RotateCw className="size-5" />}
            <span className="text-sm font-bold">
              {skipHint > 0 ? "+" : "−"}
              {Math.abs(skipHint)} s
            </span>
          </div>
        </div>
      )}

      {/* Control bar */}
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-4 pt-12 pb-3 opacity-0 backdrop-blur-[2px] transition-opacity duration-200 group-hover:opacity-100">
        {/* Timeline with buffer */}
        <div
          className="group/bar relative h-1.5 cursor-pointer rounded-full bg-white/20"
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            seek((e.clientX - r.left) / r.width);
          }}
        >
          <div className="absolute inset-y-0 left-0 rounded-full bg-white/25" style={{ width: `${bufferedPct}%` }} />
          <div className="absolute inset-y-0 left-0 rounded-full bg-[#e2b85f]" style={{ width: `${pct}%` }}>
            <span className="absolute top-1/2 right-0 size-3 -translate-y-1/2 translate-x-1/2 rounded-full bg-[#e2b85f] opacity-0 shadow transition group-hover/bar:opacity-100" />
          </div>
        </div>

        <div className="flex items-center gap-3 text-white">
          <button type="button" onClick={toggle} aria-label={isPlaying ? "Pause" : "Lecture"} className="cursor-pointer transition hover:text-[#e2b85f]">
            {isPlaying ? <Pause className="size-5 fill-white" /> : <Play className="size-5 fill-white" />}
          </button>
          <button type="button" onClick={() => skip(-SKIP)} aria-label={`Reculer de ${SKIP}s`} className="cursor-pointer transition hover:text-[#e2b85f]">
            <RotateCcw className="size-4" />
          </button>
          <button type="button" onClick={() => skip(SKIP)} aria-label={`Avancer de ${SKIP}s`} className="cursor-pointer transition hover:text-[#e2b85f]">
            <RotateCw className="size-4" />
          </button>
          <span className="font-mono text-xs tabular-nums text-white/85">
            {formatTime(progress)} / {formatTime(duration)}
          </span>

          <div className="ml-auto flex items-center gap-3">
            {/* Speed */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setSpeedOpen((o) => !o)}
                aria-label="Vitesse de lecture"
                className="flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-bold transition hover:text-[#e2b85f]"
              >
                <Gauge className="size-4" /> {speed}x
              </button>
              {speedOpen && (
                <div className="absolute right-0 bottom-8 flex flex-col overflow-hidden rounded-lg border border-white/10 bg-ink/95 py-1 shadow-xl backdrop-blur-md">
                  {SPEEDS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setSpeed(s);
                        setSpeedOpen(false);
                      }}
                      className={cn(
                        "cursor-pointer px-4 py-1.5 text-left text-xs font-bold transition hover:bg-white/10",
                        s === speed ? "text-[#e2b85f]" : "text-cream"
                      )}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Volume */}
            <div className="group/vol flex items-center gap-2">
              <button type="button" onClick={() => setMuted((m) => !m)} aria-label="Volume" className="cursor-pointer transition hover:text-[#e2b85f]">
                <VolumeIcon className="size-5" />
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
                aria-label="Niveau du volume"
                className="w-0 cursor-pointer accent-[#e2b85f] opacity-0 transition-all duration-200 group-hover/vol:w-20 group-hover/vol:opacity-100"
              />
            </div>

            {/* Fullscreen */}
            <button type="button" onClick={toggleFullscreen} aria-label="Plein écran" className="cursor-pointer transition hover:text-[#e2b85f]">
              <Maximize className="size-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
