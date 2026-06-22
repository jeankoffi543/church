// Cross-component coordination so only one medium is ever audible at a time:
// the floating audio player and any in-page video must not play together.
//
// Starting audio emits `pauseVideos`; starting a video emits `pauseAudio`.
// Each player listens for the other's event and stops itself. Pausing never
// re-emits, so there is no feedback loop.

export const MEDIA_EVENTS = {
  pauseVideos: "mfm:pause-videos",
  pauseAudio: "mfm:pause-audio",
} as const;

export function emitMedia(event: string): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(event));
  }
}

/** Subscribe to a media-bus event. Returns an unsubscribe function. */
export function onMedia(event: string, handler: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(event, handler);
  return () => window.removeEventListener(event, handler);
}
