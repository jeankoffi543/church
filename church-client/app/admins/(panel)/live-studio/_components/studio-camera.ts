/**
 * Live Studio camera/capture bridge. A "Caméra / Capture" source is a local
 * device consumed with `getUserMedia` — a webcam, a capture card (HDMI→USB), or
 * an NDI source exposed as a virtual webcam (NewTek "NDI Virtual Input").
 * Browsers cannot receive NDI natively, so device capture is the real path.
 *
 * The Preview monitor (audio owner) acquires ONE `MediaStream` and publishes it
 * here; the Program monitor attaches the SAME stream to its own `<video>` so the
 * live feed is inherently synchronised (no follower needed — it's live).
 */

export type MediaDeviceLite = { deviceId: string; label: string };

function hasMediaDevices(): boolean {
  return typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
}

/** Enumerate video (or audio) input devices. Labels are empty until permission
 *  has been granted at least once for this origin (used to detect that state). */
export async function listInputs(kind: "videoinput" | "audioinput"): Promise<MediaDeviceLite[]> {
  if (!hasMediaDevices()) return [];
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter((d) => d.kind === kind && d.deviceId)
      .map((d) => ({ deviceId: d.deviceId, label: d.label }));
  } catch {
    return [];
  }
}

/** Prompt for camera/mic permission so device labels become available. */
export async function requestCameraPermission(): Promise<boolean> {
  if (!hasMediaDevices()) return false;
  try {
    const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    s.getTracks().forEach((t) => t.stop());
    return true;
  } catch {
    return false;
  }
}

/** Acquire a capture stream for a device (video, optional audio). */
export async function acquireCameraStream(opts: {
  deviceId?: string;
  audioDeviceId?: string;
  withAudio: boolean;
}): Promise<MediaStream> {
  if (!hasMediaDevices()) throw new Error("getUserMedia indisponible");
  const video: MediaTrackConstraints = opts.deviceId
    ? { deviceId: { exact: opts.deviceId } }
    : {};
  const audio: MediaTrackConstraints | boolean = opts.withAudio
    ? opts.audioDeviceId
      ? { deviceId: { exact: opts.audioDeviceId } }
      : true
    : false;
  return navigator.mediaDevices.getUserMedia({ video: Object.keys(video).length ? video : true, audio });
}

/* ── Shared live streams (Preview → Program) ─────────────────────────── */

const streams = new Map<string, MediaStream>();
const listeners = new Set<() => void>();

export function setCameraStream(id: string, stream: MediaStream | null): void {
  if (stream) streams.set(id, stream);
  else streams.delete(id);
  listeners.forEach((l) => l());
}

export function getCameraStream(id: string): MediaStream | undefined {
  return streams.get(id);
}

export function subscribeCameraStreams(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
