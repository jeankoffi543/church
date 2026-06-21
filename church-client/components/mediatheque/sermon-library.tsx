"use client";

import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";
import { type Sermon } from "@/lib/data";
import { SermonCard } from "@/components/cards/sermon-card";

type FilterType = "all" | "serie" | "speaker" | "book";

const uniq = (arr: string[]) => [...new Set(arr)];

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative cursor-pointer rounded-full border bg-white px-[15px] py-[7px] text-[13px] font-semibold transition",
        active
          ? "border-gold-dark text-indigo"
          : "border-[rgba(40,25,80,0.12)] text-body-strong hover:border-gold hover:text-indigo"
      )}
    >
      {children}
      {active && (
        <span className="absolute inset-0 rounded-full border-2 border-gold-dark" />
      )}
    </button>
  );
}

function FilterRow({
  label,
  values,
  type,
  active,
  onSelect,
}: {
  label: string;
  values: string[];
  type: FilterType;
  active: { type: FilterType; value: string };
  onSelect: (type: FilterType, value: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="w-[74px] text-[11px] font-bold tracking-wider text-faint uppercase">
        {label}
      </span>
      <div className="flex flex-wrap gap-2">
        {values.map((v) => (
          <FilterChip
            key={v}
            active={active.type === type && active.value === v}
            onClick={() => onSelect(type, v)}
          >
            {v}
          </FilterChip>
        ))}
      </div>
    </div>
  );
}

export function SermonLibrary({ sermons }: { sermons: Sermon[] }) {
  const [filter, setFilter] = useState<{ type: FilterType; value: string }>({
    type: "all",
    value: "all",
  });

  const series = useMemo(() => uniq(sermons.map((s) => s.serie)), [sermons]);
  const speakers = useMemo(() => uniq(sermons.map((s) => s.speaker)), [sermons]);
  const books = useMemo(() => uniq(sermons.map((s) => s.book)), [sermons]);

  const filtered = useMemo(() => {
    if (filter.type === "all") return sermons;
    return sermons.filter(
      (s) => s[filter.type as keyof Sermon] === filter.value
    );
  }, [filter, sermons]);

  const select = (type: FilterType, value: string) => {
    // toggle off when re-selecting the active chip
    setFilter((cur) =>
      cur.type === type && cur.value === value
        ? { type: "all", value: "all" }
        : { type, value }
    );
  };

  return (
    <>
      {/* Filter card */}
      <div className="mb-8 rounded-[18px] border border-[rgba(40,25,80,0.08)] bg-white p-[22px] shadow-[0_1px_3px_rgba(22,15,51,0.05)]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <span className="text-[13px] font-bold text-indigo">
            Filtrer les messages
          </span>
          <FilterChip
            active={filter.type === "all"}
            onClick={() => setFilter({ type: "all", value: "all" })}
          >
            Tout afficher
          </FilterChip>
        </div>
        <div className="flex flex-col gap-3">
          <FilterRow
            label="Séries"
            values={series}
            type="serie"
            active={filter}
            onSelect={select}
          />
          <FilterRow
            label="Orateurs"
            values={speakers}
            type="speaker"
            active={filter}
            onSelect={select}
          />
          <FilterRow
            label="Livres"
            values={books}
            type="book"
            active={filter}
            onSelect={select}
          />
        </div>
      </div>

      <div className="mb-5 text-[13px] font-semibold text-faint">
        {filtered.length} message(s)
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-[22px]">
        {filtered.map((s) => (
          <SermonCard key={s.title} sermon={s} />
        ))}
      </div>
    </>
  );
}
