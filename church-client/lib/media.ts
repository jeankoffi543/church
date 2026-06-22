// Media helpers: turn admin-provided links into embeddable players and detect
// third-party audio providers — so nothing ever redirects off-site.

import type { SermonMediaType } from "@/lib/data";

export type VideoEmbed =
  | { kind: "youtube" | "vimeo"; src: string }
  | { kind: "file"; src: string };

/** Extract a YouTube video id from any common URL shape. */
export function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/(?:embed|shorts|v)\/)([\w-]{11})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}

/** Extract a Vimeo video id. */
export function extractVimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? m[1] : null;
}

export function isSoundCloudUrl(url: string | null | undefined): boolean {
  return Boolean(url && /soundcloud\.com/i.test(url));
}

/**
 * Resolve the playable embed for a sermon. Returns `null` when there is no
 * usable source. Cinema-mode iframe params hide third-party chrome as much as
 * the providers allow.
 */
export function getVideoEmbed(mediaType: SermonMediaType, src: string | null): VideoEmbed | null {
  if (!src) return null;

  if (mediaType === "video_file") {
    return { kind: "file", src };
  }

  const yt = extractYouTubeId(src);
  if (yt) {
    const params = new URLSearchParams({
      autoplay: "1",
      controls: "0",
      modestbranding: "1",
      rel: "0",
      playsinline: "1",
      iv_load_policy: "3",
    });
    return { kind: "youtube", src: `https://www.youtube.com/embed/${yt}?${params}` };
  }

  const vimeo = extractVimeoId(src);
  if (vimeo) {
    const params = new URLSearchParams({
      autoplay: "1",
      title: "0",
      byline: "0",
      portrait: "0",
    });
    return { kind: "vimeo", src: `https://player.vimeo.com/video/${vimeo}?${params}` };
  }

  // A direct video link (e.g. an .mp4 URL) — play it natively.
  return { kind: "file", src };
}

/** mm:ss formatter shared by the players. */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
