"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

export type Pastor = {
  id: number;
  name: string;
  email: string;
  role: string;
  initials: string;
  photo_path: string | null;
  desc?: string;
};

type PastoralTeamListProps = {
  title: string;
  intro: string;
  pastors: Pastor[];
};

export function PastoralTeamList({ title, intro, pastors }: PastoralTeamListProps) {
  const [showAll, setShowAll] = useState(false);

  if (!pastors || pastors.length === 0) return null;

  const visiblePastors = showAll ? pastors : pastors.slice(0, 3);
  const hasMore = pastors.length > 3;

  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div className="mb-10 text-center md:text-left">
        <span className="text-[10px] font-bold tracking-wider text-gold-dark uppercase">
          Ministres de l&apos;Évangile
        </span>
        <h2 className="mt-1 font-display text-[32px] font-bold text-indigo italic">
          {title}
        </h2>
        <p className="mt-2 text-sm text-body max-w-xl">
          {intro}
        </p>
      </div>

      {/* Grid of Pastors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 transition-all duration-500 ease-in-out">
        {visiblePastors.map((pastor, index) => {
          const isNew = index >= 3;
          return (
            <div
              key={pastor.id}
              className={cn(
                "flex flex-col rounded-2xl border border-[rgba(40,25,80,0.06)] bg-white p-6 shadow-sm hover:shadow-md hover:border-gold/20 transition-all duration-300",
                isNew && "animate-in fade-in slide-in-from-bottom-5 duration-300 fill-mode-both"
              )}
            >
              {/* Photo or Initials Badge */}
              <div className="mb-4">
                {pastor.photo_path ? (
                  <img
                    src={pastor.photo_path}
                    alt={pastor.name}
                    className="size-14 rounded-full object-cover shadow-inner border border-gold/10"
                  />
                ) : (
                  <div className="flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-mid to-ink text-[#e2b85f] font-display text-lg font-bold shadow-inner">
                    {pastor.initials}
                  </div>
                )}
              </div>

              {/* Identity */}
              <h3 className="font-display text-base font-bold text-indigo leading-tight">
                {pastor.name}
              </h3>
              <span className="text-[10px] font-bold tracking-wider text-gold-dark uppercase mt-0.5">
                {pastor.role}
              </span>

              {/* Description or Email */}
              {pastor.desc ? (
                <p className="mt-3 text-xs leading-relaxed text-body flex-1">
                  {pastor.desc}
                </p>
              ) : (
                <p className="mt-4 flex items-center gap-1.5 text-xs text-faint border-t border-[rgba(40,25,80,0.04)] pt-3 flex-1 items-end">
                  <Mail className="size-3.5 text-gold-dark" />
                  {pastor.email}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Show more button */}
      {hasMore && (
        <div className="mt-12 flex justify-center">
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="group flex cursor-pointer items-center gap-2 rounded-full border border-gold/30 bg-white px-6 py-3 text-xs font-bold uppercase tracking-wider text-indigo shadow-sm transition hover:bg-gold/5 hover:border-gold hover:shadow-md active:scale-95"
          >
            {showAll ? (
              <>
                Voir moins
                <ChevronUp className="size-4 text-gold-dark transition-transform group-hover:-translate-y-0.5" />
              </>
            ) : (
              <>
                Voir tous nos pasteurs
                <ChevronDown className="size-4 text-gold-dark transition-transform group-hover:translate-y-0.5" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
