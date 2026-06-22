"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef, useState } from "react";
import type { Map as MbMap, Marker as MbMarker, Popup as MbPopup } from "mapbox-gl";
import { MapPin, Phone, Clock, Search, Navigation, AlertCircle, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
const MAP_STYLE = "mapbox://styles/mapbox/light-v11";
const DEFAULT_CENTER: [number, number] = [-4.0083, 5.3684]; // Center of Abidjan

export interface Branch {
  id: string;
  title: string;
  address: string;
  phone: string;
  hours: string;
  lat: number;
  lng: number;
  description: string;
  website?: string;
}

export const BRANCHES: Branch[] = [
  {
    id: "yopougon",
    title: "Temple Principal - Yopougon Ficgayo",
    address: "Yopougon Ficgayo, face au terrain, Abidjan",
    phone: "+225 07 00 00 00 00",
    hours: "Dimanche 09h00 (Culte) · Mardi 18h30 · Vendredi 22h00",
    lat: 5.3484,
    lng: -4.0622,
    description: "Le quartier général régional, un lieu de réveil, de prière de combat et de délivrance.",
    website: "https://mfmficgayo.org",
  },
  {
    id: "cocody",
    title: "Campus Cocody - Angré",
    address: "Cocody Angré, Nouveau CHU, Abidjan",
    phone: "+225 07 01 02 03 04",
    hours: "Dimanche 08h00 (Culte) · Mercredi 18h30",
    lat: 5.4025,
    lng: -3.9789,
    description: "Une assemblée dynamique de louange et de communion fraternelle pour les familles de l'Est d'Abidjan.",
    website: "https://mfmficgayo.org/cocody",
  },
  {
    id: "bingerville",
    title: "Campus Bingerville",
    address: "Route de Bingerville, face Cité, Abidjan",
    phone: "+225 07 05 06 07 08",
    hours: "Dimanche 09h30 (Culte) · Jeudi 18h00",
    lat: 5.3564,
    lng: -3.8967,
    description: "Un espace paisible et propice à l'enseignement de la Parole et au renforcement spirituel.",
  },
  {
    id: "abobo",
    title: "Campus Abobo",
    address: "Abobo Gendarmerie, non loin du rond-point, Abidjan",
    phone: "+225 07 09 10 11 12",
    hours: "Dimanche 10h00 (Culte) · Mardi 18h00",
    lat: 5.4211,
    lng: -4.0156,
    description: "Un campus accueillant, centré sur la prière d'intercession et l'évangélisation communautaire.",
    website: "https://mfmficgayo.org/abobo",
  },
];

export function BranchesSplitScreen() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MbMap | null>(null);
  const markersRef = useRef<{ [id: string]: { marker: MbMarker; popup: MbPopup } }>({});
  
  const [search, setSearch] = useState("");
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const filtered = BRANCHES.filter((b) =>
    b.title.toLowerCase().includes(search.toLowerCase()) ||
    b.address.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (!MAPBOX_TOKEN) {
      setMapError("Token Mapbox non configuré (NEXT_PUBLIC_MAPBOX_TOKEN manquant).");
      return;
    }

    if (!containerRef.current) return;
    let cancelled = false;

    (async () => {
      try {
        const mapboxgl = (await import("mapbox-gl")).default;
        if (cancelled || !containerRef.current) return;
        mapboxgl.accessToken = MAPBOX_TOKEN;

        const map = new mapboxgl.Map({
          container: containerRef.current,
          style: MAP_STYLE,
          center: DEFAULT_CENTER,
          zoom: 11.5,
          attributionControl: false,
          cooperativeGestures: true,
        });

        mapRef.current = map;
        map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");
        map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-left");

        map.on("load", () => {
          if (cancelled) return;
          setIsLoaded(true);

          setTimeout(() => {
            if (!cancelled) map.resize();
          }, 100);

          // Add markers for each branch
          BRANCHES.forEach((branch) => {
            const el = document.createElement("div");
            el.className =
              "relative flex size-9 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-gold to-gold-dark shadow-[0_6px_16px_rgba(200,144,46,0.45)] cursor-pointer transition-all duration-300 hover:scale-110";
            
            el.innerHTML = `
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" class="text-indigo">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
                <path d="M12 5v3M10.5 6.5h3"/>
              </svg>
            `;

            const popup = new mapboxgl.Popup({
              closeButton: false,
              closeOnClick: false,
              offset: 28,
              className: "mfm-popup",
              focusAfterOpen: false,
            }).setHTML(`
              <div class="w-[200px] rounded-2xl border border-white/10 bg-[#160f33] p-3.5 text-cream shadow-[0_12px_30px_rgba(22,15,51,0.35)]">
                <span class="text-[9px] font-bold tracking-widest text-[#e2b85f] uppercase font-sans">Campus MFM</span>
                <h4 class="mt-0.5 font-display text-[13px] font-bold italic leading-snug text-cream">${branch.title}</h4>
                <p class="mt-1.5 text-[11px] leading-snug text-cream/70">${branch.address}</p>
              </div>
            `);

            const marker = new mapboxgl.Marker({ element: el })
              .setLngLat([branch.lng, branch.lat])
              .setPopup(popup)
              .addTo(map);

            // Handle marker click to highlight branch in list
            el.addEventListener("click", () => {
              setActiveBranchId(branch.id);
              const element = document.getElementById(`branch-card-${branch.id}`);
              element?.scrollIntoView({ behavior: "smooth", block: "nearest" });
            });

            markersRef.current[branch.id] = { marker, popup };
          });
        });
      } catch (err) {
        console.error("Mapbox initialization error:", err);
        setMapError("Erreur d'initialisation de la carte Mapbox.");
      }
    })();

    return () => {
      cancelled = true;
      Object.values(markersRef.current).forEach(({ marker }) => marker.remove());
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  const handleBranchClick = (branch: Branch) => {
    setActiveBranchId(branch.id);
    
    // Close other popups
    Object.entries(markersRef.current).forEach(([id, { popup }]) => {
      if (id === branch.id) {
        popup.addTo(mapRef.current!);
      } else {
        popup.remove();
      }
    });

    mapRef.current?.flyTo({
      center: [branch.lng, branch.lat],
      zoom: 14.5,
      essential: true,
      duration: 1500,
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] h-[calc(100vh-72px)] overflow-hidden bg-cream">
      {/* Sidebar List */}
      <div className="flex flex-col h-full bg-white border-r border-[rgba(40,25,80,0.08)] overflow-hidden">
        {/* Sidebar Header */}
        <div className="p-6 border-b border-[rgba(40,25,80,0.06)]">
          <span className="text-[10px] font-bold tracking-wider text-gold-dark uppercase">
            Géolocalisation
          </span>
          <h2 className="font-display text-2xl font-bold text-indigo italic leading-tight mt-1">
            Nos campus & branches
          </h2>
          <p className="text-xs text-body mt-1">
            Trouvez une assemblée MFM Ficgayo proche de votre localité.
          </p>
          
          {/* Search bar */}
          <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-[rgba(40,25,80,0.1)] bg-cream px-3 py-2 text-xs">
            <Search className="size-4 text-faint" />
            <input
              type="text"
              placeholder="Rechercher un campus ou lieu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-[13px] text-indigo outline-none placeholder:text-faint bg-transparent border-none"
            />
          </div>
        </div>

        {/* Sidebar Cards */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {filtered.map((branch) => {
            const isActive = activeBranchId === branch.id;
            return (
              <div
                key={branch.id}
                id={`branch-card-${branch.id}`}
                onClick={() => handleBranchClick(branch)}
                className={cn(
                  "group relative cursor-pointer select-none rounded-[20px] border p-5 transition-all duration-300",
                  isActive
                    ? "border-gold bg-indigo text-white shadow-lg shadow-indigo-mid/10"
                    : "border-[rgba(40,25,80,0.08)] bg-white text-indigo hover:border-gold hover:shadow-md"
                )}
              >
                <h3 className={cn(
                  "font-display text-lg leading-tight font-bold italic",
                  isActive ? "text-white" : "text-indigo"
                )}>
                  {branch.title}
                </h3>
                <p className={cn(
                  "text-xs leading-relaxed mt-2",
                  isActive ? "text-white/80" : "text-body"
                )}>
                  {branch.description}
                </p>

                <div className="mt-4 pt-3 border-t border-dashed border-[rgba(40,25,80,0.08)] space-y-2 text-xs">
                  <div className="flex items-start gap-2">
                    <MapPin className={cn("size-3.5 mt-0.5 shrink-0", isActive ? "text-gold" : "text-gold-dark")} />
                    <span>{branch.address}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock className={cn("size-3.5 mt-0.5 shrink-0", isActive ? "text-gold" : "text-gold-dark")} />
                    <span>{branch.hours}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Phone className={cn("size-3.5 mt-0.5 shrink-0", isActive ? "text-gold" : "text-gold-dark")} />
                    <a href={`tel:${branch.phone.replace(/\s/g, "")}`} className="hover:underline">
                      {branch.phone}
                    </a>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div>
                    {branch.website && (
                      <a
                        href={branch.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        title="Visiter le site web"
                        className={cn(
                          "flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition",
                          isActive
                            ? "text-gold hover:bg-white/10"
                            : "text-indigo-mid hover:bg-cream"
                        )}
                      >
                        <Globe className="size-3.5" />
                        Site web
                      </a>
                    )}
                  </div>

                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${branch.lat},${branch.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold transition",
                      isActive
                        ? "bg-gold text-indigo hover:brightness-105"
                        : "bg-cream text-indigo hover:bg-gold/10"
                    )}
                  >
                    <Navigation className="size-3" />
                    J&apos;y vais
                  </a>
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="py-12 text-center text-xs text-body">
              Aucun campus trouvé pour votre recherche.
            </div>
          )}
        </div>
      </div>

      {/* Map pane */}
      <div className="relative h-full bg-cream flex flex-col items-center justify-center">
        {mapError ? (
          <div className="p-6 text-center max-w-md">
            <AlertCircle className="size-10 text-red-500 mx-auto mb-3" />
            <h3 className="font-bold text-red-800 text-base">Carte de géolocalisation indisponible</h3>
            <p className="text-xs text-red-600 mt-1">{mapError}</p>
          </div>
        ) : (
          <>
            {!isLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-cream/70 z-10">
                <div className="size-10 animate-spin rounded-full border-4 border-gold border-t-transparent" />
              </div>
            )}
            <div ref={containerRef} className="absolute inset-0 size-full" />
          </>
        )}
      </div>
    </div>
  );
}
