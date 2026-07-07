/**
 * Canvas entrance animations for the program-out compositor (v4 — CHR-56).
 * Thin evaluator over the shared effect registry (`lib/studio-animations`):
 * the per-effect math lives THERE, next to its framer-motion twin, so the
 * burned-in Facebook/WHEP feed animates exactly like the DOM preview.
 *
 * The looping `scroll_*` tickers stay special-cased in program-out.ts
 * (drawScrollLayer); every other effect — entrances AND continuous loops —
 * resolves here to a per-frame {@link CanvasAnim} transform.
 */

import {
  CANVAS_ANIM_IDENTITY,
  EASING_BEZIER,
  resolveAnimation,
  type AnimSourceKind,
  type CanvasAnim,
} from "@/lib/studio-animations";

type Cubic = [number, number, number, number];

/** Cubic-bezier easing evaluator (Newton-Raphson on x, like CSS timing). */
export function cubicBezier([x1, y1, x2, y2]: Cubic): (t: number) => number {
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

export type AnimResult = CanvasAnim;

/**
 * Transform for a layer's animation at `elapsedMs` into a `durMs` run. `scale`
 * is the canvas px scale so translate offsets stay proportional. Entrances
 * settle to identity after their active window; loop effects keep animating.
 * The per-source availability condition is enforced by `resolveAnimation` —
 * an effect the source doesn't support degrades to "none" here AND in the DOM.
 */
export function computeEntrance(
  variant: string | undefined,
  elapsedMs: number,
  durMs: number,
  easingName: string,
  scale: number,
  kind: AnimSourceKind,
): AnimResult {
  const fx = resolveAnimation(variant, kind);
  if (fx.id === "none" || fx.id.startsWith("scroll_")) return CANVAS_ANIM_IDENTITY;

  const dur = Math.max(1, durMs);
  const active = fx.activeMs ? fx.activeMs(dur, kind) : dur;
  const t = Math.max(0, elapsedMs);
  if (!fx.loop && t >= active) return CANVAS_ANIM_IDENTITY;

  const raw = Math.min(1, t / active);
  const p = cubicBezier(EASING_BEZIER[easingName] ?? EASING_BEZIER["ease-out"])(raw);
  return fx.canvas({ p, raw, t, dur, k: scale, kind });
}
