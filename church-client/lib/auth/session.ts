// Importing `next/headers` already pins this module to the server runtime.
import { cache } from "react";
import { cookies } from "next/headers";

import { ADMIN_COOKIE, USER_COOKIE, PLATFORM_COOKIE } from "./config";
import { classifyVerification } from "./verify-status";
import { tenantApiBase } from "@/lib/tenant/api-base";

// Server-side session helpers, for Server Components, Route Handlers and Server
// Actions (NOT the middleware — it cannot import `next/headers`).
//
// Two layers:
//   • getXToken()   — reads the cookie only. Cheap; use it in the fetch layer /
//                     when forwarding the bearer token (the backend verifies it).
//   • getXSession() — VERIFIES the token against the backend `me` endpoint and
//                     returns the identity. Use it to gate a page and to show who
//                     is signed in. Per-request memoized so a render verifies once.

const CENTRAL_ORIGIN = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/api\/v1\/?$/, "");

export type SessionUser = {
  id: number | string;
  name?: string;
  email?: string;
  role?: string;
  [key: string]: unknown;
};

async function verify(url: string, token: string): Promise<{ user: SessionUser | null } | null> {
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const verdict = classifyVerification(res.status);
    if (verdict === "revoked") return null;
    if (verdict === "degraded") return { user: null };
    const body = (await res.json()) as { data?: SessionUser };
    return { user: body.data ?? null };
  } catch {
    // Network error: fail open (token stays, identity unknown) like tenant resolve.
    return { user: null };
  }
}

// ── Raw token getters (cookie presence only) ──────────────────────
export async function getAdminToken(): Promise<string | null> {
  return (await cookies()).get(ADMIN_COOKIE)?.value ?? null;
}
export async function getUserToken(): Promise<string | null> {
  return (await cookies()).get(USER_COOKIE)?.value ?? null;
}
export async function getPlatformToken(): Promise<string | null> {
  return (await cookies()).get(PLATFORM_COOKIE)?.value ?? null;
}

// ── Verified sessions ─────────────────────────────────────────────
export type AdminSession = { token: string; user: SessionUser | null };
export type PlatformSession = { token: string; user: SessionUser | null };
export type UserSession = { token: string };

/** Current admin session (verified against `/admin/me`), or `null` when the token
 *  is missing or revoked. */
export const getAdminSession = cache(async (): Promise<AdminSession | null> => {
  const token = await getAdminToken();
  if (!token) return null;
  const result = await verify(`${await tenantApiBase()}/admin/me`, token);
  return result ? { token, user: result.user } : null;
});

/** Current platform ("landlord") staff session, verified against `/platform/me`. */
export const getPlatformSession = cache(async (): Promise<PlatformSession | null> => {
  const token = await getPlatformToken();
  if (!token) return null;
  const result = await verify(`${CENTRAL_ORIGIN}/api/platform/me`, token);
  return result ? { token, user: result.user } : null;
});

/** Current standard-user (churchgoer) session. The churchgoer sign-in flow is
 *  still a placeholder (`app/login`), so this stays presence-only for now. */
export async function getUserSession(): Promise<UserSession | null> {
  const token = await getUserToken();
  if (!token) return null;
  return { token };
}
