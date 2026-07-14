"use server";

import { getPlatformToken } from "@/lib/auth/session";

// CHR-182 — the platform ("landlord") API for the super-admin console. Unlike
// the tenant API, platform routes are central and resolved by path (not Host),
// so a fixed backend origin is correct (same base as lib/central.ts).
const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/api\/v1\/?$/, "");

export type PlatformUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  is_super_admin: boolean;
};

/**
 * Authenticated fetch against `/api/platform/*`, carrying the platform staff
 * token from the httpOnly session cookie. Throws "UNAUTHORIZED" on 401 so the
 * console can bounce to the central login.
 */
export async function platformFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getPlatformToken();
  if (!token) {
    throw new Error("UNAUTHORIZED");
  }

  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_ORIGIN}/api/platform${path}`, { ...options, headers });

  if (!res.ok) {
    if (res.status === 401) throw new Error("UNAUTHORIZED");
    if (res.status === 403) throw new Error("FORBIDDEN");
    const text = await res.text();
    let json: { message?: string; error?: string } | undefined;
    try {
      json = JSON.parse(text);
    } catch {
      // not JSON
    }
    throw new Error(json?.message || json?.error || `Request failed with status ${res.status}`);
  }

  if (res.status === 204) return null as unknown as T;
  return (await res.json()) as T;
}

/** The signed-in platform staff member, or `null` when the session is missing/expired. */
export async function getPlatformMe(): Promise<PlatformUser | null> {
  try {
    const response = await platformFetch<{ data: PlatformUser }>("/me");
    return response.data;
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return null;
    }
    throw err;
  }
}

/* ── Super-admin console: churches (CHR-183) ─────────────────────── */

export type PlatformTenantDomain = {
  domain: string;
  type: string | null;
  is_primary: boolean;
  ssl_status: string | null;
  verified_at: string | null;
};

export type PlatformTenant = {
  id: string;
  name: string;
  slug: string;
  status: string | null;
  subscription_status: string | null;
  plan_id: number | null;
  trial_ends_at: string | null;
  studio_enabled: boolean;
  studio_seats: number;
  domains?: PlatformTenantDomain[];
  created_at: string | null;
};

export type PlatformPage<T> = {
  data: T[];
  meta: { current_page: number; last_page: number; total: number; per_page: number };
};

export type PlatformPlan = {
  code: string;
  name: string;
  price_month: number;
  currency: string;
  studio_included: boolean;
};

export type PlatformStudioKey = {
  id: number;
  label: string;
  key_prefix: string;
  bound_device: boolean;
  last_seen_at: string | null;
  revoked_at: string | null;
};

export async function getPlatformTenants(page = 1, search = "", status = ""): Promise<PlatformPage<PlatformTenant>> {
  const qs = new URLSearchParams({ page: String(page) });
  if (search) qs.set("search", search);
  if (status) qs.set("status", status);
  return platformFetch(`/tenants?${qs.toString()}`);
}

export async function getPlatformTenant(id: string): Promise<PlatformTenant> {
  const res = await platformFetch<{ data: PlatformTenant }>(`/tenants/${id}`);
  return res.data;
}

export async function suspendPlatformTenant(id: string): Promise<PlatformTenant> {
  const res = await platformFetch<{ data: PlatformTenant }>(`/tenants/${id}/suspend`, { method: "POST" });
  return res.data;
}

export async function restorePlatformTenant(id: string): Promise<PlatformTenant> {
  const res = await platformFetch<{ data: PlatformTenant }>(`/tenants/${id}/restore`, { method: "POST" });
  return res.data;
}

export async function updatePlatformTenant(
  id: string,
  data: { name?: string; studio_enabled?: boolean; studio_seats?: number }
): Promise<PlatformTenant> {
  const res = await platformFetch<{ data: PlatformTenant }>(`/tenants/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function impersonatePlatformTenant(
  id: string
): Promise<{ token: string; expires_at: string; tenant: { id: string; domain: string | null }; impersonated_user: { id: number; name: string; email: string } }> {
  return platformFetch(`/tenants/${id}/impersonate`, { method: "POST" });
}

export async function subscribePlatformTenant(
  id: string,
  planCode: string,
  email: string
): Promise<{ authorization_url: string | null; subscription: { status: string; plan_code: string } }> {
  return platformFetch(`/tenants/${id}/subscribe`, {
    method: "POST",
    body: JSON.stringify({ plan_code: planCode, email }),
  });
}

export async function getPlatformPlans(): Promise<PlatformPlan[]> {
  const res = await platformFetch<{ data: PlatformPlan[] }>("/plans");
  return Array.isArray(res.data) ? res.data : [];
}

/* ── Super-admin console: subscription plans (CHR-197) ───────────── */

export type PlanLimits = {
  members?: number | null;
  storage_gb?: number | null;
  staff_seats?: number | null;
};

export type ManagedPlan = {
  id: number;
  code: string;
  name: string;
  price_month: number;
  price_year: number;
  currency: string;
  paystack_plan_code: string | null;
  features: string[];
  limits: PlanLimits;
  studio_included: boolean;
  sort_order: number;
  is_active: boolean;
};

export type PlanInput = Omit<ManagedPlan, "id">;

export async function getManagedPlans(): Promise<ManagedPlan[]> {
  const res = await platformFetch<{ data: ManagedPlan[] }>("/plans/manage");
  return Array.isArray(res.data) ? res.data : [];
}

export async function createManagedPlan(input: PlanInput): Promise<ManagedPlan> {
  const res = await platformFetch<{ data: ManagedPlan }>("/plans", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return res.data;
}

export async function updateManagedPlan(id: number, input: PlanInput): Promise<ManagedPlan> {
  const res = await platformFetch<{ data: ManagedPlan }>(`/plans/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
  return res.data;
}

export async function deleteManagedPlan(id: number): Promise<void> {
  await platformFetch(`/plans/${id}`, { method: "DELETE" });
}

export async function getPlatformStudioKeys(id: string): Promise<{ keys: PlatformStudioKey[]; seats: number }> {
  const res = await platformFetch<{ data: PlatformStudioKey[]; seats: number }>(`/tenants/${id}/studio/keys`);
  return { keys: res.data, seats: res.seats };
}

export async function createPlatformStudioKey(id: string, label: string): Promise<{ key: string; activation: PlatformStudioKey }> {
  return platformFetch(`/tenants/${id}/studio/keys`, { method: "POST", body: JSON.stringify({ label }) });
}

export async function revokePlatformStudioKey(activationId: number): Promise<void> {
  await platformFetch(`/studio/keys/${activationId}/revoke`, { method: "POST" });
}

/* ── Super-admin console: health & metrics (CHR-184) ─────────────── */

export type PlatformOverview = {
  tenants: { total: number; active: number; suspended: number; provisioning: number };
  revenue: { mrr: number; currency: string; active_subscriptions: number };
  plans: { code: string; name: string; price_month: number; tenants: number }[];
  push: { subscriptions: number };
};

export async function getPlatformOverview(): Promise<PlatformOverview> {
  const res = await platformFetch<{ data: PlatformOverview }>("/stats/overview");
  return res.data;
}

export type PlatformShard = {
  id: number;
  name: string;
  host: string | null;
  is_active: boolean;
  max_tenants: number | null;
  tenants_count: number;
  weight: number;
  has_read_replica: boolean;
};

export async function getPlatformShards(): Promise<{ servers: PlatformShard[]; unassigned: number }> {
  const res = await platformFetch<{ data: { servers: PlatformShard[]; unassigned: number } }>("/stats/shards");
  return res.data;
}

export type PlatformAudit = {
  id: number;
  action: string;
  actor: { name: string; email: string } | null;
  tenant: { id: string; name: string; slug: string } | null;
  meta: Record<string, unknown> | null;
  created_at: string | null;
};

export async function getPlatformAudits(page = 1): Promise<PlatformPage<PlatformAudit>> {
  return platformFetch(`/stats/audits?page=${page}`);
}
