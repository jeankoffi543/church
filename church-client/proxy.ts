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
import {
  normalizeHost,
  isCentralHost,
  isTenantStatusPath,
  isMarketingHost,
  shouldServeMarketing,
  CENTRAL_TREE,
  TENANT_UNKNOWN_PATH,
  TENANT_SUSPENDED_PATH,
} from "@/lib/tenant/config";
import { resolveTenant } from "@/lib/tenant/resolve";

/**
 * Multi-tenant routing + access-control gate (Next.js 16 "proxy" convention —
 * the renamed `middleware`, Node runtime). Runs before every (non-static)
 * request.
 *
 * 1. Tenant resolution (CHR-144): a church request arrives on its own domain.
 *    The host is resolved against the central API — an unknown domain shows the
 *    "église introuvable" screen, a suspended one the "indisponible" screen, and
 *    a live one gets `x-tenant-id` / `x-tenant-domain` injected for the server
 *    components (theming in CHR-145) + the tenant API. Central hosts (the SaaS
 *    marketing site) skip this entirely.
 * 2. Session gate: `/admins/*` needs an admin cookie, protected user routes a
 *    user cookie — presence only; real verification lives in `lib/auth/session`.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = normalizeHost(request.headers.get("host") ?? request.nextUrl.host);

  // ── Central (SaaS marketing) hosts ───────────────────────────────
  // The marketing site lives under /central and is served at the root on the
  // SaaS domains; the `x-app-zone: central` header tells the root layout to drop
  // the church chrome. Other central hosts (dev localhost) keep the church app.
  if (isCentralHost(host)) {
    const serveMarketing = isMarketingHost(host) && shouldServeMarketing(pathname);
    const inCentralTree = pathname.startsWith(CENTRAL_TREE);

    if (serveMarketing || inCentralTree) {
      const headers = new Headers(request.headers);
      headers.set("x-app-zone", "central");

      if (serveMarketing) {
        const target = `${CENTRAL_TREE}${pathname === "/" ? "" : pathname}`;
        return NextResponse.rewrite(new URL(target, request.url), { request: { headers } });
      }
      return NextResponse.next({ request: { headers } });
    }

    return NextResponse.next();
  }

  // ── Tenant resolution ────────────────────────────────────────────
  let tenantHeaders: Headers | undefined;
  if (!isTenantStatusPath(pathname)) {
    const resolution = await resolveTenant(host);

    if (resolution.status === "unknown") {
      return NextResponse.rewrite(new URL(TENANT_UNKNOWN_PATH, request.url));
    }
    if (resolution.status === "suspended") {
      return NextResponse.rewrite(new URL(TENANT_SUSPENDED_PATH, request.url));
    }

    // "active" (id known) or "unavailable" (backend blip → fail open): carry the
    // domain downstream so server components + the tenant API resolve the church.
    tenantHeaders = new Headers(request.headers);
    tenantHeaders.set("x-tenant-domain", host);
    if (resolution.status === "active") {
      tenantHeaders.set("x-tenant-id", resolution.id);
    }
  }

  // Preserve the injected tenant headers on every pass-through response.
  const next = () =>
    NextResponse.next(tenantHeaders ? { request: { headers: tenantHeaders } } : undefined);

  // ── Admin backoffice ─────────────────────────────────────────────
  if (isAdminPath(pathname)) {
    const hasAdminSession = Boolean(request.cookies.get(ADMIN_COOKIE)?.value);

    // Auth screens (login) remain reachable without a session…
    if (isPublicAdminPath(pathname)) {
      // …but an already-authenticated admin skips the login screen.
      if (hasAdminSession && pathname === ADMIN_LOGIN_PATH) {
        return NextResponse.redirect(new URL(ADMIN_HOME_PATH, request.url));
      }
      return next();
    }

    if (!hasAdminSession) {
      const loginUrl = new URL(ADMIN_LOGIN_PATH, request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }

    return next();
  }

  // ── Standard user area ───────────────────────────────────────────
  if (isProtectedUserPath(pathname)) {
    const hasUserSession = Boolean(request.cookies.get(USER_COOKIE)?.value);

    if (!hasUserSession) {
      const loginUrl = new URL(USER_LOGIN_PATH, request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }

    return next();
  }

  // ── Public church site ───────────────────────────────────────────
  return next();
}

export const config = {
  // Run on all routes except Next internals and static assets.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)",
  ],
};
