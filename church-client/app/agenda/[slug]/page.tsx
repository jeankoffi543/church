import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Clock,
  MapPin,
  Users,
  Check,
} from "lucide-react";

import { getEvent, getEvents } from "@/lib/api";
import { BrandButton } from "@/components/ui/brand-button";
import { IMG } from "@/lib/data";

export async function generateStaticParams() {
  const events = await getEvents();
  return events.map((e) => ({ slug: e.slug }));
}

// Allow events created after build (in the API) to render on-demand.
export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) return { title: "Événement · MFM Ficgayo" };
  return {
    title: `${event.title} · MFM Ficgayo`,
    description: event.description,
  };
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) notFound();

  return (
    <article className="bg-cream pb-[clamp(72px,9vw,108px)]">
      {/* ── Hero banner ─────────────────────────────────────── */}
      {(() => {
        const hasCustomImage = !!event.image;
        const bannerImage = event.image || IMG.agendaFeature;
        const gradientFilter = hasCustomImage
          ? "linear-gradient(180deg,rgba(22,15,51,.35),rgba(22,15,51,.9))"
          : "linear-gradient(180deg,rgba(22,15,51,.6),rgba(22,15,51,.95))";
        return (
          <header
            className="relative flex min-h-[clamp(360px,46vw,520px)] items-end bg-cover bg-center px-6 pt-[110px] pb-10"
            style={{
              backgroundImage: `${gradientFilter},url('${bannerImage}')`,
            }}
          >
            <div className="mx-auto w-full max-w-[1000px] text-white">
              <Link
                href="/agenda"
                className="mb-6 inline-flex items-center gap-1.5 text-[13px] font-semibold text-white/70 transition hover:text-white"
              >
                <ArrowLeft className="size-4" /> Retour à l&apos;agenda
              </Link>
              <span className="mb-3 inline-block rounded-md bg-gold px-3 py-1 text-[11px] font-extrabold tracking-wider text-indigo uppercase">
                {event.type}
              </span>
              <h1 className="max-w-[760px] font-display text-[clamp(34px,5.2vw,64px)] leading-[1.04] font-semibold italic">
                {event.title}
              </h1>
              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[14px] text-white/80">
                <span className="flex items-center gap-2">
                  <CalendarDays className="size-4 text-gold" /> {event.fullDate}
                </span>
                <span className="flex items-center gap-2">
                  <Clock className="size-4 text-gold" /> {event.time}
                </span>
                <span className="flex items-center gap-2">
                  <MapPin className="size-4 text-gold" /> {event.location}
                </span>
              </div>
            </div>
          </header>
        );
      })()}

      {/* ── Body ────────────────────────────────────────────── */}
      <div className="mx-auto grid max-w-[1000px] grid-cols-1 gap-10 px-6 pt-[clamp(40px,6vw,72px)] lg:grid-cols-[1fr_340px]">
        {/* Main */}
        <div>
          <h2 className="font-display text-[26px] font-semibold text-indigo italic">
            À propos de ce programme
          </h2>
          <p className="mt-4 text-[16px] leading-[1.75] text-body">
            {event.description}
          </p>

          <h3 className="mt-10 mb-4 text-[15px] font-bold tracking-wide text-indigo uppercase">
            Au programme
          </h3>
          <ul className="flex flex-col gap-3">
            {event.highlights.map((h) => (
              <li key={h} className="flex items-start gap-3">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold-dark">
                  <Check className="size-3.5" />
                </span>
                <span className="text-[15px] leading-relaxed text-body-soft">
                  {h}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Sidebar */}
        <aside className="lg:sticky lg:top-[88px] lg:h-fit">
          <div className="rounded-[20px] border border-[rgba(40,25,80,0.08)] bg-white p-6 shadow-[0_12px_40px_rgba(22,15,51,0.08)]">
            <div className="flex flex-col gap-4">
              <InfoLine icon={<CalendarDays className="size-4" />} label="Date" value={event.fullDate} />
              <InfoLine icon={<Clock className="size-4" />} label="Horaire" value={event.time} />
              <InfoLine icon={<MapPin className="size-4" />} label="Lieu" value={event.location} />
              <InfoLine icon={<Users className="size-4" />} label="Animé par" value={event.host} />
            </div>
            <div className="mt-6 flex flex-col gap-2.5">
              <BrandButton asChild variant="gold" size="full">
                <Link href="/contact">S&apos;inscrire</Link>
              </BrandButton>
              <BrandButton asChild variant="outline" size="full">
                <Link href="/agenda">
                  Voir les autres dates <ArrowRight className="size-4" />
                </Link>
              </BrandButton>
            </div>
          </div>
        </aside>
      </div>
    </article>
  );
}

function InfoLine({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-lilac text-indigo-mid">
        {icon}
      </span>
      <div>
        <div className="text-[11px] font-bold tracking-wider text-faint uppercase">
          {label}
        </div>
        <div className="text-[14.5px] font-semibold text-indigo">{value}</div>
      </div>
    </div>
  );
}
