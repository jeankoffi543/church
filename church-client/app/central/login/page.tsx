import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getPlatformSession } from "@/lib/auth/session";
import { PLATFORM_HOME_PATH } from "@/lib/auth/config";
import { loginPlatform } from "./actions";

export const metadata: Metadata = {
  title: "Console plateforme — ChurchApp",
  robots: { index: false, follow: false },
};

const ERRORS: Record<string, string> = {
  missing: "Renseignez votre email et votre mot de passe.",
  invalid: "Identifiants invalides ou accès non autorisé.",
};

export default async function CentralLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getPlatformSession()) {
    redirect(PLATFORM_HOME_PATH);
  }

  const { error } = await searchParams;
  const message = error ? ERRORS[error] ?? ERRORS.invalid : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink px-6 py-16">
      <div className="w-full max-w-sm">
        <Link href="/central" className="mb-8 flex items-center justify-center gap-2 font-display text-2xl font-bold text-cream">
          <span className="grid size-9 place-items-center rounded-lg bg-gold text-ink">✦</span>
          ChurchApp
        </Link>

        <div className="rounded-[20px] border border-cream/10 bg-cream/[0.03] p-8 shadow-2xl">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-gold">Console plateforme</p>
          <h1 className="mt-2 font-display text-2xl font-bold text-cream">Connexion administrateur</h1>
          <p className="mt-1 text-sm text-cream/60">Réservé au personnel de la plateforme.</p>

          {message && (
            <p className="mt-5 rounded-lg border border-live/40 bg-live/10 px-3 py-2 text-sm text-live">{message}</p>
          )}

          <form action={loginPlatform} className="mt-6 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-semibold text-cream/80">Email</span>
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                className="rounded-lg border border-cream/15 bg-ink/60 px-3 py-2.5 text-cream outline-none focus:border-gold"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-semibold text-cream/80">Mot de passe</span>
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="rounded-lg border border-cream/15 bg-ink/60 px-3 py-2.5 text-cream outline-none focus:border-gold"
              />
            </label>
            <button
              type="submit"
              className="mt-2 rounded-full bg-gold px-6 py-3 font-semibold text-ink transition hover:bg-gold-dark"
            >
              Se connecter
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-cream/40">
          Vous gérez une église ? <Link href="/central/signup" className="text-gold hover:underline">Créez votre site</Link>
        </p>
      </div>
    </main>
  );
}
