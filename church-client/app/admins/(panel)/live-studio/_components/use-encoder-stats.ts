"use client";

import { useEffect, useRef, useState } from "react";

export type EncoderStats = {
  connected: boolean;
  /** e.g. "H264", "VP8", "VP9" — read from the negotiated codec, not guessed. */
  codecName: string | null;
  /** H264 profile decoded from `sdpFmtpLine`'s `profile-level-id` (Baseline/Main/High). */
  profile: string | null;
  bitrateKbps: number | null;
  fps: number | null;
  /** Cumulative since connecting. */
  droppedFrames: number;
  droppedPct: number;
  /** Real encoder workload: `totalEncodeTime` (seconds of actual encode work)
   *  over real wall-clock time × 100. There is no standard, cross-browser API
   *  for a tab's true CPU percentage — this is the closest honestly-measurable
   *  analogue (what OBS calls "encoding overload"), so the status bar never
   *  shows a fabricated "CPU %". */
  encodeLoadPct: number | null;
};

const IDLE: EncoderStats = {
  connected: false,
  codecName: null,
  profile: null,
  bitrateKbps: null,
  fps: null,
  droppedFrames: 0,
  droppedPct: 0,
  encodeLoadPct: null,
};

/** First byte of H264's `profile-level-id` → the human profile name. */
const H264_PROFILE_BYTE: Record<string, string> = {
  "42": "Baseline",
  "4d": "Main",
  "58": "Extended",
  "64": "High",
  "6e": "High 10",
};

function parseH264Profile(sdpFmtpLine: string | undefined): string | null {
  if (!sdpFmtpLine) return null;
  const m = /profile-level-id=([0-9A-Fa-f]{6})/.exec(sdpFmtpLine);
  if (!m) return null;
  return H264_PROFILE_BYTE[m[1].slice(0, 2).toLowerCase()] ?? null;
}

interface OutboundVideoRtp {
  type: "outbound-rtp";
  kind?: string;
  mediaType?: string;
  codecId?: string;
  timestamp: number;
  bytesSent?: number;
  framesSent?: number;
  framesEncoded?: number;
  framesPerSecond?: number;
  totalEncodeTime?: number;
}
interface CodecStat {
  type: "codec";
  id: string;
  mimeType?: string;
  sdpFmtpLine?: string;
}

type Sample = {
  t: number;
  bytesSent: number;
  framesSent: number;
  framesEncoded: number;
  totalEncodeTime: number;
  droppedFrames: number;
};

/**
 * Real encoder/network readouts for the studio's status bar, sampled every ~1s
 * from the WHIP connection's `RTCStatsReport` while publishing. Replaces the
 * previously hardcoded "4500 kb/s / 60 FPS / CPU 14%" chrome (see
 * `status-bar.tsx`) — every value here is measured from the live connection,
 * never guessed, and the bar returns to a neutral idle state when not
 * publishing rather than showing stale/fake numbers.
 */
export function useEncoderStats(
  getStats: () => Promise<RTCStatsReport | null>,
  connected: boolean,
  targetFps: number,
): EncoderStats {
  const [stats, setStats] = useState<EncoderStats>(IDLE);
  const prevRef = useRef<Sample | null>(null);

  useEffect(() => {
    if (!connected) {
      prevRef.current = null;
      // Resetting to the neutral idle readout when the connection drops —
      // guarded by `connected`, so this can't cascade (mirrors the same
      // guarded reset pattern used for clearing search suggestions above).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStats(IDLE);
      return;
    }
    let cancelled = false;

    async function sample() {
      const report = await getStats();
      if (cancelled || !report) return;

      let outbound: OutboundVideoRtp | null = null;
      // A WHIP session publishes video AND audio tracks, so the report holds a
      // codec stat per track — index by id and look up the VIDEO one specifically,
      // otherwise the last-seen codec (often audio/Opus) could win.
      const codecsById = new Map<string, CodecStat>();
      report.forEach((stat) => {
        const raw = stat as unknown as Record<string, unknown>;
        if (raw.type === "outbound-rtp" && (raw.kind === "video" || raw.mediaType === "video")) {
          outbound = stat as unknown as OutboundVideoRtp;
        } else if (raw.type === "codec") {
          const c = stat as unknown as CodecStat;
          codecsById.set(c.id, c);
        }
      });
      if (!outbound) return;
      const ob: OutboundVideoRtp = outbound;
      const codec = ob.codecId ? (codecsById.get(ob.codecId) ?? null) : null;

      const now = ob.timestamp;
      const bytesSent = ob.bytesSent ?? 0;
      const framesSent = ob.framesSent ?? 0;
      const framesEncoded = ob.framesEncoded ?? 0;
      const totalEncodeTime = ob.totalEncodeTime ?? 0;

      const prev = prevRef.current;
      let bitrateKbps: number | null = null;
      let fps: number | null = ob.framesPerSecond ?? null;
      let encodeLoadPct: number | null = null;
      let cumulativeDropped = prev?.droppedFrames ?? 0;

      if (prev) {
        const dtMs = now - prev.t;
        if (dtMs > 0) {
          const dBytes = Math.max(0, bytesSent - prev.bytesSent);
          bitrateKbps = Math.round((dBytes * 8) / dtMs); // bytes·8 / ms == kbit/s
          if (fps == null) {
            const dFrames = Math.max(0, framesEncoded - prev.framesEncoded);
            fps = Math.round((dFrames / dtMs) * 1000);
          }
          const dEncodeTime = Math.max(0, totalEncodeTime - prev.totalEncodeTime);
          encodeLoadPct = Math.round(Math.min(100, (dEncodeTime / (dtMs / 1000)) * 100));

          const expected = (dtMs / 1000) * targetFps;
          const dSent = Math.max(0, framesSent - prev.framesSent);
          cumulativeDropped += Math.max(0, Math.round(expected - dSent));
        }
      }

      prevRef.current = { t: now, bytesSent, framesSent, framesEncoded, totalEncodeTime, droppedFrames: cumulativeDropped };

      const mime = codec?.mimeType;
      const codecName = mime ? (mime.split("/")[1]?.toUpperCase() ?? null) : null;
      const profile = codecName === "H264" ? parseH264Profile(codec?.sdpFmtpLine) : null;
      const totalSoFar = Math.max(1, framesSent + cumulativeDropped);

      if (!cancelled) {
        setStats({
          connected: true,
          codecName,
          profile,
          bitrateKbps,
          fps,
          droppedFrames: cumulativeDropped,
          droppedPct: Math.round((cumulativeDropped / totalSoFar) * 1000) / 10,
          encodeLoadPct,
        });
      }
    }

    void sample();
    const id = setInterval(() => void sample(), 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [connected, getStats, targetFps]);

  return stats;
}
