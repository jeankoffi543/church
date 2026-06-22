"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Clock, MapPin, ArrowRight, Search } from "lucide-react";
import type { ChurchEvent } from "@/lib/data";
import { IMG } from "@/lib/data";
import { Pagination } from "@/app/admins/(panel)/_components/pagination";

export function AgendaCard({ event }: { event: ChurchEvent }) {
  const imageUrl = event.image || IMG.agendaFeature;

  return (
    <article className="group flex flex-col h-full overflow-hidden rounded-xl border border-[rgba(40,25,80,0.08)] bg-white shadow-[0_1px_3px_rgba(22,15,51,0.02)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(22,15,51,0.08)]">
      {/* Zone Image (Top) */}
      <div className="aspect-video w-full overflow-hidden rounded-t-xl relative bg-indigo-mid">
        <Image
          src={imageUrl}
          alt={event.title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          unoptimized
        />
        {/* Optional: Type Badge floating inside the relative container */}
        {event.type && (
          <span className="absolute top-3 left-3 rounded-lg bg-indigo/90 backdrop-blur-md px-2.5 py-1 text-[9px] font-bold tracking-wider text-gold uppercase shadow-sm">
            {event.type}
          </span>
        )}
      </div>

      {/* Zone Contenu (Bottom) */}
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-semibold text-xl text-indigo line-clamp-1 mb-3 leading-tight" title={event.title}>
          {event.title}
        </h3>

        {/* Date and hour with discrete icon */}
        <div className="flex items-center gap-2 text-xs text-body-soft mb-2">
          <Clock className="size-3.5 text-gold-dark shrink-0" />
          <span className="font-medium">{event.fullDate} à {event.time}</span>
        </div>

        {/* Location / Lieu */}
        <div className="flex items-center gap-2 text-xs text-body-soft mb-4">
          <MapPin className="size-3.5 text-gold-dark shrink-0" />
          <span className="line-clamp-1 font-medium">{event.location}</span>
        </div>

        {/* Description: short truncated description to max 2 lines */}
        <p className="text-xs text-body line-clamp-2 leading-relaxed mb-5">
          {event.description}
        </p>

        {/* Details button aligned at the bottom */}
        <div className="mt-auto pt-2">
          <Link
            href={`/agenda/${event.slug}`}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-indigo-mid/20 bg-cream/10 py-2.5 text-xs font-bold text-indigo-mid transition hover:border-gold hover:bg-cream"
          >
            Détails <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}

export function AgendaList({ initialEvents }: { initialEvents: ChurchEvent[] }) {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(9); // 9 per page fits a 3-column grid perfectly

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  const filtered = initialEvents.filter((event) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      event.title.toLowerCase().includes(q) ||
      (event.type && event.type.toLowerCase().includes(q)) ||
      (event.location && event.location.toLowerCase().includes(q)) ||
      (event.description && event.description.toLowerCase().includes(q))
    );
  });

  const total = filtered.length;
  const pageCount = Math.ceil(total / perPage) || 1;
  const paginatedEvents = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  return (
    <div className="space-y-8">
      {/* Search Bar */}
      <div className="flex max-w-md items-center gap-2.5 rounded-xl border border-[rgba(40,25,80,0.1)] bg-white px-3.5 py-2.5 shadow-[0_1px_3px_rgba(22,15,51,0.02)]">
        <Search className="size-4 text-faint" />
        <input
          type="text"
          placeholder="Rechercher un programme..."
          value={search}
          onChange={handleSearchChange}
          className="w-full text-sm text-indigo outline-none placeholder:text-faint bg-transparent border-none"
        />
      </div>

      {/* Grid List */}
      {paginatedEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedEvents.map((event) => (
            <AgendaCard key={event.slug} event={event} />
          ))}
        </div>
      ) : (
        <div className="rounded-[24px] border border-dashed border-[rgba(40,25,80,0.12)] p-12 text-center text-body">
          Aucun programme trouvé correspondant à vos critères.
        </div>
      )}

      {/* Pagination centered horizontally at the bottom */}
      {total > perPage && (
        <div className="flex justify-center mt-10 w-full">
          <div className="overflow-hidden rounded-xl border border-[rgba(40,25,80,0.08)] bg-white shadow-sm w-full">
            <Pagination
              page={currentPage}
              pageCount={pageCount}
              total={total}
              perPage={perPage}
              onPageChange={(page) => setCurrentPage(page)}
              onPerPageChange={(newPerPage) => {
                setPerPage(newPerPage);
                setCurrentPage(1);
              }}
              itemLabel="programmes"
            />
          </div>
        </div>
      )}
    </div>
  );
}
