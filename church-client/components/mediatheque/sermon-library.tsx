"use client";

import { useMemo, useState, useEffect } from "react";
import { Search, SlidersHorizontal, X, Check, ChevronLeft, ChevronRight, BookOpen, ArrowLeft, CalendarDays } from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";
import { type Sermon, SERMONS } from "@/lib/data";
import { BIBLE_BOOKS, normalizeBook } from "@/lib/constants/bible";
import { SermonCard } from "@/components/cards/sermon-card";
import type { AudioTrack } from "@/components/audio/audio-player";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const DETAIL_STEP = 12;

const uniq = (arr: string[]) => [...new Set(arr.filter(Boolean))];

type Facet = "speaker" | "series" | "year" | "date" | "book";

export function SermonLibrary({
  initialSermons = [],
  meta,
  searchParam = "",
  speakersParam = [],
  seriesParam = [],
  yearsParam = [],
  datesParam = [],
  booksParam = [],
  pageParam = 1,
}: {
  initialSermons?: Sermon[];
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    speakers: string[];
    series: string[];
    years: string[];
    dates: string[];
    books: string[];
  };
  searchParam?: string;
  speakersParam?: string[];
  seriesParam?: string[];
  yearsParam?: string[];
  datesParam?: string[];
  booksParam?: string[];
  pageParam?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParam);
  const [speakers, setSpeakers] = useState<string[]>(speakersParam);
  const [seriesSel, setSeriesSel] = useState<string[]>(seriesParam);
  const [years, setYears] = useState<string[]>(yearsParam);
  const [dates, setDates] = useState<string[]>(datesParam);
  const [books, setBooks] = useState<string[]>(booksParam);
  const [sheetOpen, setSheetOpen] = useState(false);
  // Which facet's dedicated search/pagination sub-sheet is open (if any), plus
  // its search/pagination state (lifted here so it resets cleanly on open).
  const [detailKey, setDetailKey] = useState<Facet | null>(null);
  const [detailQuery, setDetailQuery] = useState("");
  const [detailLimit, setDetailLimit] = useState(DETAIL_STEP);
  const [page, setPage] = useState(pageParam);

  const openDetail = (key: Facet) => {
    setDetailKey(key);
    setDetailQuery("");
    setDetailLimit(DETAIL_STEP);
  };

  // URL Query parameter updates
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (search) {
        params.set("search", search);
      } else {
        params.delete("search");
      }

      params.delete("speaker[]");
      params.delete("series[]");
      params.delete("year[]");
      params.delete("date[]");
      params.delete("book[]");

      speakers.forEach((s) => params.append("speaker[]", s));
      seriesSel.forEach((s) => params.append("series[]", s));
      years.forEach((y) => params.append("year[]", y));
      dates.forEach((d) => params.append("date[]", d));
      books.forEach((b) => params.append("book[]", b));

      if (page > 1) {
        params.set("page", String(page));
      } else {
        params.delete("page");
      }

      const nextQueryString = params.toString();
      if (nextQueryString !== searchParams.toString()) {
        router.push(`${pathname}?${nextQueryString}`, { scroll: false });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [search, speakers, seriesSel, years, dates, books, page, router, pathname, searchParams]);

  const fallbackSpeakers = useMemo(() => uniq(SERMONS.map((s) => s.speaker)), []);
  const fallbackSeries = useMemo(() => uniq(SERMONS.map((s) => s.serie)), []);
  const fallbackYears = useMemo(() => uniq(SERMONS.map((s) => s.date.match(/\d{4}/)?.[0] ?? "—")).sort((a, b) => b.localeCompare(a)), []);
  const fallbackDates = useMemo(() => uniq(SERMONS.map((s) => s.date)), []);

  const allSpeakers = meta?.speakers ?? fallbackSpeakers;
  const allSeries = meta?.series ?? fallbackSeries;
  const allYears = meta?.years ?? fallbackYears;
  const allDates = meta?.dates ?? fallbackDates;

  const filtered = initialSermons;
  const pageCount = meta?.last_page ?? 1;
  const currentPage = meta?.current_page ?? 1;
  const paged = initialSermons;

  const totalCount = meta?.total ?? initialSermons.length;

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

  const activeCount = speakers.length + seriesSel.length + years.length + dates.length + books.length;

  const toggle = (setter: React.Dispatch<React.SetStateAction<string[]>>, value: string) => {
    setPage(1);
    setter((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  };

  // One config per facet — drives both the compact previews and the dedicated
  // search/pagination sub-sheet.
  const facets: FacetConfig[] = [
    { key: "speaker", title: "Orateurs", options: allSpeakers, selected: speakers, onToggle: (v) => toggle(setSpeakers, v) },
    { key: "series", title: "Catégories", options: allSeries, selected: seriesSel, onToggle: (v) => toggle(setSeriesSel, v) },
    { key: "year", title: "Années", options: allYears, selected: years, onToggle: (v) => toggle(setYears, v) },
    { key: "date", title: "Dates", options: allDates, selected: dates, onToggle: (v) => toggle(setDates, v), icon: CalendarDays },
    { key: "book", title: "Livres bibliques", options: BIBLE_BOOKS, selected: books, onToggle: (v) => toggle(setBooks, v), icon: BookOpen },
  ];
  const detailConfig = facets.find((f) => f.key === detailKey) ?? null;

  const resetFilters = () => {
    setSpeakers([]);
    setSeriesSel([]);
    setYears([]);
    setDates([]);
    setBooks([]);
    setSearch("");
    setPage(1);
  };

  /* ── Active filter chips (outside the sheet) ────────────────────── */
  const chips: { facet: Facet; value: string; remove: () => void }[] = [
    ...speakers.map((v) => ({ facet: "speaker" as const, value: v, remove: () => toggle(setSpeakers, v) })),
    ...seriesSel.map((v) => ({ facet: "series" as const, value: v, remove: () => toggle(setSeriesSel, v) })),
    ...years.map((v) => ({ facet: "year" as const, value: v, remove: () => toggle(setYears, v) })),
    ...dates.map((v) => ({ facet: "date" as const, value: v, remove: () => toggle(setDates, v) })),
    ...books.map((v) => ({ facet: "book" as const, value: v, remove: () => toggle(setBooks, v) })),
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

      <div className="mb-5 text-[13px] font-semibold text-faint">{totalCount} message(s)</div>

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
      {pageCount > 1 && (
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
            {facets.map((f) => (
              <FacetPreview key={f.key} config={f} onSeeMore={() => openDetail(f.key)} />
            ))}
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

          {/* Per-facet search & pagination — an in-sheet sliding panel (same
              dialog, so closing it never dismisses the main sheet). */}
          {detailConfig && (
            <FacetDetailPanel
              config={detailConfig}
              query={detailQuery}
              limit={detailLimit}
              onSearch={(v) => {
                setDetailQuery(v);
                setDetailLimit(DETAIL_STEP);
              }}
              onMore={() => setDetailLimit((n) => n + DETAIL_STEP)}
              onBack={() => setDetailKey(null)}
            />
          )}
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

type FacetConfig = {
  key: Facet;
  title: string;
  options: readonly string[];
  selected: string[];
  onToggle: (value: string) => void;
  icon?: React.ComponentType<{ className?: string }>;
};

/** Checkbox row shared by the compact preview and the detail sub-sheet. */
function FacetRow({
  label,
  active,
  onToggle,
  icon: Icon,
}: {
  label: string;
  active: boolean;
  onToggle: () => void;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition",
        active ? "bg-gold/10 font-bold text-gold-dark" : "text-indigo hover:bg-cream"
      )}
    >
      <span className="flex items-center gap-2 truncate">
        {Icon && <Icon className="size-3.5 shrink-0 opacity-60" />}
        {label}
      </span>
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
}

const PREVIEW_COUNT = 5;

/** Compact preview inside the main filters sheet; "Voir plus" opens the sub-sheet. */
function FacetPreview({ config, onSeeMore }: { config: FacetConfig; onSeeMore: () => void }) {
  const { title, options, selected, onToggle, icon } = config;
  if (options.length === 0) return null;

  // Selected first, then the rest — so active choices stay visible in the preview.
  const ordered = [
    ...selected.filter((o) => options.includes(o)),
    ...options.filter((o) => !selected.includes(o)),
  ];
  const visible = ordered.slice(0, PREVIEW_COUNT);

  return (
    <div>
      <div className="mb-2.5 flex items-center gap-2">
        <p className="text-[11px] font-bold tracking-wider text-faint uppercase">{title}</p>
        {selected.length > 0 && (
          <span className="flex size-4 items-center justify-center rounded-full bg-gold text-[10px] font-black text-indigo">
            {selected.length}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1">
        {visible.map((opt) => (
          <FacetRow key={opt} label={opt} active={selected.includes(opt)} onToggle={() => onToggle(opt)} icon={icon} />
        ))}
      </div>
      {options.length > PREVIEW_COUNT && (
        <button
          onClick={onSeeMore}
          className="mt-2 flex cursor-pointer items-center gap-1 text-[12px] font-bold text-gold-dark transition hover:brightness-110"
        >
          Voir plus ({options.length}) <ChevronRight className="size-3.5" />
        </button>
      )}
    </div>
  );
}

/**
 * In-sheet sliding panel: full search + pagination for one facet. Rendered
 * inside the main SheetContent (not a second dialog), so dismissing it can never
 * close the main filters sheet.
 */
function FacetDetailPanel({
  config,
  query,
  limit,
  onSearch,
  onMore,
  onBack,
}: {
  config: FacetConfig;
  query: string;
  limit: number;
  onSearch: (value: string) => void;
  onMore: () => void;
  onBack: () => void;
}) {
  const matches = useMemo(() => {
    const q = normalizeBook(query);
    return q ? config.options.filter((o) => normalizeBook(o).includes(q)) : config.options;
  }, [config, query]);

  const visible = matches.slice(0, limit);

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-white duration-200 animate-in slide-in-from-right-8">
      <div className="border-b border-[rgba(40,25,80,0.08)] p-5">
        <button
          type="button"
          onClick={onBack}
          className="mb-1.5 -ml-1 inline-flex w-fit cursor-pointer items-center gap-1.5 text-xs font-bold text-faint transition hover:text-indigo"
        >
          <ArrowLeft className="size-4" /> Retour aux filtres
        </button>
        <h3 className="font-display text-lg font-bold text-indigo italic">{config.title}</h3>
        <p className="text-xs text-body">
          {config.selected.length > 0 ? `${config.selected.length} sélectionné(s) · ` : ""}
          Recherchez puis cochez.
        </p>
      </div>

      <div className="border-b border-[rgba(40,25,80,0.08)] p-4">
        <div className="flex items-center gap-2 rounded-lg border border-[rgba(40,25,80,0.12)] bg-cream px-3 py-2 focus-within:border-gold">
          <Search className="size-4 shrink-0 text-faint" />
          <input
            autoFocus
            value={query}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Rechercher…"
            className="w-full bg-transparent text-sm text-indigo outline-none placeholder:text-faint"
          />
        </div>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto p-4">
        {visible.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-faint italic">Aucun résultat.</p>
        ) : (
          visible.map((opt) => (
            <FacetRow
              key={opt}
              label={opt}
              active={config.selected.includes(opt)}
              onToggle={() => config.onToggle(opt)}
              icon={config.icon}
            />
          ))
        )}
        {matches.length > limit && (
          <button
            onClick={onMore}
            className="mt-2 w-full cursor-pointer rounded-lg border border-[rgba(40,25,80,0.12)] py-2 text-[12px] font-bold text-gold-dark transition hover:bg-cream"
          >
            Voir plus ({matches.length - limit})
          </button>
        )}
      </div>

      <div className="border-t border-[rgba(40,25,80,0.08)] p-4">
        <button
          onClick={onBack}
          className="w-full cursor-pointer rounded-xl bg-gradient-to-br from-gold to-gold-dark px-5 py-2.5 text-xs font-bold text-indigo shadow-md transition hover:brightness-105"
        >
          Terminé
        </button>
      </div>
    </div>
  );
}
