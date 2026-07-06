"use client";

import type React from "react";
import { useLayoutEffect, useRef, useState } from "react";
import { Maximize } from "lucide-react";
import { AnimatePresence } from "framer-motion";

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
 *
 * **Composition space (CHR-53).** Layers are laid out in a LOGICAL stage of
 * exactly `compositionWidth × compositionHeight` CSS px (the OBS "base canvas"),
 * letterboxed + downscaled to fit the monitor via `transform: scale(k)`. Every
 * px-based style (font sizes, paddings, radii, borders) therefore renders at the
 * same metric the program-out canvas uses — preview and antenne/diffusion are
 * structurally identical, whatever the monitor's on-screen size or device. The
 * drag math is unaffected: it works in % of the stage's bounding box, and
 * `getBoundingClientRect()` accounts for the transform.
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
  compositionWidth = 1920,
  compositionHeight = 1080,
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
  /** Logical composition (OBS base canvas) the layers are laid out in. */
  compositionWidth?: number;
  compositionHeight?: number;
}) {
  const isProgram = tone === "program";

  // Measure the monitor and contain-fit the composition ratio inside it; the
  // logical stage is then scaled down by k to fill that letterboxed viewport.
  // setState is GUARDED by a 0.5px threshold: an unconditional set on every
  // ResizeObserver tick re-rendered the whole layer stack in a feedback loop
  // (sub-pixel churn), pinning the CPU.
  const frameRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const measure = () => {
      const { width, height } = el.getBoundingClientRect();
      const k = Math.min(width / compositionWidth, height / compositionHeight);
      const w = Math.round(compositionWidth * k);
      const h = Math.round(compositionHeight * k);
      setFit((prev) => (Math.abs(prev.w - w) < 1 && Math.abs(prev.h - h) < 1 ? prev : { w, h }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [compositionWidth, compositionHeight]);
  const k = fit.w > 0 ? fit.w / compositionWidth : 0;
  const visible = layers.filter((l) => {
    if (!l.visible) return false;
    if (!isCompositable(l)) return false;
    if (l.parentId) {
      const parent = layers.find((p) => p.id === l.parentId);
      if (parent && !parent.visible) return false;
    }
    return true;
  });

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

      {/* Letterboxed 16:9 viewport → logical composition stage, scaled to fit.
          stageRef targets the SCALED stage: getBoundingClientRect() returns its
          visual box, so the console's %-based drag math keeps working as-is. */}
      <div ref={frameRef} className="absolute inset-0 grid place-items-center">
        {visible.length === 0 && (
          <div className="absolute inset-0 grid place-items-center">
            <span className={cn("text-[11px] tracking-[2px] text-white/20", MONO)}>
              — AUCUNE SOURCE VISIBLE —
            </span>
          </div>
        )}
        {fit.w > 0 && (
          <div
            // `contain: strict` fences layout+paint inside the viewport: without
            // it the browser invalidates the full 1920×1080 logical surface on
            // every animation frame (marquee, entrances) — a big CPU cost. The
            // ring marks the BROADCAST frame edge (the monitor may be wider than
            // 16:9 — anything outside this line is letterbox, never diffused).
            className="relative overflow-hidden ring-1 ring-white/15"
            style={{ width: fit.w, height: fit.h, contain: "strict" }}
          >
            <div
              ref={stageRef}
              className="absolute top-0 left-0"
              style={{
                width: compositionWidth,
                height: compositionHeight,
                transform: `scale(${k})`,
                transformOrigin: "top left",
              }}
            >
              <AnimatePresence>
                {visible.map((layer, idx) => {
                  const z = visible.length - idx;
                  const effective = layer.type === "bible" ? { ...layer, style: bibleStyle } : layer;
                  // Camera/video keep a STABLE key so an animation replay (animNonce bump)
                  // doesn't remount them — a camera remount re-runs getUserMedia (black
                  // flash) and a video would reload. Images DO remount so they replay.
                  const stableKey = layer.type === "camera" || layer.type === "video";

                  return (
                    <CompositeLayer
                      key={stableKey ? layer.id : `${layer.id}-${animNonce}`}
                      layer={effective}
                      verse={layer.type === "bible" ? bibleVerse : undefined}
                      z={z}
                      selected={!isProgram && layer.id === selectedLayerId}
                      draggable={draggable}
                      audioOwner={!isProgram}
                      onPointerDown={onLayerPointerDown}
                      onResize={onLayerResize}
                      onSelect={onLayerSelect}
                      allLayers={layers}
                      selectedLayerId={selectedLayerId}
                      uiScale={k > 0 ? 1 / k : 1}
                    />
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        )}
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
