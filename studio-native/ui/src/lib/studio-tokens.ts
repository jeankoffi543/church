// Ported 1:1 from church-client studio-tokens.ts — the inspector's option lists.
export const COLOR_SWATCHES = ["#ffffff", "#e2b85f", "#b270ff", "#34d399", "#160f33"] as const;

export const TEXT_GRADIENTS = [
  "linear-gradient(90deg, #e2b85f, #fff3c4)",
  "linear-gradient(90deg, #b270ff, #6c5ce7)",
  "linear-gradient(90deg, #34d399, #22d3ee)",
  "linear-gradient(90deg, #ff6b6b, #ffd93d)",
  "linear-gradient(135deg, #f6d365, #fda085)",
] as const;

export const FONT_OPTIONS = [
  "Cormorant Garamond",
  "Plus Jakarta Sans",
  "Playfair Display",
  "Montserrat",
  "Outfit",
  "Roboto",
  "Inter",
  "Georgia",
] as const;

export const WEIGHT_OPTIONS: { value: string; label: string }[] = [
  { value: "300", label: "300 · Light" },
  { value: "400", label: "400 · Regular" },
  { value: "500", label: "500 · Medium" },
  { value: "600", label: "600 · Semibold" },
  { value: "700", label: "700 · Bold" },
  { value: "800", label: "800 · Extrabold" },
];

export const PREDEFINED_POSITIONS: { value: string; label: string }[] = [
  { value: "centered_bottom", label: "Centré bas" },
  { value: "centered_top", label: "Centré haut" },
  { value: "lower_third_left", label: "Tiers bas gauche" },
  { value: "lower_third_right", label: "Tiers bas droite" },
  { value: "ticker", label: "Bandeau bas (ticker)" },
  { value: "banner_top", label: "Bandeau haut" },
  { value: "full_screen_cinema", label: "Plein écran cinéma" },
  { value: "full_screen", label: "Plein écran (bord à bord)" },
  { value: "pip_top_left", label: "Incrustation haut gauche" },
  { value: "pip_top_right", label: "Incrustation haut droite" },
  { value: "pip_bottom_left", label: "Incrustation bas gauche" },
  { value: "pip_bottom_right", label: "Incrustation bas droite" },
];

export const CONTAINER_SHAPES: { value: string; label: string }[] = [
  { value: "rounded_rectangle", label: "Rectangle arrondi" },
  { value: "rectangle", label: "Rectangle droit" },
  { value: "capsule", label: "Capsule" },
  { value: "asymmetric", label: "Asymétrique" },
  { value: "transparent", label: "Transparent" },
];

export const BORDER_STYLES: { value: string; label: string }[] = [
  { value: "solid", label: "Plein" },
  { value: "dashed", label: "Pointillé" },
  { value: "glow", label: "Néon (glow)" },
  { value: "none", label: "Aucun" },
];

export const TYPO_ELEMENTS: { id: "fontRef" | "fontBody" | "fontVer"; label: string }[] = [
  { id: "fontRef", label: "Référence" },
  { id: "fontBody", label: "Verset" },
  { id: "fontVer", label: "Version" },
];

// Cubic-bezier presets (church-client EASING_BEZIER) — for the easing curve SVG.
export const EASING_BEZIER: Record<string, [number, number, number, number]> = {
  linear: [0, 0, 1, 1],
  "ease-in": [0.42, 0, 1, 1],
  "ease-out": [0, 0, 0.58, 1],
  "ease-in-out": [0.42, 0, 0.58, 1],
  bounce: [0.175, 0.885, 0.32, 1.275],
  "back-out": [0.34, 1.56, 0.64, 1],
};
