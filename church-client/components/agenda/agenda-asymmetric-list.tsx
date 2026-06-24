"use client";

import { useState } from "react";
import { EventRow } from "@/components/cards/event-card";
import { Pagination } from "@/app/admins/(panel)/_components/pagination";
import type { ChurchEvent } from "@/lib/data";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

export function AgendaAsymmetricList({
  events,
  initialMeta,
}: {
  events: ChurchEvent[];
  initialMeta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentPage = initialMeta?.current_page ?? 1;
  const perPage = initialMeta?.per_page ?? 10;
  const total = initialMeta?.total ?? events.length;
  const pageCount = initialMeta?.last_page ?? 1;

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handlePerPageChange = (newPerPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("per_page", String(newPerPage));
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="space-y-8">
      {/* Original Column layout wrapper */}
      <div className="flex flex-col gap-3.5">
        {events.map((e) => (
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
              onPageChange={handlePageChange}
              onPerPageChange={handlePerPageChange}
              itemLabel="événements"
            />
          </div>
        </div>
      )}
    </div>
  );
}
