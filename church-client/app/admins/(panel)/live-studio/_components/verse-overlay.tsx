"use client";

import type React from "react";

import type { ScriptureVerse, StudioSettings } from "@/lib/studio";
import { cn } from "@/lib/utils";
import { getContainerStyle, getElementStyle, getOverlayBoxStyle } from "./studio-style";

export type DragAction = "move" | "nw" | "ne" | "se" | "sw";

const HANDLES: { action: Exclude<DragAction, "move">; pos: string }[] = [
  { action: "nw", pos: "-top-1.5 -left-1.5 cursor-nw-resize" },
  { action: "ne", pos: "-top-1.5 -right-1.5 cursor-ne-resize" },
  { action: "sw", pos: "-bottom-1.5 -left-1.5 cursor-sw-resize" },
  { action: "se", pos: "-bottom-1.5 -right-1.5 cursor-se-resize" },
];

/**
 * The live verse overlay — the actual broadcast composite (reference / verse /
 * version) styled from `StudioSettings`. When `draggable` it is movable and
 * resizable (custom position mode) via the orchestrator's pointer handler.
 * Inline styles here are data-driven (operator-chosen geometry & typography).
 */
export function VerseOverlay({
  verse,
  settings,
  draggable = false,
  onPointerDown,
}: {
  verse: ScriptureVerse;
  settings: StudioSettings;
  draggable?: boolean;
  onPointerDown?: (e: React.PointerEvent, action: DragAction) => void;
}) {
  const versionLabel = verse.texts ? Object.keys(verse.texts)[0] : verse.translation || "LSG";
  const canDrag = draggable && !!onPointerDown && settings.positionMode === "custom";

  return (
    <div
      style={{
        ...getContainerStyle(settings),
        position: "absolute",
        ...getOverlayBoxStyle(settings),
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
      onPointerDown={canDrag ? (e) => onPointerDown!(e, "move") : undefined}
      className={cn(
        "group select-none ring-1 ring-white/10",
        canDrag && "cursor-move hover:ring-gold/40",
      )}
    >
      {canDrag &&
        HANDLES.map((h) => (
          <div
            key={h.action}
            onPointerDown={(e) => {
              e.stopPropagation();
              onPointerDown!(e, h.action);
            }}
            className={cn(
              "absolute z-10 size-3 rounded-full border border-gold bg-studio-bg shadow",
              h.pos,
            )}
          />
        ))}

      <span style={getElementStyle("fontRef", settings)} className="pointer-events-none mb-2 block text-center">
        {verse.reference}
      </span>
      <div className="pointer-events-none grid grid-cols-1 gap-2">
        <p style={getElementStyle("fontBody", settings)} className="text-center">
          {verse.text}
        </p>
        <span style={getElementStyle("fontVer", settings)} className="mt-1 block text-center">
          {versionLabel}
        </span>
      </div>
    </div>
  );
}
