const FALLBACK = process.env.NEXT_PUBLIC_API_URL || "";

function swapHost(host: string): string {
  if (FALLBACK === "" || host === "") return FALLBACK;
  try {
    const url = new URL(FALLBACK);
    url.hostname = host;
    return url.toString().replace(/\/+$/, "");
  } catch {
    return FALLBACK;
  }
}

/**
 * CHR-152 — the church-api base URL for the CURRENT tenant.
 *
 * The proxy resolves the church from the Host and sets `x-tenant-domain`; we
 * point fetches at THAT domain (keeping the backend's scheme + port) so Laravel
 * resolves the tenant by Host — the same trust anchor as production.
 *
 * Isomorphic: `lib/api.ts` is used by both server components AND client
 * components, so we read the tenant from `window.location` in the browser and
 * from the request headers on the server. `next/headers` is imported
 * **dynamically** so it never lands in the client bundle. Falls back to the
 * fixed URL when there's no tenant (central site / dev without a tenant host).
 * In dev, map the tenant domains to 127.0.0.1 via /etc/hosts.
 */
export async function tenantApiBase(): Promise<string> {
  if (typeof window !== "undefined") {
    return swapHost(window.location.hostname);
  }

  try {
    const { headers } = await import("next/headers");
    const domain = (await headers()).get("x-tenant-domain");
    return domain ? swapHost(domain) : FALLBACK;
  } catch {
    return FALLBACK;
  }
}
