"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { PLATFORM_CONSOLE_PREFIX, CENTRAL_LOGIN_PATH } from "@/lib/auth/config";

/**
 * Marketing chrome for the SaaS site (header + footer). Suppressed on the
 * platform console and the central login (CHR-182), which bring their own — the
 * same pattern as the church site's `site-frame`.
 */
export function CentralChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const bare = pathname === CENTRAL_LOGIN_PATH || pathname.startsWith(PLATFORM_CONSOLE_PREFIX);

  if (bare) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-cream text-indigo">
      <header className="sticky top-0 z-40 border-b border-indigo/10 bg-cream/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/central" className="flex items-center gap-2 font-display text-xl font-bold">
            <span className="grid size-8 place-items-center rounded-lg bg-indigo text-cream">✦</span>
            ChurchApp
          </Link>
          <nav className="flex items-center gap-6 text-sm font-semibold">
            <Link href="/central/pricing" className="text-body hover:text-indigo">Tarifs</Link>
            <Link href={CENTRAL_LOGIN_PATH} className="text-body hover:text-indigo">Connexion</Link>
            <Link
              href="/central/signup"
              className="rounded-full bg-gold px-4 py-2 text-ink transition hover:bg-gold-dark"
            >
              Créer mon église
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-indigo/10 bg-cream">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-8 text-sm text-body sm:flex-row sm:items-center sm:justify-between">
          <p className="font-display text-base font-bold text-indigo">ChurchApp</p>
          <p>© {new Date().getFullYear()} ChurchApp — Le site de votre église, clé en main.</p>
        </div>
      </footer>
    </div>
  );
}
