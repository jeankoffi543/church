import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Église momentanément indisponible",
  robots: { index: false, follow: false },
};

/**
 * CHR-144 — shown (via proxy rewrite) when the church's subscription is
 * suspended/lapsed. Standalone chrome (the site frame is suppressed here).
 */
export default function TenantSuspendedPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ink px-6 text-center text-cream">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-gold">Site momentanément indisponible</p>
      <h1 className="max-w-xl font-display text-3xl font-semibold sm:text-4xl">
        Ce site d&apos;église est momentanément suspendu
      </h1>
      <p className="max-w-md text-sm text-cream/70">
        L&apos;abonnement de l&apos;église est en attente de régularisation. Les responsables ont été notifiés.
      </p>
    </main>
  );
}
