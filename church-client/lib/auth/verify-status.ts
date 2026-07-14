// Pure session-verification verdict (CHR-202). Kept dependency-free (no
// next/headers, no path aliases) so it is unit-testable under `node --test`.

/**
 * How to treat a token-verification response from a backend `me` endpoint:
 *   • `valid`    — 200: keep the session and its identity.
 *   • `revoked`  — 401/403: the token is gone/forbidden; drop the session.
 *   • `degraded` — anything else (network 5xx, timeout): keep the token but skip
 *                  identity, so a backend blip doesn't sign everyone out.
 */
export function classifyVerification(status: number): "valid" | "revoked" | "degraded" {
  if (status === 200) return "valid";
  if (status === 401 || status === 403) return "revoked";
  return "degraded";
}
