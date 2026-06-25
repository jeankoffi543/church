/**
 * Live Studio (régie) shared types + the public, latency-free Bible engine
 * client. The Bible search endpoint is public, so the console queries it
 * directly from the browser for instant autocomplete.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

/* ── Types ──────────────────────────────────────────────────────── */

export type ScriptureVerse = {
  id?: number;
  book?: string | null;
  chapter?: number | null;
  verse?: number | null;
  reference: string;
  text: string;
  translation?: string;
  texts?: Record<string, string>;
};

export type StudioLayout = "lower_third" | "full_screen" | "sidebar";
export type StudioAnimation = "fade_slide" | "typewriter" | "scale" | "neon_slide";

export type StudioSettings = {
  layout: StudioLayout;
  animation: StudioAnimation;
  font: string;
  background: string;
  /** 0 = stays until manually hidden. */
  duration: number;
};

export const DEFAULT_STUDIO_SETTINGS: StudioSettings = {
  layout: "lower_third",
  animation: "fade_slide",
  font: "Cormorant Garamond",
  background: "gradient_purple",
  duration: 0,
};

/** Payload broadcast over the `live` channel (`.scripture`). */
export type ScripturePayload = {
  action: "show" | "hide";
  verse: ScriptureVerse | null;
  settings: StudioSettings | null;
  at?: string;
};

export type BibleSearchResult = {
  query: string;
  match: ScriptureVerse | null;
  next_verse: ScriptureVerse | null;
  next_chapter: ScriptureVerse | null;
  suggestions: ScriptureVerse[];
};

export type NavigateDirection = "next_verse" | "prev_verse" | "next_chapter" | "prev_chapter";

export async function getBibleTranslations(): Promise<string[]> {
  try {
    const res = await fetch(`${API_URL}/public/bible/translations`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { data: string[] };
    return json.data;
  } catch {
    return [];
  }
}

/* ── Public Bible engine (browser-side, no auth) ────────────────── */

export async function searchBible(
  query: string,
  versions?: string[],
  signal?: AbortSignal
): Promise<BibleSearchResult | null> {
  const q = query.trim();
  if (!q) return null;

  const params = new URLSearchParams({ q });
  if (versions && versions.length > 0) {
    versions.forEach((v) => {
      params.append("translations[]", v);
    });
  }

  try {
    const res = await fetch(`${API_URL}/public/bible/search?${params.toString()}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal,
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data: BibleSearchResult };
    return json.data;
  } catch {
    return null;
  }
}

export async function navigateBible(
  verse: ScriptureVerse,
  direction: NavigateDirection,
  versions?: string[]
): Promise<ScriptureVerse | null> {
  if (!verse.book || !verse.chapter || !verse.verse) return null;
  const params = new URLSearchParams({
    book: verse.book,
    chapter: String(verse.chapter),
    verse: String(verse.verse),
    direction,
  });
  if (versions && versions.length > 0) {
    versions.forEach((v) => {
      params.append("translations[]", v);
    });
  }
  try {
    const res = await fetch(`${API_URL}/public/bible/navigate?${params.toString()}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data: ScriptureVerse | null };
    return json.data;
  } catch {
    return null;
  }
}

/** The overlay currently on air — lets a viewer catch up when joining mid-stream. */
export async function getCurrentScripture(): Promise<ScripturePayload | null> {
  try {
    const res = await fetch(`${API_URL}/public/live/scripture`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data: ScripturePayload };
    return json.data;
  } catch {
    return null;
  }
}
