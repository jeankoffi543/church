import { NextResponse, type NextRequest } from "next/server";

import {
  ADMIN_COOKIE,
  USER_COOKIE,
  ADMIN_LOGIN_PATH,
  ADMIN_HOME_PATH,
  USER_LOGIN_PATH,
  isAdminPath,
  isPublicAdminPath,
  isProtectedUserPath,
} from "@/lib/auth/config";

/**
 * Routing + access-control gate (Next.js 16 "proxy" convention — the renamed
 * `middleware`). Runs before every (non-static) request is rendered.
 *
 * - `/admins/*`  → requires an admin session, otherwise → `/admins/login`.
 * - user routes  → require a standard user session, otherwise → `/login`.
 * - everything else (the public church site) is left untouched.
 *
 * NOTE: this only checks for the *presence* of a session cookie. Cryptographic
 * verification (JWT signature, DB lookup, expiry…) belongs in `lib/auth/session`
 * and the route handlers — the proxy stays cheap and edge-safe.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Admin backoffice ─────────────────────────────────────────────
  if (isAdminPath(pathname)) {
    const hasAdminSession = Boolean(request.cookies.get(ADMIN_COOKIE)?.value);

    // Auth screens (login) remain reachable without a session…
    if (isPublicAdminPath(pathname)) {
      // …but an already-authenticated admin skips the login screen.
      if (hasAdminSession && pathname === ADMIN_LOGIN_PATH) {
        return NextResponse.redirect(new URL(ADMIN_HOME_PATH, request.url));
      }
      return NextResponse.next();
    }

    if (!hasAdminSession) {
      const loginUrl = new URL(ADMIN_LOGIN_PATH, request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  // ── Standard user area ───────────────────────────────────────────
  if (isProtectedUserPath(pathname)) {
    const hasUserSession = Boolean(request.cookies.get(USER_COOKIE)?.value);

    if (!hasUserSession) {
      const loginUrl = new URL(USER_LOGIN_PATH, request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  // ── Public church site ───────────────────────────────────────────
  return NextResponse.next();
}

export const config = {
  // Run on all routes except Next internals and static assets.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)",
  ],
};
