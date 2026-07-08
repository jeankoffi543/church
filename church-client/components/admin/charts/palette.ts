/**
 * Chart color tokens — validated categorical palette (dataviz skill:
 * scripts/validate_palette.js "#b8790a,#6a56b0,#7a4fd6,#1f8a5b,#c86a3e" --mode light
 * → lightness band PASS, chroma floor PASS, CVD separation PASS, contrast PASS).
 * Assign in this fixed order — never cycled, never reassigned when a filter
 * changes which categories are present.
 */
export const CATEGORICAL_COLORS = [
  "#b8790a", // 1 — gold (brand accent)
  "#6a56b0", // 2 — indigo-violet
  "#7a4fd6", // 3 — violet
  "#1f8a5b", // 4 — teal-green
  "#c86a3e", // 5 — terracotta
] as const;

/** Reserved — never reused for a plain category. */
export const STATUS_COLORS = {
  good: "#1f8a5b", // matches --color-online family
  warning: "#c8902e", // matches --color-gold-dark
  critical: "#d22f2f", // matches --color-live-dark
} as const;

/** One-step-off-surface hairline for gridlines/axes — recessive, never dashed. */
export const CHART_GRID_COLOR = "rgba(40, 25, 80, 0.08)";
export const CHART_AXIS_TEXT_COLOR = "#9a93ad"; // --color-faint
export const CHART_SURFACE = "#ffffff";

/** Stable color per giving nature, so the legend never repaints as filters change. */
export const NATURE_COLORS: Record<string, string> = {
  dime: CATEGORICAL_COLORS[0],
  offrande: CATEGORICAL_COLORS[1],
  projet: CATEGORICAL_COLORS[2],
  missions: CATEGORICAL_COLORS[3],
  autre: CATEGORICAL_COLORS[4],
};

export function colorForNature(nature: string, fallbackIndex = 0): string {
  return NATURE_COLORS[nature] ?? CATEGORICAL_COLORS[fallbackIndex % CATEGORICAL_COLORS.length];
}

export const NATURE_LABELS: Record<string, string> = {
  dime: "Dîme",
  offrande: "Offrande",
  projet: "Projet",
  missions: "Missions",
  autre: "Autre",
};

export function labelForNature(nature: string): string {
  return NATURE_LABELS[nature] ?? nature.charAt(0).toUpperCase() + nature.slice(1);
}

export const CHANNEL_COLORS: Record<string, string> = {
  en_ligne: CATEGORICAL_COLORS[0],
  especes: CATEGORICAL_COLORS[1],
};

export const CHANNEL_LABELS: Record<string, string> = {
  en_ligne: "En ligne",
  especes: "Espèces (culte)",
};
