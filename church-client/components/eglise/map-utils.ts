// Geometry helpers for the home-groups map: a soft circular "sector blob"
// polygon per zone, plus a distinct colour palette. Kept framework-agnostic and
// type-safe so the map component stays focused on rendering.

import type { HomeGroup } from "@/lib/data";

export const ABIDJAN_CENTER: [number, number] = [-4.008, 5.353];

export const ZONE_PALETTE = [
  "#e2b85f",
  "#7c5cff",
  "#0ea5e9",
  "#10b981",
  "#f97316",
  "#ec4899",
] as const;

export function zoneColor(index: number): string {
  return ZONE_PALETTE[index % ZONE_PALETTE.length];
}

/** Groups that carry usable coordinates. */
export function withCoords(groups: HomeGroup[]): (HomeGroup & { lat: number; lng: number })[] {
  return groups.filter(
    (g): g is HomeGroup & { lat: number; lng: number } =>
      typeof g.lat === "number" && typeof g.lng === "number"
  );
}

type Ring = [number, number][];

/** Build a circle polygon ring around a center, corrected for latitude. */
function circleRing(lng: number, lat: number, radiusDeg: number, steps = 48): Ring {
  const ring: Ring = [];
  const lngScale = 1 / Math.cos((lat * Math.PI) / 180);
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * 2 * Math.PI;
    ring.push([lng + radiusDeg * lngScale * Math.cos(a), lat + radiusDeg * Math.sin(a)]);
  }
  return ring;
}

export type ZoneFeatureCollection = {
  type: "FeatureCollection";
  features: {
    type: "Feature";
    properties: { zone: string; color: string };
    geometry: { type: "Polygon"; coordinates: Ring[] };
  }[];
};

/**
 * Build a semi-transparent "sector blob" polygon per zone, sized to cover the
 * zone's cells (with padding), each in a distinct colour.
 */
export function buildZonePolygons(groups: HomeGroup[]): ZoneFeatureCollection {
  const located = withCoords(groups);
  const byZone = new Map<string, { lat: number; lng: number }[]>();

  for (const g of located) {
    const zone = g.zone ?? "Autres";
    const list = byZone.get(zone) ?? [];
    list.push({ lat: g.lat, lng: g.lng });
    byZone.set(zone, list);
  }

  const features: ZoneFeatureCollection["features"] = [];
  let i = 0;

  for (const [zone, points] of byZone) {
    const centroid = points.reduce(
      (acc, p) => ({ lat: acc.lat + p.lat / points.length, lng: acc.lng + p.lng / points.length }),
      { lat: 0, lng: 0 }
    );
    const maxDist = Math.max(
      0,
      ...points.map((p) => Math.hypot(p.lat - centroid.lat, p.lng - centroid.lng))
    );
    const radius = Math.max(maxDist * 1.5, 0.018);

    features.push({
      type: "Feature",
      properties: { zone, color: zoneColor(i) },
      geometry: { type: "Polygon", coordinates: [circleRing(centroid.lng, centroid.lat, radius)] },
    });
    i++;
  }

  return { type: "FeatureCollection", features };
}
