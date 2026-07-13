// Importing `next/headers` already pins this module to the server runtime.
import { cookies } from "next/headers";

import { ADMIN_COOKIE, USER_COOKIE, PLATFORM_COOKIE } from "./config";

// Server-side session helpers, for use in Server Components, Route Handlers and
// Server Actions (NOT the middleware — it cannot import `next/headers`).

export type AdminSession = {
  token: string;
  // TODO: enrich once tokens are decoded (id, email, role, expiry…).
};

export type UserSession = {
  token: string;
};

/**
 * Returns the current admin session, or `null` if none.
 * Replace the body with real verification (JWT verify, DB lookup…).
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  return { token };
}

/** Returns the current standard-user session, or `null` if none. */
export async function getUserSession(): Promise<UserSession | null> {
  const token = (await cookies()).get(USER_COOKIE)?.value;
  if (!token) return null;
  return { token };
}

export type PlatformSession = {
  token: string;
};

/** Returns the current platform ("landlord") staff session, or `null` (CHR-182). */
export async function getPlatformSession(): Promise<PlatformSession | null> {
  const token = (await cookies()).get(PLATFORM_COOKIE)?.value;
  if (!token) return null;
  return { token };
}
