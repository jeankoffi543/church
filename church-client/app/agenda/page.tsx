import type { Metadata } from "next";
import { getEvents } from "@/lib/api";
import { PageHeader } from "@/components/sections/page-header";
import { EventRow } from "@/components/cards/event-card";
import { BrandButton } from "@/components/ui/brand-button";
import { IMG } from "@/lib/data";

export const metadata: Metadata = {
  title: "Agenda · MFM Ficgayo",
  description: "Programmes et événements de l'Église MFM Ficgayo.",
};

export default async function AgendaPage() {
  const events = await getEvents();
  const featured = events.find((e) => e.slug === "maison-de-feu-2026") ?? events[0];

  return (
    <section className="min-h-screen bg-cream px-6 pt-[clamp(96px,11vw,120px)] pb-[90px]">
      <div className="mx-auto max-w-[1100px]">
        <PageHeader
          eyebrow="Agenda"
          title="Programmes & événements"
          intro="Conférences, veillées, séminaires : ne manque aucun rendez-vous de la Maison."
        />

        {/* Featured event */}
        {featured && (
          <div className="mb-10 flex flex-wrap overflow-hidden rounded-[24px] bg-gradient-to-br from-indigo-mid to-ink shadow-[0_24px_60px_rgba(22,15,51,0.16)]">
            <div
              className="min-h-[240px] flex-[1_1_300px] bg-cover bg-center"
              style={{
                backgroundImage: `linear-gradient(120deg,rgba(33,22,72,.4),rgba(22,15,51,.6)),url('${featured.image || IMG.agendaFeature}')`,
              }}
            />
            <div className="flex flex-[1_1_360px] flex-col justify-center p-[clamp(28px,4vw,48px)] text-white">
              <span className="mb-3 inline-block text-[11px] font-bold tracking-wider text-gold uppercase">
                À ne pas manquer · {featured.time}
              </span>
              <h2 className="mb-3 font-display text-[clamp(28px,3.6vw,42px)] leading-[1.05] font-semibold italic">
                {featured.title}
              </h2>
              <p className="mb-6 max-w-[420px] text-[15px] leading-relaxed text-white/80">
                {featured.description}
              </p>
              <div className="flex flex-wrap gap-3">
                <BrandButton variant="gold" size="sm" className="px-6">
                  S&apos;inscrire
                </BrandButton>
                <BrandButton variant="ghostLight" size="sm" className="px-6">
                  En savoir plus
                </BrandButton>
              </div>
            </div>
          </div>
        )}

        {/* Event list */}
        <div className="flex flex-col gap-3.5">
          {events.map((e) => (
            <EventRow key={e.title} event={e} />
          ))}
        </div>
      </div>
    </section>
  );
}
