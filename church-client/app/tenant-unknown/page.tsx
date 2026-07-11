import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Église introuvable",
  robots: { index: false, follow: false },
};

/**
 * CHR-144 — shown (via proxy rewrite) when the request's domain maps to no
 * church. Standalone chrome (the site frame is suppressed for this path).
 */
export default function TenantUnknownPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ink px-6 text-center text-cream">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-gold">Église introuvable</p>
      <h1 className="max-w-xl font-display text-3xl font-semibold sm:text-4xl">
        Aucune église ne correspond à cette adresse
      </h1>
      <p className="max-w-md text-sm text-cream/70">
        Vérifiez le lien, ou contactez votre église pour obtenir sa bonne adresse web.
      </p>
    </main>
  );
}
