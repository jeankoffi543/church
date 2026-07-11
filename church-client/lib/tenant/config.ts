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

// ── SaaS marketing site (CHR-146) ──────────────────────────────────
// The marketing site lives under /central. Its real hosts (the SaaS domains)
// serve it at the root; on other central hosts (dev localhost) it stays at
// /central so the church app is untouched.
const MARKETING_HOSTS = (process.env.NEXT_PUBLIC_MARKETING_HOSTS || "")
  .split(",")
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);

export const CENTRAL_TREE = "/central";

export function isMarketingHost(host: string): boolean {
  return MARKETING_HOSTS.includes(host);
}

/** Paths a marketing host maps into the /central tree (everything but internals). */
export function shouldServeMarketing(pathname: string): boolean {
  return (
    !pathname.startsWith(CENTRAL_TREE) &&
    !pathname.startsWith("/_next") &&
    !pathname.startsWith("/api") &&
    !pathname.startsWith("/admins")
  );
}
