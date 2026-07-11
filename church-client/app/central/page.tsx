import Link from "next/link";
import { getPlans, formatPrice } from "@/lib/central";

const VALUE = [
  { title: "Votre site, votre marque", body: "Un site d'église élégant sur votre propre domaine — couleurs, logo et sections adaptés à votre assemblée." },
  { title: "Gérez votre église", body: "Fidèles, cellules, ministères, présences, équipes de service et suivi des âmes, réunis en un seul endroit." },
  { title: "Dons & finances", body: "Recevez la dîme et les offrandes en ligne, suivez la générosité et exportez vos rapports." },
  { title: "Live & Studio", body: "Diffusez vos cultes sur le web, et passez au Studio Live desktop pour une régie multi-caméras." },
];

export default async function CentralHome() {
  const plans = await getPlans();

  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-20 text-center sm:pt-28">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.22em] text-gold-dark">
          Plateforme SaaS pour églises
        </p>
        <h1 className="mx-auto mt-4 max-w-3xl font-display text-4xl font-bold leading-[1.05] text-indigo sm:text-6xl">
          Le site de votre église, clé en main.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-body">
          Présence en ligne, gestion des membres, dons, live et Studio — en quelques minutes,
          sur votre propre nom de domaine.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/central/signup" className="rounded-full bg-gold px-6 py-3 font-semibold text-ink transition hover:bg-gold-dark">
            Créer mon église
          </Link>
          <Link href="/central/pricing" className="rounded-full border border-indigo/20 px-6 py-3 font-semibold text-indigo transition hover:bg-indigo/5">
            Voir les tarifs
          </Link>
        </div>
      </section>

      {/* Value props */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {VALUE.map((v) => (
            <div key={v.title} className="rounded-2xl border border-indigo/10 bg-white p-6">
              <h3 className="font-display text-lg font-bold text-indigo">{v.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-body">{v.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing preview */}
      {plans.length > 0 && (
        <section className="bg-ink py-20 text-cream">
          <div className="mx-auto max-w-6xl px-6 text-center">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">Des offres pour chaque assemblée</h2>
            <p className="mx-auto mt-3 max-w-lg text-cream/70">
              Commencez gratuitement, passez à l&apos;offre supérieure quand votre église grandit.
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {plans.map((plan) => (
                <div key={plan.code} className="rounded-2xl border border-cream/15 bg-cream/[0.04] p-6 text-left">
                  <p className="font-mono text-xs uppercase tracking-[0.14em] text-gold">{plan.name}</p>
                  <p className="mt-2 text-3xl font-bold">{formatPrice(plan.price_month, plan.currency)}</p>
                  {plan.price_month > 0 && <p className="text-xs text-cream/60">par mois</p>}
                </div>
              ))}
            </div>
            <Link href="/central/pricing" className="mt-10 inline-block rounded-full bg-gold px-6 py-3 font-semibold text-ink transition hover:bg-gold-dark">
              Comparer les offres
            </Link>
          </div>
        </section>
      )}
    </>
  );
}
