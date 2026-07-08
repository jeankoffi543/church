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

/**
 * Acquire a SCREEN / window / tab capture via `getDisplayMedia` (OBS "Capture
 * d'écran"). Unlike a camera, this MUST be called from a user gesture and the
 * browser shows its own picker each time — there is no persistable deviceId, so
 * the resulting stream is held in the shared registry (see setCameraStream) and
 * is never silently re-acquired. `withAudio` requests system/tab audio where the
 * browser supports it (Chrome tab/desktop audio); it is best-effort.
 */
export async function acquireScreenStream(opts?: { withAudio?: boolean }): Promise<MediaStream> {
  const md = typeof navigator !== "undefined" ? navigator.mediaDevices : undefined;
  if (!md?.getDisplayMedia) throw new Error("getDisplayMedia indisponible");
  return md.getDisplayMedia({
    video: { frameRate: { ideal: 30, max: 60 } },
    audio: opts?.withAudio ?? true,
  });
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
