import type { Metadata } from "next";
import Link from "next/link";
import { Church, Server, ScrollText } from "lucide-react";

import { getPlatformOverview } from "@/lib/platform-api";
import { formatPrice } from "@/lib/central";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Console — ChurchApp",
  robots: { index: false, follow: false },
};

const AREAS = [
  { icon: Church, title: "Églises", body: "Rechercher, suspendre, restaurer et se connecter en tant qu'une église.", href: "/central/admin/tenants" },
  { icon: Server, title: "Infrastructure", body: "Santé et capacité des serveurs de bases (shards).", href: "/central/admin/infrastructure" },
  { icon: ScrollText, title: "Journal d'audit", body: "Toutes les actions du personnel de la plateforme.", href: "/central/admin/audits" },
];

export default async function PlatformConsoleHome() {
  const overview = await getPlatformOverview().catch(() => null);

  const kpis = overview
    ? [
        { label: "Églises", value: String(overview.tenants.total), hint: `${overview.tenants.active} actives · ${overview.tenants.suspended} suspendues` },
        { label: "Revenu mensuel (MRR)", value: formatPrice(overview.revenue.mrr, overview.revenue.currency), hint: `${overview.revenue.active_subscriptions} abonnement(s) actif(s)` },
        { label: "Notifications push", value: String(overview.push.subscriptions), hint: "appareils enregistrés" },
      ]
    : [];

  return (
    <>
      <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-gold-dark">Console super-admin</p>
      <h1 className="mt-2 font-display text-3xl font-bold text-indigo">Tableau de bord plateforme</h1>

      {kpis.length > 0 && (
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="rounded-2xl border border-indigo/10 bg-white p-5">
              <p className="text-xs font-bold text-body uppercase tracking-wider">{kpi.label}</p>
              <p className="mt-1.5 font-display text-3xl font-bold text-indigo">{kpi.value}</p>
              <p className="mt-1 text-xs text-faint">{kpi.hint}</p>
            </div>
          ))}
        </div>
      )}

      {overview && overview.plans.length > 0 && (
        <div className="mt-4 rounded-2xl border border-indigo/10 bg-white p-5">
          <p className="mb-3 text-xs font-bold text-body uppercase tracking-wider">Répartition par offre</p>
          <ul className="flex flex-col gap-2">
            {overview.plans.map((plan) => (
              <li key={plan.code} className="flex items-center justify-between text-sm">
                <span className="font-semibold text-indigo">{plan.name}</span>
                <span className="text-body">{plan.tenants} église{plan.tenants > 1 ? "s" : ""}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {AREAS.map((area) => {
          const Icon = area.icon;
          return (
            <Link
              key={area.title}
              href={area.href}
              className="rounded-2xl border border-indigo/10 bg-white p-6 transition hover:border-gold hover:shadow-md"
            >
              <div className="grid size-11 place-items-center rounded-xl bg-indigo/5">
                <Icon className="size-5 text-indigo" />
              </div>
              <h2 className="mt-4 font-display text-lg font-bold text-indigo">{area.title}</h2>
              <p className="mt-1.5 text-sm text-body">{area.body}</p>
            </Link>
          );
        })}
      </div>
    </>
  );
}
