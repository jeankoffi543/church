/**
 * Resolve an external live link (YouTube / Facebook / Vimeo / HLS / direct file)
 * to something renderable in a monitor: an `iframe` src or a `<video>` src.
 * Mirrors the conversion used by the public live player.
 */
export function resolveEmbed(url: string): { type: "iframe" | "video" | null; src: string } {
  const u = (url || "").trim();
  if (!u) return { type: null, src: "" };

  // YouTube
  if (u.includes("watch?v=")) {
    return { type: "iframe", src: u.replace("watch?v=", "embed/") };
  }
  if (u.includes("youtu.be/")) {
    const id = u.split("youtu.be/")[1]?.split(/[?&]/)[0] ?? "";
    return { type: "iframe", src: `https://www.youtube.com/embed/${id}` };
  }
  if (u.includes("youtube.com/embed/")) {
    return { type: "iframe", src: u };
  }

  // Vimeo
  if (u.includes("vimeo.com/") && !u.includes("player.vimeo.com")) {
    const id = u.split("vimeo.com/")[1]?.split(/[?&]/)[0] ?? "";
    return { type: "iframe", src: `https://player.vimeo.com/video/${id}` };
  }

  // Facebook
  if (/facebook\.com|fb\.watch|fb\.me/.test(u)) {
    return {
      type: "iframe",
      src: `https://www.facebook.com/plugins/video.php?show_text=false&href=${encodeURIComponent(u)}`,
    };
  }

  // Direct media / HLS
  if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(u) || u.endsWith(".m3u8")) {
    return { type: "video", src: u };
  }

  // Fallback: assume it is already an embeddable iframe URL.
  return { type: "iframe", src: u };
}
