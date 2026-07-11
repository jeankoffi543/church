// CHR-145 — dynamic theming by tenant. The server layout reads the resolved
// tenant (x-tenant-domain, set by the proxy), fetches that church's `theme`
// settings, and turns them into CSS-variable overrides applied at SSR so the
// single Next.js codebase recolors per church. Best-effort: any failure falls
// back to the app's default brand.
import { cache } from "react";
import { tenantApiBase } from "@/lib/tenant/api-base";

export type SiteTheme = {
  primary?: string;
  secondary?: string;
  siteName?: string;
  logo?: string;
  banner?: string;
  sections?: { id: string; on: boolean }[];
};

const str = (v: unknown): string | undefined =>
  typeof v === "string" && v.trim() !== "" ? v : undefined;

// Only accept real colour literals — the theme is tenant-authored, so guard the
// inline <style> against injection (`}</style>…`).
const COLOR_RE = /^#[0-9a-fA-F]{3,8}$|^(?:rgb|hsl)a?\([\d\s.,%/]+\)$/;
const safeColor = (v: unknown): string | undefined =>
  typeof v === "string" && COLOR_RE.test(v.trim()) ? v.trim() : undefined;

/**
 * The current tenant's theme, or `null` (→ default brand). Memoised per request
 * so the layout + metadata share one fetch.
 */
export const getTenantTheme = cache(async (): Promise<SiteTheme | null> => {
  const base = await tenantApiBase();
  if (!base) return null;

  try {
    const res = await fetch(`${base}/public/settings?group=theme`, {
      headers: { accept: "application/json" },
      next: { revalidate: 60, tags: ["theme"] },
    });
    if (!res.ok) return null;

    const json = (await res.json()) as { data?: Record<string, unknown> };
    const d = json.data;
    if (!d || Object.keys(d).length === 0) return null;

    return {
      primary: str(d.primary),
      secondary: str(d.secondary),
      siteName: str(d.site_name),
      logo: str(d.logo),
      banner: str(d.banner),
      sections: Array.isArray(d.sections) ? (d.sections as { id: string; on: boolean }[]) : undefined,
    };
  } catch {
    return null;
  }
});

/**
 * Map a theme to `:root` overrides of the Tailwind v4 brand tokens (which are
 * emitted as CSS variables): `primary` → the gold accent, `secondary` → the
 * indigo headings. Returns "" when there's nothing safe to apply.
 */
export function themeCssVars(theme: SiteTheme | null): string {
  if (!theme) return "";

  const rules: string[] = [];
  const primary = safeColor(theme.primary);
  const secondary = safeColor(theme.secondary);

  if (primary) rules.push(`--color-gold:${primary}`, `--color-gold-dark:${primary}`);
  if (secondary) rules.push(`--color-indigo:${secondary}`, `--color-indigo-mid:${secondary}`);

  return rules.length ? `:root{${rules.join(";")}}` : "";
}
