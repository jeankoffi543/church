// CHR-152 — client-side tenant API base (browser). Swaps the backend host for
// the current tenant domain so Laravel resolves the church by Host. No
// `next/headers` (client-safe). CORS is open on `api/*` and these public calls
// carry no credentials, so cross-origin is fine. In dev, map the tenant domains
// to 127.0.0.1 via /etc/hosts.
const FALLBACK = process.env.NEXT_PUBLIC_API_URL || "";

export function clientTenantApiBase(): string {
  if (typeof window === "undefined" || FALLBACK === "") return FALLBACK;
  try {
    const url = new URL(FALLBACK);
    url.hostname = window.location.hostname;
    return url.toString().replace(/\/+$/, "");
  } catch {
    return FALLBACK;
  }
}
