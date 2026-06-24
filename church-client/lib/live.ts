/**
 * Public Live Engine client — chat, reactions, anonymous audience presence and
 * the time-synced replay feed. Mirrors the Reverb broadcast payloads so values
 * coming over the socket and over HTTP share one shape.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export type ChatMessage = {
  id: number;
  author_name: string;
  message: string;
  time_offset_seconds: number;
  created_at: string | null;
};

export type ReactionType = "heart" | "flame" | "hands" | "dove" | "crown";

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function postJson<T>(path: string, body: Record<string, unknown>): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/* ── Chat ───────────────────────────────────────────────────────── */

export async function getLiveMessages(): Promise<ChatMessage[]> {
  const json = await getJson<{ data: ChatMessage[] }>("/public/live/chat");
  return json?.data ?? [];
}

export async function getArchivedChat(slug: string): Promise<ChatMessage[]> {
  const json = await getJson<{ data: ChatMessage[] }>(`/public/past-lives/${slug}/chat`);
  return json?.data ?? [];
}

/** Register a (refresh-proof) view for an archive. Fire-and-forget. */
export function recordPastLiveView(id: number): void {
  void postJson(`/public/past-lives/${id}/view`, {});
}

export async function sendChat(authorName: string, message: string): Promise<ChatMessage | null> {
  const json = await postJson<{ data: ChatMessage }>("/public/live/chat", {
    author_name: authorName,
    message,
  });
  return json?.data ?? null;
}

/* ── Reactions ──────────────────────────────────────────────────── */

export async function sendReaction(type: ReactionType): Promise<{ type: string; total: number } | null> {
  const json = await postJson<{ data: { type: string; total: number } }>("/public/live/react", { type });
  return json?.data ?? null;
}

/* ── Audience presence ──────────────────────────────────────────── */

export async function sendPresence(clientId: string): Promise<number> {
  const json = await postJson<{ data: { count: number } }>("/public/live/presence", { client_id: clientId });
  return json?.data?.count ?? 0;
}

/** Best-effort departure — also fired via `sendBeacon` on page unload. */
export function sendLeave(clientId: string): void {
  const url = `${API_URL}/public/live/leave`;
  const payload = JSON.stringify({ client_id: clientId });
  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    navigator.sendBeacon(url, new Blob([payload], { type: "application/json" }));
    return;
  }
  void fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => {});
}

/* ── Local identity (ephemeral pseudonym + stable client id) ────── */

const PSEUDO_KEY = "mfm_live_pseudo";
const CLIENT_KEY = "mfm_live_client";

export function getPseudonym(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(PSEUDO_KEY);
}

export function setPseudonym(name: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PSEUDO_KEY, name.trim().slice(0, 40));
}

/** A stable, anonymous id used to de-duplicate the audience heartbeat. */
export function getClientId(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(CLIENT_KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(CLIENT_KEY, id);
  }
  return id;
}
