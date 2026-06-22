// Minimal typed wrapper around the SoundCloud Widget API, used to stream third
// party audio through a hidden iframe — no bulky orange widget on screen.

export type SCWidget = {
  bind(event: string, listener: (e?: { currentPosition?: number }) => void): void;
  unbind(event: string): void;
  load(url: string, options?: Record<string, unknown>): void;
  play(): void;
  pause(): void;
  seekTo(milliseconds: number): void;
  setVolume(volume: number): void; // 0..100
  getDuration(cb: (ms: number) => void): void;
};

type SCNamespace = {
  Widget: {
    (el: HTMLIFrameElement | string): SCWidget;
    Events: Record<string, string>;
  };
};

declare global {
  interface Window {
    SC?: SCNamespace;
  }
}

let apiPromise: Promise<SCNamespace | null> | null = null;

/** Lazily inject the SoundCloud Widget API. Resolves null if it cannot load. */
export function loadSoundCloudApi(): Promise<SCNamespace | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (window.SC) return Promise.resolve(window.SC);
  if (!apiPromise) {
    apiPromise = new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://w.soundcloud.com/player/api.js";
      script.async = true;
      script.onload = () => resolve(window.SC ?? null);
      script.onerror = () => resolve(null);
      document.head.appendChild(script);
    });
  }
  return apiPromise;
}

export function soundCloudEmbedSrc(trackUrl: string): string {
  const params = new URLSearchParams({
    url: trackUrl,
    auto_play: "false",
    visual: "false",
    hide_related: "true",
    show_comments: "false",
    show_user: "false",
  });
  return `https://w.soundcloud.com/player/?${params}`;
}
