"use client";

import { useEffect, useRef, useState } from "react";
import type Hls from "hls.js";

/**
 * Plays an HLS (`.m3u8`) stream from our own RTMP→HLS server. Uses native HLS on
 * Safari, and lazy-loads hls.js elsewhere. The instance is destroyed on unmount
 * (no leak), and the manifest is loaded low-latency for live edge playback.
 */
export function HlsPlayer({ src, title }: { src: string; title?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setFailed(false);
    let hls: Hls | null = null;
    let cancelled = false;

    // Safari / iOS play HLS natively — no library needed.
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
        hls = new Hls({ lowLatencyMode: true, liveSyncDurationCount: 3, enableWorker: true });
        hls.loadSource(src);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
        hls.on(Hls.Events.ERROR, (_e, data) => {
          if (data.fatal) setFailed(true);
        });
      })
      .catch(() => setFailed(true));

    return () => {
      cancelled = true;
      hls?.destroy();
    };
  }, [src]);

  if (failed) {
    return (
      <div className="absolute inset-0 grid place-items-center px-6 text-center">
        <p className="max-w-sm text-sm font-medium text-white/70">
          Le flux en direct est momentanément indisponible. Réessayez dans un instant.
        </p>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      title={title}
      className="absolute inset-0 size-full bg-black"
      controls
      playsInline
      autoPlay
      muted
    />
  );
}
