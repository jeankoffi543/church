import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { getMinistries } from "@/lib/api";
import { Eyebrow } from "@/components/ui/eyebrow";
import { BrandButton } from "@/components/ui/brand-button";
import { MinistryGrid } from "@/components/eglise/ministry-grid";

export const metadata: Metadata = {
  title: "Ministères · MFM Ficgayo",
  description:
    "Découvrez tous les ministères de l'Église MFM Ficgayo — enfants, jeunesse, couples, louange, intercession — et trouvez votre place dans la Maison.",
};

export default async function MinisteresPage() {
  const ministries = await getMinistries();

  return (
    <>
      {/* ── Header ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-cream to-lilac/40 px-6 pt-[clamp(110px,13vw,150px)] pb-[clamp(48px,6vw,72px)]">
        <div className="absolute -top-24 left-1/2 size-[420px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(226,184,95,0.14),transparent_70%)]" />
        <div className="relative mx-auto max-w-[720px] text-center">
          <Eyebrow>Nos ministères</Eyebrow>
          <h1 className="mt-3 font-display text-[clamp(40px,6vw,72px)] leading-[1.02] font-semibold tracking-[-0.5px] text-indigo italic">
            Une famille, plusieurs maisons
          </h1>
          <p className="mx-auto mt-5 max-w-[560px] text-[17px] leading-relaxed text-body">
            Chaque génération, chaque appel, chaque don a sa place dans la Maison.
            Découvre nos ministères et engage-toi là où ton cœur brûle.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3.5">
            <BrandButton asChild variant="gold">
              <Link href="/eglise">Trouver une cellule</Link>
            </BrandButton>
            <BrandButton asChild variant="outline">
              <Link href="/agenda">Voir l&apos;agenda</Link>
            </BrandButton>
          </div>
        </div>
      </section>

      {/* ── Grid ───────────────────────────────────────────── */}
      <section className="px-6 pb-[clamp(72px,9vw,108px)]">
        <div className="mx-auto max-w-[1200px]">
          <div className="mb-8 flex items-center gap-3">
            <span className="text-[13px] font-bold text-faint">
              {ministries.length} ministères
            </span>
            <span className="h-px flex-1 bg-[rgba(40,25,80,0.1)]" />
          </div>
          <MinistryGrid ministries={ministries} />
        </div>
      </section>

      {/* ── Closing invitation ─────────────────────────────── */}
      <section className="px-6 pb-[clamp(72px,9vw,108px)]">
        <div className="mx-auto max-w-[1200px]">
          <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-indigo-mid to-ink px-[clamp(32px,5vw,64px)] py-[clamp(40px,6vw,64px)] text-center text-white">
            <div className="absolute -bottom-16 -left-10 size-[220px] rounded-full bg-[radial-gradient(circle,rgba(226,184,95,0.22),transparent_70%)]" />
            <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-gold/30">
              <Sparkles className="size-6 text-gold" />
            </span>
            <h2 className="mx-auto mt-5 max-w-[520px] font-display text-[clamp(28px,4vw,46px)] leading-[1.05] font-semibold italic">
              Tu cherches ta place ?
            </h2>
            <p className="mx-auto mt-3 max-w-[480px] text-[16px] leading-relaxed text-white/75">
              Notre équipe t&apos;accompagne pour rejoindre le ministère qui te
              correspond. Fais le premier pas, on s&apos;occupe du reste.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3.5">
              <BrandButton asChild variant="gold">
                <Link href="/eglise">
                  Rejoindre la Maison
                  <ArrowRight className="size-4" />
                </Link>
              </BrandButton>
              <BrandButton asChild variant="ghostLight">
                <Link href="/live">Découvrir un culte</Link>
              </BrandButton>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
