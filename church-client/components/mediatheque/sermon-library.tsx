"use client";

import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, X, Check, ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { type Sermon } from "@/lib/data";
import { SermonCard } from "@/components/cards/sermon-card";
import type { AudioTrack } from "@/components/audio/audio-player";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const PAGE_SIZE = 9;
const FACET_STEP = 8;

const uniq = (arr: string[]) => [...new Set(arr.filter(Boolean))];
const yearOf = (s: Sermon) => s.date.match(/\d{4}/)?.[0] ?? "—";

type Facet = "speaker" | "series" | "year";

export function SermonLibrary({ sermons }: { sermons: Sermon[] }) {
  const [search, setSearch] = useState("");
  const [speakers, setSpeakers] = useState<string[]>([]);
  const [seriesSel, setSeriesSel] = useState<string[]>([]);
  const [years, setYears] = useState<string[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [page, setPage] = useState(1);
  // How many options of each facet are visible inside the sheet.
  const [shown, setShown] = useState<Record<Facet, number>>({ speaker: FACET_STEP, series: FACET_STEP, year: FACET_STEP });

  const allSpeakers = useMemo(() => uniq(sermons.map((s) => s.speaker)), [sermons]);
  const allSeries = useMemo(() => uniq(sermons.map((s) => s.serie)), [sermons]);
  const allYears = useMemo(() => uniq(sermons.map(yearOf)).sort((a, b) => b.localeCompare(a)), [sermons]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sermons.filter((s) => {
      const matchesSearch =
        !q || [s.title, s.speaker, s.serie, s.book].some((v) => v?.toLowerCase().includes(q));
      const matchesSpeaker = speakers.length === 0 || speakers.includes(s.speaker);
      const matchesSeries = seriesSel.length === 0 || seriesSel.includes(s.serie);
      const matchesYear = years.length === 0 || years.includes(yearOf(s));
      return matchesSearch && matchesSpeaker && matchesSeries && matchesYear;
    });
  }, [sermons, search, speakers, seriesSel, years]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Queue used for the floating player's prev/next across all audio results.
  const audioQueue = useMemo<AudioTrack[]>(
    () =>
      filtered
        .filter((s) => s.isAudio && s.mediaSrc)
        .map((s) => ({
          id: s.id ?? undefined,
          title: s.title,
          speaker: s.speaker,
          src: s.mediaSrc as string,
          cover: s.background ?? null,
        })),
    [filtered]
  );

  const activeCount = speakers.length + seriesSel.length + years.length;

  const toggle = (setter: React.Dispatch<React.SetStateAction<string[]>>, value: string) => {
    setPage(1);
    setter((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  };

  const resetFilters = () => {
    setSpeakers([]);
    setSeriesSel([]);
    setYears([]);
    setPage(1);
  };

  /* ── Active filter chips (outside the sheet) ────────────────────── */
  const chips: { facet: Facet; value: string; remove: () => void }[] = [
    ...speakers.map((v) => ({ facet: "speaker" as const, value: v, remove: () => toggle(setSpeakers, v) })),
    ...seriesSel.map((v) => ({ facet: "series" as const, value: v, remove: () => toggle(setSeriesSel, v) })),
    ...years.map((v) => ({ facet: "year" as const, value: v, remove: () => toggle(setYears, v) })),
  ];

  return (
    <>
      {/* Toolbar */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex min-w-[240px] flex-1 items-center gap-2.5 rounded-xl border border-[rgba(40,25,80,0.1)] bg-white px-3.5 py-2.5 shadow-[0_1px_3px_rgba(22,15,51,0.02)] focus-within:border-gold">
          <Search className="size-4 text-faint" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Rechercher par titre, orateur, série…"
            className="w-full bg-transparent text-[14px] text-indigo outline-none placeholder:text-faint"
          />
        </div>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="flex shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-[rgba(40,25,80,0.12)] bg-white px-4 py-2.5 text-[13px] font-bold text-indigo shadow-[0_1px_3px_rgba(22,15,51,0.02)] transition hover:border-gold hover:text-gold-dark"
        >
          <SlidersHorizontal className="size-4" />
          Plus de Filtres
          {activeCount > 0 && (
            <span className="flex size-5 items-center justify-center rounded-full bg-gold text-[10px] font-black text-indigo">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {/* Active chips */}
      {chips.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          {chips.map((c) => (
            <span
              key={`${c.facet}-${c.value}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-indigo/15 bg-indigo/5 px-3 py-1 text-[12px] font-bold text-indigo"
            >
              {c.value}
              <button onClick={c.remove} className="cursor-pointer text-indigo/60 transition hover:text-live" aria-label={`Retirer ${c.value}`}>
                <X className="size-3" />
              </button>
            </span>
          ))}
          <button onClick={resetFilters} className="cursor-pointer text-[12px] font-bold text-faint underline-offset-2 transition hover:text-live hover:underline">
            Tout effacer
          </button>
        </div>
      )}

      <div className="mb-5 text-[13px] font-semibold text-faint">{filtered.length} message(s)</div>

      {/* Grid */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-[22px]">
        {paged.map((s) => (
          <SermonCard key={s.id ?? s.title} sermon={s} audioQueue={audioQueue} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-[18px] border border-[rgba(40,25,80,0.08)] bg-white px-6 py-16 text-center">
          <p className="text-sm font-semibold text-body-strong">Aucun message trouvé</p>
          <p className="mt-1 text-xs text-body">Essayez d’ajuster votre recherche ou vos filtres.</p>
        </div>
      )}

      {/* Pagination */}
      {filtered.length > PAGE_SIZE && (
        <div className="mt-10 flex items-center justify-center gap-2">
          <PagerButton onClick={() => setPage(currentPage - 1)} disabled={currentPage <= 1} aria-label="Précédent">
            <ChevronLeft className="size-4" />
          </PagerButton>
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              aria-current={p === currentPage ? "page" : undefined}
              className={cn(
                "flex size-10 cursor-pointer items-center justify-center rounded-xl text-sm font-bold transition",
                p === currentPage
                  ? "bg-gradient-to-br from-gold to-gold-dark text-indigo shadow-[0_8px_20px_rgba(200,144,46,0.25)]"
                  : "border border-[rgba(40,25,80,0.12)] bg-white text-indigo hover:border-gold hover:text-gold-dark"
              )}
            >
              {p}
            </button>
          ))}
          <PagerButton onClick={() => setPage(currentPage + 1)} disabled={currentPage >= pageCount} aria-label="Suivant">
            <ChevronRight className="size-4" />
          </PagerButton>
        </div>
      )}

      {/* ── Filters sheet ──────────────────────────────────────────── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="right"
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="flex w-[90vw] flex-col gap-0 bg-white p-0 sm:max-w-md"
        >
          <SheetHeader className="border-b border-[rgba(40,25,80,0.08)] p-5">
            <SheetTitle className="font-display text-xl font-bold text-indigo italic">Filtres avancés</SheetTitle>
            <SheetDescription className="text-xs text-body">
              Affinez par orateur, catégorie ou année.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-6 overflow-y-auto p-5">
            <FacetSection
              title="Orateurs"
              options={allSpeakers}
              selected={speakers}
              onToggle={(v) => toggle(setSpeakers, v)}
              shown={shown.speaker}
              onMore={() => setShown((s) => ({ ...s, speaker: s.speaker + FACET_STEP }))}
            />
            <FacetSection
              title="Catégories"
              options={allSeries}
              selected={seriesSel}
              onToggle={(v) => toggle(setSeriesSel, v)}
              shown={shown.series}
              onMore={() => setShown((s) => ({ ...s, series: s.series + FACET_STEP }))}
            />
            <FacetSection
              title="Années"
              options={allYears}
              selected={years}
              onToggle={(v) => toggle(setYears, v)}
              shown={shown.year}
              onMore={() => setShown((s) => ({ ...s, year: s.year + FACET_STEP }))}
            />
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-[rgba(40,25,80,0.08)] p-4">
            <button onClick={resetFilters} className="cursor-pointer rounded-xl px-4 py-2.5 text-xs font-bold text-body transition hover:bg-cream">
              Réinitialiser
            </button>
            <button
              onClick={() => setSheetOpen(false)}
              className="cursor-pointer rounded-xl bg-gradient-to-br from-gold to-gold-dark px-5 py-2.5 text-xs font-bold text-indigo shadow-md transition hover:brightness-105"
            >
              Voir les {filtered.length} résultat(s)
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function PagerButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="flex size-10 cursor-pointer items-center justify-center rounded-xl border border-[rgba(40,25,80,0.12)] bg-white text-indigo transition hover:border-gold hover:text-gold-dark disabled:cursor-not-allowed disabled:opacity-35"
    >
      {children}
    </button>
  );
}

function FacetSection({
  title,
  options,
  selected,
  onToggle,
  shown,
  onMore,
}: {
  title: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  shown: number;
  onMore: () => void;
}) {
  if (options.length === 0) return null;
  const visible = options.slice(0, shown);

  return (
    <div>
      <p className="mb-2.5 text-[11px] font-bold tracking-wider text-faint uppercase">{title}</p>
      <div className="flex flex-col gap-1">
        {visible.map((opt) => {
          const active = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onToggle(opt)}
              className={cn(
                "flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition",
                active ? "bg-gold/10 font-bold text-gold-dark" : "text-indigo hover:bg-cream"
              )}
            >
              <span className="truncate">{opt}</span>
              <span
                className={cn(
                  "flex size-4 shrink-0 items-center justify-center rounded-[5px] border transition",
                  active ? "border-gold bg-gradient-to-br from-gold to-gold-dark text-white" : "border-[rgba(40,25,80,0.2)]"
                )}
              >
                {active && <Check className="size-3" strokeWidth={3} />}
              </span>
            </button>
          );
        })}
      </div>
      {options.length > shown && (
        <button onClick={onMore} className="mt-2 cursor-pointer text-[12px] font-bold text-gold-dark transition hover:brightness-110">
          Voir plus ({options.length - shown})
        </button>
      )}
    </div>
  );
}
