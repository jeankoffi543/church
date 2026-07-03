import type { StudioSettings } from "@/lib/studio";

/**
 * Shared visual constants for the Live Studio inspector. Option `value`s use the
 * REAL `StudioSettings` enum members (not the mockup's shorthand) so they bind
 * straight to the existing broadcast logic.
 */

/** Tailwind class for the broadcast monospace face (JetBrains Mono). */
export const MONO = "font-studio-mono";

export const COLOR_SWATCHES = ["#ffffff", "#e2b85f", "#b270ff", "#34d399", "#160f33"] as const;

/** Text-colour gradient presets (CSS strings — rendered on the DOM overlay and
 *  the program-out canvas alike). */
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

export const PREDEFINED_POSITIONS: {
  value: StudioSettings["predefinedPosition"];
  label: string;
}[] = [
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

export const CONTAINER_SHAPES: {
  value: StudioSettings["containerShape"];
  label: string;
}[] = [
  { value: "rounded_rectangle", label: "Rectangle arrondi" },
  { value: "rectangle", label: "Rectangle droit" },
  { value: "capsule", label: "Capsule" },
  { value: "asymmetric", label: "Asymétrique" },
  { value: "transparent", label: "Transparent" },
];

export const BORDER_STYLES: {
  value: StudioSettings["containerBorderStyle"];
  label: string;
}[] = [
  { value: "solid", label: "Plein" },
  { value: "dashed", label: "Pointillé" },
  { value: "glow", label: "Néon (glow)" },
  { value: "none", label: "Aucun" },
];

export const ANIM_OPTIONS: { value: StudioSettings["animation"]; label: string }[] = [
  { value: "none", label: "Aucune animation" },
  { value: "clip_reveal", label: "Déploiement (clip)" },
  { value: "fade_slide", label: "Fondu & glissement" },
  { value: "scale", label: "Zoom" },
  { value: "slide_left", label: "Glissement gauche" },
  { value: "slide_right", label: "Glissement droite" },
  { value: "neon_slide", label: "Néon glissé" },
  { value: "typewriter", label: "Machine à écrire" },
  { value: "scroll_left", label: "Défil. Horizontal (← Gauche)" },
  { value: "scroll_right", label: "Défil. Horizontal (→ Droite)" },
  { value: "scroll_up", label: "Défil. Vertical (↑ Haut)" },
  { value: "scroll_down", label: "Défil. Vertical (↓ Bas)" },
];

export const EASING_OPTIONS: { value: StudioSettings["animEasing"]; label: string }[] = [
  { value: "ease-out", label: "Ease-out" },
  { value: "ease-in", label: "Ease-in" },
  { value: "ease-in-out", label: "Ease-in-out" },
  { value: "linear", label: "Linéaire" },
  { value: "bounce", label: "Rebond" },
];

/** The inspector "Style Pro" tab ids, matching the orchestrator's `styleTab`. */
export const STYLE_TABS: { id: "layout" | "typo" | "container" | "anim" | "presets"; label: string }[] = [
  { id: "layout", label: "Mise en page" },
  { id: "typo", label: "Typo" },
  { id: "container", label: "Cadre" },
  { id: "anim", label: "Anim" },
  { id: "presets", label: "Presets" },
];

/** Typography target elements (reference / verse body / version code). */
export const TYPO_ELEMENTS: { id: "fontRef" | "fontBody" | "fontVer"; label: string }[] = [
  { id: "fontRef", label: "Référence" },
  { id: "fontBody", label: "Verset" },
  { id: "fontVer", label: "Version" },
];
