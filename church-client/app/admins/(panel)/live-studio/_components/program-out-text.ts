/**
 * Canvas text renderer for the program-out compositor (v2). Burns the text-based
 * overlays — `text`, `song` and the `bible` verse — into the outgoing frame so
 * they appear on Facebook (the public `/live` gets them separately via Reverb).
 *
 * It mirrors the DOM renderer (`composite-layer.tsx` + `studio-style.ts`):
 * `getContainerStyle` → the box, `getElementStyle` → per-block typography,
 * `getOverlayBoxStyle` → geometry.
 *
 * Scale: the DOM sizes fonts/padding in ABSOLUTE px inside the (small) preview
 * stage, so the same values on a 1280×720 canvas would look half the relative
 * size. Every px value is therefore multiplied by `scale` (canvas height ÷
 * preview-stage height) so the burned-in text matches what the operator sees.
 *
 * v2 limitations: gradient text colour falls back to a solid; entrance
 * animations are v3.
 */

import type { StudioSettings } from "@/lib/studio";
import type { ScriptureVerse } from "./studio-layers";

type Box = { x: number; y: number; w: number; h: number };
type Prefix = "fontRef" | "fontBody" | "fontVer";

/** A stacked run of text sharing one typography (bible = ref + body + version). */
type Block = { text: string; prefix: Prefix; gapBefore: number };

/** Solid colour for canvas — CSS gradients aren't paintable as text fill, so we
 *  pull the first colour out of the gradient string, or fall back to white. */
function resolveColor(value: string | undefined): string {
  if (!value) return "#ffffff";
  if (!value.includes("gradient")) return value;
  const hit = value.match(/#[0-9a-fA-F]{3,8}|rgba?\([^)]*\)|hsla?\([^)]*\)/);
  return hit ? hit[0] : "#ffffff";
}

function num(s: StudioSettings, key: string, fallback: number): number {
  const v = s[key as keyof StudioSettings];
  return typeof v === "number" ? v : fallback;
}
function str(s: StudioSettings, key: string, fallback: string): string {
  const v = s[key as keyof StudioSettings];
  return typeof v === "string" && v ? v : fallback;
}

function fontOf(s: StudioSettings, p: Prefix, scale: number) {
  const size = num(s, `${p}Size`, 24) * scale;
  return {
    font: `${str(s, `${p}Style`, "normal")} ${str(s, `${p}Weight`, "400")} ${size}px ${str(s, `${p}Family`, "sans-serif")}`,
    size,
    lineHeight: num(s, `${p}LineHeight`, 1.3),
    spacing: num(s, `${p}Spacing`, 0) * scale,
    color: resolveColor(str(s, `${p}Color`, "#ffffff")),
    upper: str(s, `${p}Transform`, "none") === "uppercase",
  };
}

/** Trace the container path (rounded / asymmetric / capsule / rectangle). */
function containerPath(ctx: CanvasRenderingContext2D, box: Box, radii: number | number[]) {
  ctx.beginPath();
  ctx.roundRect(box.x, box.y, box.w, box.h, radii);
}

/** Draw the container box (background, border, shadow) behind the text. */
function drawContainer(ctx: CanvasRenderingContext2D, box: Box, s: StudioSettings, scale: number) {
  const shape = str(s, "containerShape", "rounded_rectangle");
  if (shape === "transparent") return;

  const r = num(s, "containerBorderRadius", 16) * scale;
  const small = 6 * scale;
  const radii: number | number[] =
    shape === "rectangle"
      ? 0
      : shape === "capsule"
        ? box.h / 2
        : shape === "asymmetric"
          ? [r, small, r, small]
          : r;

  ctx.save();
  const blur = num(s, "shadowBlur", 0) * scale;
  if (blur > 0 || num(s, "shadowOffsetX", 0) || num(s, "shadowOffsetY", 0)) {
    ctx.shadowColor = str(s, "shadowColor", "rgba(0,0,0,0.5)");
    ctx.shadowBlur = blur;
    ctx.shadowOffsetX = num(s, "shadowOffsetX", 0) * scale;
    ctx.shadowOffsetY = num(s, "shadowOffsetY", 0) * scale;
  }
  containerPath(ctx, box, radii);
  ctx.fillStyle = resolveColor(str(s, "containerBg", "rgba(22,15,51,0.95)"));
  ctx.fill();
  ctx.restore();

  const borderStyle = str(s, "containerBorderStyle", "solid");
  if (borderStyle !== "none" && num(s, "containerBorderWidth", 0) > 0) {
    ctx.save();
    ctx.lineWidth = num(s, "containerBorderWidth", 1) * scale;
    ctx.strokeStyle = str(s, "containerBorderColor", "rgba(255,255,255,0.1)");
    if (borderStyle === "dashed") ctx.setLineDash([8 * scale, 6 * scale]);
    if (borderStyle === "glow") {
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = 18 * scale;
    }
    containerPath(ctx, box, radii);
    ctx.stroke();
    ctx.restore();
  }
}

/** Greedy word-wrap that also honours explicit `\n`. */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const out: string[] = [];
  for (const paragraph of text.split("\n")) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      out.push("");
      continue;
    }
    let line = words[0];
    for (let i = 1; i < words.length; i += 1) {
      const candidate = `${line} ${words[i]}`;
      if (ctx.measureText(candidate).width <= maxWidth) {
        line = candidate;
      } else {
        out.push(line);
        line = words[i];
      }
    }
    out.push(line);
  }
  return out;
}

/** Draw stacked text blocks inside a box, honouring H/V alignment + padding.
 *  `reveal` (0..1) progressively unveils the body text for the typewriter
 *  animation, keeping the wrapped layout stable (no reflow). */
function drawBlocks(
  ctx: CanvasRenderingContext2D,
  box: Box,
  s: StudioSettings,
  blocks: Block[],
  scale: number,
  reveal: number,
) {
  const padX = num(s, "containerPaddingX", 28) * scale;
  const padY = num(s, "containerPaddingY", 24) * scale;
  const innerX = box.x + padX;
  const innerY = box.y + padY;
  const innerW = Math.max(1, box.w - padX * 2);
  const innerH = Math.max(1, box.h - padY * 2);

  const hAlign = (s.textAlign ?? "center") as "left" | "center" | "right";
  const vAlign = (s.textVerticalAlign ?? "center") as "top" | "center" | "bottom";

  // Measure: wrap each block, capture real font metrics, accumulate total height.
  type Measured = {
    lines: string[];
    advance: number;
    ascent: number;
    descent: number;
    f: ReturnType<typeof fontOf>;
    gapBefore: number;
    prefix: Prefix;
  };
  const measured: Measured[] = [];
  let totalH = 0;
  for (const block of blocks) {
    const f = fontOf(s, block.prefix, scale);
    ctx.font = f.font;
    ctx.letterSpacing = `${f.spacing}px`;
    const text = f.upper ? block.text.toUpperCase() : block.text;
    const lines = wrapText(ctx, text, innerW);
    // Real vertical metrics so the glyph sits inside its line box like CSS,
    // instead of being hung from the top of the em box.
    const tm = ctx.measureText("Mg");
    const ascent = tm.fontBoundingBoxAscent || f.size * 0.8;
    const descent = tm.fontBoundingBoxDescent || f.size * 0.2;
    const advance = f.size * f.lineHeight;
    const gapBefore = block.gapBefore * scale;
    measured.push({ lines, advance, ascent, descent, f, gapBefore, prefix: block.prefix });
    totalH += gapBefore + lines.length * advance;
  }

  let y =
    vAlign === "top" ? innerY : vAlign === "bottom" ? innerY + innerH - totalH : innerY + (innerH - totalH) / 2;

  const x = hAlign === "left" ? innerX : hAlign === "right" ? innerX + innerW : innerX + innerW / 2;
  ctx.textAlign = hAlign === "left" ? "left" : hAlign === "right" ? "right" : "center";
  ctx.textBaseline = "alphabetic";

  for (const m of measured) {
    y += m.gapBefore;
    ctx.font = m.f.font;
    ctx.letterSpacing = `${m.f.spacing}px`;
    ctx.fillStyle = m.f.color;
    // Baseline = top of the line box + centred leading + ascent (CSS line-box model).
    const leadTop = (m.advance - (m.ascent + m.descent)) / 2;
    // Typewriter reveal applies to the body only; keep the full layout stable.
    const revealBody = m.prefix === "fontBody" && reveal < 1;
    let budget = revealBody
      ? Math.ceil(reveal * m.lines.reduce((a, l) => a + l.length, 0))
      : Number.POSITIVE_INFINITY;
    for (const line of m.lines) {
      const baseY = y + leadTop + m.ascent;
      if (revealBody) {
        if (budget <= 0) {
          y += m.advance;
          continue;
        }
        const partial = line.length > budget ? line.slice(0, budget) : line;
        budget -= line.length;
        // Anchor at the full line's left edge so characters reveal left→right in
        // place, instead of a centred partial string growing both ways.
        const flw = ctx.measureText(line).width;
        const leftEdge =
          hAlign === "right" ? innerX + innerW - flw : hAlign === "center" ? innerX + innerW / 2 - flw / 2 : innerX;
        ctx.textAlign = "left";
        ctx.fillText(partial, leftEdge, baseY);
        ctx.textAlign = hAlign;
      } else {
        ctx.fillText(line, x, baseY);
      }
      y += m.advance;
    }
  }
  ctx.letterSpacing = "0px";
}

/** Render a text/song layer (main body + optional subtitle). */
export function drawContentLayer(
  ctx: CanvasRenderingContext2D,
  box: Box,
  s: StudioSettings,
  content: string,
  scale: number,
  sub?: string,
  reveal = 1,
) {
  if (!content && !sub) return;
  drawContainer(ctx, box, s, scale);
  const blocks: Block[] = [{ text: content ?? "", prefix: "fontBody", gapBefore: 0 }];
  if (sub) blocks.push({ text: sub, prefix: "fontBody", gapBefore: 6 });
  drawBlocks(ctx, box, s, blocks, scale, reveal);
}

/** Render a scrolling ticker (scroll_left/right/up/down): a single-line marquee
 *  (horizontal) or a scrolling block (vertical), clipped to the box and looping.
 *  `phase` is the loop position 0..1. */
export function drawScrollLayer(
  ctx: CanvasRenderingContext2D,
  box: Box,
  s: StudioSettings,
  content: string,
  scale: number,
  variant: string,
  phase: number,
) {
  if (!content) return;
  drawContainer(ctx, box, s, scale);
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();

  const f = fontOf(s, "fontBody", scale);
  ctx.font = f.font;
  ctx.letterSpacing = `${f.spacing}px`;
  ctx.fillStyle = f.color;
  ctx.textBaseline = "middle";
  const advance = f.size * f.lineHeight;

  if (variant === "scroll_up" || variant === "scroll_down") {
    const hAlign = (s.textAlign ?? "center") as "left" | "center" | "right";
    ctx.textAlign = hAlign;
    const padX = num(s, "containerPaddingX", 28) * scale;
    const innerW = Math.max(1, box.w - padX * 2);
    const x = hAlign === "left" ? box.x + padX : hAlign === "right" ? box.x + box.w - padX : box.x + box.w / 2;
    const lines = wrapText(ctx, f.upper ? content.toUpperCase() : content, innerW);
    const totalH = lines.length * advance;
    const travel = box.h + totalH;
    const yTop = variant === "scroll_up" ? box.y + box.h - phase * travel : box.y - totalH + phase * travel;
    lines.forEach((line, i) => ctx.fillText(line, x, yTop + i * advance + advance / 2));
  } else {
    ctx.textAlign = "left";
    const text = (f.upper ? content.toUpperCase() : content).replace(/\n/g, "  ");
    const tw = ctx.measureText(text).width;
    const cy = box.y + box.h / 2;
    const travel = box.w + tw;
    const x = variant === "scroll_left" ? box.x + box.w - phase * travel : box.x - tw + phase * travel;
    ctx.fillText(text, x, cy);
  }
  ctx.letterSpacing = "0px";
  ctx.restore();
}

/** Render the bible verse layer: reference + body + version label. */
export function drawBibleLayer(
  ctx: CanvasRenderingContext2D,
  box: Box,
  s: StudioSettings,
  verse: ScriptureVerse,
  scale: number,
  reveal = 1,
) {
  drawContainer(ctx, box, s, scale);
  const versionLabel = verse.texts ? Object.keys(verse.texts)[0] : verse.translation || "LSG";
  drawBlocks(
    ctx,
    box,
    s,
    [
      { text: verse.reference ?? "", prefix: "fontRef", gapBefore: 0 },
      { text: verse.text ?? "", prefix: "fontBody", gapBefore: 8 },
      { text: versionLabel, prefix: "fontVer", gapBefore: 4 },
    ],
    scale,
    reveal,
  );
}
