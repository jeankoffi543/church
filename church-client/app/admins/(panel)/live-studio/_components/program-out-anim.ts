/**
 * Canvas entrance animations for the program-out compositor (v3). Reproduces the
 * framer-motion `ANIMATION_PLUGINS` entrance variants (composite-layer.tsx) as a
 * per-frame transform applied around each layer's draw, so the burned-in overlays
 * animate on Facebook like they do in the DOM preview.
 *
 * Covered: fade_slide, scale, slide_left/right, neon_slide, clip_reveal,
 * typewriter (progressive reveal). The looping `scroll_*` tickers are deferred
 * (continuous, no-wrap marquee) — they render static for now.
 */

type Cubic = [number, number, number, number];

/** framer-motion named easings → cubic-bezier control points. */
const EASING: Record<string, Cubic> = {
  linear: [0, 0, 1, 1],
  "ease-in": [0.42, 0, 1, 1],
  "ease-out": [0, 0, 0.58, 1],
  "ease-in-out": [0.42, 0, 0.58, 1],
  bounce: [0.175, 0.885, 0.32, 1.275],
};

/** Cubic-bezier easing evaluator (Newton-Raphson on x, like CSS timing). */
function cubicBezier([x1, y1, x2, y2]: Cubic): (t: number) => number {
  if (x1 === y1 && x2 === y2) return (t) => t; // linear
  const ax = 3 * x1 - 3 * x2 + 1;
  const bx = 3 * x2 - 6 * x1;
  const cx = 3 * x1;
  const ay = 3 * y1 - 3 * y2 + 1;
  const by = 3 * y2 - 6 * y1;
  const cy = 3 * y1;
  const fx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const fy = (t: number) => ((ay * t + by) * t + cy) * t;
  const dfx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x) => {
    let t = x;
    for (let i = 0; i < 5; i += 1) {
      const err = fx(t) - x;
      const d = dfx(t);
      if (Math.abs(err) < 1e-4 || d === 0) break;
      t -= err / d;
    }
    return fy(Math.max(0, Math.min(1, t)));
  };
}

export type AnimResult = {
  alpha: number;
  tx: number;
  ty: number;
  scale: number;
  /** clip_reveal: fraction (0..1) of the box width revealed from the left. */
  clipRevealX?: number;
  /** typewriter: fraction (0..1) of the body text revealed. */
  reveal?: number;
};

const IDENTITY: AnimResult = { alpha: 1, tx: 0, ty: 0, scale: 1 };

/**
 * Transform for an entrance animation at `elapsedMs` into a `durMs` run. `scale`
 * is the text px scale so translate offsets stay proportional to the canvas.
 * Returns identity once the animation has settled (or for `none`/`scroll_*`).
 */
export function computeEntrance(
  variant: string | undefined,
  elapsedMs: number,
  durMs: number,
  easingName: string,
  scale: number,
): AnimResult {
  if (!variant || variant === "none" || variant.startsWith("scroll_")) return IDENTITY;
  const raw = Math.min(1, Math.max(0, elapsedMs / Math.max(1, durMs)));
  if (raw >= 1) return IDENTITY;
  const p = cubicBezier(EASING[easingName] ?? EASING["ease-out"])(raw);

  switch (variant) {
    case "fade_slide":
      return { alpha: p, tx: 0, ty: 30 * scale * (1 - p), scale: 1 };
    case "scale":
      return { alpha: p, tx: 0, ty: 0, scale: 0.9 + 0.1 * p };
    case "slide_left":
      return { alpha: p, tx: -100 * scale * (1 - p), ty: 0, scale: 1 };
    case "slide_right":
      return { alpha: p, tx: 100 * scale * (1 - p), ty: 0, scale: 1 };
    case "neon_slide":
      return { alpha: p, tx: -80 * scale * (1 - p), ty: 0, scale: 0.98 + 0.02 * p };
    case "clip_reveal":
      return { alpha: 0.5 + 0.5 * p, tx: 0, ty: 0, scale: 1, clipRevealX: p };
    case "typewriter":
      return { alpha: 1, tx: 0, ty: 0, scale: 1, reveal: raw };
    default:
      return { alpha: p, tx: 0, ty: 0, scale: 1 }; // unknown → simple fade
  }
}
