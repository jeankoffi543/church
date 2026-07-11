import Link from "next/link";
import type { ReactNode } from "react";

/**
 * CHR-146 — chrome for the SaaS marketing site (the church chrome is suppressed
 * by the root layout via `x-app-zone: central`).
 */
export default function CentralLayout({ children }: { children: ReactNode }) {
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
            <a href="/admins/login" className="text-body hover:text-indigo">Connexion</a>
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
