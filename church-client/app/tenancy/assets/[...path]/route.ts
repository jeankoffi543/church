import type { NextRequest } from "next/server";

// CHR-154 — tenant asset serving.
//
// Uploaded files live in each church's own storage on the backend (church-api),
// served by the tenant asset route `GET /tenancy/assets/{path}` which resolves
// the tenant from the Host. This handler transparently proxies to that route on
// the tenant's own host (church-api port), so the browser stays same-origin:
// asset URLs can be plain relative `/tenancy/assets/...` paths that render
// identically in Server and Client Components — no CORS, no per-tenant image
// host allow-listing.
//
// We fetch the tenant-host origin directly (not a fixed IP + Host header):
// Node's fetch/undici sends the Host from the URL and silently drops a manual
// `Host` header, and church-api identifies the church by that Host. The Next
// server therefore must be able to resolve tenant domains — true in dev
// (/etc/hosts) and prod (real DNS). `Range` is forwarded and the upstream
// status/headers are passed through, so video seeking (HTTP 206) keeps working.
// In production, point the edge straight at church-api for `/tenancy/assets`
// (or serve the S3 `tenants/{id}/` prefix) to skip this hop.

export const dynamic = "force-dynamic";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

const PASSTHROUGH_HEADERS = [
  "content-type",
  "content-length",
  "content-range",
  "accept-ranges",
  "cache-control",
  "last-modified",
  "etag",
  "content-disposition",
];

/** church-api origin on the tenant's own host: swap the API host, keep its port. */
function tenantBackendOrigin(host: string): string | null {
  if (API_URL === "" || host === "") return null;
  try {
    const url = new URL(API_URL); // e.g. http://127.0.0.1:8001/api/v1
    url.hostname = host.split(":")[0]; // the tenant host (drop the Next port)
    url.pathname = "";
    return url.origin; // e.g. http://demo.localhost:8001
  } catch {
    return null;
  }
}

async function proxy(request: NextRequest, path: string[], includeBody: boolean): Promise<Response> {
  const origin = tenantBackendOrigin(request.headers.get("host") ?? "");
  if (origin === null) return new Response("Not found", { status: 404 });

  const target = `${origin}/tenancy/assets/${path.map(encodeURIComponent).join("/")}`;
  const range = request.headers.get("range");

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: includeBody ? "GET" : "HEAD",
      headers: range !== null ? { range } : undefined,
      cache: "no-store",
    });
  } catch {
    return new Response("Bad gateway", { status: 502 });
  }

  const headers = new Headers();
  for (const name of PASSTHROUGH_HEADERS) {
    const value = upstream.headers.get(name);
    if (value !== null) headers.set(name, value);
  }

  return new Response(includeBody ? upstream.body : null, {
    status: upstream.status,
    headers,
  });
}

export async function GET(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return proxy(request, path, true);
}

export async function HEAD(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return proxy(request, path, false);
}
