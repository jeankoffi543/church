// Plan-based feature flags, mirroring the Laravel `App\Enums\Feature` enum. The
// admin `me` payload carries the tenant's active features (resolved from its
// plan + per-tenant overrides), so the back-office can hide modules the church's
// plan doesn't include. The API stays the source of truth (the `feature:` route
// middleware returns 403 anyway) — this is convenience gating, not security.

import type { AdminMe } from "@/lib/admin-api";

export const FEATURES = {
  customDomain: "custom_domain",
  store: "store",
  finances: "finances",
  evangelism: "evangelism",
  followups: "followups",
  teams: "teams",
  resources: "resources",
  live: "live",
  studio: "studio",
  multiCampus: "multi_campus",
  analytics: "analytics",
} as const;

export type FeatureName = (typeof FEATURES)[keyof typeof FEATURES];

/**
 * True when the tenant's plan includes the feature. Unlike permissions, a Super
 * Admin does NOT bypass this: a church on the free plan never sees paid modules,
 * whoever is logged in. An empty/undefined feature means "no gate".
 */
export function hasFeature(
  me: Pick<AdminMe, "features"> | null,
  feature: string | undefined | null
): boolean {
  if (!feature) return true;
  if (!me) return false;
  return me.features.includes(feature);
}
