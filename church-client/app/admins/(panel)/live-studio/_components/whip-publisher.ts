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
  for (const track of stream.getTracks()) {
    const tr = pc.addTransceiver(track, { direction: "sendonly", streams: [stream] });
    if (track.kind === "video" && preferH264 && tr.setCodecPreferences) {
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

  return {
    getState: () => state,
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
