"use client";

import { cn } from "@/lib/utils";
import { MONO } from "./studio-tokens";
import type { EncoderStats } from "./use-encoder-stats";

/**
 * Bottom encoder/status strip — every value is a REAL readout of the outgoing
 * WHIP connection (`use-encoder-stats.ts`), sampled from `RTCStatsReport`.
 * Shows a neutral idle state (no fabricated numbers) while not publishing.
 */
export function StatusBar({ statusRight, stats }: { statusRight: string; stats: EncoderStats }) {
  const { connected, codecName, profile, bitrateKbps, fps, droppedFrames, droppedPct, encodeLoadPct } = stats;
  return (
    <footer
      className={cn(
        "flex flex-none flex-wrap items-center gap-x-[18px] gap-y-1 rounded-xl border border-white/6 bg-studio-rail px-3.5 py-2 text-[10.5px] text-white/50",
        MONO,
      )}
    >
      <span className="flex items-center gap-1.5">
        <span className={cn("size-[7px] rounded-full", connected ? "bg-studio-preview" : "bg-white/25")} />
        {connected
          ? `ENCODEUR ${codecName ?? "—"}${profile ? ` · ${profile}` : ""}`
          : "ENCODEUR · hors ligne"}
      </span>
      <span>{connected && bitrateKbps != null ? `${bitrateKbps} kb/s` : "—"}</span>
      <span>{connected && fps != null ? `${fps} FPS` : "—"}</span>
      <span className="text-white/70">
        {connected ? `${droppedFrames} image${droppedFrames > 1 ? "s" : ""} perdue${droppedFrames > 1 ? "s" : ""} (${droppedPct}%)` : "0 image perdue"}
      </span>
      <span>
        CHARGE ENCODAGE{" "}
        <span className="text-studio-preview-bright">
          {connected && encodeLoadPct != null ? `${encodeLoadPct}%` : "—"}
        </span>
      </span>
      {statusRight && <span className="ml-auto text-gold/70">{statusRight}</span>}
    </footer>
  );
}
