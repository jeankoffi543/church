// Public Bible engine (CHR-129) — the native mirror of church-client/lib/studio.ts.
// The desktop app hits the SAME church backend public endpoints (no auth) as the
// web console; only the base URL differs. Tauri's CSP is null, so the webview
// `fetch` reaches an external host directly.
import type { ScriptureVerse } from "./api";

export type BibleSearchResult = {
  query: string;
  match: ScriptureVerse | null;
  next_verse: ScriptureVerse | null;
  next_chapter: ScriptureVerse | null;
  suggestions: ScriptureVerse[];
};

export type NavigateDirection = "next_verse" | "prev_verse" | "next_chapter" | "prev_chapter";

// API base: an operator override in localStorage, else the church backend's dev
// default. No trailing slash. (Set via `studio.apiUrl` in localStorage.)
const DEFAULT_API = "http://127.0.0.1:8001/api/v1";
export function bibleApiBase(): string {
  const ls = (typeof localStorage !== "undefined" && localStorage.getItem("studio.apiUrl")) || "";
  return (ls || DEFAULT_API).replace(/\/+$/, "");
}
export function setBibleApiBase(url: string) {
  localStorage.setItem("studio.apiUrl", url.trim());
}

// The operator's selected translations, shared between the search panel and the
// verse/chapter nav so both stay on the same version set.
export function bibleVersions(): string[] {
  try {
    const raw = localStorage.getItem("studio.bibleVersions");
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}
export function setBibleVersions(v: string[]) {
  localStorage.setItem("studio.bibleVersions", JSON.stringify(v));
}

export async function getBibleTranslations(): Promise<string[]> {
  try {
    const res = await fetch(`${bibleApiBase()}/public/bible/translations`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { data: string[] };
    return json.data ?? [];
  } catch {
    return [];
  }
}

export async function searchBible(
  query: string,
  versions?: string[],
  signal?: AbortSignal,
): Promise<BibleSearchResult | null> {
  const q = query.trim();
  if (!q) return null;
  const params = new URLSearchParams({ q });
  versions?.forEach((v) => params.append("translations[]", v));
  try {
    const res = await fetch(`${bibleApiBase()}/public/bible/search?${params.toString()}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal,
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data: BibleSearchResult };
    return json.data ?? null;
  } catch {
    return null;
  }
}

export async function navigateBible(
  verse: ScriptureVerse,
  direction: NavigateDirection,
  versions?: string[],
): Promise<ScriptureVerse | null> {
  if (!verse.book || !verse.chapter || !verse.verse) return null;
  const params = new URLSearchParams({
    book: verse.book,
    chapter: String(verse.chapter),
    verse: String(verse.verse),
    direction,
  });
  versions?.forEach((v) => params.append("translations[]", v));
  try {
    const res = await fetch(`${bibleApiBase()}/public/bible/navigate?${params.toString()}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data: ScriptureVerse | null };
    return json.data ?? null;
  } catch {
    return null;
  }
}
