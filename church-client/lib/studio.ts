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
export type StudioAnimation = "none" | "fade_slide" | "typewriter" | "scale" | "neon_slide" | "slide_left" | "slide_right" | "clip_reveal" | "scroll_left" | "scroll_right" | "scroll_up" | "scroll_down";

export type StudioSettings = {
  layout: StudioLayout;
  animation: StudioAnimation;
  font: string;
  background: string;
  /** 0 = stays until manually hidden. */
  duration: number;

  // Typographie - Référence/Titre
  fontRefFamily: string;
  fontRefWeight: string;
  fontRefStyle: "normal" | "italic";
  fontRefTransform: "none" | "uppercase";
  fontRefDecoration: "none" | "underline";
  fontRefSpacing: number;
  fontRefSize: number;
  fontRefLineHeight: number;
  fontRefColor: string;

  // Typographie - Verset/Corps
  fontBodyFamily: string;
  fontBodyWeight: string;
  fontBodyStyle: "normal" | "italic";
  fontBodyTransform: "none" | "uppercase";
  fontBodyDecoration: "none" | "underline";
  fontBodySpacing: number;
  fontBodySize: number;
  fontBodyLineHeight: number;
  fontBodyColor: string;

  // Typographie - Code Version
  fontVerFamily: string;
  fontVerWeight: string;
  fontVerStyle: "normal" | "italic";
  fontVerTransform: "none" | "uppercase";
  fontVerDecoration: "none" | "underline";
  fontVerSpacing: number;
  fontVerSize: number;
  fontVerLineHeight: number;
  fontVerColor: string;

  // Conteneur & Géométrie
  containerShape: "rectangle" | "rounded_rectangle" | "capsule" | "asymmetric" | "transparent";
  containerBg: string;
  containerBorderRadius: number;
  containerBorderWidth: number;
  containerBorderStyle: "solid" | "dashed" | "glow" | "none";
  containerBorderColor: string;
  containerPaddingX: number;
  containerPaddingY: number;

  // Ombres portée (Box Shadow)
  shadowBlur: number;
  shadowSpread: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  shadowColor: string;

  // Positionnement Libre
  positionMode: "predefined" | "custom";
  predefinedPosition:
    | "lower_third_left"
    | "lower_third_right"
    | "centered_bottom"
    | "centered_top"
    | "ticker"
    | "banner_top"
    | "full_screen_cinema"
    | "full_screen"
    | "pip_top_left"
    | "pip_top_right"
    | "pip_bottom_left"
    | "pip_bottom_right";
  customX: number; // %
  customY: number; // %
  customWidth: number; // %
  customHeight: number; // %

  // Animations & Transitions
  animDuration: number; // ms
  animEasing: "linear" | "ease-in" | "ease-out" | "ease-in-out" | "bounce";

  // Alignements
  textAlign?: "left" | "center" | "right";
  textVerticalAlign?: "top" | "center" | "bottom";
};

export const DEFAULT_STUDIO_SETTINGS: StudioSettings = {
  layout: "lower_third",
  animation: "fade_slide",
  font: "Cormorant Garamond",
  background: "gradient_purple",
  duration: 0,

  fontRefFamily: "Plus Jakarta Sans",
  fontRefWeight: "700",
  fontRefStyle: "normal",
  fontRefTransform: "uppercase",
  fontRefDecoration: "none",
  fontRefSpacing: 7.5,
  fontRefSize: 39,
  fontRefLineHeight: 1.2,
  fontRefColor: "#e2b85f",

  fontBodyFamily: "Cormorant Garamond",
  fontBodyWeight: "500",
  fontBodyStyle: "normal",
  fontBodyTransform: "none",
  fontBodyDecoration: "none",
  fontBodySpacing: 0,
  fontBodySize: 84,
  fontBodyLineHeight: 1.3,
  fontBodyColor: "#ffffff",

  fontVerFamily: "Plus Jakarta Sans",
  fontVerWeight: "600",
  fontVerStyle: "italic",
  fontVerTransform: "uppercase",
  fontVerDecoration: "none",
  fontVerSpacing: 3,
  fontVerSize: 33,
  fontVerLineHeight: 1.2,
  fontVerColor: "#e2b85f",

  containerShape: "rounded_rectangle",
  containerBg: "rgba(22, 15, 51, 0.95)",
  containerBorderRadius: 48,
  containerBorderWidth: 3,
  containerBorderStyle: "solid",
  containerBorderColor: "rgba(255, 255, 255, 0.1)",
  containerPaddingX: 84,
  containerPaddingY: 72,

  shadowBlur: 90,
  shadowSpread: 0,
  shadowOffsetX: 0,
  shadowOffsetY: 36,
  shadowColor: "rgba(0, 0, 0, 0.5)",

  positionMode: "predefined",
  predefinedPosition: "centered_bottom",
  customX: 10,
  customY: 70,
  customWidth: 80,
  customHeight: 20,

  animDuration: 500,
  animEasing: "ease-out",

  textAlign: "center",
  textVerticalAlign: "center",
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
