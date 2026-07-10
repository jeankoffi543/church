// Effect registry for the Anim gallery (CHR-128) — the native mirror of
// church-client/lib/studio-animations.tsx. The web keeps three implementations
// per effect (framer-motion DOM variants + program-out canvas math + the
// per-source availability rule); here we port the GALLERY-facing metadata
// (id/label/hint/category/availability) plus a lightweight CSS `preview`
// archetype for the hover glyph. The actual on-air render is the engine's
// animate_layer (compositor-pad transforms, CHR-110) — the pad-mappable subset;
// richer 3D/loop/reveal effects degrade gracefully there.

export type AnimSourceKind =
  | "bible"
  | "text"
  | "song"
  | "image"
  | "camera"
  | "screen"
  | "video"
  | "embed"
  | "group";

// Per-source availability (faithful to the web rules).
const forAll = (): boolean => true;
const TEXTY = new Set<AnimSourceKind>(["bible", "text", "song"]);
const forTextyOrImage = (k: AnimSourceKind): boolean => TEXTY.has(k) || k === "image";
const forTextOnly = (k: AnimSourceKind): boolean => k === "text";

export type AnimCategoryId =
  | "essentiels"
  | "glissements"
  | "rotations"
  | "3d"
  | "revelations"
  | "texte"
  | "boucles";

export const ANIM_CATEGORIES: { id: AnimCategoryId; label: string }[] = [
  { id: "essentiels", label: "Essentiels" },
  { id: "glissements", label: "Glissements" },
  { id: "rotations", label: "Rotations" },
  { id: "3d", label: "3D" },
  { id: "revelations", label: "Révélations" },
  { id: "texte", label: "Texte" },
  { id: "boucles", label: "Boucles" },
];

// CSS preview archetype for the hover glyph (see .fxp-* in index.css).
export type PreviewFx =
  | "none" | "fade" | "fadeslide" | "scale" | "zoomout" | "pop" | "blur"
  | "slideL" | "slideR" | "slideU" | "slideD" | "drop" | "roll"
  | "rotate" | "spin" | "swirl" | "flipx" | "flipy" | "door" | "swing" | "tilt"
  | "spin3d" | "window" | "reveal" | "revealU" | "revealD" | "split" | "iris"
  | "wipe" | "type" | "scrollx" | "scrollxr" | "scrolly" | "scrollyd"
  | "pulse" | "float" | "sway" | "ripple" | "heartbeat" | "spinloop";

export type AnimEffect = {
  id: string;
  label: string;
  hint: string;
  category: AnimCategoryId;
  also?: AnimCategoryId[];
  loop?: boolean;
  unavailableHint?: string;
  availableFor: (kind: AnimSourceKind) => boolean;
  preview: PreviewFx;
};

const TEXT_ONLY_HINT = "Bandeau défilant — sources Texte uniquement.";

export const ANIM_EFFECTS: AnimEffect[] = [
  // ── Essentiels ──
  { id: "none", label: "Aucune animation", hint: "Apparition immédiate, sans effet.", category: "essentiels", availableFor: forAll, preview: "none" },
  { id: "fade", label: "Fondu", hint: "Simple fondu d'opacité.", category: "essentiels", availableFor: forAll, preview: "fade" },
  { id: "fade_slide", label: "Fondu & glissement", hint: "Fondu avec une légère montée.", category: "essentiels", availableFor: forAll, preview: "fadeslide" },
  { id: "scale", label: "Zoom avant", hint: "Grandit depuis un léger retrait.", category: "essentiels", availableFor: forAll, preview: "scale" },
  { id: "zoom_out", label: "Zoom arrière", hint: "Se pose depuis un léger avant-plan.", category: "essentiels", availableFor: forAll, preview: "zoomout" },
  { id: "pop", label: "Pop élastique", hint: "Rebond élastique à l'entrée.", category: "essentiels", availableFor: forAll, preview: "pop" },
  { id: "blur_in", label: "Fondu flouté", hint: "Fondu avec mise au point.", category: "essentiels", availableFor: forAll, preview: "blur" },
  { id: "ripple", label: "Goutte d'eau", hint: "Onde d'apparition en cercle.", category: "essentiels", availableFor: forAll, preview: "ripple" },

  // ── Glissements ──
  { id: "slide_left", label: "Glissement gauche", hint: "Entre depuis la gauche.", category: "glissements", availableFor: forAll, preview: "slideL" },
  { id: "slide_right", label: "Glissement droite", hint: "Entre depuis la droite.", category: "glissements", availableFor: forAll, preview: "slideR" },
  { id: "slide_up", label: "Glissement montant", hint: "Entre depuis le bas.", category: "glissements", availableFor: forAll, preview: "slideU" },
  { id: "slide_down", label: "Glissement descendant", hint: "Entre depuis le haut.", category: "glissements", availableFor: forAll, preview: "slideD" },
  { id: "drop_in", label: "Chute & rebond", hint: "Tombe du haut avec rebond.", category: "glissements", availableFor: forAll, preview: "drop" },
  { id: "neon_slide", label: "Néon glissé", hint: "Glissement avec halo néon.", category: "glissements", availableFor: forAll, preview: "slideL" },
  { id: "slide_blur_up", label: "Montée floutée", hint: "Monte en se défloutant.", category: "glissements", availableFor: forAll, preview: "slideU" },
  { id: "roll_in_left", label: "Roulé (gauche)", hint: "Roule depuis la gauche.", category: "glissements", also: ["rotations"], availableFor: forAll, preview: "roll" },

  // ── Rotations ──
  { id: "rotate_in", label: "Rotation 2D", hint: "Pivote en apparaissant.", category: "rotations", availableFor: forAll, preview: "rotate" },
  { id: "spin_in", label: "Rotation 360°", hint: "Un tour complet à l'entrée.", category: "rotations", availableFor: forAll, preview: "spin" },
  { id: "swirl_in", label: "Spirale", hint: "Spirale en grandissant.", category: "rotations", availableFor: forAll, preview: "swirl" },

  // ── 3D ──
  { id: "flip_x", label: "Volet 3D vertical", hint: "Bascule sur l'axe horizontal.", category: "3d", availableFor: forAll, preview: "flipx" },
  { id: "flip_y", label: "Volet 3D horizontal", hint: "Bascule sur l'axe vertical.", category: "3d", availableFor: forAll, preview: "flipy" },
  { id: "door", label: "Porte 3D", hint: "S'ouvre comme une porte.", category: "3d", availableFor: forAll, preview: "door" },
  { id: "swing_in", label: "Balancier 3D", hint: "Se balance depuis le haut.", category: "3d", availableFor: forAll, preview: "swing" },
  { id: "tilt_in", label: "Perspective inclinée", hint: "Se redresse en perspective.", category: "3d", availableFor: forAll, preview: "tilt" },
  { id: "spin3d_loop", label: "Rotation 3D continue", hint: "Tourne en 3D sans fin.", category: "3d", also: ["boucles"], loop: true, availableFor: forAll, preview: "spin3d" },
  { id: "window_loop", label: "Fenêtre 3D", hint: "Oscille comme une fenêtre.", category: "3d", also: ["boucles"], loop: true, availableFor: forAll, preview: "window" },

  // ── Révélations ──
  { id: "clip_reveal", label: "Rideau gauche → droite", hint: "Se dévoile de gauche à droite.", category: "revelations", availableFor: forAll, preview: "reveal" },
  { id: "reveal_up", label: "Rideau montant", hint: "Se dévoile vers le haut.", category: "revelations", availableFor: forAll, preview: "revealU" },
  { id: "split_center", label: "Rideau central", hint: "S'ouvre depuis le centre.", category: "revelations", availableFor: forAll, preview: "split" },
  { id: "iris", label: "Iris circulaire", hint: "Ouverture en cercle.", category: "revelations", availableFor: forAll, preview: "iris" },
  { id: "reveal_down", label: "Rideau descendant", hint: "Se dévoile vers le bas.", category: "revelations", availableFor: forAll, preview: "revealD" },
  { id: "wipe_left", label: "Balayage droite → gauche", hint: "Balaye de droite à gauche.", category: "revelations", availableFor: forAll, preview: "wipe" },

  // ── Texte ──
  { id: "typewriter", label: "Machine à écrire", hint: "Révèle le texte caractère par caractère.", category: "texte", availableFor: forTextyOrImage, unavailableHint: "Nécessite du texte à révéler (ou une image, en balayage).", preview: "type" },
  { id: "scroll_left", label: "Défil. horizontal (← gauche)", hint: "Bandeau défilant vers la gauche.", category: "texte", loop: true, availableFor: forTextOnly, unavailableHint: TEXT_ONLY_HINT, preview: "scrollx" },
  { id: "scroll_right", label: "Défil. horizontal (→ droite)", hint: "Bandeau défilant vers la droite.", category: "texte", loop: true, availableFor: forTextOnly, unavailableHint: TEXT_ONLY_HINT, preview: "scrollxr" },
  { id: "scroll_up", label: "Défil. vertical (↑ haut)", hint: "Bandeau défilant vers le haut.", category: "texte", loop: true, availableFor: forTextOnly, unavailableHint: TEXT_ONLY_HINT, preview: "scrolly" },
  { id: "scroll_down", label: "Défil. vertical (↓ bas)", hint: "Bandeau défilant vers le bas.", category: "texte", loop: true, availableFor: forTextOnly, unavailableHint: TEXT_ONLY_HINT, preview: "scrollyd" },

  // ── Boucles ──
  { id: "rotate_loop", label: "Rotation continue", hint: "Tourne sans fin.", category: "boucles", also: ["rotations"], loop: true, availableFor: forAll, preview: "spinloop" },
  { id: "pulse_loop", label: "Pulsation", hint: "Grandit et rétrécit doucement.", category: "boucles", loop: true, availableFor: forAll, preview: "pulse" },
  { id: "float_loop", label: "Flottement", hint: "Monte et descend en douceur.", category: "boucles", loop: true, availableFor: forAll, preview: "float" },
  { id: "sway_loop", label: "Balancement", hint: "Se balance de gauche à droite.", category: "boucles", also: ["rotations"], loop: true, availableFor: forAll, preview: "sway" },
  { id: "ripple_loop", label: "Onde (goutte d'eau)", hint: "Onde répétée en cercle.", category: "boucles", also: ["essentiels"], loop: true, availableFor: forAll, preview: "ripple" },
  { id: "heartbeat_loop", label: "Battement", hint: "Double battement de cœur.", category: "boucles", loop: true, availableFor: forAll, preview: "heartbeat" },
];

export function animInCategory(fx: AnimEffect, cat: AnimCategoryId): boolean {
  return fx.category === cat || (fx.also?.includes(cat) ?? false);
}

const FALLBACK = ANIM_EFFECTS[0];
export function getAnimEffect(id: string | undefined): AnimEffect {
  return ANIM_EFFECTS.find((e) => e.id === id) ?? FALLBACK;
}

export const EASING_OPTIONS: { value: string; label: string }[] = [
  { value: "ease-out", label: "Ease-out" },
  { value: "ease-in", label: "Ease-in" },
  { value: "ease-in-out", label: "Ease-in-out" },
  { value: "linear", label: "Linéaire" },
  { value: "bounce", label: "Rebond" },
  { value: "back-out", label: "Dépassement (back)" },
];

// The layer kind → AnimSourceKind (audio never reaches the Anim tab).
export function animKind(kind: string): AnimSourceKind {
  return (kind === "audio" ? "text" : kind) as AnimSourceKind;
}
