"use client";

import { useMemo, useState, useEffect } from "react";
import { Play, Eye, Clock, Search, X, ChevronDown, CalendarRange, Loader2 } from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";
import { type PastLive, getPastLives } from "@/lib/api";
import { BrandButton } from "@/components/ui/brand-button";
import { SmartImage } from "@/components/ui/smart-image";
import { SermonVideoDialog } from "@/components/media/sermon-video-dialog";
import { FacetSheet, FACET_SHEET_STEP } from "@/components/lives/facet-sheet";

const IMG_FALLBACK = "https://images.unsplash.com/photo-1507692049790-de58290a4334?w=1600&q=80";
const STEP = 9;

const resumeKeyOf = (live: PastLive) => `mfm:resume:past-live:${live.id}`;
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export function LivesArchive({
  latest,
  initialLives = [],
  meta,
  searchParam = "",
  seriesParam = [],
  yearsParam = [],
}: {
  latest: PastLive | null;
  initialLives?: PastLive[];
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    years: string[];
    series: string[];
  };
  searchParam?: string;
  seriesParam?: string[];
  yearsParam?: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [active, setActive] = useState<PastLive | null>(null);
  const [search, setSearch] = useState(searchParam);
  const [series, setSeries] = useState<string[]>(seriesParam);
  const [years, setYears] = useState<string[]>(yearsParam);

  const [livesList, setLivesList] = useState<PastLive[]>(initialLives);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  // Sync state with props when initialLives updates from server page reload
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setLivesList(initialLives);
      setPage(1);
      setSearch(searchParam);
      setSeries(seriesParam ?? []);
      setYears(yearsParam ?? []);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [initialLives, searchParam, seriesParam, yearsParam]);

  // Which facet's "Voir plus" sheet is open + its lifted search/pagination state.
  const [facetOpen, setFacetOpen] = useState<"series" | "years" | null>(null);
  const [facetQuery, setFacetQuery] = useState("");
  const [facetLimit, setFacetLimit] = useState(FACET_SHEET_STEP);

  // Debounce and push search / filters update in URL
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (search) {
        params.set("search", search);
      } else {
        params.delete("search");
      }

      params.delete("series[]");
      params.delete("year[]");

      series.forEach((s) => params.append("series[]", s));
      years.forEach((y) => params.append("year[]", y));

      const nextQueryString = params.toString();
      if (nextQueryString !== searchParams.toString()) {
        router.push(`${pathname}?${nextQueryString}`, { scroll: false });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [search, series, years, router, pathname, searchParams]);

  const handleLoadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    const res = await getPastLives({
      search,
      series,
      year: years,
      perPage: STEP,
      page: nextPage,
    });
    setLivesList((prev) => [...prev, ...res.data]);
    setPage(nextPage);
    setLoadingMore(false);
  };

  const archive = useMemo(() => livesList.filter((l) => l.id !== latest?.id), [livesList, latest]);
  const allSeries = meta?.series ?? [];
  const allYears = meta?.years ?? [];

  // Group items into chronological month sections.
  const monthGroups = useMemo(() => {
    const map = new Map<string, PastLive[]>();
    for (const live of archive) {
      const key = cap(live.monthLabel) || "Sans date";
      (map.get(key) ?? map.set(key, []).get(key)!).push(live);
    }
    return [...map.entries()];
  }, [archive]);

  const activeCount = series.length + years.length;
  const toggle = (setter: React.Dispatch<React.SetStateAction<string[]>>, value: string) =>
    setter((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  const resetFilters = () => { setSeries([]); setYears([]); setSearch(""); };

  const openFacet = (key: "series" | "years") => {
    setFacetOpen(key);
    setFacetQuery("");
    setFacetLimit(FACET_SHEET_STEP);
  };
  const facet =
    facetOpen === "series"
      ? { title: "Séries", options: allSeries, selected: series, onToggle: (v: string) => toggle(setSeries, v) }
      : facetOpen === "years"
        ? { title: "Années", options: allYears, selected: years, onToggle: (v: string) => toggle(setYears, v) }
        : null;

  const totalCount = meta?.total ?? initialLives.length;
  const hasMore = livesList.length < totalCount;

  return (
    <div className="min-h-screen bg-ink pb-[clamp(56px,8vw,96px)]">
      {/* ── Cinematic hero ─────────────────────────────────────── */}
      {latest && (
        <header
          className="relative flex min-h-[clamp(420px,56vw,640px)] items-end bg-cover bg-center"
          style={{ backgroundImage: `linear-gradient(180deg,rgba(13,9,30,.25),rgba(13,9,30,.65) 55%,#0d091e),url('${latest.thumbnail ?? IMG_FALLBACK}')` }}
        >
          <div className="mx-auto w-full max-w-[1200px] px-6 pb-[clamp(32px,5vw,64px)]">
            {latest.series && (
              <span className="mb-3 inline-block rounded-md bg-gold/90 px-3 py-1 text-[11px] font-extrabold tracking-wider text-indigo uppercase">{latest.series}</span>
            )}
            <h1 className="max-w-[820px] font-display text-[clamp(34px,5.6vw,68px)] leading-[1.02] font-semibold text-white italic">{latest.title}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13.5px] font-semibold text-white/70">
              {latest.preacher && <span>{latest.preacher}</span>}
              {latest.dateLabel && <Dot label={latest.dateLabel} />}
              {latest.duration && (<span className="flex items-center gap-1.5"><Clock className="size-4 text-gold" /> {latest.duration}</span>)}
              <span className="flex items-center gap-1.5"><Eye className="size-4 text-gold" /> {latest.views.toLocaleString("fr-FR")} vues</span>
            </div>
            {latest.description && (<p className="mt-4 max-w-[640px] text-[15px] leading-relaxed text-white/65 line-clamp-3">{latest.description}</p>)}
            <div className="mt-6">
              <BrandButton variant="gold" size="sm" className="px-7" onClick={() => setActive(latest)}>
                <Play className="size-4 fill-indigo" /> Regarder la rediffusion
              </BrandButton>
            </div>
          </div>
        </header>
      )}

      <div className="mx-auto mt-[clamp(28px,4vw,52px)] max-w-[1200px] px-6">
        <h2 className="mb-5 flex items-center gap-2.5 font-display text-[clamp(22px,2.6vw,30px)] font-semibold text-white italic">
          <CalendarRange className="size-6 text-gold" /> Toutes les archives
        </h2>

        {/* ── Search + filters ─────────────────────────────────── */}
        <div className="mb-5 flex flex-col gap-3">
          <div className="flex items-center gap-2.5 rounded-xl border border-white/12 bg-white/5 px-4 py-2.5 focus-within:border-gold/60">
            <Search className="size-4 text-white/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par titre, prédicateur ou série…"
              className="w-full bg-transparent text-[14px] text-white outline-none placeholder:text-white/35"
            />
          </div>
          {allSeries.length > 0 && <ChipRow label="Séries" options={allSeries} active={series} onToggle={(v) => toggle(setSeries, v)} onMore={() => openFacet("series")} />}
          {allYears.length > 0 && <ChipRow label="Années" options={allYears} active={years} onToggle={(v) => toggle(setYears, v)} onMore={() => openFacet("years")} />}
        </div>

        <div className="mb-7 flex items-center gap-3 text-[13px] font-semibold text-white/45">
          <span>{totalCount} rediffusion(s)</span>
          {(activeCount > 0 || search) && (
            <button onClick={resetFilters} className="inline-flex cursor-pointer items-center gap-1 text-gold/80 transition hover:text-gold">
              <X className="size-3.5" /> Réinitialiser
            </button>
          )}
        </div>

        {/* ── Month-grouped grid ───────────────────────────────── */}
        {monthGroups.map(([month, items]) => (
          <section key={month} className="mb-[clamp(24px,3.5vw,40px)]">
            <h3 className="mb-4 text-[13px] font-bold tracking-[0.18em] text-gold uppercase">{month}</h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
              {items.map((live) => (<LiveCard key={live.id} live={live} onPlay={() => setActive(live)} />))}
            </div>
          </section>
        ))}

        {archive.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-16 text-center">
            <p className="text-sm font-semibold text-white/80">Aucune rediffusion</p>
            <p className="mt-1 text-xs text-white/45">Ajustez votre recherche ou vos filtres.</p>
          </div>
        )}

        {/* ── Load more ────────────────────────────────────────── */}
        {hasMore && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/15 bg-white/5 px-7 py-3 text-sm font-bold text-white transition hover:border-gold hover:text-gold disabled:opacity-50"
            >
              {loadingMore ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ChevronDown className="size-4" />
              )}
              {loadingMore ? "Chargement..." : "Charger plus"}
              {!loadingMore && (
                <span className="text-white/40">({totalCount - livesList.length})</span>
              )}
            </button>
          </div>
        )}
      </div>

      {active && active.mediaType && (
        <SermonVideoDialog
          open={active !== null}
          onOpenChange={(o) => { if (!o) setActive(null); }}
          mediaType={active.mediaType}
          src={active.mediaSrc}
          title={active.title}
          resumeKey={resumeKeyOf(active)}
        />
      )}

      <FacetSheet
        open={facetOpen !== null}
        onOpenChange={(o) => { if (!o) setFacetOpen(null); }}
        title={facet?.title ?? ""}
        options={facet?.options ?? []}
        selected={facet?.selected ?? []}
        onToggle={facet?.onToggle ?? (() => {})}
        query={facetQuery}
        limit={facetLimit}
        onQuery={(v) => { setFacetQuery(v); setFacetLimit(FACET_SHEET_STEP); }}
        onMore={() => setFacetLimit((l) => l + FACET_SHEET_STEP)}
      />
    </div>
  );
}

const CHIP_PREVIEW = 6;

function ChipRow({
  label,
  options,
  active,
  onToggle,
  onMore,
}: {
  label: string;
  options: string[];
  active: string[];
  onToggle: (v: string) => void;
  onMore: () => void;
}) {
  // Selected first so active choices stay visible within the preview window.
  const ordered = [...active.filter((o) => options.includes(o)), ...options.filter((o) => !active.includes(o))];
  const shown = ordered.slice(0, CHIP_PREVIEW);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-[11px] font-bold tracking-wider text-white/35 uppercase">{label}</span>
      {shown.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onToggle(opt)}
          className={cn(
            "cursor-pointer rounded-full border px-3 py-1.5 text-[12.5px] font-bold transition",
            active.includes(opt) ? "border-gold bg-gold/15 text-gold" : "border-white/15 text-white/70 hover:border-white/40"
          )}
        >
          {opt}
        </button>
      ))}
      {options.length > CHIP_PREVIEW && (
        <button
          type="button"
          onClick={onMore}
          className="cursor-pointer rounded-full border border-gold/40 px-3 py-1.5 text-[12.5px] font-bold text-gold transition hover:bg-gold/10"
        >
          Voir plus ({options.length})
        </button>
      )}
    </div>
  );
}

function LiveCard({ live, onPlay }: { live: PastLive; onPlay: () => void }) {
  return (
    <button type="button" onClick={onPlay} className="group block w-full cursor-pointer text-left">
      <div className="relative aspect-video overflow-hidden rounded-xl ring-1 ring-white/10 transition group-hover:ring-gold/60">
        <SmartImage
          src={live.thumbnail}
          alt={live.title}
          fallback={IMG_FALLBACK}
          sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 380px"
          skeletonClassName="bg-white/5"
          className="size-full"
        />
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/55 to-transparent" />
        <span className="absolute inset-0 m-auto flex size-14 items-center justify-center rounded-full bg-white/15 opacity-0 backdrop-blur-md transition group-hover:opacity-100">
          <Play className="ml-0.5 size-6 fill-white text-white" />
        </span>
        {live.duration && (
          <span className="absolute right-2 bottom-2 rounded bg-black/65 px-1.5 py-0.5 text-[11px] font-bold text-white">{live.duration}</span>
        )}
      </div>
      <h3 className="mt-2.5 line-clamp-2 text-[14.5px] leading-snug font-semibold text-white/90 transition group-hover:text-gold">{live.title}</h3>
      <p className="mt-1 flex items-center gap-2 text-[12px] font-semibold text-white/45">
        <span>{live.dateLabel}</span>
        <span className="size-[3px] rounded-full bg-white/30" />
        <span className="flex items-center gap-1"><Eye className="size-3" /> {live.views.toLocaleString("fr-FR")}</span>
      </p>
    </button>
  );
}

function Dot({ label }: { label: string }) {
  return (<span className="flex items-center gap-1.5"><span className="size-[3px] rounded-full bg-white/40" /> {label}</span>);
}
