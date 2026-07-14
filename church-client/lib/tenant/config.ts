// CHR-144 — pure tenant classification for the proxy + the site chrome.
// Edge/client-safe: no fetch, no Node-only APIs (importable anywhere).

const CENTRAL_DOMAINS = (process.env.NEXT_PUBLIC_CENTRAL_DOMAINS || "localhost,127.0.0.1")
  .split(",")
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);

/** Bare hostname (no port), lowercased. */
export function normalizeHost(host: string | null | undefined): string {
  return (host ?? "").toLowerCase().split(":")[0].trim();
}

/**
 * True for hosts served by the central SaaS app itself (marketing site /
 * platform back-office), which are NOT churches and skip tenant resolution.
 */
export function isCentralHost(host: string): boolean {
  return host === "" || CENTRAL_DOMAINS.includes(host);
}

/** Internal screens the proxy rewrites to when a tenant can't be served. */
export const TENANT_UNKNOWN_PATH = "/tenant-unknown";
export const TENANT_SUSPENDED_PATH = "/tenant-suspended";

export function isTenantStatusPath(pathname: string): boolean {
  return pathname === TENANT_UNKNOWN_PATH || pathname === TENANT_SUSPENDED_PATH;
}

// ── SaaS central site (CHR-146, CHR-195) ───────────────────────────
// The SaaS owner's site (marketing + platform console) lives under /central but
// is served at the ROOT of every central host: a central host is the owner's,
// never a church, so `/` renders central and never a tenant page. Church pages
// exist only on tenant hosts. Internals (/_next, /api) and the church back-office
// (/admins) pass through untouched.
export const CENTRAL_TREE = "/central";

/** Paths a central host serves from the /central tree at the root (all but internals). */
export function servesCentralAtRoot(pathname: string): boolean {
  return (
    !pathname.startsWith(CENTRAL_TREE) &&
    !pathname.startsWith("/_next") &&
    !pathname.startsWith("/api") &&
    !pathname.startsWith("/admins")
  );
}

export type CentralDecision =
  | { serve: "central-root"; target: string } // rewrite `/x` → `/central/x`
  | { serve: "central-tree" } // already under /central — pass through as central
  | { serve: "app" }; // internals + /admins — pass through untouched

/**
 * Routing for a request already known to be on a central host. Central owns the
 * root, so everything but internals/back-office maps into the /central tree.
 */
export function decideCentralRequest(pathname: string): CentralDecision {
  if (pathname.startsWith(CENTRAL_TREE)) {
    return { serve: "central-tree" };
  }
  if (servesCentralAtRoot(pathname)) {
    return { serve: "central-root", target: `${CENTRAL_TREE}${pathname === "/" ? "" : pathname}` };
  }
  return { serve: "app" };
}
