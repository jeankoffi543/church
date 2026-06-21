import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";

import type { ChurchEvent } from "@/lib/data";

/** Compact date tile shared by the teaser card and the agenda row. */
function DateTile({
  day,
  month,
  tone = "navy",
}: {
  day: string;
  month: string;
  tone?: "navy" | "cream";
}) {
  if (tone === "cream") {
    return (
      <div className="w-[72px] shrink-0 rounded-[14px] border border-[rgba(40,25,80,0.08)] bg-cream py-3 text-center">
        <div className="font-display text-[32px] leading-none font-bold text-indigo">
          {day}
        </div>
        <div className="mt-0.5 text-[10px] font-bold tracking-[0.15em] text-gold-dark">
          {month}
        </div>
      </div>
    );
  }
  return (
    <div className="w-[60px] shrink-0 rounded-[13px] bg-gradient-to-br from-indigo-mid to-ink py-3 text-center text-white">
      <div className="font-display text-[28px] leading-none font-bold">{day}</div>
      <div className="mt-0.5 text-[10px] font-bold tracking-[0.15em] text-gold">
        {month}
      </div>
    </div>
  );
}

/** Grid card used on the home "Prochains rendez-vous" teaser. */
export function EventTeaserCard({ event }: { event: ChurchEvent }) {
  return (
    <Link
      href={`/agenda/${event.slug}`}
      className="flex gap-[18px] rounded-[18px] border border-[rgba(40,25,80,0.08)] bg-white p-6 shadow-[0_1px_3px_rgba(22,15,51,0.05)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_16px_38px_rgba(22,15,51,0.12)]"
    >
      <DateTile day={event.day} month={event.month} />
      <div className="min-w-0">
        <span className="mb-1.5 inline-block text-[10.5px] font-bold tracking-wider text-gold-dark uppercase">
          {event.type}
        </span>
        <h3 className="mb-1.5 text-base leading-tight font-bold text-indigo">
          {event.title}
        </h3>
        <span className="text-[13px] text-body">{event.time}</span>
      </div>
    </Link>
  );
}

/** Full-width row used on the Agenda page. */
export function EventRow({ event }: { event: ChurchEvent }) {
  return (
    <article className="flex flex-wrap items-center gap-[22px] rounded-[18px] border border-[rgba(40,25,80,0.08)] bg-white p-[22px_24px] shadow-[0_1px_3px_rgba(22,15,51,0.05)] transition-all duration-200 hover:shadow-[0_14px_34px_rgba(22,15,51,0.1)]">
      <DateTile day={event.day} month={event.month} tone="cream" />
      <div className="min-w-[200px] flex-1">
        <span className="mb-2 inline-block rounded-md bg-lilac px-2.5 py-[3px] text-[10.5px] font-bold tracking-wider text-indigo-mid uppercase">
          {event.type}
        </span>
        <h3 className="mb-1 text-lg leading-tight font-bold text-indigo">
          {event.title}
        </h3>
        <span className="flex items-center gap-1.5 text-[13.5px] text-body">
          <Clock className="size-3.5" /> {event.time}
        </span>
      </div>
      <Link
        href={`/agenda/${event.slug}`}
        className="flex shrink-0 items-center gap-1 rounded-[11px] border border-indigo-mid/25 px-[22px] py-[11px] text-[13.5px] font-bold text-indigo-mid transition hover:border-gold hover:bg-cream"
      >
        Détails <ArrowRight className="size-3.5" />
      </Link>
    </article>
  );
}
