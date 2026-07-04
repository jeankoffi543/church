// Resolve a backend-stored asset path (e.g. "/storage/ministries/x.jpg") into a
// fully-qualified URL pointing at the Laravel origin. The API base looks like
// "http://host:port/api/v1"; assets are served from the host root ("/storage").

const ASSET_BASE = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/api\/v1\/?$/, "");

export function assetUrl(path?: any): string | null {
  if (!path || typeof path !== "string") return null;
  if (/^https?:\/\//i.test(path)) return path; // already absolute
  return `${ASSET_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
}
