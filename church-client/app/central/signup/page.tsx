import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Créer mon église — ChurchApp",
};

/**
 * CHR-146 — placeholder. The real self-service onboarding (form → tenant
 * provisioning) lands in CHR-147; this keeps the pricing/landing CTAs alive.
 */
export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan } = await searchParams;

  return (
    <section className="mx-auto flex max-w-xl flex-col items-center px-6 py-24 text-center">
      <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-gold-dark">Inscription</p>
      <h1 className="mt-4 font-display text-3xl font-bold text-indigo sm:text-4xl">Créez le site de votre église</h1>
      <p className="mt-4 text-body">
        {plan ? (
          <>Offre sélectionnée : <span className="font-semibold text-indigo">{plan}</span>. </>
        ) : null}
        L&apos;inscription en libre-service arrive très bientôt.
      </p>
      <Link href="/central/pricing" className="mt-8 rounded-full border border-indigo/20 px-6 py-3 font-semibold text-indigo transition hover:bg-indigo/5">
        Revoir les offres
      </Link>
    </section>
  );
}
