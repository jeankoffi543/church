"use client";

import { Maximize, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type Hls from "hls.js";

/**
 * Plays an HLS (`.m3u8`) stream. Native HLS on Safari, lazy hls.js elsewhere; the
 * instance is destroyed on unmount. Tuned to sit near the live edge and catch up.
 *
 * In `live` mode the native controls are removed and replaced by a compact bar
 * **at the top** (play / mute / fullscreen) so they never overlap the reaction
 * buttons pinned to the bottom-right. Archives keep the full native controls.
 */
export function HlsPlayer({
  src,
  title,
  onTime,
  live = false,
}: {
  src: string;
  title?: string;
  onTime?: (seconds: number) => void;
  live?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setFailed(false);
    let hls: Hls | null = null;
    let cancelled = false;

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      video.play().catch(() => {});
      return;
    }

    import("hls.js")
      .then(({ default: Hls }) => {
        if (cancelled || !Hls.isSupported()) {
          if (!Hls.isSupported()) setFailed(true);
          return;
        }
        hls = new Hls(
          live
            ? {
                enableWorker: true,
                // The studio feed (WebRTC → SRS RTMP → HLS) has slightly jittery
                // segment timing — hugging the live edge (2-segment sync + 1.5×
                // catch-up) stalled constantly and froze the page. Keep a healthy
                // cushion (~6s from edge) and let hls.js retry hard on blips.
                liveSyncDuration: 6,
                liveMaxLatencyDuration: 24,
                maxLiveSyncPlaybackRate: 1.1,
                maxBufferLength: 30,
                backBufferLength: 30,
                fragLoadingMaxRetry: 8,
                levelLoadingMaxRetry: 8,
                manifestLoadingMaxRetry: 8,
              }
            : { enableWorker: true, backBufferLength: 30 },
        );

        // A live blip (segment rollover, brief gap, decode hiccup) is recoverable
        // — retry instead of killing the player forever. Bounded so a truly dead
        // stream still surfaces the fallback; reset once media flows again.
        let recoveries = 0;
        const MAX_RECOVERIES = 6;
        hls.loadSource(src);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
        hls.on(Hls.Events.FRAG_BUFFERED, () => {
          recoveries = 0;
        });
        hls.on(Hls.Events.ERROR, (_e, data) => {
          if (!data.fatal || !hls) return;
          if (recoveries >= MAX_RECOVERIES) {
            hls.destroy();
            setFailed(true);
            return;
          }
          recoveries += 1;
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            // Wait a beat so we don't hammer a momentarily-down segment.
            setTimeout(() => hls?.startLoad(), 1000);
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
          } else {
            hls.destroy();
            setFailed(true);
          }
        });
      })
      .catch(() => setFailed(true));

    return () => {
      cancelled = true;
      hls?.destroy();
    };
  }, [src, live]);

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  };

  const toggleFullscreen = () => {
    const el = wrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    } else {
      void el.requestFullscreen?.().catch(() => {});
    }
  };

  if (failed) {
    return (
      <div className="absolute inset-0 grid place-items-center px-6 text-center">
        <p className="max-w-sm text-sm font-medium text-white/70">
          Le flux en direct est momentanément indisponible. Réessayez dans un instant.
        </p>
      </div>
    );
  }

  // Archives: full native controls (seek bar is useful for VOD).
  if (!live) {
    return (
      <video
        ref={videoRef}
        title={title}
        className="absolute inset-0 size-full bg-black"
        controls
        playsInline
        autoPlay
        muted
        onTimeUpdate={(e) => onTime?.(e.currentTarget.currentTime)}
      />
    );
  }

  // Live: minimal controls at the top, away from the bottom reaction buttons.
  return (
    <div ref={wrapRef} className="absolute inset-0">
      <video
        ref={videoRef}
        title={title}
        className="size-full bg-black"
        playsInline
        autoPlay
        muted
        onClick={togglePlay}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => onTime?.(e.currentTarget.currentTime)}
      />
      <div className="pointer-events-auto absolute top-3 right-3 z-20 flex gap-2">
        <ControlButton label={playing ? "Pause" : "Lecture"} onClick={togglePlay}>
          {playing ? <Pause className="size-4 fill-white" /> : <Play className="size-4 fill-white" />}
        </ControlButton>
        <ControlButton label={muted ? "Activer le son" : "Couper le son"} onClick={toggleMute}>
          {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        </ControlButton>
        <ControlButton label="Plein écran" onClick={toggleFullscreen}>
          <Maximize className="size-4" />
        </ControlButton>
      </div>
    </div>
  );
}

function ControlButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid size-9 cursor-pointer place-items-center rounded-full border border-white/15 bg-black/50 text-white backdrop-blur-md transition hover:bg-black/70"
    >
      {children}
    </button>
  );
}
