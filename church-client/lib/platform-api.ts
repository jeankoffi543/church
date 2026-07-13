"use server";

import { getPlatformSession } from "@/lib/auth/session";

// CHR-182 — the platform ("landlord") API for the super-admin console. Unlike
// the tenant API, platform routes are central and resolved by path (not Host),
// so a fixed backend origin is correct (same base as lib/central.ts).
const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/api\/v1\/?$/, "");

export type PlatformUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  is_super_admin: boolean;
};

/**
 * Authenticated fetch against `/api/platform/*`, carrying the platform staff
 * token from the httpOnly session cookie. Throws "UNAUTHORIZED" on 401 so the
 * console can bounce to the central login.
 */
export async function platformFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const session = await getPlatformSession();
  if (!session?.token) {
    throw new Error("UNAUTHORIZED");
  }

  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("Authorization", `Bearer ${session.token}`);

  const res = await fetch(`${API_ORIGIN}/api/platform${path}`, { ...options, headers });

  if (!res.ok) {
    if (res.status === 401) throw new Error("UNAUTHORIZED");
    if (res.status === 403) throw new Error("FORBIDDEN");
    const text = await res.text();
    let json: { message?: string; error?: string } | undefined;
    try {
      json = JSON.parse(text);
    } catch {
      // not JSON
    }
    throw new Error(json?.message || json?.error || `Request failed with status ${res.status}`);
  }

  if (res.status === 204) return null as unknown as T;
  return (await res.json()) as T;
}

/** The signed-in platform staff member, or `null` when the session is missing/expired. */
export async function getPlatformMe(): Promise<PlatformUser | null> {
  try {
    const response = await platformFetch<{ data: PlatformUser }>("/me");
    return response.data;
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return null;
    }
    throw err;
  }
}
