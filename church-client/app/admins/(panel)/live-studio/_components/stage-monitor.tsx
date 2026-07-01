"use client";

import type React from "react";
import { Maximize } from "lucide-react";

import type { ScriptureVerse, StudioSettings } from "@/lib/studio";
import { cn } from "@/lib/utils";
import { CompositeLayer, type ResizeCorner } from "./composite-layer";
import { isCompositable, type StudioLayer } from "./studio-layers";
import { MONO } from "./studio-tokens";

/**
 * A broadcast monitor — Preview (green) or Program (red, on-air). Composites the
 * visible layer stack by z-order (top of `layers` = front). The Preview exposes
 * `stageRef` (drag surface) and lets overlays be dragged; Program is a passive
 * mirror. The bible layer is fed the real `bibleVerse` + `bibleStyle`.
 */
export function StageMonitor({
  tone,
  layers,
  bibleVerse,
  bibleStyle,
  sceneName,
  selectedLayerId,
  stageRef,
  draggable = false,
  onLayerPointerDown,
  onLayerResize,
  onLayerSelect,
  onFullscreen,
  black = false,
  animNonce = 0,
}: {
  tone: "preview" | "program";
  layers: StudioLayer[];
  bibleVerse: ScriptureVerse | null;
  bibleStyle: StudioSettings;
  sceneName: string;
  selectedLayerId?: string | null;
  stageRef?: React.Ref<HTMLDivElement>;
  draggable?: boolean;
  onLayerPointerDown?: (e: React.PointerEvent, id: string) => void;
  onLayerResize?: (e: React.PointerEvent, id: string, corner: ResizeCorner) => void;
  onLayerSelect?: (id: string) => void;
  onFullscreen?: () => void;
  black?: boolean;
  /** Bumping this replays the entrance animations (remounts the layers). */
  animNonce?: number;
}) {
  const isProgram = tone === "program";
  const visible = layers.filter((l) => l.visible && isCompositable(l));

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl",
        isProgram
          ? "border-2 border-studio-onair/55 bg-studio-onair/[0.03] shadow-[0_0_0_1px_rgba(239,68,68,.1),0_14px_40px_rgba(239,68,68,.12)]"
          : "border-[1.5px] border-studio-preview/40 bg-studio-preview/[0.03]",
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a1430] to-[#0b0718]" />
      <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent_0_2px,rgba(0,0,0,0.22)_2px_3px)] opacity-50" />
      {!isProgram && (
        <div className="absolute inset-x-0 top-0 h-2/5 animate-studio-scan bg-[linear-gradient(180deg,#fff,transparent)] opacity-10" />
      )}

      {/* Composited layer stack — ref target for the drag math */}
      <div ref={stageRef} className="absolute inset-0">
        {visible.length === 0 && (
          <div className="absolute inset-0 grid place-items-center">
            <span className={cn("text-[11px] tracking-[2px] text-white/20", MONO)}>
              — AUCUNE SOURCE VISIBLE —
            </span>
          </div>
        )}
        {visible.map((layer, idx) => {
          const z = visible.length - idx;
          const effective = layer.type === "bible" ? { ...layer, style: bibleStyle } : layer;
          return (
            <CompositeLayer
              key={`${layer.id}-${animNonce}`}
              layer={effective}
              verse={layer.type === "bible" ? bibleVerse : undefined}
              z={z}
              selected={!isProgram && layer.id === selectedLayerId}
              draggable={draggable}
              audioOwner={!isProgram}
              onPointerDown={onLayerPointerDown}
              onResize={onLayerResize}
              onSelect={onLayerSelect}
            />
          );
        })}
      </div>

      {black && (
        <div className="absolute inset-0 z-[80] grid place-items-center bg-black">
          <span className={cn("text-[11px] tracking-[3px] text-white/25", MONO)}>— ÉCRAN VIDE —</span>
        </div>
      )}

      {isProgram ? (
        <div className="absolute top-2.5 left-2.5 z-[70] flex animate-onair-pulse items-center gap-1.5 rounded-lg bg-studio-onair/90 px-2.5 py-1.5">
          <span className="size-[7px] animate-studio-blink rounded-full bg-white" />
          <span className="text-[10px] font-extrabold tracking-[1.4px] text-white">
            ANTENNE · {sceneName}
          </span>
        </div>
      ) : (
        <div className="absolute top-2.5 left-2.5 z-[60] flex items-center gap-1.5 rounded-lg border border-studio-preview/40 bg-studio-preview/15 px-2.5 py-1.5 backdrop-blur">
          <span className="size-[7px] rounded-full bg-studio-preview" />
          <span className="text-[10px] font-extrabold tracking-[1.2px] text-studio-preview-bright">
            APERÇU · {sceneName}
          </span>
        </div>
      )}

      {onFullscreen && (
        <button
          type="button"
          onClick={onFullscreen}
          title="Éditeur de position plein écran"
          className="absolute top-2.5 right-2.5 z-[60] flex size-7 items-center justify-center rounded-md border border-white/10 bg-black/40 text-white/50 transition-colors hover:text-white"
        >
          <Maximize className="size-3.5" />
        </button>
      )}

      {!isProgram && draggable && (
        <div className="pointer-events-none absolute right-2.5 bottom-2 z-[60] rounded-md bg-black/40 px-2 py-1 text-[9px] font-semibold tracking-[0.5px] text-white/40">
          Glissez une source pour la repositionner
        </div>
      )}
    </div>
  );
}
