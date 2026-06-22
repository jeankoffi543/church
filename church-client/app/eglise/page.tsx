import type { Metadata } from "next";
import Link from "next/link";
import { Flame, ArrowRight, ShieldCheck, HeartHandshake } from "lucide-react";
import { PageHeader } from "@/components/sections/page-header";
import { BrandButton } from "@/components/ui/brand-button";
import { PastorWord } from "@/components/eglise/pastor-word";

export const metadata: Metadata = {
  title: "L'Église & Vision · MFM Ficgayo",
  description: "Découvrez la vision, la confession de foi et l'équipe pastorale de l'Église MFM Ficgayo.",
};

const PILLARS = [
  {
    title: "La Parole Révélée",
    desc: "Un enseignement biblique pur et sans compromis, qui libère la vérité et transforme les vies.",
    icon: <ShieldCheck className="size-6 text-gold" />,
  },
  {
    title: "La Prière de Feu",
    desc: "L'intercession prophétique et le combat spirituel pour briser les liens et libérer les captifs.",
    icon: <Flame className="size-6 text-gold" />,
  },
  {
    title: "L'Amour Fraternel",
    desc: "Une communauté unie et accueillante qui accompagne chaque croyant vers sa destinée en Christ.",
    icon: <HeartHandshake className="size-6 text-gold" />,
  },
];

const PASTORS = [
  {
    name: "Pasteur David Odion Victor",
    role: "Surintendant Régional MFM Ficgayo",
    desc: "Dirige l'œuvre régionale de Ficgayo avec passion, onction et dévouement envers le combat spirituel et la délivrance.",
    initials: "DV",
  },
  {
    name: "Pasteur Daniel Adeyemi",
    role: "Pasteur Adjoint & Enseignement",
    desc: "Coordonne l'enseignement doctrinal de la Parole et la formation théologique des leaders et serviteurs.",
    initials: "DA",
  },
  {
    name: "Sœur Esther Mbarga",
    role: "Responsable Intercession & Femmes",
    desc: "Porte le fardeau de la prière continuelle et anime le ministère d'impact des femmes vertueuses.",
    initials: "EM",
  },
];

export default function EglisePage() {
  return (
    <>
      <section className="bg-cream px-6 pt-[clamp(96px,11vw,120px)] pb-10">
        <div className="mx-auto max-w-[1100px]">
          <PageHeader
            eyebrow="Qui sommes-nous"
            title="L'Église MFM Ficgayo"
            intro="Un phare spirituel, un lieu de prière, de délivrance et de transformation par la grâce de Jésus-Christ."
          />

          {/* Présentation de l'Église / Message Pastoral Banner */}
          <div className="rounded-3xl border border-[rgba(40,25,80,0.08)] bg-white p-6 shadow-[0_24px_50px_rgba(22,15,51,0.04)] md:p-8 flex flex-col md:flex-row gap-6 items-center">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-mid to-ink text-[#e2b85f]">
              <Flame className="size-7" />
            </div>
            <div className="flex-1 text-left space-y-1.5">
              <span className="text-[10px] font-bold tracking-wider text-gold-dark uppercase">
                Présentation MFM Ficgayo
              </span>
              <h3 className="font-display text-lg md:text-xl font-bold text-indigo leading-snug italic">
                « Soyez les bienvenus sur cette page Prophétique... »
              </h3>
              <p className="text-xs md:text-sm text-body leading-relaxed max-w-2xl">
                Découvrez l&apos;exhortation prophétique du Pasteur David Odion Victor sur la puissance de la vie de prière et les 3 garanties au nom de JÉSUS.
              </p>
            </div>
            <BrandButton asChild variant="gold" className="w-full md:w-auto shrink-0 shadow-md">
              <Link href="/eglise/mot-du-pasteur">
                Lire le message <ArrowRight className="size-4" />
              </Link>
            </BrandButton>
          </div>
        </div>
      </section>

      {/* Pastor Word Showcase Component */}
      <PastorWord />

      <section className="bg-cream px-6 py-20">
        <div className="mx-auto max-w-[1100px]">
          {/* Vision & Pillars */}
          <div className="mb-20">
            <div className="mb-10 text-center md:text-left">
              <span className="text-[10px] font-bold tracking-wider text-gold-dark uppercase">Piliers de Foi</span>
              <h2 className="mt-1 font-display text-[32px] font-bold text-indigo italic">Notre Vision Spirituelle</h2>
              <p className="mt-2 text-sm text-body max-w-md">Nous sommes appelés à bâtir des vies de feu, ancrées dans la sainteté et l&apos;autorité spirituelle.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {PILLARS.map((p) => (
                <div key={p.title} className="rounded-2xl border border-[rgba(40,25,80,0.06)] bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-gold/15 mb-4">
                    {p.icon}
                  </div>
                  <h3 className="font-display text-lg font-bold text-indigo leading-tight">{p.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-body">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Pastoral Team */}
          <div>
            <div className="mb-10 text-center md:text-left">
              <span className="text-[10px] font-bold tracking-wider text-gold-dark uppercase">Ministres de l&apos;Évangile</span>
              <h2 className="mt-1 font-display text-[32px] font-bold text-indigo italic">L&apos;Équipe Pastorale</h2>
              <p className="mt-2 text-sm text-body max-w-md">Des bergers consacrés pour vous accompagner et vous équiper dans votre parcours spirituel.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {PASTORS.map((pastor) => (
                <div key={pastor.name} className="flex flex-col rounded-2xl border border-[rgba(40,25,80,0.06)] bg-white p-6 shadow-sm">
                  <div className="flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-mid to-ink text-gold font-display text-lg font-bold mb-4 shadow-inner">
                    {pastor.initials}
                  </div>
                  <h3 className="font-display text-base font-bold text-indigo leading-tight">{pastor.name}</h3>
                  <span className="text-[10px] font-bold tracking-wider text-gold-dark uppercase mt-0.5">{pastor.role}</span>
                  <p className="mt-3 text-xs leading-relaxed text-body flex-1">{pastor.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
