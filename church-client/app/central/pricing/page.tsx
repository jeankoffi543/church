import type { Metadata } from "next";
import Link from "next/link";
import { getPlans, featureLabel, formatPrice, type MarketingPlan } from "@/lib/central";

export const metadata: Metadata = {
  title: "Tarifs — ChurchApp",
  description: "Des offres simples pour mettre votre église en ligne, du gratuit au Studio Live.",
};

function limitsLine(plan: MarketingPlan): string {
  const l = plan.limits ?? {};
  const members = l.members == null ? "Fidèles illimités" : `Jusqu'à ${l.members} fidèles`;
  const staff = l.staff_seats == null ? "équipe illimitée" : `${l.staff_seats} membres du staff`;
  const storage = l.storage_gb != null ? `${l.storage_gb} Go de stockage` : null;
  return [members, staff, storage].filter(Boolean).join(" · ");
}

export default async function PricingPage() {
  const plans = await getPlans();

  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="text-center">
        <h1 className="font-display text-4xl font-bold text-indigo sm:text-5xl">Tarifs</h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-body">
          Commencez gratuitement. Débloquez les modules et le Studio Live quand votre église grandit.
        </p>
      </div>

      {plans.length === 0 ? (
        <p className="mt-16 text-center text-body">Les offres seront bientôt disponibles.</p>
      ) : (
        <div className="mt-14 grid gap-6 lg:grid-cols-4">
          {plans.map((plan) => (
            <div
              key={plan.code}
              className={`flex flex-col rounded-2xl border p-7 ${
                plan.studio_included ? "border-gold bg-white shadow-lg" : "border-indigo/10 bg-white"
              }`}
            >
              {plan.studio_included && (
                <span className="mb-2 self-start rounded-full bg-gold/15 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-gold-dark">
                  Studio Live
                </span>
              )}
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-body">{plan.name}</p>
              <p className="mt-3 text-4xl font-bold text-indigo">{formatPrice(plan.price_month, plan.currency)}</p>
              <p className="text-xs text-faint">{plan.price_month > 0 ? "par mois" : "pour toujours"}</p>

              <p className="mt-4 text-xs leading-relaxed text-body">{limitsLine(plan)}</p>

              <ul className="mt-5 flex flex-1 flex-col gap-2 text-sm text-body">
                {plan.features.length === 0 && <li className="text-faint">Les fonctions essentielles</li>}
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="mt-0.5 text-gold-dark">✓</span>
                    {featureLabel(f)}
                  </li>
                ))}
              </ul>

              <Link
                href={`/central/signup?plan=${plan.code}`}
                className={`mt-6 rounded-full px-5 py-3 text-center font-semibold transition ${
                  plan.studio_included
                    ? "bg-gold text-ink hover:bg-gold-dark"
                    : "border border-indigo/20 text-indigo hover:bg-indigo/5"
                }`}
              >
                Choisir {plan.name}
              </Link>
            </div>
          ))}
        </div>
      )}

      <p className="mt-10 text-center text-xs text-faint">
        Prix indicatifs en USD, hors taxes. Facturation annuelle : deux mois offerts.
      </p>
    </section>
  );
}
