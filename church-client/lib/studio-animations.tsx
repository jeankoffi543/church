"use client";

import { motion, type Variants, type Easing } from "framer-motion";

import type { StudioAnimation, StudioSettings } from "./studio";

/**
 * Effect registry — the SINGLE source of truth for every entrance/transition
 * animation of the Live Studio (CHR-56). Each effect carries, side by side:
 *
 *  - `dom`     → framer-motion variants for the DOM renderers (studio preview
 *                monitors in `composite-layer.tsx` AND the public /live bible
 *                overlay in `live-video-overlay.tsx`);
 *  - `canvas`  → the per-frame transform for the program-out compositor
 *                (`program-out-anim.ts` → burned into the Facebook/WHEP feed);
 *  - `availableFor` → the per-source condition (CHR-56 P1): some sources don't
 *                support some effects, and the Anim tab greys those out.
 *
 * Keeping the three implementations co-located per effect is what guarantees
 * preview / antenne / Facebook / /live parity: an effect is added or changed in
 * ONE place. Ids live in `StudioAnimation` (lib/studio.ts) — extend that union
 * first, then register the effect here.
 */

/* ── Source kinds & availability conditions ─────────────────────── */

/** Visual source types an animation can target ("audio" never renders). */
export type AnimSourceKind =
  | "bible"
  | "text"
  | "song"
  | "image"
  | "camera"
  | "video"
  | "embed"
  | "group";

/**
 * Per-source availability rules (CHR-56 P1). One helper per family — add new
 * conditions here when a future effect needs a finer rule (e.g. per-device,
 * per-resolution). Current rationale:
 *
 *  - `forAll`    — pure geometry/opacity transforms work on every visual source
 *                  in both renderers (DOM + canvas).
 *  - `forTextyOrImage` — character-based effects need actual TEXT to reveal
 *                  (bible, text, song); the typewriter also has an image
 *                  adaptation (a swept reveal + cursor, CHR-56 P2), so images
 *                  join the text kinds for it.
 *  - `forTextOnly` (scroll_*) — tickers are implemented as an inner marquee
 *                  only by the TEXT layer (DOM) and `drawScrollLayer` (canvas).
 *                  On bible/song the DOM would loop the whole framed box while
 *                  the canvas scrolls the content — a preview/antenne disparity
 *                  — so they are text-only until an inner-marquee is built for
 *                  those types.
 */
const forAll = (): boolean => true;
const TEXTY: ReadonlySet<AnimSourceKind> = new Set(["bible", "text", "song"]);
const forTextyOrImage = (k: AnimSourceKind): boolean => TEXTY.has(k) || k === "image";
const forTextOnly = (k: AnimSourceKind): boolean => k === "text";

/* ── Easings (shared by both renderers) ─────────────────────────── */

type Cubic = [number, number, number, number];

/** framer-motion easing per name — the DOM side of the easing table. */
export const EASING_MAP: Record<string, Easing> = {
  linear: "linear",
  "ease-in": "easeIn",
  "ease-out": "easeOut",
  "ease-in-out": "easeInOut",
  bounce: [0.175, 0.885, 0.32, 1.275] as Easing,
  "back-out": [0.34, 1.56, 0.64, 1] as Easing,
};

/** cubic-bezier control points per name — the canvas side of the same table. */
export const EASING_BEZIER: Record<string, Cubic> = {
  linear: [0, 0, 1, 1],
  "ease-in": [0.42, 0, 1, 1],
  "ease-out": [0, 0, 0.58, 1],
  "ease-in-out": [0.42, 0, 0.58, 1],
  bounce: [0.175, 0.885, 0.32, 1.275],
  "back-out": [0.34, 1.56, 0.64, 1],
};

export const EASING_OPTIONS: { value: StudioSettings["animEasing"]; label: string }[] = [
  { value: "ease-out", label: "Ease-out" },
  { value: "ease-in", label: "Ease-in" },
  { value: "ease-in-out", label: "Ease-in-out" },
  { value: "linear", label: "Linéaire" },
  { value: "bounce", label: "Rebond" },
  { value: "back-out", label: "Dépassement (back)" },
];

/** True bounce curve (easeOutBounce) — used by drop_in on the canvas so the
 *  burned-in fall matches the DOM keyframes. */
export function easeOutBounce(x: number): number {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (x < 1 / d1) return n1 * x * x;
  if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75;
  if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375;
  return n1 * (x -= 2.625 / d1) * x + 0.984375;
}

/** easeOutBack (overshoot) — the "pop" curve, same on both renderers. */
export function easeOutBack(x: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

/* ── Canvas transform model ─────────────────────────────────────── */

/**
 * The per-frame transform an effect asks the program-out canvas to apply around
 * a layer's draw. All px offsets are PRE-scaled by `k` (canvas px per
 * composition px) by the effect itself. 3D rotations are approximated by the
 * projected cosine scale (scaleX for rotateY, scaleY for rotateX) — visually
 * equivalent for a flat layer.
 */
export type CanvasAnim = {
  alpha: number;
  tx: number;
  ty: number;
  /** Uniform scale (multiplied with scaleX/scaleY). */
  scale: number;
  scaleX?: number;
  scaleY?: number;
  /** 2D rotation in radians around the transform origin. */
  rotate?: number;
  /** Gaussian blur radius in canvas px (ctx.filter). */
  blur?: number;
  /** Transform origin for rotate/scale ("center" by default). */
  origin?: "center" | "left" | "top";
  /** Progressive clip of the layer box. `cursor` draws the typewriter sweep bar. */
  clip?: { kind: "left" | "right" | "up" | "down" | "center" | "iris"; p: number; cursor?: boolean };
  /** Typewriter (text kinds): fraction (0..1) of the body text revealed. */
  reveal?: number;
};

export const CANVAS_ANIM_IDENTITY: CanvasAnim = { alpha: 1, tx: 0, ty: 0, scale: 1 };

/** Inputs handed to an effect's canvas math each frame. */
export type CanvasAnimArgs = {
  /** Eased progress 0..1 (operator's easing curve applied). */
  p: number;
  /** Linear progress 0..1 (for effects with their own curve: pop, drop_in…). */
  raw: number;
  /** Elapsed ms since the entrance started (keeps growing for loops). */
  t: number;
  /** The operator's "Durée de transition" in ms. */
  dur: number;
  /** Canvas px per composition px (offsets must be multiplied by it). */
  k: number;
  /** The layer type being drawn (typewriter branches text vs image). */
  kind: AnimSourceKind;
};

/* ── Effect model ───────────────────────────────────────────────── */

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

export type AnimEffect = {
  id: StudioAnimation;
  label: string;
  /** One-liner shown on the gallery card. */
  hint: string;
  /** Primary category (defines the effect's slot in the "Tous" ordering). */
  category: AnimCategoryId;
  /** Extra categories the effect is ALSO listed under — an effect can be
   *  thematically plural (a continuous 3D rotation belongs to both "3D" and
   *  "Boucles"). This is what keeps every category self-complete: nothing is
   *  reachable only via "Tous". */
  also?: AnimCategoryId[];
  /** Continuous effect: never settles, keeps animating while on air. */
  loop?: boolean;
  /** Why the effect is greyed out when `availableFor` says no. */
  unavailableHint?: string;
  availableFor: (kind: AnimSourceKind) => boolean;
  /** How long the entrance stays active (ms) before settling to identity. */
  activeMs?: (durMs: number, kind: AnimSourceKind) => number;
  /** framer-motion variants (DOM preview monitors + /live bible overlay). */
  dom: (durMs: number, ease: Easing, kind: AnimSourceKind) => Variants;
  /** Per-frame transform for the program-out canvas (Facebook / WHEP). */
  canvas: (a: CanvasAnimArgs) => CanvasAnim;
};

const sec = (ms: number) => ms / 1000;
/** Sweep duration of the image typewriter (min floor so it reads as a sweep). */
const sweepMs = (dur: number) => Math.max(800, dur);
const rad = (deg: number) => (deg * Math.PI) / 180;
/** Loop period from the transition duration, with a comfortable floor. */
const period = (dur: number, mult: number, floor: number) => Math.max(floor, dur * mult);
/** Loops fade in over 300ms so they don't pop on air. */
const loopFade = (t: number) => Math.min(1, t / 300);
/** 0→1→0 triangle over a loop period (for oscillating loops). */
const triangle = (t: number, per: number) => {
  const ph = (t % per) / per;
  return ph < 0.5 ? ph * 2 : 2 - ph * 2;
};
/** Double-beat envelope (0..1) for the heartbeat loop. */
const heartbeat = (ph: number) => {
  const bump = (c: number, w: number) => Math.max(0, 1 - Math.abs(ph - c) / w);
  return Math.max(bump(0.08, 0.08), bump(0.26, 0.08) * 0.82);
};

const EXIT_FADE = { opacity: 0, transition: { duration: 0.3 } };

/* ── The catalogue ──────────────────────────────────────────────── */

const EFFECTS: AnimEffect[] = [
  /* ── Essentiels ── */
  {
    id: "none",
    label: "Aucune animation",
    hint: "Apparition immédiate, sans effet.",
    category: "essentiels",
    availableFor: forAll,
    dom: () => ({ initial: {}, animate: {}, exit: {} }),
    canvas: () => CANVAS_ANIM_IDENTITY,
  },
  {
    id: "fade",
    label: "Fondu",
    hint: "Simple fondu d'opacité.",
    category: "essentiels",
    availableFor: forAll,
    dom: (dur, ease) => ({
      initial: { opacity: 0 },
      animate: { opacity: 1, transition: { duration: sec(dur), ease } },
      exit: EXIT_FADE,
    }),
    canvas: ({ p }) => ({ ...CANVAS_ANIM_IDENTITY, alpha: p }),
  },
  {
    id: "fade_slide",
    label: "Fondu & glissement",
    hint: "Fondu avec une légère montée.",
    category: "essentiels",
    availableFor: forAll,
    dom: (dur, ease) => ({
      initial: { opacity: 0, y: 30 },
      animate: { opacity: 1, y: 0, transition: { duration: sec(dur), ease } },
      exit: { opacity: 0, y: 20, transition: { duration: sec(dur), ease } },
    }),
    canvas: ({ p, k }) => ({ ...CANVAS_ANIM_IDENTITY, alpha: p, ty: 30 * k * (1 - p) }),
  },
  {
    id: "scale",
    label: "Zoom avant",
    hint: "Grossit de 90% à 100%.",
    category: "essentiels",
    availableFor: forAll,
    dom: (dur, ease) => ({
      initial: { opacity: 0, scale: 0.9 },
      animate: { opacity: 1, scale: 1, transition: { duration: sec(dur), ease } },
      exit: { opacity: 0, scale: 0.93, transition: { duration: sec(dur), ease } },
    }),
    canvas: ({ p }) => ({ ...CANVAS_ANIM_IDENTITY, alpha: p, scale: 0.9 + 0.1 * p }),
  },
  {
    id: "zoom_out",
    label: "Zoom arrière",
    hint: "Se pose depuis 115% vers 100%.",
    category: "essentiels",
    availableFor: forAll,
    dom: (dur, ease) => ({
      initial: { opacity: 0, scale: 1.15 },
      animate: { opacity: 1, scale: 1, transition: { duration: sec(dur), ease } },
      exit: { opacity: 0, scale: 1.08, transition: { duration: sec(dur), ease } },
    }),
    canvas: ({ p }) => ({ ...CANVAS_ANIM_IDENTITY, alpha: p, scale: 1.15 - 0.15 * p }),
  },
  {
    id: "pop",
    label: "Pop élastique",
    hint: "Surgit avec un dépassement ressort.",
    category: "essentiels",
    availableFor: forAll,
    // Characterful curve: pop always uses backOut, whatever the easing select.
    dom: (dur) => ({
      initial: { opacity: 0, scale: 0.5 },
      animate: { opacity: 1, scale: 1, transition: { duration: sec(dur), ease: "backOut" } },
      exit: { opacity: 0, scale: 0.6, transition: { duration: 0.25 } },
    }),
    canvas: ({ raw }) => ({
      ...CANVAS_ANIM_IDENTITY,
      alpha: Math.min(1, raw * 2),
      scale: 0.5 + 0.5 * easeOutBack(raw),
    }),
  },
  {
    id: "blur_in",
    label: "Fondu flouté",
    hint: "Se dévoile depuis un flou cinématique.",
    category: "essentiels",
    availableFor: forAll,
    dom: (dur, ease) => ({
      initial: { opacity: 0, filter: "blur(14px)", scale: 1.04 },
      animate: { opacity: 1, filter: "blur(0px)", scale: 1, transition: { duration: sec(dur), ease } },
      exit: { opacity: 0, filter: "blur(8px)", transition: { duration: 0.3 } },
    }),
    canvas: ({ p, k }) => ({
      ...CANVAS_ANIM_IDENTITY,
      alpha: p,
      scale: 1.04 - 0.04 * p,
      blur: 14 * k * (1 - p),
    }),
  },
  {
    id: "ripple",
    label: "Goutte d'eau",
    hint: "Impact qui se propage, comme une goutte sur l'eau.",
    category: "essentiels",
    availableFor: forAll,
    // A drop impact: shrink-in with an elastic overshoot, then settle.
    dom: (dur) => ({
      initial: { opacity: 0, scale: 0.35 },
      animate: {
        opacity: 1,
        scale: [0.35, 1.12, 0.96, 1],
        transition: { duration: sec(dur), times: [0, 0.5, 0.78, 1], ease: "easeOut" },
      },
      exit: { opacity: 0, scale: 1.1, transition: { duration: 0.3 } },
    }),
    canvas: ({ raw }) => ({
      ...CANVAS_ANIM_IDENTITY,
      alpha: Math.min(1, raw * 2),
      scale: 0.35 + 0.65 * easeOutBack(raw),
    }),
  },

  /* ── Glissements ── */
  {
    id: "slide_left",
    label: "Glissement gauche",
    hint: "Entre depuis la gauche.",
    category: "glissements",
    availableFor: forAll,
    dom: (dur, ease) => ({
      initial: { opacity: 0, x: -100 },
      animate: { opacity: 1, x: 0, transition: { duration: sec(dur), ease } },
      exit: { opacity: 0, x: -50, transition: { duration: sec(dur), ease } },
    }),
    canvas: ({ p, k }) => ({ ...CANVAS_ANIM_IDENTITY, alpha: p, tx: -100 * k * (1 - p) }),
  },
  {
    id: "slide_right",
    label: "Glissement droite",
    hint: "Entre depuis la droite.",
    category: "glissements",
    availableFor: forAll,
    dom: (dur, ease) => ({
      initial: { opacity: 0, x: 100 },
      animate: { opacity: 1, x: 0, transition: { duration: sec(dur), ease } },
      exit: { opacity: 0, x: 50, transition: { duration: sec(dur), ease } },
    }),
    canvas: ({ p, k }) => ({ ...CANVAS_ANIM_IDENTITY, alpha: p, tx: 100 * k * (1 - p) }),
  },
  {
    id: "slide_up",
    label: "Glissement montant",
    hint: "Monte depuis le bas du cadre.",
    category: "glissements",
    availableFor: forAll,
    dom: (dur, ease) => ({
      initial: { opacity: 0, y: 100 },
      animate: { opacity: 1, y: 0, transition: { duration: sec(dur), ease } },
      exit: { opacity: 0, y: 60, transition: { duration: sec(dur), ease } },
    }),
    canvas: ({ p, k }) => ({ ...CANVAS_ANIM_IDENTITY, alpha: p, ty: 100 * k * (1 - p) }),
  },
  {
    id: "slide_down",
    label: "Glissement descendant",
    hint: "Descend depuis le haut du cadre.",
    category: "glissements",
    availableFor: forAll,
    dom: (dur, ease) => ({
      initial: { opacity: 0, y: -100 },
      animate: { opacity: 1, y: 0, transition: { duration: sec(dur), ease } },
      exit: { opacity: 0, y: -60, transition: { duration: sec(dur), ease } },
    }),
    canvas: ({ p, k }) => ({ ...CANVAS_ANIM_IDENTITY, alpha: p, ty: -100 * k * (1 - p) }),
  },
  {
    id: "drop_in",
    label: "Chute & rebond",
    hint: "Tombe et rebondit en se posant.",
    category: "glissements",
    availableFor: forAll,
    // Its own bounce curve on both sides (keyframes ≈ easeOutBounce).
    dom: (dur) => ({
      initial: { opacity: 0, y: -240 },
      animate: {
        opacity: 1,
        y: [-240, 0, -60, 0, -18, 0],
        transition: {
          opacity: { duration: sec(dur) * 0.4 },
          y: { duration: sec(dur), times: [0, 0.4, 0.6, 0.78, 0.9, 1], ease: "linear" },
        },
      },
      exit: { opacity: 0, y: 40, transition: { duration: 0.3 } },
    }),
    canvas: ({ raw, k }) => ({
      ...CANVAS_ANIM_IDENTITY,
      alpha: Math.min(1, raw * 2.5),
      ty: -240 * k * (1 - easeOutBounce(raw)),
    }),
  },
  {
    id: "neon_slide",
    label: "Néon glissé",
    hint: "Glisse avec une pointe de zoom.",
    category: "glissements",
    availableFor: forAll,
    dom: (dur, ease) => ({
      initial: { opacity: 0, x: -80, scale: 0.98 },
      animate: { opacity: 1, x: 0, scale: 1, transition: { duration: sec(dur), ease } },
      exit: { opacity: 0, x: 40, scale: 0.98, transition: { duration: sec(dur), ease } },
    }),
    canvas: ({ p, k }) => ({
      ...CANVAS_ANIM_IDENTITY,
      alpha: p,
      tx: -80 * k * (1 - p),
      scale: 0.98 + 0.02 * p,
    }),
  },
  {
    id: "slide_blur_up",
    label: "Montée floutée",
    hint: "Monte depuis le bas avec un flou de mouvement.",
    category: "glissements",
    availableFor: forAll,
    dom: (dur, ease) => ({
      initial: { opacity: 0, y: 120, filter: "blur(10px)" },
      animate: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: sec(dur), ease } },
      exit: { opacity: 0, y: 60, filter: "blur(6px)", transition: { duration: 0.3 } },
    }),
    canvas: ({ p, k }) => ({
      ...CANVAS_ANIM_IDENTITY,
      alpha: p,
      ty: 120 * k * (1 - p),
      blur: 10 * k * (1 - p),
    }),
  },
  {
    id: "roll_in_left",
    label: "Roulé (gauche)",
    hint: "Entre en roulant depuis la gauche.",
    category: "glissements",
    also: ["rotations"],
    availableFor: forAll,
    dom: (dur, ease) => ({
      initial: { opacity: 0, x: -160, rotate: -270 },
      animate: { opacity: 1, x: 0, rotate: 0, transition: { duration: sec(dur), ease } },
      exit: { opacity: 0, x: -80, rotate: -120, transition: { duration: 0.3 } },
    }),
    canvas: ({ p, k }) => ({
      ...CANVAS_ANIM_IDENTITY,
      alpha: p,
      tx: -160 * k * (1 - p),
      rotate: -rad(270) * (1 - p),
    }),
  },

  /* ── Rotations 2D / 360° ── */
  {
    id: "rotate_in",
    label: "Rotation 2D",
    hint: "Pivote d'un quart de tour en entrant.",
    category: "rotations",
    availableFor: forAll,
    dom: (dur, ease) => ({
      initial: { opacity: 0, rotate: -90, scale: 0.8 },
      animate: { opacity: 1, rotate: 0, scale: 1, transition: { duration: sec(dur), ease } },
      exit: { opacity: 0, rotate: 45, scale: 0.85, transition: { duration: 0.3 } },
    }),
    canvas: ({ p }) => ({
      ...CANVAS_ANIM_IDENTITY,
      alpha: p,
      rotate: -rad(90) * (1 - p),
      scale: 0.8 + 0.2 * p,
    }),
  },
  {
    id: "spin_in",
    label: "Rotation 360°",
    hint: "Un tour complet en grossissant.",
    category: "rotations",
    availableFor: forAll,
    dom: (dur, ease) => ({
      initial: { opacity: 0, rotate: -360, scale: 0.3 },
      animate: { opacity: 1, rotate: 0, scale: 1, transition: { duration: sec(dur), ease } },
      exit: { opacity: 0, rotate: 180, scale: 0.4, transition: { duration: 0.35 } },
    }),
    canvas: ({ p }) => ({
      ...CANVAS_ANIM_IDENTITY,
      alpha: p,
      rotate: -rad(360) * (1 - p),
      scale: 0.3 + 0.7 * p,
    }),
  },
  {
    id: "swirl_in",
    label: "Spirale",
    hint: "Surgit du centre en spirale (1,5 tour).",
    category: "rotations",
    availableFor: forAll,
    dom: (dur, ease) => ({
      initial: { opacity: 0, rotate: 540, scale: 0 },
      animate: { opacity: 1, rotate: 0, scale: 1, transition: { duration: sec(dur), ease } },
      exit: { opacity: 0, rotate: 200, scale: 0.2, transition: { duration: 0.35 } },
    }),
    canvas: ({ p }) => ({
      ...CANVAS_ANIM_IDENTITY,
      alpha: p,
      rotate: rad(540) * (1 - p),
      scale: p,
    }),
  },

  /* ── 3D (canvas: projection cosinus) ── */
  {
    id: "flip_x",
    label: "Volet 3D vertical",
    hint: "Bascule autour de l'axe vertical.",
    category: "3d",
    availableFor: forAll,
    dom: (dur, ease) => ({
      initial: { opacity: 0, rotateY: 90, transformPerspective: 1200 },
      animate: { opacity: 1, rotateY: 0, transformPerspective: 1200, transition: { duration: sec(dur), ease } },
      exit: { opacity: 0, rotateY: -60, transformPerspective: 1200, transition: { duration: 0.3 } },
    }),
    canvas: ({ p }) => ({
      ...CANVAS_ANIM_IDENTITY,
      alpha: p,
      scaleX: Math.max(0.001, Math.cos(rad(90) * (1 - p))),
    }),
  },
  {
    id: "flip_y",
    label: "Volet 3D horizontal",
    hint: "Bascule autour de l'axe horizontal.",
    category: "3d",
    availableFor: forAll,
    dom: (dur, ease) => ({
      initial: { opacity: 0, rotateX: -90, transformPerspective: 1200 },
      animate: { opacity: 1, rotateX: 0, transformPerspective: 1200, transition: { duration: sec(dur), ease } },
      exit: { opacity: 0, rotateX: 60, transformPerspective: 1200, transition: { duration: 0.3 } },
    }),
    canvas: ({ p }) => ({
      ...CANVAS_ANIM_IDENTITY,
      alpha: p,
      scaleY: Math.max(0.001, Math.cos(rad(90) * (1 - p))),
    }),
  },
  {
    id: "door",
    label: "Porte 3D",
    hint: "S'ouvre comme une porte (charnière à gauche).",
    category: "3d",
    availableFor: forAll,
    dom: (dur, ease) => ({
      initial: { opacity: 0, rotateY: -90, originX: 0, transformPerspective: 1200 },
      animate: { opacity: 1, rotateY: 0, originX: 0, transformPerspective: 1200, transition: { duration: sec(dur), ease } },
      exit: { opacity: 0, rotateY: -50, originX: 0, transformPerspective: 1200, transition: { duration: 0.3 } },
    }),
    canvas: ({ p }) => ({
      ...CANVAS_ANIM_IDENTITY,
      alpha: p,
      origin: "left",
      scaleX: Math.max(0.001, Math.cos(rad(90) * (1 - p))),
    }),
  },
  {
    id: "swing_in",
    label: "Balancier 3D",
    hint: "Pivote depuis le haut, comme une enseigne.",
    category: "3d",
    availableFor: forAll,
    dom: (dur, ease) => ({
      initial: { opacity: 0, rotateX: -85, originY: 0, transformPerspective: 1000 },
      animate: { opacity: 1, rotateX: 0, originY: 0, transformPerspective: 1000, transition: { duration: sec(dur), ease } },
      exit: { opacity: 0, rotateX: -45, originY: 0, transformPerspective: 1000, transition: { duration: 0.3 } },
    }),
    canvas: ({ p }) => ({
      ...CANVAS_ANIM_IDENTITY,
      alpha: p,
      origin: "top",
      scaleY: Math.max(0.001, Math.cos(rad(85) * (1 - p))),
    }),
  },
  {
    id: "tilt_in",
    label: "Perspective inclinée",
    hint: "Se redresse depuis une inclinaison 3D.",
    category: "3d",
    availableFor: forAll,
    dom: (dur, ease) => ({
      initial: { opacity: 0, rotateX: 35, y: 60, scale: 0.92, transformPerspective: 1000 },
      animate: { opacity: 1, rotateX: 0, y: 0, scale: 1, transformPerspective: 1000, transition: { duration: sec(dur), ease } },
      exit: { opacity: 0, rotateX: 20, y: 30, transition: { duration: 0.3 } },
    }),
    canvas: ({ p, k }) => ({
      ...CANVAS_ANIM_IDENTITY,
      alpha: p,
      ty: 60 * k * (1 - p),
      scale: 0.92 + 0.08 * p,
      scaleY: Math.max(0.001, Math.cos(rad(35) * (1 - p))),
    }),
  },
  {
    id: "spin3d_loop",
    label: "Rotation 3D continue",
    hint: "Tourne en 3D sans fin, comme un panneau qui pivote.",
    category: "3d",
    also: ["boucles"],
    loop: true,
    availableFor: forAll,
    dom: (dur) => ({
      initial: { opacity: 0 },
      animate: {
        opacity: 1,
        rotateY: 360,
        transformPerspective: 1400,
        transition: {
          opacity: { duration: 0.3 },
          rotateY: { repeat: Infinity, repeatType: "loop", ease: "linear", duration: sec(period(dur, 7, 3600)) },
        },
      },
      exit: EXIT_FADE,
    }),
    // rotateY projects to scaleX = cos(θ); it passes through 0 (edge-on) and
    // negative (the back face, mirrored) — reads as a spinning panel on canvas.
    canvas: ({ t, dur }) => {
      const per = period(dur, 7, 3600);
      const theta = 2 * Math.PI * ((t % per) / per);
      return { ...CANVAS_ANIM_IDENTITY, alpha: loopFade(t), scaleX: Math.cos(theta) };
    },
  },
  {
    id: "window_loop",
    label: "Fenêtre 3D",
    hint: "S'ouvre et se referme en 3D, charnière à gauche.",
    category: "3d",
    also: ["boucles"],
    loop: true,
    availableFor: forAll,
    dom: (dur) => ({
      initial: { opacity: 0 },
      animate: {
        opacity: 1,
        rotateY: [0, -78, 0],
        originX: 0,
        transformPerspective: 1400,
        transition: {
          opacity: { duration: 0.3 },
          rotateY: { repeat: Infinity, repeatType: "loop", ease: "easeInOut", duration: sec(period(dur, 6, 4200)) },
        },
      },
      exit: EXIT_FADE,
    }),
    canvas: ({ t, dur }) => {
      const per = period(dur, 6, 4200);
      const open = rad(78) * triangle(t, per); // 0 → 78° → 0, hinged left
      return {
        ...CANVAS_ANIM_IDENTITY,
        alpha: loopFade(t),
        origin: "left",
        scaleX: Math.max(0.02, Math.cos(open)),
      };
    },
  },

  /* ── Révélations ── */
  {
    id: "clip_reveal",
    label: "Rideau gauche → droite",
    hint: "Se dévoile de gauche à droite.",
    category: "revelations",
    availableFor: forAll,
    dom: (dur, ease) => ({
      initial: { clipPath: "inset(0 100% 0 0)", opacity: 0.5 },
      animate: { clipPath: "inset(0 0% 0 0)", opacity: 1, transition: { duration: sec(dur), ease } },
      exit: { clipPath: "inset(0 0 0 100%)", opacity: 0, transition: { duration: sec(dur), ease } },
    }),
    canvas: ({ p }) => ({
      ...CANVAS_ANIM_IDENTITY,
      alpha: 0.5 + 0.5 * p,
      clip: { kind: "left", p },
    }),
  },
  {
    id: "reveal_up",
    label: "Rideau montant",
    hint: "Se dévoile du bas vers le haut.",
    category: "revelations",
    availableFor: forAll,
    dom: (dur, ease) => ({
      initial: { clipPath: "inset(100% 0 0 0)", opacity: 0.5 },
      animate: { clipPath: "inset(0% 0 0 0)", opacity: 1, transition: { duration: sec(dur), ease } },
      exit: { clipPath: "inset(0 0 100% 0)", opacity: 0, transition: { duration: sec(dur), ease } },
    }),
    canvas: ({ p }) => ({
      ...CANVAS_ANIM_IDENTITY,
      alpha: 0.5 + 0.5 * p,
      clip: { kind: "up", p },
    }),
  },
  {
    id: "split_center",
    label: "Rideau central",
    hint: "S'ouvre depuis le centre vers les bords.",
    category: "revelations",
    availableFor: forAll,
    dom: (dur, ease) => ({
      initial: { clipPath: "inset(0 50% 0 50%)", opacity: 0.5 },
      animate: { clipPath: "inset(0 0% 0 0%)", opacity: 1, transition: { duration: sec(dur), ease } },
      exit: { clipPath: "inset(0 50% 0 50%)", opacity: 0, transition: { duration: sec(dur), ease } },
    }),
    canvas: ({ p }) => ({
      ...CANVAS_ANIM_IDENTITY,
      alpha: 0.5 + 0.5 * p,
      clip: { kind: "center", p },
    }),
  },
  {
    id: "iris",
    label: "Iris circulaire",
    hint: "S'ouvre en cercle depuis le centre.",
    category: "revelations",
    availableFor: forAll,
    dom: (dur, ease) => ({
      initial: { clipPath: "circle(0% at 50% 50%)", opacity: 0.5 },
      animate: { clipPath: "circle(75% at 50% 50%)", opacity: 1, transition: { duration: sec(dur), ease } },
      exit: { clipPath: "circle(0% at 50% 50%)", opacity: 0, transition: { duration: sec(dur), ease } },
    }),
    canvas: ({ p }) => ({
      ...CANVAS_ANIM_IDENTITY,
      alpha: 0.5 + 0.5 * p,
      clip: { kind: "iris", p },
    }),
  },
  {
    id: "reveal_down",
    label: "Rideau descendant",
    hint: "Se dévoile du haut vers le bas.",
    category: "revelations",
    availableFor: forAll,
    dom: (dur, ease) => ({
      initial: { clipPath: "inset(0 0 100% 0)", opacity: 0.5 },
      animate: { clipPath: "inset(0 0 0% 0)", opacity: 1, transition: { duration: sec(dur), ease } },
      exit: { clipPath: "inset(100% 0 0 0)", opacity: 0, transition: { duration: sec(dur), ease } },
    }),
    canvas: ({ p }) => ({
      ...CANVAS_ANIM_IDENTITY,
      alpha: 0.5 + 0.5 * p,
      clip: { kind: "down", p },
    }),
  },
  {
    id: "wipe_left",
    label: "Balayage droite → gauche",
    hint: "Se dévoile de droite à gauche.",
    category: "revelations",
    availableFor: forAll,
    dom: (dur, ease) => ({
      initial: { clipPath: "inset(0 0 0 100%)", opacity: 0.5 },
      animate: { clipPath: "inset(0 0 0 0%)", opacity: 1, transition: { duration: sec(dur), ease } },
      exit: { clipPath: "inset(0 100% 0 0)", opacity: 0, transition: { duration: sec(dur), ease } },
    }),
    canvas: ({ p }) => ({
      ...CANVAS_ANIM_IDENTITY,
      alpha: 0.5 + 0.5 * p,
      clip: { kind: "right", p },
    }),
  },

  /* ── Texte ── */
  {
    id: "typewriter",
    label: "Machine à écrire",
    hint: "Texte frappé lettre à lettre ; images : balayage + curseur.",
    category: "texte",
    availableFor: forTextyOrImage,
    unavailableHint: "Nécessite du texte à révéler (ou une image, en balayage).",
    activeMs: (dur, kind) => (kind === "image" ? sweepMs(dur) : dur),
    dom: (dur, ease, kind) => {
      // CHR-56 P2 — image adaptation: a linear left→right sweep (the cursor bar
      // is rendered by the layer itself, see composite-layer.tsx).
      if (kind === "image") {
        return {
          initial: { clipPath: "inset(0 100% 0 0)" },
          animate: {
            clipPath: "inset(0 0% 0 0)",
            transition: { duration: sec(sweepMs(dur)), ease: "linear" },
          },
          exit: EXIT_FADE,
        };
      }
      // Text kinds: the outer box just fades in; the per-character stagger is
      // done by <TypewriterText> inside the layer.
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1, transition: { duration: sec(dur), ease } },
        exit: EXIT_FADE,
      };
    },
    canvas: ({ raw, t, dur, kind }) => {
      if (kind === "image") {
        const p = Math.min(1, t / sweepMs(dur));
        return { ...CANVAS_ANIM_IDENTITY, clip: { kind: "left", p, cursor: true } };
      }
      return { ...CANVAS_ANIM_IDENTITY, reveal: raw };
    },
  },
  {
    id: "scroll_left",
    label: "Défil. horizontal (← gauche)",
    hint: "Bandeau défilant vers la gauche.",
    category: "texte",
    loop: true,
    availableFor: forTextOnly,
    unavailableHint: "Bandeau défilant — sources Texte uniquement.",
    dom: (dur) => scrollVariants("x", "100%", "-100%", dur),
    canvas: () => CANVAS_ANIM_IDENTITY, // drawn by drawScrollLayer (program-out)
  },
  {
    id: "scroll_right",
    label: "Défil. horizontal (→ droite)",
    hint: "Bandeau défilant vers la droite.",
    category: "texte",
    loop: true,
    availableFor: forTextOnly,
    unavailableHint: "Bandeau défilant — sources Texte uniquement.",
    dom: (dur) => scrollVariants("x", "-100%", "100%", dur),
    canvas: () => CANVAS_ANIM_IDENTITY,
  },
  {
    id: "scroll_up",
    label: "Défil. vertical (↑ haut)",
    hint: "Générique montant.",
    category: "texte",
    loop: true,
    availableFor: forTextOnly,
    unavailableHint: "Bandeau défilant — sources Texte uniquement.",
    dom: (dur) => scrollVariants("y", "100%", "-100%", dur),
    canvas: () => CANVAS_ANIM_IDENTITY,
  },
  {
    id: "scroll_down",
    label: "Défil. vertical (↓ bas)",
    hint: "Générique descendant.",
    category: "texte",
    loop: true,
    availableFor: forTextOnly,
    unavailableHint: "Bandeau défilant — sources Texte uniquement.",
    dom: (dur) => scrollVariants("y", "-100%", "100%", dur),
    canvas: () => CANVAS_ANIM_IDENTITY,
  },

  /* ── Boucles continues ── */
  {
    id: "rotate_loop",
    label: "Rotation continue",
    hint: "Tourne sur elle-même en permanence.",
    category: "boucles",
    also: ["rotations"],
    loop: true,
    availableFor: forAll,
    dom: (dur) => ({
      initial: { opacity: 0 },
      animate: {
        opacity: 1,
        rotate: 360,
        transition: {
          opacity: { duration: 0.3 },
          rotate: { repeat: Infinity, repeatType: "loop", ease: "linear", duration: sec(period(dur, 6, 3000)) },
        },
      },
      exit: EXIT_FADE,
    }),
    canvas: ({ t, dur }) => {
      const per = period(dur, 6, 3000);
      return { ...CANVAS_ANIM_IDENTITY, alpha: loopFade(t), rotate: rad(360) * ((t % per) / per) };
    },
  },
  {
    id: "pulse_loop",
    label: "Pulsation",
    hint: "Respire doucement (zoom léger).",
    category: "boucles",
    loop: true,
    availableFor: forAll,
    dom: (dur) => ({
      initial: { opacity: 0 },
      animate: {
        opacity: 1,
        scale: [1, 1.06, 1],
        transition: {
          opacity: { duration: 0.3 },
          scale: { repeat: Infinity, repeatType: "loop", ease: "easeInOut", duration: sec(period(dur, 3, 1600)) },
        },
      },
      exit: EXIT_FADE,
    }),
    canvas: ({ t, dur }) => {
      const per = period(dur, 3, 1600);
      return {
        ...CANVAS_ANIM_IDENTITY,
        alpha: loopFade(t),
        scale: 1 + 0.06 * Math.sin((Math.PI * (t % per)) / per),
      };
    },
  },
  {
    id: "float_loop",
    label: "Flottement",
    hint: "Lévite lentement de haut en bas.",
    category: "boucles",
    loop: true,
    availableFor: forAll,
    dom: (dur) => ({
      initial: { opacity: 0 },
      animate: {
        opacity: 1,
        y: [0, -14, 0],
        transition: {
          opacity: { duration: 0.3 },
          y: { repeat: Infinity, repeatType: "loop", ease: "easeInOut", duration: sec(period(dur, 5, 2600)) },
        },
      },
      exit: EXIT_FADE,
    }),
    canvas: ({ t, dur, k }) => {
      const per = period(dur, 5, 2600);
      return {
        ...CANVAS_ANIM_IDENTITY,
        alpha: loopFade(t),
        ty: -14 * k * Math.sin((Math.PI * (t % per)) / per),
      };
    },
  },
  {
    id: "sway_loop",
    label: "Balancement",
    hint: "Oscille en douceur autour de son centre.",
    category: "boucles",
    also: ["rotations"],
    loop: true,
    availableFor: forAll,
    dom: (dur) => ({
      initial: { opacity: 0 },
      animate: {
        opacity: 1,
        rotate: [0, 3.5, 0, -3.5, 0],
        transition: {
          opacity: { duration: 0.3 },
          rotate: { repeat: Infinity, repeatType: "loop", ease: "easeInOut", duration: sec(period(dur, 6, 3200)) },
        },
      },
      exit: EXIT_FADE,
    }),
    canvas: ({ t, dur }) => {
      const per = period(dur, 6, 3200);
      return {
        ...CANVAS_ANIM_IDENTITY,
        alpha: loopFade(t),
        rotate: rad(3.5) * Math.sin((2 * Math.PI * (t % per)) / per),
      };
    },
  },
  {
    id: "ripple_loop",
    label: "Onde (goutte d'eau)",
    hint: "Pulse en continu comme une onde qui se propage.",
    category: "boucles",
    also: ["essentiels"],
    loop: true,
    availableFor: forAll,
    // Content must never blink to invisible: the alpha only dips slightly.
    dom: (dur) => ({
      initial: { opacity: 0 },
      animate: {
        opacity: 1,
        scale: [1, 1.14, 1],
        transition: {
          opacity: { duration: 0.3 },
          scale: { repeat: Infinity, repeatType: "loop", ease: "easeOut", duration: sec(period(dur, 3.5, 1900)) },
        },
      },
      exit: EXIT_FADE,
    }),
    canvas: ({ t, dur }) => {
      const per = period(dur, 3.5, 1900);
      const ph = (t % per) / per;
      // A single expanding wave per period (grows fast, eases out), then resets.
      const wave = Math.sin(Math.PI * Math.min(1, ph * 1.15));
      return {
        ...CANVAS_ANIM_IDENTITY,
        alpha: loopFade(t) * (0.9 + 0.1 * (1 - wave)),
        scale: 1 + 0.14 * wave,
      };
    },
  },
  {
    id: "heartbeat_loop",
    label: "Battement",
    hint: "Double pulsation, comme un cœur qui bat.",
    category: "boucles",
    loop: true,
    availableFor: forAll,
    dom: (dur) => ({
      initial: { opacity: 0 },
      animate: {
        opacity: 1,
        scale: [1, 1.12, 1, 1.1, 1, 1, 1],
        transition: {
          opacity: { duration: 0.3 },
          scale: {
            repeat: Infinity,
            repeatType: "loop",
            ease: "easeOut",
            times: [0, 0.08, 0.18, 0.26, 0.36, 0.7, 1],
            duration: sec(period(dur, 3, 1500)),
          },
        },
      },
      exit: EXIT_FADE,
    }),
    canvas: ({ t, dur }) => {
      const per = period(dur, 3, 1500);
      return {
        ...CANVAS_ANIM_IDENTITY,
        alpha: loopFade(t),
        scale: 1 + 0.12 * heartbeat((t % per) / per),
      };
    },
  },
];

/** Marquee variants shared by the four scroll_* effects (DOM side). */
function scrollVariants(axis: "x" | "y", from: string, to: string, dur: number): Variants {
  const transition = {
    repeat: Infinity,
    repeatType: "loop" as const,
    duration: dur > 100 ? (dur * 12) / 1000 : 12,
    ease: "linear" as const,
  };
  if (axis === "x") {
    return {
      initial: { x: from },
      animate: { x: to, transition: { x: transition } },
      exit: { opacity: 0 },
    };
  }
  return {
    initial: { y: from },
    animate: { y: to, transition: { y: transition } },
    exit: { opacity: 0 },
  };
}

/* ── Lookups ────────────────────────────────────────────────────── */

const EFFECT_BY_ID = new Map<string, AnimEffect>(EFFECTS.map((e) => [e.id, e]));

export const ANIM_EFFECTS: readonly AnimEffect[] = EFFECTS;

/** Whether an effect is listed under a category (primary OR secondary). */
export function animInCategory(fx: AnimEffect, cat: AnimCategoryId): boolean {
  return fx.category === cat || (fx.also?.includes(cat) ?? false);
}

/** Select options (legacy shape) derived from the registry. */
export const ANIM_OPTIONS: { value: StudioAnimation; label: string }[] = EFFECTS.map((e) => ({
  value: e.id,
  label: e.label,
}));

/** The effect for an id — unknown/legacy ids fall back to fade_slide. */
export function getAnimEffect(id: string | undefined): AnimEffect {
  return (id && EFFECT_BY_ID.get(id)) || EFFECT_BY_ID.get("fade_slide")!;
}

export function animationAvailable(id: string | undefined, kind: AnimSourceKind): boolean {
  return getAnimEffect(id).availableFor(kind);
}

/**
 * The effect actually RENDERED for a layer: the per-source condition is
 * enforced here, in one place for all three renderers — an unavailable
 * persisted value (e.g. an old "typewriter" on a camera) degrades to "none"
 * instead of silently animating differently per renderer.
 */
export function resolveAnimation(id: string | undefined, kind: AnimSourceKind): AnimEffect {
  const fx = getAnimEffect(id);
  return fx.availableFor(kind) ? fx : EFFECT_BY_ID.get("none")!;
}

/** framer-motion variants for a layer — availability + easing resolved. */
export function domAnimVariants(
  id: string | undefined,
  durMs: number,
  easingName: string | undefined,
  kind: AnimSourceKind,
): Variants {
  const ease = EASING_MAP[easingName || "ease-out"] || EASING_MAP["ease-out"];
  return resolveAnimation(id, kind).dom(durMs || 500, ease, kind);
}

/* ── Shared typewriter text (per-character stagger + cursor) ────── */

const typewriterContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.015 } },
};

const typewriterChar: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.04 } },
};

/** The blinking-cursor, character-staggered text used by every DOM renderer. */
export function TypewriterText({ text }: { text: string }) {
  const characters = Array.from(text);
  return (
    <motion.span variants={typewriterContainer} initial="hidden" animate="visible" className="inline">
      {characters.map((char, index) => (
        <motion.span key={index} variants={typewriterChar} className="inline">
          {char}
        </motion.span>
      ))}
      <motion.span
        animate={{ opacity: [1, 1, 0, 0, 1] }}
        transition={{ repeat: Infinity, duration: 0.8, times: [0, 0.5, 0.5, 1, 1], ease: "linear" }}
        className="ml-0.5 inline-block w-[2px] bg-[#e2b85f] align-middle"
        style={{ height: "1.2em" }}
      >
        &nbsp;
      </motion.span>
    </motion.span>
  );
}
