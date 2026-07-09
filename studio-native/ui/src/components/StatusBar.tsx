import { cn } from "../lib/cn";

const MONO = "font-studio-mono";

export type EncoderStats = {
  connected: boolean;
  codecName?: string | null;
  profile?: string | null;
  bitrateKbps: number | null;
  fps: number | null;
  droppedFrames: number;
  droppedPct: number;
  encodeLoadPct: number | null;
};

/**
 * Bottom encoder/status strip — ported 1:1 from the web console's
 * `status-bar.tsx`. Values are the real readout of the active output (our
 * `output_stats`); a neutral idle state while not publishing.
 */
export function StatusBar({ statusRight, stats }: { statusRight: string; stats: EncoderStats }) {
  const { connected, codecName, profile, bitrateKbps, fps, droppedFrames, droppedPct, encodeLoadPct } =
    stats;
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
        {connected
          ? `${droppedFrames} image${droppedFrames > 1 ? "s" : ""} perdue${droppedFrames > 1 ? "s" : ""} (${droppedPct}%)`
          : "0 image perdue"}
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
