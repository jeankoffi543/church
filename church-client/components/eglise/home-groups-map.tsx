"use client";

import "mapbox-gl/dist/mapbox-gl.css";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Map as MbMap, Marker as MbMarker, Popup as MbPopup } from "mapbox-gl";
import {
  ArrowRight,
  MapPin,
  Clock,
  X,
  Compass,
  Search,
  List,
  Map as MapIcon,
  Users,
  Plus,
  Check,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { type HomeGroup } from "@/lib/data";
import { cn } from "@/lib/utils";
import { ABIDJAN_CENTER, buildZonePolygons } from "@/components/eglise/map-utils";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
const MAP_STYLE = "mapbox://styles/mapbox/light-v11";
// Zones shown inline before collapsing the rest behind the "Voir plus" sheet.
const ZONES_INLINE = 6;
const ZONE_PAGE_SIZE = 10;

/** A group, or the "general / find a group near me" intent. */
export type JoinTarget = HomeGroup | "general";

/* ── Imperatively-created custom marker (Tailwind classes kept as literals
   so the JIT compiler emits them) ─────────────────────────────────────── */
function createMarkerElement(): { root: HTMLButtonElement; pin: HTMLSpanElement } {
  const root = document.createElement("button");
  root.type = "button";
  root.className = "block cursor-pointer";

  const pin = document.createElement("span");
  pin.className =
    "flex size-9 items-center justify-center rounded-full bg-[#e2b85f] text-[#160f33] shadow-[0_6px_16px_rgba(200,144,46,0.5)] ring-2 ring-white transition-transform duration-200";
  pin.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9"/></svg>';

  root.appendChild(pin);
  return { root, pin };
}

function popupHtml(group: HomeGroup): string {
  const when = group.when || `${group.day ?? ""} ${group.time ?? ""}`.trim();
  return `
    <div class="w-[230px] overflow-hidden rounded-2xl border border-white/10 bg-[#160f33] p-4 text-cream shadow-[0_18px_50px_rgba(22,15,51,0.5)]">
      <span class="text-[9px] font-bold tracking-widest text-[#e2b85f] uppercase">${group.zone ?? "Cellule"}</span>
      <h4 class="mt-0.5 font-display text-lg font-bold italic leading-tight text-cream">${group.name}</h4>
      <p class="mt-1 text-[11px] text-[#9a8fb5]">Responsable · ${group.leader || "Non assigné"}</p>
      <p class="mt-0.5 text-[11px] text-[#9a8fb5]">${when}</p>
      <button class="js-join mt-3 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-[#e2b85f] to-[#c8902e] px-3 py-2 text-[12px] font-extrabold text-[#160f33] transition hover:brightness-105">
        S'inscrire / Rejoindre
      </button>
    </div>`;
}

/**
 * Premium split-screen cartography (Airbnb/Mapbox style): a filterable sidebar
 * on the left and an interactive Mapbox map on the right. It is purely
 * presentational — joining is delegated to the parent through `onJoin`.
 */
export function HomeGroupsMap({
  groups,
  onJoin,
}: {
  groups: HomeGroup[];
  onJoin: (target: JoinTarget) => void;
}) {
  const [search, setSearch] = useState("");
  const [zoneFilter, setZoneFilter] = useState<string | null>(null);
  const [dayFilter, setDayFilter] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "map">("list");
  const [zoneSheetOpen, setZoneSheetOpen] = useState(false);
  const [zonePage, setZonePage] = useState(1);
  const [mapReady, setMapReady] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MbMap | null>(null);
  const popupRef = useRef<MbPopup | null>(null);
  // All currently-rendered markers. Rebuilt from scratch on every filter change
  // so no "ghost" marker for a filtered-out cell ever lingers on the map.
  const markersRef = useRef<{ id: number | null; marker: MbMarker; pin: HTMLElement; root: HTMLElement }[]>([]);
  // Stable indirections so imperatively-created markers/popups always reach the
  // latest handlers without being recreated.
  const markerClickRef = useRef<(g: HomeGroup) => void>(() => {});
  const onJoinRef = useRef(onJoin);
  const activeIdRef = useRef<number | null>(activeId);

  const zones = useMemo(
    () => Array.from(new Set(groups.map((g) => g.zone).filter(Boolean))) as string[],
    [groups]
  );
  const days = useMemo(
    () => Array.from(new Set(groups.map((g) => g.day).filter(Boolean))) as string[],
    [groups]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return groups.filter((g) => {
      const matchesSearch =
        !q || [g.name, g.leader, g.area, g.zone].some((v) => v?.toLowerCase().includes(q));
      const matchesZone = !zoneFilter || g.zone === zoneFilter;
      const matchesDay = !dayFilter || g.day === dayFilter;
      return matchesSearch && matchesZone && matchesDay;
    });
  }, [groups, search, zoneFilter, dayFilter]);

  const filteredKey = filtered.map((g) => g.id ?? g.name).join("|");

  const flyTo = useCallback((g: HomeGroup) => {
    if (typeof g.lat !== "number" || typeof g.lng !== "number") return;
    mapRef.current?.flyTo({ center: [g.lng, g.lat], zoom: 15, speed: 1.2, curve: 1.4, essential: true });
  }, []);

  const openPopup = useCallback(async (g: HomeGroup) => {
    const map = mapRef.current;
    if (!map || typeof g.lat !== "number" || typeof g.lng !== "number") return;
    const mapboxgl = (await import("mapbox-gl")).default;

    popupRef.current?.remove();
    const node = document.createElement("div");
    node.innerHTML = popupHtml(g);
    node.querySelector(".js-join")?.addEventListener("click", () => {
      popupRef.current?.remove();
      onJoinRef.current(g);
    });

    popupRef.current = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: true,
      offset: 22,
      className: "mfm-popup",
      maxWidth: "260px",
      // Don't focus the popup on open — that focus makes the browser scroll the
      // whole page to bring the popup into view.
      focusAfterOpen: false,
    })
      .setLngLat([g.lng, g.lat])
      .setDOMContent(node)
      .addTo(map);
  }, []);

  const handleSelectCard = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>, g: HomeGroup) => {
      // Block any native navigation/submit + bubbling that could jump the page.
      e.preventDefault();
      e.stopPropagation();
      // Drop focus from the card so the browser doesn't scroll it into view.
      e.currentTarget.blur();
      setActiveId(g.id ?? null);
      flyTo(g);
      void openPopup(g);
      setMobileView("map");
    },
    [flyTo, openPopup]
  );

  // Keep indirections current.
  useEffect(() => {
    onJoinRef.current = onJoin;
    activeIdRef.current = activeId;
    markerClickRef.current = (g) => {
      setActiveId(g.id ?? null);
      flyTo(g);
      void openPopup(g);
    };
  });

  /* ── Map init (once) ────────────────────────────────────────────── */
  useEffect(() => {
    if (!MAPBOX_TOKEN || !containerRef.current) return;
    let cancelled = false;

    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (cancelled || !containerRef.current) return;
      mapboxgl.accessToken = MAPBOX_TOKEN;

      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: MAP_STYLE,
        center: ABIDJAN_CENTER,
        zoom: 11.5,
        attributionControl: false,
        cooperativeGestures: true,
      });
      mapRef.current = map;
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");
      map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-left");

      map.on("load", () => {
        if (cancelled) return;
        // Empty source up-front; markers + polygons are (re)built per filter.
        map.addSource("zones", { type: "geojson", data: buildZonePolygons([]) });
        map.addLayer({
          id: "zones-fill",
          type: "fill",
          source: "zones",
          paint: { "fill-color": ["get", "color"], "fill-opacity": 0.15 },
        });
        map.addLayer({
          id: "zones-line",
          type: "line",
          source: "zones",
          paint: { "line-color": ["get", "color"], "line-width": 1.5, "line-opacity": 0.5 },
        });
        setMapReady(true);
      });
    })();

    return () => {
      cancelled = true;
      popupRef.current?.remove();
      markersRef.current.forEach(({ marker }) => marker.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // Map initialises once; data layers react to filters in the effect below.
  }, []);

  /* ── Rebuild markers + zone polygons whenever the filter changes ──
     Every marker is removed and recreated from the filtered set so no ghost
     marker survives a filter that empties its zone. ─────────────────────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    let cancelled = false;

    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (cancelled || !mapRef.current) return;

      // 1. Tear down every existing marker.
      popupRef.current?.remove();
      markersRef.current.forEach(({ marker }) => marker.remove());
      markersRef.current = [];

      // 2. Rebuild strictly from the filtered, geo-located cells.
      const visible = filtered.filter(
        (g): g is HomeGroup & { lat: number; lng: number } =>
          typeof g.lat === "number" && typeof g.lng === "number"
      );

      for (const g of visible) {
        const { root, pin } = createMarkerElement();
        // Prevent the marker button from stealing focus (which would scroll
        // the page) and block native bubbling.
        root.addEventListener("mousedown", (e) => e.preventDefault());
        root.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          markerClickRef.current(g);
        });
        const marker = new mapboxgl.Marker({ element: root, anchor: "bottom" })
          .setLngLat([g.lng, g.lat])
          .addTo(map);
        if (g.id != null && g.id === activeIdRef.current) {
          pin.classList.add("scale-125", "ring-[#160f33]");
          root.style.zIndex = "10";
        }
        markersRef.current.push({ id: g.id ?? null, marker, pin, root });
      }

      // 3. Sync the zone "sector blob" polygons to the same filtered set so
      //    empty quartiers lose their coloured circle too.
      const source = map.getSource("zones") as
        | { setData?: (data: unknown) => void }
        | undefined;
      source?.setData?.(buildZonePolygons(visible));
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, filteredKey]);

  /* ── Active marker highlight (no rebuild on hover) ──────────────── */
  useEffect(() => {
    markersRef.current.forEach(({ id, pin, root }) => {
      const active = id != null && id === activeId;
      pin.classList.toggle("scale-125", active);
      pin.classList.toggle("ring-[#160f33]", active);
      root.style.zIndex = active ? "10" : "1";
    });
  }, [activeId]);

  /* ── Resize when the map (re)appears on mobile ──────────────────── */
  useEffect(() => {
    if (mobileView === "map") {
      const t = setTimeout(() => mapRef.current?.resize(), 60);
      return () => clearTimeout(t);
    }
  }, [mobileView]);

  // Zone sheet pagination (10 per page).
  const zonePageCount = Math.max(1, Math.ceil(zones.length / ZONE_PAGE_SIZE));
  const zoneCurrentPage = Math.min(zonePage, zonePageCount);
  const pagedZones = zones.slice((zoneCurrentPage - 1) * ZONE_PAGE_SIZE, zoneCurrentPage * ZONE_PAGE_SIZE);

  const pickZone = (z: string | null) => {
    setZoneFilter(z);
    setZoneSheetOpen(false);
  };

  return (
    <>
      {/* Mobile view toggle */}
      <div className="mb-4 flex items-center gap-1.5 rounded-xl border border-[rgba(40,25,80,0.1)] bg-white p-1 md:hidden">
        {(["list", "map"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setMobileView(v)}
            className={cn(
              "flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition",
              mobileView === v ? "bg-indigo text-white shadow-sm" : "text-body hover:bg-cream hover:text-indigo"
            )}
          >
            {v === "list" ? <List className="size-4" /> : <MapIcon className="size-4" />}
            {v === "list" ? "Vue Liste" : "Vue Carte"}
          </button>
        ))}
      </div>

      <div className="grid gap-0 overflow-hidden rounded-[24px] border border-[rgba(40,25,80,0.1)] bg-white shadow-[0_1px_3px_rgba(22,15,51,0.05)] md:h-[640px] md:grid-cols-3">
        {/* ── Sidebar ──────────────────────────────────────────────── */}
        <aside
          className={cn(
            "flex min-h-0 flex-col md:col-span-1 md:border-r md:border-[rgba(40,25,80,0.08)]",
            mobileView === "map" && "hidden md:flex"
          )}
        >
          <div className="space-y-3 border-b border-[rgba(40,25,80,0.08)] p-4">
            <div className="flex items-center gap-2.5 rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-3.5 py-2.5 focus-within:border-gold">
              <Search className="size-4 shrink-0 text-faint" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Quartier, responsable, rue…"
                className="w-full bg-transparent text-sm text-indigo outline-none placeholder:text-faint"
              />
              {search && (
                <button onClick={() => setSearch("")} className="cursor-pointer text-faint hover:text-indigo">
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {zones.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <FilterBadge active={zoneFilter === null} onClick={() => setZoneFilter(null)}>
                  Toutes zones
                </FilterBadge>
                {zones.slice(0, ZONES_INLINE).map((z) => (
                  <FilterBadge key={z} active={zoneFilter === z} onClick={() => setZoneFilter(zoneFilter === z ? null : z)}>
                    {z}
                  </FilterBadge>
                ))}
                {/* When a zone hidden by the inline cap is selected, surface it. */}
                {zoneFilter && !zones.slice(0, ZONES_INLINE).includes(zoneFilter) && (
                  <FilterBadge active onClick={() => setZoneFilter(null)}>
                    {zoneFilter}
                  </FilterBadge>
                )}
                {zones.length > ZONES_INLINE && (
                  <button
                    type="button"
                    onClick={() => {
                      setZonePage(1);
                      setZoneSheetOpen(true);
                    }}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-dashed border-gold/50 bg-gold/5 px-3 py-1 text-[11px] font-bold text-gold-dark transition hover:bg-gold/10"
                  >
                    <Plus className="size-3" /> Voir plus ({zones.length})
                  </button>
                )}
              </div>
            )}

            {/* Aesthetic separator between zones and days */}
            {zones.length > 0 && days.length > 0 && (
              <div className="flex items-center gap-2 py-0.5" aria-hidden="true">
                <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[rgba(40,25,80,0.12)]" />
                <span className="size-1 rotate-45 rounded-[1px] bg-gold/60" />
                <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[rgba(40,25,80,0.12)]" />
              </div>
            )}

            {days.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <FilterBadge active={dayFilter === null} onClick={() => setDayFilter(null)} variant="day">
                  Tous les jours
                </FilterBadge>
                {days.map((d) => (
                  <FilterBadge key={d} active={dayFilter === d} onClick={() => setDayFilter(dayFilter === d ? null : d)} variant="day">
                    {d}
                  </FilterBadge>
                ))}
              </div>
            )}
          </div>

          <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-4">
            <p className="px-1 text-[11px] font-bold tracking-wide text-faint uppercase">
              {filtered.length} cellule{filtered.length > 1 ? "s" : ""}
            </p>
            {filtered.map((g) => {
              const isActive = g.id != null && g.id === activeId;
              return (
                <button
                  key={g.id ?? g.name}
                  type="button"
                  onClick={(e) => handleSelectCard(e, g)}
                  onMouseEnter={() => setActiveId(g.id ?? null)}
                  className={cn(
                    "w-full rounded-[14px] border bg-white p-4 text-left transition-all duration-200",
                    isActive
                      ? "border-gold shadow-[0_12px_30px_rgba(200,144,46,0.18)]"
                      : "border-[rgba(40,25,80,0.08)] hover:border-gold/50 hover:shadow-[0_10px_24px_rgba(22,15,51,0.08)]"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-[15px] font-bold text-indigo">{g.name}</h3>
                    {g.zone && (
                      <span className="shrink-0 rounded-full bg-indigo/5 px-2 py-0.5 text-[10px] font-bold text-indigo">
                        {g.zone}
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-body">
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3.5 text-gold-dark" /> {g.area}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="size-3.5 text-gold-dark" /> {g.when || `${g.day ?? ""} ${g.time ?? ""}`.trim()}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[11.5px] text-faint">Responsable · {g.leader || "Non assigné"}</span>
                    <span
                      role="button"
                      tabIndex={-1}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onJoin(g);
                      }}
                      className="flex cursor-pointer items-center gap-1 text-[12px] font-bold text-indigo-mid transition hover:text-gold"
                    >
                      Rejoindre <ArrowRight className="size-3.5" />
                    </span>
                  </div>
                </button>
              );
            })}

            {filtered.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <Users className="size-8 text-gold/40" />
                <p className="text-sm font-semibold text-body-strong">Aucune cellule trouvée</p>
                <p className="max-w-[220px] text-xs text-body">
                  Essaie une autre zone, un autre jour, ou trouve un groupe près de chez toi.
                </p>
              </div>
            )}
          </div>

          <div className="border-t border-[rgba(40,25,80,0.08)] p-4">
            <button
              onClick={() => onJoin("general")}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo py-3 text-sm font-bold text-white transition hover:bg-indigo-mid"
            >
              <Compass className="size-4" /> Trouver un groupe près de chez moi
            </button>
          </div>
        </aside>

        {/* ── Map ──────────────────────────────────────────────────── */}
        <div
          className={cn(
            "relative min-h-[460px] md:col-span-2 md:min-h-0",
            mobileView === "list" && "hidden md:block"
          )}
        >
          <div ref={containerRef} className="absolute inset-0 size-full" />
          {!MAPBOX_TOKEN && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-lilac-200 to-lilac-300 p-6 text-center">
              <MapIcon className="size-9 text-indigo-mid/50" />
              <p className="max-w-xs text-sm font-semibold text-indigo">Carte interactive indisponible</p>
              <p className="max-w-xs text-xs text-body">
                Configurez <code className="rounded bg-white/60 px-1 font-mono text-[11px]">NEXT_PUBLIC_MAPBOX_TOKEN</code>{" "}
                pour activer la cartographie des cellules.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Zone picker sheet (paginated, 10 per page) ───────────────── */}
      <Sheet open={zoneSheetOpen} onOpenChange={setZoneSheetOpen}>
        <SheetContent
          side="right"
          className="w-[90vw] gap-0 bg-white p-0 sm:max-w-sm"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <SheetHeader className="border-b border-[rgba(40,25,80,0.08)] p-5">
            <SheetTitle className="font-display text-xl font-bold text-indigo italic">
              Filtrer par zone
            </SheetTitle>
            <SheetDescription className="text-xs text-body">
              {zones.length} zone{zones.length > 1 ? "s" : ""} · choisissez un secteur.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-3">
            <button
              type="button"
              onClick={() => pickZone(null)}
              className={cn(
                "flex w-full cursor-pointer items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-bold transition",
                zoneFilter === null ? "bg-indigo text-white" : "text-indigo hover:bg-cream"
              )}
            >
              Toutes zones
              {zoneFilter === null && <Check className="size-4" />}
            </button>
            {pagedZones.map((z) => (
              <button
                key={z}
                type="button"
                onClick={() => pickZone(z)}
                className={cn(
                  "mt-1.5 flex w-full cursor-pointer items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-semibold transition",
                  zoneFilter === z ? "bg-gold text-indigo" : "text-indigo hover:bg-cream"
                )}
              >
                <span className="flex items-center gap-2">
                  <MapPin className="size-4 text-gold-dark" /> {z}
                </span>
                {zoneFilter === z && <Check className="size-4" />}
              </button>
            ))}
          </div>

          {zonePageCount > 1 && (
            <div className="flex items-center justify-between gap-3 border-t border-[rgba(40,25,80,0.08)] p-4">
              <button
                type="button"
                onClick={() => setZonePage((p) => Math.max(1, p - 1))}
                disabled={zoneCurrentPage <= 1}
                className="flex size-9 cursor-pointer items-center justify-center rounded-lg border border-[rgba(40,25,80,0.12)] text-indigo transition hover:border-gold disabled:cursor-not-allowed disabled:opacity-35"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="text-xs font-bold text-body">
                Page {zoneCurrentPage} / {zonePageCount}
              </span>
              <button
                type="button"
                onClick={() => setZonePage((p) => Math.min(zonePageCount, p + 1))}
                disabled={zoneCurrentPage >= zonePageCount}
                className="flex size-9 cursor-pointer items-center justify-center rounded-lg border border-[rgba(40,25,80,0.12)] text-indigo transition hover:border-gold disabled:cursor-not-allowed disabled:opacity-35"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function FilterBadge({
  active,
  onClick,
  children,
  variant = "zone",
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  variant?: "zone" | "day";
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded-full px-3 py-1 text-[11px] font-bold transition",
        active
          ? variant === "zone"
            ? "bg-indigo text-white shadow-sm"
            : "bg-gold text-indigo shadow-sm"
          : "border border-[rgba(40,25,80,0.12)] bg-white text-body hover:border-gold hover:text-indigo"
      )}
    >
      {children}
    </button>
  );
}
