import type { Metadata } from "next";
import Link from "next/link";
import { Church, CreditCard, Server } from "lucide-react";

export const metadata: Metadata = {
  title: "Console — ChurchApp",
  robots: { index: false, follow: false },
};

const AREAS = [
  { icon: Church, title: "Églises", body: "Rechercher, suspendre, restaurer et se connecter en tant qu'une église.", href: "/central/admin/tenants" as string | undefined, soon: false },
  { icon: CreditCard, title: "Abonnements", body: "Suivre les abonnements, les paiements et les revenus de la plateforme.", href: undefined, soon: true },
  { icon: Server, title: "Infrastructure", body: "Santé des serveurs de bases (shards), audits et notifications push.", href: undefined, soon: true },
];

export default function PlatformConsoleHome() {
  return (
    <>
      <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-gold-dark">Console super-admin</p>
      <h1 className="mt-2 font-display text-3xl font-bold text-indigo">Tableau de bord plateforme</h1>
      <p className="mt-2 max-w-2xl text-sm text-body">
        Gérez les églises, les abonnements et l&apos;infrastructure de la plateforme ChurchApp.
      </p>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {AREAS.map((area) => {
          const Icon = area.icon;
          const inner = (
            <>
              <div className="flex items-center justify-between">
                <div className="grid size-11 place-items-center rounded-xl bg-indigo/5">
                  <Icon className="size-5 text-indigo" />
                </div>
                {area.soon && (
                  <span className="rounded-full bg-gold/15 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-gold-dark">
                    Bientôt
                  </span>
                )}
              </div>
              <h2 className="mt-4 font-display text-lg font-bold text-indigo">{area.title}</h2>
              <p className="mt-1.5 text-sm text-body">{area.body}</p>
            </>
          );
          const cardClass = "rounded-2xl border border-indigo/10 bg-white p-6";
          return area.href ? (
            <Link key={area.title} href={area.href} className={`${cardClass} transition hover:border-gold hover:shadow-md`}>
              {inner}
            </Link>
          ) : (
            <div key={area.title} className={cardClass}>{inner}</div>
          );
        })}
      </div>
    </>
  );
}
