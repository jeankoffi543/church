"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import type { AdminMe } from "@/lib/admin-api";
import { ADMIN_PAGES, resolveActivePath } from "@/lib/admin/registry";
import { hasFeature } from "@/lib/auth/features";
import { FeatureRestricted } from "./feature-restricted";

/**
 * Deep-link guard (CHR-179): mirrors the nav's plan gating for the whole page
 * tree. If the active route belongs to a module the tenant's plan doesn't
 * include, render the upsell screen instead of the page — so a bookmarked or
 * hand-typed URL can't slip past the hidden nav item. Backend `feature:`
 * middleware is still the real enforcement; this is graceful UX.
 */
export function FeatureGuard({ me, children }: { me: AdminMe | null; children: ReactNode }) {
  const pathname = usePathname();
  const activePath = resolveActivePath(pathname);
  const page = ADMIN_PAGES.find((p) => p.path === activePath);

  if (page?.feature && !hasFeature(me, page.feature)) {
    return <FeatureRestricted />;
  }

  return <>{children}</>;
}
