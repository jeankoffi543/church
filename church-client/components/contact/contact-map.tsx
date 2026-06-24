"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef, useState } from "react";
import type { Map as MbMap, Marker as MbMarker } from "mapbox-gl";
import { MapPin, AlertCircle } from "lucide-react";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
const MAP_STYLE = "mapbox://styles/mapbox/light-v11";
const DEFAULT_CENTER: [number, number] = [-4.0846, 5.3358]; // Yopougon Ficgayo, Abidjan

interface ContactMapProps {
  mapHint?: string;
  lat?: number;
  lng?: number;
}

export function ContactMap({
  mapHint = "Yopougon Ficgayo, Abidjan",
  lat = DEFAULT_CENTER[1],
  lng = DEFAULT_CENTER[0],
}: ContactMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MbMap | null>(null);
  const markerRef = useRef<MbMarker | null>(null);
  // Missing-token is a static condition → derive it as the initial state instead
  // of setting it synchronously inside the effect (same result, no extra render).
  const [mapError, setMapError] = useState<string | null>(
    MAPBOX_TOKEN ? null : "Token Mapbox non configuré (NEXT_PUBLIC_MAPBOX_TOKEN manquant).",
  );
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!MAPBOX_TOKEN) return;
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
          center: [lng, lat],
          zoom: 15,
          attributionControl: false,
          cooperativeGestures: true,
        });

        mapRef.current = map;
        map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");
        map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-left");

        map.on("load", () => {
          if (cancelled) return;
          setIsLoaded(true);
          
          // Trigger a resize after a short delay to ensure correct rendering container size
          setTimeout(() => {
            if (!cancelled) {
              map.resize();
            }
          }, 60);

          // Create a custom element for the marker matching the map theme and styles
          const el = document.createElement("div");
          el.className =
            "relative flex size-10 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-gold to-gold-dark shadow-[0_8px_22px_rgba(200,144,46,0.5)] cursor-pointer transition-all duration-300 hover:scale-110 hover:shadow-[0_12px_26px_rgba(200,144,46,0.65)]";

          // Add a custom church temple SVG icon (house with a cross on top)
          el.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18" class="text-indigo">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
              <path d="M12 5v3M10.5 6.5h3"/>
            </svg>
          `;

          const marker = new mapboxgl.Marker({ element: el })
            .setLngLat([lng, lat])
            .addTo(map);

          const safeHint = mapHint.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
          const popup = new mapboxgl.Popup({
            closeButton: false,
            closeOnClick: false,
            offset: 28, // Clear the size-10 (40px diameter) marker so the description doesn't cover it
            className: "mfm-popup",
            focusAfterOpen: false,
          })
            .setLngLat([lng, lat])
            .setHTML(`
              <div class="w-[180px] rounded-2xl border border-white/10 bg-[#160f33] p-3 text-cream shadow-[0_12px_30px_rgba(22,15,51,0.3)]">
                <span class="text-[9px] font-bold tracking-widest text-[#e2b85f] uppercase font-sans">Notre Église</span>
                <h4 class="mt-0.5 font-display text-[13px] font-bold italic leading-tight text-cream">${safeHint}</h4>
              </div>
            `);

          marker.setPopup(popup);
          marker.togglePopup();

          markerRef.current = marker;
        });
      } catch (err) {
        console.error("Mapbox initialization error:", err);
        setMapError("Erreur d'initialisation de la carte Mapbox.");
      }
    })();

    return () => {
      cancelled = true;
      markerRef.current?.remove();
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // mapHint is intentionally excluded: it only feeds the popup label, and we
    // don't want to tear down & rebuild the whole map when the label changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng]);

  if (mapError) {
    return (
      <div className="relative mt-8 h-[260px] w-full overflow-hidden rounded-[26px] border border-red-200 bg-red-50 flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="size-8 text-red-500 mb-2 animate-bounce" />
        <h3 className="font-bold text-red-800 text-sm">Carte indisponible</h3>
        <p className="text-xs text-red-600 mt-1 max-w-md">{mapError}</p>
        <p className="text-[10px] text-red-400 mt-2 font-mono">
          Vérifie ton fichier .env.local et configure NEXT_PUBLIC_MAPBOX_TOKEN
        </p>
      </div>
    );
  }

  return (
    <div className="relative mt-8 h-[260px] overflow-hidden rounded-[26px] border border-[rgba(40,25,80,0.1)] bg-gradient-to-b from-lilac-200 to-lilac-300">
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-cream/50 z-10">
          <div className="size-8 animate-spin rounded-full border-4 border-gold border-t-transparent" />
        </div>
      )}
      <div ref={containerRef} className="absolute inset-0 size-full" />
      <div className="absolute bottom-4 left-4 flex items-center gap-1.5 rounded-[10px] bg-white/90 px-4 py-2.5 text-[13px] font-bold text-indigo shadow-[0_4px_14px_rgba(22,15,51,0.12)] z-10 pointer-events-none">
        <MapPin className="size-4 text-gold-dark" /> {mapHint}
      </div>
    </div>
  );
}
