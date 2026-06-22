// Minimal typed loader for the official YouTube IFrame Player API, used to bind
// playback state (end / error) without leaving the page.

export type YTPlayer = {
  playVideo(): void;
  pauseVideo(): void;
  destroy(): void;
  getPlayerState(): number;
};

type YTPlayerEvent = { data: number };

export type YTNamespace = {
  Player: new (
    el: HTMLElement | string,
    options: {
      videoId: string;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: (e: { target: YTPlayer }) => void;
        onStateChange?: (e: YTPlayerEvent) => void;
        onError?: (e: YTPlayerEvent) => void;
      };
    }
  ) => YTPlayer;
  PlayerState: { ENDED: number; PLAYING: number; PAUSED: number; BUFFERING: number; CUED: number };
};

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YTNamespace | null> | null = null;

/** Lazily inject the IFrame API. Resolves null if it fails to load. */
export function loadYouTubeApi(): Promise<YTNamespace | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!apiPromise) {
    apiPromise = new Promise((resolve) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        resolve(window.YT ?? null);
      };
      const existing = document.querySelector<HTMLScriptElement>('script[src="https://www.youtube.com/iframe_api"]');
      if (!existing) {
        const script = document.createElement("script");
        script.src = "https://www.youtube.com/iframe_api";
        script.async = true;
        script.onerror = () => resolve(null);
        document.head.appendChild(script);
      }
      // Safety timeout so callers never hang forever.
      setTimeout(() => resolve(window.YT ?? null), 6000);
    });
  }
  return apiPromise;
}
