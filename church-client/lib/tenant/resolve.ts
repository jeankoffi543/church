// CHR-144 — server-only: resolve a host to its tenant via the central API,
// cached in-memory (60s) so the proxy hits the backend at most once per domain
// per TTL. Imported by `proxy.ts` (Node runtime).

const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/api\/v1\/?$/, "");

export type Resolution =
  | { status: "active"; id: string }
  | { status: "suspended"; id: string }
  | { status: "unknown" }
  | { status: "unavailable" };

type Entry = { value: Resolution; expires: number };
const cache = new Map<string, Entry>();
const TTL_MS = 60_000;

export async function resolveTenant(host: string): Promise<Resolution> {
  const now = Date.now();
  const hit = cache.get(host);
  if (hit && hit.expires > now) return hit.value;

  const store = (value: Resolution): Resolution => {
    cache.set(host, { value, expires: now + TTL_MS });
    return value;
  };

  try {
    const res = await fetch(
      `${API_ORIGIN}/api/platform/resolve?domain=${encodeURIComponent(host)}`,
      { headers: { accept: "application/json" } },
    );

    if (res.status === 404) return store({ status: "unknown" });
    if (!res.ok) return { status: "unavailable" }; // transient — don't cache

    const data = (await res.json()) as { tenant_id: string; active: boolean };

    return store(
      data.active
        ? { status: "active", id: String(data.tenant_id) }
        : { status: "suspended", id: String(data.tenant_id) },
    );
  } catch {
    // Backend unreachable: fail OPEN (let the request through with the domain
    // header, downstream resolves by Host) rather than bricking the whole site.
    return { status: "unavailable" };
  }
}
