/**
 * WHIP publisher — pushes a local `MediaStream` (the program-out feed) to a media
 * server over WebRTC using WHIP (WebRTC-HTTP Ingestion Protocol, the standard
 * "send" handshake).
 *
 * A browser can't speak RTMP, so it publishes via WebRTC to a media server
 * (OvenMediaEngine / MediaMTX / Cloudflare Stream) which transcodes to H264/AAC
 * and re-streams to Facebook over RTMPS. This module only handles the
 * browser→server leg; the server→Facebook push is configured server-side.
 *
 * Handshake: create an offer, wait for ICE gathering, POST the SDP to the WHIP
 * endpoint (`Content-Type: application/sdp`), apply the answer, and remember the
 * `Location` resource URL so we can `DELETE` it to stop.
 */

export type WhipState = "connecting" | "connected" | "failed" | "closed";

export type WhipPublisher = {
  /** Live connection state. */
  getState: () => WhipState;
  /** Raw WebRTC stats for the outgoing connection (real encoder/bitrate/fps
   *  readouts) — `null` once stopped. See `use-encoder-stats.ts`. */
  getStats: () => Promise<RTCStatsReport | null>;
  /** Stop publishing: DELETE the WHIP resource and close the peer connection. */
  stop: () => Promise<void>;
};

/** Wait until ICE gathering completes, or `timeoutMs` elapses (non-trickle WHIP). */
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
 * Publish `stream` to a WHIP `endpoint`. `token` (optional) is sent as a Bearer
 * Authorization header. Resolves once the answer is applied; connection progress
 * is reported through `onState`.
 */
export async function publishWhip(opts: {
  endpoint: string;
  stream: MediaStream;
  token?: string;
  iceServers?: RTCIceServer[];
  /** Force H264 for the video track. Required for SRS (and most servers that
   *  remux WebRTC→RTMP): the video is passed through unchanged, so it must be
   *  H264 — a VP8 offer can't be forwarded to Facebook. Default `true`. */
  preferH264?: boolean;
  onState?: (state: WhipState) => void;
}): Promise<WhipPublisher> {
  const { endpoint, stream, token, iceServers, preferH264 = true, onState } = opts;

  let state: WhipState = "connecting";
  const setState = (s: WhipState) => {
    state = s;
    onState?.(s);
  };

  const pc = new RTCPeerConnection({
    iceServers: iceServers ?? [{ urls: "stun:stun.l.google.com:19302" }],
    // SRS requires a single BUNDLE group (rejects otherwise: "only support BUNDLE").
    bundlePolicy: "max-bundle",
  });

  pc.addEventListener("connectionstatechange", () => {
    if (pc.connectionState === "connected") setState("connected");
    else if (pc.connectionState === "failed") setState("failed");
    else if (pc.connectionState === "closed" && state !== "closed") setState("failed");
  });

  // Send-only: add every track from the program feed (video + mixed audio).
  let videoSender: RTCRtpSender | null = null;
  for (const track of stream.getTracks()) {
    const tr = pc.addTransceiver(track, { direction: "sendonly", streams: [stream] });
    if (track.kind === "video") {
      videoSender = tr.sender;
      // NOTE: no `contentHint = "detail"` and no `maintain-resolution` here — we
      // tried both for sharpness and they made the stream FREEZE under transient
      // CPU/network pressure (the encoder's only remaining lever was framerate).
      // "balanced" degradation keeps motion fluid; sharpness comes from the
      // bitrate ceiling below.
      if (preferH264 && tr.setCodecPreferences) {
        const caps = RTCRtpSender.getCapabilities("video");
        if (caps) {
          const h264 = caps.codecs.filter((c) => c.mimeType.toLowerCase() === "video/h264");
          if (h264.length > 0) {
            const others = caps.codecs.filter((c) => c.mimeType.toLowerCase() !== "video/h264");
            try {
              tr.setCodecPreferences([...h264, ...others]);
            } catch {
              /* browser rejected the ordering — fall back to its default */
            }
          }
        }
      }
    }
  }

  /**
   * Post-negotiation encoder tuning. Raise the bitrate CEILING (sized to the
   * track's resolution) so text stays crisp, but keep the DEFAULT "balanced"
   * degradation: under transient pressure the encoder may soften the image a
   * little yet the motion stays fluid — forcing `maintain-resolution` made the
   * broadcast freeze in bursts instead. Best-effort.
   */
  async function tuneVideoEncoding() {
    if (!videoSender) return;
    try {
      const h = videoSender.track?.getSettings().height ?? 1080;
      const maxBitrate = h >= 2160 ? 24_000_000 : h >= 1440 ? 14_000_000 : h >= 1080 ? 8_000_000 : 5_000_000;
      const params = videoSender.getParameters();
      params.degradationPreference = "balanced";
      if (!params.encodings || params.encodings.length === 0) params.encodings = [{}];
      params.encodings[0].maxBitrate = maxBitrate;
      await videoSender.setParameters(params);
    } catch {
      /* setParameters unsupported mid-flight — keep browser defaults */
    }
  }

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  await waitForIce(pc);

  const headers: Record<string, string> = { "Content-Type": "application/sdp" };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: pc.localDescription?.sdp ?? offer.sdp ?? "",
    });
  } catch (err) {
    pc.close();
    setState("failed");
    throw new Error(`WHIP: échec réseau vers l'ingest (${(err as Error).message})`);
  }

  if (!res.ok) {
    pc.close();
    setState("failed");
    throw new Error(`WHIP: l'ingest a répondu ${res.status} ${res.statusText}`);
  }

  const answerSdp = await res.text();
  // The resource URL to DELETE on stop (may be relative to the endpoint).
  const location = res.headers.get("Location");
  const resourceUrl = location ? new URL(location, endpoint).toString() : null;

  await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
  void tuneVideoEncoding();

  return {
    getState: () => state,
    getStats: () => (state === "closed" ? Promise.resolve(null) : pc.getStats()),
    async stop() {
      setState("closed");
      if (resourceUrl) {
        try {
          await fetch(resourceUrl, {
            method: "DELETE",
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          });
        } catch {
          /* best-effort — closing the pc stops the media regardless */
        }
      }
      pc.close();
    },
  };
}
