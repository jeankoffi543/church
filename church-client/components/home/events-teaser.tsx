import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { getEvents } from "@/lib/api";
import { Eyebrow } from "@/components/ui/eyebrow";
import { EventTeaserCard } from "@/components/cards/event-card";

export async function EventsTeaser() {
  const { data: events } = await getEvents({ perPage: 10 });
  return (
    <section className="pb-[clamp(72px,9vw,108px)]">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Eyebrow>À venir</Eyebrow>
            <h2 className="mt-2 font-display text-[clamp(30px,4.2vw,48px)] leading-[1.04] font-semibold text-indigo italic">
              Prochains rendez-vous
            </h2>
          </div>
          <Link
            href="/agenda"
            className="flex items-center gap-1 rounded-[10px] border border-indigo-mid/25 px-5 py-[11px] text-sm font-semibold text-indigo-mid transition hover:border-gold"
          >
            Tout l&apos;agenda <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-[18px]">
          {events.slice(0, 4).map((e) => (
            <EventTeaserCard key={e.title} event={e} />
          ))}
        </div>
      </div>
    </section>
  );
}
