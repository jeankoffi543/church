"use client";

import { Maximize, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/** Wait until ICE gathering completes, or `timeoutMs` elapses (non-trickle WHEP). */
function waitForIce(pc: RTCPeerConnection, timeoutMs = 3000): Promise<void> {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      pc.removeEventListener("icegatheringstatechange", check);
      clearTimeout(timer);
      resolve();
    };
    const check = () => {
      if (pc.iceGatheringState === "complete") done();
    };
    const timer = setTimeout(done, timeoutMs);
    pc.addEventListener("icegatheringstatechange", check);
  });
}

/**
 * Plays a live WebRTC stream over **WHEP** (WebRTC-HTTP Egress Protocol) — the same
 * feed the studio publishes to SRS, played back directly. WebRTC natively rides out
 * a frozen/jittery source (jitter buffer, last-frame hold, resume), so unlike the
 * HLS path it never stalls-to-black on a browser-source stall.
 *
 * Receive-only: offer two `recvonly` transceivers, POST the SDP to the WHEP url,
 * apply the answer. It **auto-reconnects** (with backoff) if the peer connection
 * drops or the stream isn't live yet — so it also survives a studio restart.
 */
export function WhepPlayer({ url, title }: { url: string; title?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const ambientRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let pc: RTCPeerConnection | null = null;
    let cancelled = false;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;

    const scheduleReconnect = () => {
      if (cancelled) return;
      try {
        pc?.close();
      } catch {
        /* already closed */
      }
      pc = null;
      setConnected(false);
      attempts += 1;
      // Backoff 1s → 5s max; keep trying indefinitely (the stream may just not be
      // live yet, or the studio is mid-restart).
      retry = setTimeout(connect, Math.min(1000 * attempts, 5000));
    };

    async function connect() {
      if (cancelled) return;
      const peer = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        bundlePolicy: "max-bundle",
      });
      pc = peer;

      const remote = new MediaStream();
      peer.addTransceiver("video", { direction: "recvonly" });
      peer.addTransceiver("audio", { direction: "recvonly" });

      peer.ontrack = (e) => {
        remote.addTrack(e.track);
        const v = videoRef.current;
        if (v && v.srcObject !== remote) {
          v.srcObject = remote;
          void v.play().catch(() => {});
        }
        // Ambient backdrop shares the SAME MediaStream (no extra connection).
        const b = ambientRef.current;
        if (b && b.srcObject !== remote) {
          b.srcObject = remote;
          void b.play().catch(() => {});
        }
      };
      peer.addEventListener("connectionstatechange", () => {
        if (peer !== pc) return;
        if (peer.connectionState === "connected") {
          attempts = 0;
          setConnected(true);
        } else if (peer.connectionState === "failed" || peer.connectionState === "disconnected") {
          scheduleReconnect();
        }
      });

      try {
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        await waitForIce(peer);

        // SRS native WebRTC play API: POST JSON { api, streamurl, sdp } → { sdp }.
        const u = new URL(url);
        const api = u.origin + u.pathname;
        const app = u.searchParams.get("app") ?? "live";
        const stream = u.searchParams.get("stream") ?? "";
        const streamurl = `webrtc://${u.hostname}/${app}/${stream}`;

        const res = await fetch(api, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ api, streamurl, sdp: peer.localDescription?.sdp ?? offer.sdp ?? "" }),
        });
        if (!res.ok) throw new Error(`play ${res.status}`);
        const json = (await res.json()) as { code?: number; sdp?: string };
        if (cancelled || peer !== pc) return;
        if (json.code !== 0 || !json.sdp) throw new Error(`play code ${json.code}`);
        await peer.setRemoteDescription({ type: "answer", sdp: json.sdp });
      } catch {
        scheduleReconnect();
      }
    }

    void connect();

    return () => {
      cancelled = true;
      if (retry) clearTimeout(retry);
      try {
        pc?.close();
      } catch {
        /* already closed */
      }
    };
  }, [url]);

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
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

  return (
    <div ref={wrapRef} className="absolute inset-0 overflow-hidden bg-black">
      {/* Ambient fill: the same stream cover-scaled + blurred behind the sharp
          16:9 picture, so a container that isn't exactly 16:9 shows glow instead
          of empty black bands (the fullscreen look, windowed). */}
      <video
        ref={ambientRef}
        aria-hidden
        // Full-strength ambient (45% opacity read as plain black): the bands must
        // feel like the video spilling over, not empty space.
        className="absolute inset-0 size-full scale-125 object-cover blur-3xl brightness-[.72] saturate-125"
        playsInline
        autoPlay
        muted
      />
      <video
        ref={videoRef}
        title={title}
        className="relative size-full object-contain"
        playsInline
        autoPlay
        muted
      />

      {!connected && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="flex items-center gap-2 rounded-full bg-black/50 px-3.5 py-1.5 text-[13px] font-semibold text-white/80 backdrop-blur-md">
            <span className="size-2 animate-pulse rounded-full bg-gold" />
            Connexion au direct…
          </div>
        </div>
      )}

      <div className="pointer-events-auto absolute top-3 right-3 z-20 flex gap-2">
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
