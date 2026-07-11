// Resolve a backend-stored asset path (e.g. "/storage/ministries/x.jpg") into a
// URL the browser can load for the CURRENT tenant.
//
// CHR-154 — the file lives in the tenant's own storage on church-api, served
// same-origin via the proxy route `app/tenancy/assets/[...path]/route.ts`. So we
// emit a relative `/tenancy/assets/...` URL: it resolves against the current
// (tenant) host and renders identically in Server and Client Components. Absolute
// URLs (external images, YouTube thumbnails) pass through untouched.

export function assetUrl(path?: unknown): string | null {
  if (!path || typeof path !== "string") return null;
  if (/^https?:\/\//i.test(path)) return path; // already absolute
  if (/^(data|blob):/i.test(path)) return path; // local preview

  // Strip a leading `/storage/` (or an already-mapped `/tenancy/assets/`) so the
  // path is relative to the tenant's public disk root.
  const rel = path.replace(/^\/+/, "").replace(/^(storage|tenancy\/assets)\//, "");
  return `/tenancy/assets/${rel}`;
}
