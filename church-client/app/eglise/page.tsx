import type { Metadata } from "next";
import Link from "next/link";
import { Flame, ArrowRight } from "lucide-react";

import { getMinistries, getHomeGroups } from "@/lib/api";
import { PageHeader } from "@/components/sections/page-header";
import { MinistryGrid } from "@/components/eglise/ministry-grid";
import { HomeGroups } from "@/components/eglise/home-groups";

export const metadata: Metadata = {
  title: "L'Église · MFM Ficgayo",
  description: "Découvrez les ministères et les groupes de maison de MFM Ficgayo.",
};

export default async function EglisePage() {
  const ministries = await getMinistries();
  const homeGroups = await getHomeGroups();

  return (
    <section className="min-h-screen bg-cream px-6 pt-[clamp(96px,11vw,120px)] pb-[90px]">
      <div className="mx-auto max-w-[1200px]">
        <PageHeader
          eyebrow="Vie de l'Église"
          title="L'écosystème de la Maison"
          intro="Chacun a sa place. Découvre nos ministères et trouve un groupe de maison près de chez toi."
        />

        {/* Pastoral Welcome Banner */}
        <div className="mb-12 rounded-2xl border border-[rgba(40,25,80,0.08)] bg-white p-6 shadow-[0_1px_3px_rgba(22,15,51,0.05)] md:p-8 flex flex-col md:flex-row gap-6 items-center">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-mid to-ink text-[#e2b85f]">
            <Flame className="size-7" />
          </div>
          <div className="flex-1 text-left space-y-1.5">
            <span className="text-[10px] font-bold tracking-wider text-gold-dark uppercase">
              Message du Surintendant Régional
            </span>
            <h3 className="font-display text-lg md:text-xl font-bold text-indigo italic leading-snug">
              « Soyez les bienvenus sur cette page Prophétique... »
            </h3>
            <p className="text-xs md:text-sm text-body leading-relaxed max-w-2xl">
              Découvrez l&apos;exhortation prophétique du Pasteur David Odion Victor sur la puissance de la vie de prière et les 3 garanties au nom de JÉSUS.
            </p>
          </div>
          <Link
            href="/eglise/mot-du-pasteur"
            className="w-full md:w-auto inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-gold to-gold-dark text-indigo px-5 py-3 text-sm font-bold transition hover:brightness-105 active:scale-95 shadow-md"
          >
            Lire le message <ArrowRight className="size-4" />
          </Link>
        </div>

        <h2 className="mb-[22px] font-display text-[28px] font-semibold text-indigo italic">
          Nos ministères
        </h2>
        <MinistryGrid ministries={ministries} />

        <div className="mb-[26px]">
          <h2 className="mb-1.5 font-display text-[28px] font-semibold text-indigo italic">
            Groupes de maison
          </h2>
          <p className="max-w-[440px] text-sm text-body">
            Les cellules de prière sont le cœur battant de la Maison. On y grandit
            ensemble, en semaine, près de chez soi.
          </p>
        </div>
        <HomeGroups groups={homeGroups} />
      </div>
    </section>
  );
}
