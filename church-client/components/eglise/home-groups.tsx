"use client";

import "mapbox-gl/dist/mapbox-gl.css";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Map as MbMap, Marker as MbMarker, Popup as MbPopup } from "mapbox-gl";
import {
  ArrowRight,
  MapPin,
  Clock,
  Check,
  X,
  Loader2,
  Compass,
  Search,
  List,
  Map as MapIcon,
  Users,
} from "lucide-react";

import { HOME_GROUPS, type HomeGroup } from "@/lib/data";
import { cn } from "@/lib/utils";
import {
  ABIDJAN_CENTER,
  buildZonePolygons,
  withCoords,
} from "@/components/eglise/map-utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BrandButton } from "@/components/ui/brand-button";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
const MAP_STYLE = "mapbox://styles/mapbox/light-v11";

type Selection = HomeGroup | "general" | null;

/* ── Custom marker DOM element (Tailwind classes kept as literals so the
   JIT compiler picks them up even though the node is created imperatively) ── */
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
  return `
    <div class="w-[230px] overflow-hidden rounded-2xl border border-white/10 bg-[#160f33] p-4 text-cream shadow-[0_18px_50px_rgba(22,15,51,0.5)]">
      <span class="text-[9px] font-bold tracking-widest text-[#e2b85f] uppercase">${group.zone ?? "Cellule"}</span>
      <h4 class="mt-0.5 font-display text-lg font-bold italic leading-tight text-cream">${group.name}</h4>
      <p class="mt-1 text-[11px] text-[#9a8fb5]">Responsable · ${group.leader}</p>
      <p class="mt-0.5 text-[11px] text-[#9a8fb5]">${group.when || `${group.day ?? ""} ${group.time ?? ""}`.trim()}</p>
      <button class="js-join mt-3 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-[#e2b85f] to-[#c8902e] px-3 py-2 text-[12px] font-extrabold text-[#160f33] transition hover:brightness-105">
        S'inscrire / Rejoindre
      </button>
    </div>`;
}

export function HomeGroups({ groups = HOME_GROUPS }: { groups?: HomeGroup[] }) {
  /* ── Filters & UI state ─────────────────────────────────────────── */
  const [search, setSearch] = useState("");
  const [zoneFilter, setZoneFilter] = useState<string | null>(null);
  const [dayFilter, setDayFilter] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "map">("list");

  /* ── Join dialog ────────────────────────────────────────────────── */
  const [selection, setSelection] = useState<Selection>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  /* ── Map refs ───────────────────────────────────────────────────── */
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MbMap | null>(null);
  const popupRef = useRef<MbPopup | null>(null);
  const markersRef = useRef<Map<number, { marker: MbMarker; pin: HTMLElement; root: HTMLElement }>>(
    new Map()
  );
  // Stable indirections so imperatively-created markers/popups always reach the
  // latest handlers without being recreated.
  const markerClickRef = useRef<(g: HomeGroup) => void>(() => {});
  const openJoinRef = useRef<(g: HomeGroup) => void>(() => {});

  /* ── Derived data ───────────────────────────────────────────────── */
  const located = useMemo(() => withCoords(groups), [groups]);

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
        !q ||
        [g.name, g.leader, g.area, g.zone].some((v) => v?.toLowerCase().includes(q));
      const matchesZone = !zoneFilter || g.zone === zoneFilter;
      const matchesDay = !dayFilter || g.day === dayFilter;
      return matchesSearch && matchesZone && matchesDay;
    });
  }, [groups, search, zoneFilter, dayFilter]);

  const filteredKey = filtered.map((g) => g.id ?? g.name).join("|");

  /* ── Actions ────────────────────────────────────────────────────── */
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
      openJoinRef.current(g);
    });

    popupRef.current = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: true,
      offset: 22,
      className: "mfm-popup",
      maxWidth: "260px",
    })
      .setLngLat([g.lng, g.lat])
      .setDOMContent(node)
      .addTo(map);
  }, []);

  const openJoin = useCallback((g: HomeGroup) => setSelection(g), []);

  const handleSelectCard = useCallback(
    (g: HomeGroup) => {
      setActiveId(g.id ?? null);
      flyTo(g);
      void openPopup(g);
      setMobileView("map");
    },
    [flyTo, openPopup]
  );

  // Keep the indirections current.
  useEffect(() => {
    markerClickRef.current = (g) => {
      setActiveId(g.id ?? null);
      flyTo(g);
      void openPopup(g);
    };
    openJoinRef.current = openJoin;
  });

  /* ── Map init (once) ────────────────────────────────────────────── */
  useEffect(() => {
    if (!MAPBOX_TOKEN || !containerRef.current) return;
    let cancelled = false;
    const markers = markersRef.current;

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

        // Zone "sector blob" polygons.
        const zonePolygons = buildZonePolygons(groups);
        if (zonePolygons.features.length > 0) {
          map.addSource("zones", { type: "geojson", data: zonePolygons });
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
        }

        // Custom markers.
        for (const g of located) {
          const { root, pin } = createMarkerElement();
          root.addEventListener("click", (e) => {
            e.stopPropagation();
            markerClickRef.current(g);
          });
          const marker = new mapboxgl.Marker({ element: root, anchor: "bottom" })
            .setLngLat([g.lng, g.lat])
            .addTo(map);
          if (typeof g.id === "number") {
            markers.set(g.id, { marker, pin, root });
          }
        }
      });
    })();

    return () => {
      cancelled = true;
      popupRef.current?.remove();
      markers.forEach(({ marker }) => marker.remove());
      markers.clear();
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // groups/located are stable (server data); init must run once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Marker visibility follows the active filters ───────────────── */
  useEffect(() => {
    const visibleIds = new Set(filtered.map((g) => g.id));
    markersRef.current.forEach(({ root }, id) => {
      root.style.display = visibleIds.has(id) ? "" : "none";
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredKey]);

  /* ── Active marker highlight ────────────────────────────────────── */
  useEffect(() => {
    markersRef.current.forEach(({ pin, root }, id) => {
      const active = id === activeId;
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

  /* ── Join form submit (placeholder, as designed) ────────────────── */
  const open = selection !== null;
  const group = selection && selection !== "general" ? selection : null;

  const onOpenChange = (next: boolean) => {
    if (!next) setSelection(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const label = group ? `la ${group.name}` : "un groupe de maison";
      setSelection(null);
      setToast(
        `Merci ! Ta demande pour rejoindre ${label} a bien été reçue. Un responsable te contactera très vite.`
      );
      setTimeout(() => setToast(null), 4500);
    }, 1400);
  };

  /* ── Render ─────────────────────────────────────────────────────── */
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

      <div className="grid gap-4 overflow-hidden rounded-[24px] border border-[rgba(40,25,80,0.1)] bg-white shadow-[0_1px_3px_rgba(22,15,51,0.05)] md:h-[640px] md:grid-cols-3">
        {/* ── Sidebar ──────────────────────────────────────────────── */}
        <aside
          className={cn(
            "flex min-h-0 flex-col md:col-span-1 md:border-r md:border-[rgba(40,25,80,0.08)]",
            mobileView === "map" && "hidden md:flex"
          )}
        >
          {/* Search + filters */}
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

            {/* Zone badges */}
            {zones.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <FilterBadge active={zoneFilter === null} onClick={() => setZoneFilter(null)}>
                  Toutes zones
                </FilterBadge>
                {zones.map((z) => (
                  <FilterBadge key={z} active={zoneFilter === z} onClick={() => setZoneFilter(zoneFilter === z ? null : z)}>
                    {z}
                  </FilterBadge>
                ))}
              </div>
            )}

            {/* Day filter */}
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

          {/* Listing */}
          <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-4">
            <p className="px-1 text-[11px] font-bold tracking-wide text-faint uppercase">
              {filtered.length} cellule{filtered.length > 1 ? "s" : ""}
            </p>
            {filtered.map((g) => {
              const isActive = g.id != null && g.id === activeId;
              return (
                <button
                  key={g.id ?? g.name}
                  onClick={() => handleSelectCard(g)}
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
                    <span className="text-[11.5px] text-faint">Responsable · {g.leader}</span>
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        openJoin(g);
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

          {/* General CTA */}
          <div className="border-t border-[rgba(40,25,80,0.08)] p-4">
            <button
              onClick={() => setSelection("general")}
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
              <p className="max-w-xs text-sm font-semibold text-indigo">
                Carte interactive indisponible
              </p>
              <p className="max-w-xs text-xs text-body">
                Configurez <code className="rounded bg-white/60 px-1 font-mono text-[11px]">NEXT_PUBLIC_MAPBOX_TOKEN</code>{" "}
                pour activer la cartographie des cellules.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Join dialog (as designed) ────────────────────────────────── */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[90%] rounded-xl border border-white/10 bg-ink p-6 text-cream shadow-2xl sm:max-w-md">
          <DialogHeader className="gap-1 text-left">
            <span className="text-[10px] font-bold tracking-widest text-gold uppercase">
              Groupe de maison
            </span>
            <DialogTitle className="font-display text-2xl leading-tight font-bold text-cream italic">
              {group ? `Rejoindre : ${group.name}` : "Trouver mon groupe"}
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed text-[#9a8fb5]">
              {group
                ? `${group.area} · ${group.when || `${group.day ?? ""} ${group.time ?? ""}`.trim()} · Responsable ${group.leader}.`
                : "Dis-nous où tu habites, nous t'orientons vers la cellule la plus proche de chez toi."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="mt-2 space-y-4 text-left">
            <Field label="Nom complet">
              <Input required placeholder="Ex: Jean Koffi" className={DARK_FIELD} />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Téléphone">
                <Input type="tel" required placeholder="+225 07 00 00 00" className={DARK_FIELD} />
              </Field>
              <Field label="Quartier">
                <Input required defaultValue={group?.zone ?? group?.area ?? ""} placeholder="Ex: Yopougon" className={DARK_FIELD} />
              </Field>
            </div>
            <Field label="Message (optionnel)">
              <Textarea rows={3} placeholder="Une précision pour le responsable…" className={`${DARK_FIELD} min-h-20 resize-none`} />
            </Field>

            <BrandButton type="submit" disabled={loading} variant="gold" size="full" className="h-12 text-sm font-extrabold">
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Envoi en cours…
                </>
              ) : (
                <>
                  Envoyer ma demande <ArrowRight className="size-4" />
                </>
              )}
            </BrandButton>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Toast ────────────────────────────────────────────────────── */}
      {toast && (
        <div className="fixed right-5 bottom-5 z-[100] w-full max-w-sm px-4 sm:px-0">
          <div className="flex gap-3 rounded-xl border border-gold/30 bg-ink p-4 shadow-[0_12px_40px_rgba(22,15,51,0.5)]">
            <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-gold/20 text-gold">
              <Check className="size-4" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-[13.5px] font-semibold leading-snug text-cream">Demande envoyée</p>
              <p className="mt-1 text-xs leading-normal text-[#9a8fb5]">{toast}</p>
            </div>
            <button
              onClick={() => setToast(null)}
              aria-label="Fermer"
              className="cursor-pointer border-none bg-transparent p-0 text-[#9a8fb5] outline-none transition-colors hover:text-cream"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Small building blocks ──────────────────────────────────────────── */

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

const DARK_FIELD =
  "h-11 rounded-xl border-white/15 bg-white/5 px-4 text-sm text-cream placeholder:text-white/30 focus-visible:border-gold focus-visible:ring-3 focus-visible:ring-gold/30 transition-all";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold tracking-wider text-[#9a8fb5] uppercase">{label}</label>
      {children}
    </div>
  );
}
