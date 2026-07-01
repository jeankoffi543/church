"use client";

import type React from "react";

import type { ScriptureVerse } from "@/lib/studio";
import { cn } from "@/lib/utils";
import { getContainerStyle, getElementStyle, getOverlayBoxStyle } from "./studio-style";
import { isBackgroundLayer, imageHatch, type StudioLayer } from "./studio-layers";
import { MONO } from "./studio-tokens";

export type ResizeCorner = "nw" | "ne" | "sw" | "se";

const CORNER_POS: Record<ResizeCorner, string> = {
  nw: "-top-1.5 -left-1.5 cursor-nw-resize",
  ne: "-top-1.5 -right-1.5 cursor-ne-resize",
  sw: "-bottom-1.5 -left-1.5 cursor-sw-resize",
  se: "-bottom-1.5 -right-1.5 cursor-se-resize",
};

/**
 * Renders one composite layer (bible / text / song / image / camera / video /
 * embed) onto a monitor. Backgrounds fill the frame; overlays are positioned
 * from their style, draggable (move) and resizable (corner handles) in the
 * Preview. Inline styles are data-driven. Selection shows a dashed ring.
 */
export function CompositeLayer({
  layer,
  verse,
  z,
  selected,
  draggable = false,
  onPointerDown,
  onResize,
  onSelect,
}: {
  layer: StudioLayer;
  verse?: ScriptureVerse | null;
  z: number;
  selected: boolean;
  draggable?: boolean;
  onPointerDown?: (e: React.PointerEvent, id: string) => void;
  onResize?: (e: React.PointerEvent, id: string, corner: ResizeCorner) => void;
  onSelect?: (id: string) => void;
}) {
  const isBg = isBackgroundLayer(layer);
  // Full-frame backgrounds aren't draggable, but a click still selects them so
  // the inspector binds to the source.
  const selectProps =
    draggable && onSelect && isBg
      ? { onClick: () => onSelect(layer.id), role: "button" as const }
      : {};
  const ring = selected
    ? isBg
      ? "shadow-[inset_0_0_0_2px_#b270ff]"
      : "outline-2 outline-dashed outline-studio-purple outline-offset-4"
    : "";
  const movable = draggable && !!onPointerDown && !isBg;
  const dragProps = movable
    ? { onPointerDown: (e: React.PointerEvent) => onPointerDown!(e, layer.id) }
    : {};

  const handles =
    selected && movable && onResize
      ? (Object.keys(CORNER_POS) as ResizeCorner[]).map((c) => (
          <div
            key={c}
            onPointerDown={(e) => onResize(e, layer.id, c)}
            className={cn(
              "absolute z-20 size-3 rounded-full border border-studio-purple bg-studio-bg shadow",
              CORNER_POS[c],
            )}
          />
        ))
      : null;

  // Bible verse overlay
  if (layer.type === "bible") {
    const versionLabel = verse?.texts ? Object.keys(verse.texts)[0] : verse?.translation || "LSG";
    return (
      <div
        data-layer
        {...dragProps}
        className={cn("absolute flex flex-col justify-center text-center", movable && "cursor-move", ring)}
        style={{ ...getContainerStyle(layer.style), ...getOverlayBoxStyle(layer.style), zIndex: z }}
      >
        {handles}
        {verse ? (
          <>
            <span style={getElementStyle("fontRef", layer.style)} className="mb-2 block">
              {verse.reference}
            </span>
            <p style={getElementStyle("fontBody", layer.style)}>{verse.text}</p>
            <span style={getElementStyle("fontVer", layer.style)} className="mt-1 block">
              {versionLabel}
            </span>
          </>
        ) : (
          <span className={cn("text-[11px] tracking-[2px] text-white/25", MONO)}>
            Sélectionnez un verset
          </span>
        )}
      </div>
    );
  }

  // Camera / video / external embed (background feed)
  if (layer.type === "camera" || layer.type === "video" || layer.type === "embed") {
    const meta =
      layer.type === "camera"
        ? { label: "FLUX CAMÉRA · NDI", color: "rgba(255,255,255,.5)", hatch: "rgba(255,255,255,.03)", hatch2: "rgba(255,255,255,.06)" }
        : layer.type === "video"
          ? { label: "FLUX VLC · HLS", color: "rgba(240,168,104,.7)", hatch: "rgba(240,168,104,.05)", hatch2: "rgba(240,168,104,.1)" }
          : { label: "DIRECT EXTERNE · YOUTUBE / FACEBOOK", color: "rgba(255,107,107,.8)", hatch: "rgba(255,107,107,.05)", hatch2: "rgba(255,107,107,.1)" };
    return (
      <div
        {...selectProps}
        className={cn("absolute inset-0 flex items-center justify-center", draggable && "cursor-pointer", ring)}
        style={{
          zIndex: z,
          background: `repeating-linear-gradient(45deg,${meta.hatch} 0 14px,${meta.hatch2} 14px 28px)`,
        }}
      >
        <div className="max-w-[80%] text-center">
          <div className={cn("text-[13px] font-semibold tracking-[2px]", MONO)} style={{ color: meta.color }}>
            {meta.label}
          </div>
          <div className="mt-1 truncate text-[10px] text-white/30">{layer.feedUrl || layer.name}</div>
        </div>
      </div>
    );
  }

  // Image layer
  if (layer.type === "image") {
    const bg = layer.imageUrl
      ? `center/cover no-repeat url(${JSON.stringify(layer.imageUrl)})`
      : imageHatch(layer.imageHue ?? 265);
    if (isBg) {
      return (
        <div
          {...selectProps}
          className={cn("absolute inset-0", draggable && "cursor-pointer", ring)}
          style={{ zIndex: z, background: bg }}
        >
          <span
            className={cn(
              "absolute bottom-2.5 left-2.5 rounded-md bg-black/45 px-2 py-1 text-[9.5px] tracking-[1px] text-white/55",
              MONO,
            )}
          >
            🖼 {layer.name}
          </span>
        </div>
      );
    }
    return (
      <div
        data-layer
        {...dragProps}
        className={cn("absolute overflow-hidden rounded-xl", movable && "cursor-move", ring)}
        style={{ ...getOverlayBoxStyle(layer.style), zIndex: z, background: bg }}
      >
        {handles}
      </div>
    );
  }

  // Song lyrics — a centered stack of lines
  if (layer.type === "song") {
    const lines = (layer.content ?? "").split("\n");
    return (
      <div
        data-layer
        {...dragProps}
        className={cn("absolute flex flex-col items-center justify-center text-center", movable && "cursor-move", ring)}
        style={{ ...getContainerStyle(layer.style), ...getOverlayBoxStyle(layer.style), zIndex: z }}
      >
        {handles}
        {lines.map((line, i) => (
          <div key={i} style={getElementStyle("fontBody", layer.style)}>
            {line || " "}
          </div>
        ))}
      </div>
    );
  }

  // Text layer
  return (
    <div
      data-layer
      {...dragProps}
      className={cn("absolute flex flex-col justify-center text-center", movable && "cursor-move", ring)}
      style={{ ...getContainerStyle(layer.style), ...getOverlayBoxStyle(layer.style), zIndex: z }}
    >
      {handles}
      <p style={getElementStyle("fontBody", layer.style)}>{layer.content}</p>
      {layer.sub ? <span className="mt-1 text-[12px] text-white/55">{layer.sub}</span> : null}
    </div>
  );
}
