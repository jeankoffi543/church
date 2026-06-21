"use client";

import "mapbox-gl/dist/mapbox-gl.css";

import { useEffect, useRef, useState } from "react";
import type { Map as MbMap, Marker as MbMarker } from "mapbox-gl";
import { MapPin, Search, Loader2, Crosshair } from "lucide-react";

import { cn } from "@/lib/utils";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
const MAP_STYLE = "mapbox://styles/mapbox/streets-v12";
const ABIDJAN: [number, number] = [-4.008, 5.353];

export type LocationValue = {
  address: string;
  latitude: number | null;
  longitude: number | null;
  zone?: string | null;
};

type Suggestion = { id: string; label: string; lng: number; lat: number; zone: string | null };

/* ── Mapbox Geocoding v6 helpers ─────────────────────────────────────── */

type GeoFeature = {
  id?: string;
  properties?: {
    mapbox_id?: string;
    full_address?: string;
    name?: string;
    context?: {
      neighborhood?: { name?: string };
      locality?: { name?: string };
      place?: { name?: string };
      region?: { name?: string };
    };
  };
  geometry?: { coordinates?: [number, number] };
};

function extractZone(f: GeoFeature): string | null {
  const c = f.properties?.context;
  return c?.locality?.name ?? c?.place?.name ?? c?.neighborhood?.name ?? null;
}

async function forwardGeocode(query: string): Promise<Suggestion[]> {
  const url =
    `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(query)}` +
    `&access_token=${MAPBOX_TOKEN}&country=ci&language=fr&limit=5&autocomplete=true` +
    `&proximity=${ABIDJAN[0]},${ABIDJAN[1]}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const json = (await res.json()) as { features?: GeoFeature[] };
  return (json.features ?? [])
    .filter((f) => f.geometry?.coordinates)
    .map((f, i) => ({
      id: f.properties?.mapbox_id ?? f.id ?? String(i),
      label: f.properties?.full_address ?? f.properties?.name ?? "",
      lng: f.geometry!.coordinates![0],
      lat: f.geometry!.coordinates![1],
      zone: extractZone(f),
    }));
}

async function reverseGeocode(lng: number, lat: number): Promise<{ address: string; zone: string | null } | null> {
  const url =
    `https://api.mapbox.com/search/geocode/v6/reverse?longitude=${lng}&latitude=${lat}` +
    `&access_token=${MAPBOX_TOKEN}&language=fr&limit=1`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = (await res.json()) as { features?: GeoFeature[] };
  const f = json.features?.[0];
  if (!f) return null;
  return { address: f.properties?.full_address ?? f.properties?.name ?? "", zone: extractZone(f) };
}

/**
 * Address autocomplete + interactive map picker. Latitude/longitude are
 * read-only and filled automatically from the chosen suggestion or map click.
 */
export function LocationPicker({
  value,
  onChange,
}: {
  value: LocationValue;
  onChange: (next: LocationValue) => void;
}) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [searching, setSearching] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MbMap | null>(null);
  const markerRef = useRef<MbMarker | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Always reach the latest onChange / value from imperative map handlers.
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);
  useEffect(() => {
    onChangeRef.current = onChange;
    valueRef.current = value;
  });

  /* ── Map init (once) ────────────────────────────────────────────── */
  useEffect(() => {
    if (!MAPBOX_TOKEN || !containerRef.current) return;
    let cancelled = false;

    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (cancelled || !containerRef.current) return;
      mapboxgl.accessToken = MAPBOX_TOKEN;

      const start: [number, number] =
        valueRef.current.longitude != null && valueRef.current.latitude != null
          ? [valueRef.current.longitude, valueRef.current.latitude]
          : ABIDJAN;

      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: MAP_STYLE,
        center: start,
        zoom: valueRef.current.latitude != null ? 14 : 11,
        attributionControl: false,
      });
      mapRef.current = map;
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

      const marker = new mapboxgl.Marker({ color: "#e2b85f", draggable: true });
      markerRef.current = marker;
      if (valueRef.current.latitude != null && valueRef.current.longitude != null) {
        marker.setLngLat([valueRef.current.longitude, valueRef.current.latitude]).addTo(map);
      }

      const commit = async (lng: number, lat: number) => {
        marker.setLngLat([lng, lat]).addTo(map);
        const round = (n: number) => Math.round(n * 1e7) / 1e7;
        const rev = await reverseGeocode(lng, lat);
        onChangeRef.current({
          address: rev?.address || valueRef.current.address,
          latitude: round(lat),
          longitude: round(lng),
          zone: rev?.zone ?? valueRef.current.zone ?? null,
        });
      };

      map.on("click", (e) => void commit(e.lngLat.lng, e.lngLat.lat));
      marker.on("dragend", () => {
        const ll = marker.getLngLat();
        void commit(ll.lng, ll.lat);
      });

      map.on("load", () => setTimeout(() => map.resize(), 60));
    })();

    return () => {
      cancelled = true;
      markerRef.current?.remove();
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  /* ── Keep marker/map in sync when coords change via suggestions ──── */
  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;
    if (value.latitude != null && value.longitude != null) {
      marker.setLngLat([value.longitude, value.latitude]).addTo(map);
      map.flyTo({ center: [value.longitude, value.latitude], zoom: 14, essential: true });
    }
  }, [value.latitude, value.longitude]);

  /* ── Address autocomplete ───────────────────────────────────────── */
  const handleAddressChange = (text: string) => {
    onChange({ ...value, address: text });
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!MAPBOX_TOKEN || text.trim().length < 3) {
      setSuggestions([]);
      setSuggestOpen(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const results = await forwardGeocode(text.trim());
      setSuggestions(results);
      setSuggestOpen(results.length > 0);
      setSearching(false);
    }, 320);
  };

  const pickSuggestion = (s: Suggestion) => {
    setSuggestOpen(false);
    setSuggestions([]);
    onChange({
      address: s.label,
      latitude: Math.round(s.lat * 1e7) / 1e7,
      longitude: Math.round(s.lng * 1e7) / 1e7,
      zone: s.zone,
    });
  };

  return (
    <div className="space-y-3">
      {/* Address with autocomplete */}
      <label className="relative flex flex-col gap-2">
        <span className="text-xs font-bold text-body-strong uppercase tracking-wide">
          Adresse complète (Quartier...) *
        </span>
        <div className="flex items-center gap-2.5 rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-4 py-3 focus-within:border-gold">
          <Search className="size-4 shrink-0 text-faint" />
          <input
            type="text"
            required
            value={value.address}
            onChange={(e) => handleAddressChange(e.target.value)}
            onFocus={() => suggestions.length > 0 && setSuggestOpen(true)}
            onBlur={() => setTimeout(() => setSuggestOpen(false), 150)}
            placeholder="ex: Yopougon, Cité Ficgayo, Rue des Bananiers"
            autoComplete="off"
            className="w-full bg-transparent text-sm text-indigo outline-none placeholder:text-faint"
          />
          {searching && <Loader2 className="size-4 shrink-0 animate-spin text-faint" />}
        </div>

        {suggestOpen && suggestions.length > 0 && (
          <div className="absolute top-full z-50 mt-1 w-full overflow-hidden rounded-xl border border-[rgba(40,25,80,0.1)] bg-white shadow-[0_12px_40px_rgba(22,15,51,0.14)]">
            {suggestions.map((s) => (
              <button
                key={s.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  pickSuggestion(s);
                }}
                className="flex w-full cursor-pointer items-start gap-2 px-3.5 py-2.5 text-left text-sm text-indigo transition hover:bg-cream"
              >
                <MapPin className="mt-0.5 size-3.5 shrink-0 text-gold-dark" />
                <span className="leading-snug">{s.label}</span>
              </button>
            ))}
          </div>
        )}
      </label>

      {/* Map picker */}
      <div className="relative h-60 overflow-hidden rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#eef0f4]">
        <div ref={containerRef} className="absolute inset-0 size-full" />
        {MAPBOX_TOKEN ? (
          <div className="pointer-events-none absolute top-2 left-2 z-10 flex items-center gap-1.5 rounded-lg bg-white/90 px-2.5 py-1.5 text-[11px] font-bold text-indigo shadow-sm backdrop-blur-sm">
            <Crosshair className="size-3.5 text-gold-dark" />
            Cliquez ou déplacez le repère
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-xs text-body">
            Configurez <code className="mx-1 rounded bg-white px-1 font-mono">NEXT_PUBLIC_MAPBOX_TOKEN</code> pour la carte.
          </div>
        )}
      </div>

      {/* Read-only coordinates (auto-filled) */}
      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-xs font-bold text-body-strong uppercase tracking-wide">Latitude</span>
          <input
            type="text"
            readOnly
            disabled
            value={value.latitude ?? ""}
            placeholder="Auto"
            className={cn(
              "w-full cursor-not-allowed rounded-xl border border-[rgba(40,25,80,0.1)] bg-[#eceaf2] px-4 py-3 font-mono text-sm text-faint outline-none"
            )}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-xs font-bold text-body-strong uppercase tracking-wide">Longitude</span>
          <input
            type="text"
            readOnly
            disabled
            value={value.longitude ?? ""}
            placeholder="Auto"
            className="w-full cursor-not-allowed rounded-xl border border-[rgba(40,25,80,0.1)] bg-[#eceaf2] px-4 py-3 font-mono text-sm text-faint outline-none"
          />
        </label>
      </div>
    </div>
  );
}
