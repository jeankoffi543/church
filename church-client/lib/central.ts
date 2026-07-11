// CHR-146 — data + helpers for the SaaS marketing site (served from /central).
// The plan catalogue is public + central, so a fixed backend URL is fine here.
const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/api\/v1\/?$/, "");

export type MarketingPlan = {
  code: string;
  name: string;
  price_month: number;
  price_year: number;
  currency: string;
  features: string[];
  limits: Record<string, number | null>;
  studio_included: boolean;
};

export async function getPlans(): Promise<MarketingPlan[]> {
  try {
    const res = await fetch(`${API_ORIGIN}/api/platform/plans`, {
      headers: { accept: "application/json" },
      next: { revalidate: 300, tags: ["plans"] },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: MarketingPlan[] };
    return Array.isArray(json.data) ? json.data : [];
  } catch {
    return [];
  }
}

/** Human labels for the gate-able feature keys (mirror of the backend enum). */
export const FEATURE_LABELS: Record<string, string> = {
  custom_domain: "Domaine personnalisé",
  store: "Boutique en ligne",
  finances: "Finances & dons en ligne",
  evangelism: "Évangélisation",
  followups: "Suivi des âmes",
  teams: "Équipes de service",
  resources: "Logistique & réservations",
  live: "Diffusion live web",
  studio: "Studio Live (desktop)",
  multi_campus: "Multi-campus",
  analytics: "Analytics avancés",
};

export function featureLabel(key: string): string {
  return FEATURE_LABELS[key] ?? key;
}

/** Prices are stored as minor units (cents). */
export function formatPrice(minorUnits: number, currency: string): string {
  if (minorUnits <= 0) return "Gratuit";
  const amount = Math.round(minorUnits / 100);
  return currency === "USD" ? `$${amount}` : `${amount} ${currency}`;
}
