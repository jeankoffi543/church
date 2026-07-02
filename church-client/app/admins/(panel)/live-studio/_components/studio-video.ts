/**
 * Live Studio video transport bridge. The owned `<video>` element lives in the
 * Preview monitor (`VideoMedia`), but the transport controls (play / pause /
 * stop / seek / replay) live in the inspector. Each owned video registers a
 * {@link VideoController} keyed by its layer id so the inspector can drive it and
 * poll its playback state.
 */

export type VideoTransportState = {
  currentTime: number;
  duration: number;
  paused: boolean;
  ended: boolean;
  ready: boolean;
};

export type VideoController = {
  play: () => void;
  pause: () => void;
  toggle: () => void;
  /** Pause and rewind to the start. */
  stop: () => void;
  /** Rewind to the start and play. */
  restart: () => void;
  seek: (time: number) => void;
  skip: (deltaSeconds: number) => void;
  getState: () => VideoTransportState;
};

const controllers = new Map<string, VideoController>();

export function registerVideoController(id: string, controller: VideoController): () => void {
  controllers.set(id, controller);
  return () => {
    if (controllers.get(id) === controller) controllers.delete(id);
  };
}

export function getVideoController(id: string): VideoController | undefined {
  return controllers.get(id);
}
