import type { ReactNode } from "react";
import { Maximize } from "lucide-react";
import { cn } from "../lib/cn";

const MONO = "font-studio-mono";

/**
 * A broadcast monitor — Preview (green) or Program (red, on-air) — ported 1:1
 * from the web console's `stage-monitor.tsx` chrome (border, gradient, scan
 * lines, ANTENNE/APERÇU badges, black-screen, fullscreen). The web composites a
 * DOM layer stack (CompositeLayer); the native studio composites in GStreamer,
 * so the letterboxed viewport shows the **compositor's JPEG feed** instead —
 * `overlay` draws the drag box on top.
 */
export function StageMonitor({
  tone,
  frame,
  sceneName,
  black = false,
  draggable = false,
  onFullscreen,
  overlay,
}: {
  tone: "preview" | "program";
  frame: string | null;
  sceneName: string;
  black?: boolean;
  draggable?: boolean;
  onFullscreen?: () => void;
  overlay?: ReactNode;
}) {
  const isProgram = tone === "program";
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

      {/* Letterboxed viewport → the compositor's JPEG feed, contain-fit; the
          ring marks the broadcast frame edge. The box needs a CONCRETE base
          dimension (`h-full`) — `aspect-video max-h-full max-w-full` around a
          `size-full` img is a circular size dependency that WebKitGTK (the Tauri
          webview) collapses to 0×0, so the feed showed nothing on the real app
          even though the JPEG was correct (Blink/Chromium sized it fine, hiding
          the bug in headless checks). */}
      <div className="absolute inset-0 grid place-items-center">
        {frame ? (
          <div className="relative h-full aspect-video max-w-full overflow-hidden ring-1 ring-white/15">
            <img
              src={frame}
              alt={isProgram ? "Programme" : "Aperçu"}
              draggable={false}
              className="block h-full w-full object-contain"
            />
            {overlay}
          </div>
        ) : (
          <span className={cn("text-[11px] tracking-[2px] text-white/20", MONO)}>
            — AUCUNE SOURCE VISIBLE —
          </span>
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
