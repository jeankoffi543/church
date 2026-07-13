import type { Metadata } from "next";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = {
  title: "Créer mon église — ChurchApp",
  description: "Créez le site de votre église en quelques minutes.",
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; tenant?: string; reference?: string; trxref?: string }>;
}) {
  const { plan, tenant, reference, trxref } = await searchParams;

  return (
    <section className="mx-auto max-w-lg px-6 py-16">
      <div className="text-center">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-gold-dark">Inscription</p>
        <h1 className="mt-3 font-display text-3xl font-bold text-indigo sm:text-4xl">
          Créez le site de votre église
        </h1>
        <p className="mt-3 text-sm text-body">
          14 jours d&apos;essai · votre site est prêt en quelques instants sur votre sous-domaine.
        </p>
      </div>

      {/* On a paid signup, Paystack redirects back here with ?tenant=…&reference=… */}
      <SignupForm initialPlan={plan} returnTenant={tenant} returnReference={reference ?? trxref} />
    </section>
  );
}
