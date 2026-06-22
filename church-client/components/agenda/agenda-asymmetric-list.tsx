"use client";

import { useState } from "react";
import { EventRow } from "@/components/cards/event-card";
import { Pagination } from "@/app/admins/(panel)/_components/pagination";
import type { ChurchEvent } from "@/lib/data";

export function AgendaAsymmetricList({ events }: { events: ChurchEvent[] }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const total = events.length;
  const pageCount = Math.ceil(total / perPage) || 1;
  const paginatedEvents = events.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage
  );

  return (
    <div className="space-y-8">
      {/* Original Column layout wrapper */}
      <div className="flex flex-col gap-3.5">
        {paginatedEvents.map((e) => (
          <EventRow key={e.id ?? e.slug} event={e} />
        ))}
      </div>

      {/* Pagination centered horizontally */}
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
              itemLabel="événements"
            />
          </div>
        </div>
      )}
    </div>
  );
}
