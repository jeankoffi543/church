"use client";

import { Settings2, Radio, TriangleAlert, Square } from "lucide-react";

import { cn } from "@/lib/utils";
import { MONO } from "./studio-tokens";

/**
 * Broadcast control-bar header: brand lockup + settings, sandbox banner, and the
 * PREVIEW/LIVE program-mode switch with the on-air / recording indicators.
 *
 * The PREVIEW/LIVE mode, sandbox and recording flags are OBS "chrome" state
 * (stub — TODO(studio): drive from a real scene/broadcast engine). The settings
 * gear opens the real live-configuration modal.
 */
export function StudioHeader({
  mode,
  onModeChange,
  sandbox,
  recording,
  recLabel,
  onOpenSettings,
}: {
  mode: "preview" | "live";
  onModeChange: (mode: "preview" | "live") => void;
  sandbox: boolean;
  recording: boolean;
  recLabel: string;
  onOpenSettings: () => void;
}) {
  return (
    <header className="relative flex flex-none items-center gap-4 rounded-2xl border border-white/8 bg-studio-panel px-3.5 py-2.5">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-gold to-gold-dark shadow-[0_6px_16px_rgba(200,144,46,.3)]">
          <Radio className="size-5 text-ink" strokeWidth={2} />
        </span>
        <div className="min-w-0 leading-tight">
          <div className="text-[9px] font-extrabold tracking-[2.6px] text-gold uppercase">
            Régie Live · Production
          </div>
          <div className="font-serif text-[21px] font-bold whitespace-nowrap text-white italic">
            MFM Studio Control
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenSettings}
          title="Paramètres de la régie"
          className="ml-1 flex size-9 items-center justify-center rounded-[10px] border border-white/8 bg-white/4 text-white/60 transition-colors hover:bg-white/8 hover:text-gold"
        >
          <Settings2 className="size-[18px]" />
        </button>
      </div>

      {sandbox && (
        <div className="flex animate-sandbox-flash items-center gap-1.5 rounded-[9px] border border-studio-sandbox/60 px-3 py-1.5">
          <TriangleAlert className="size-[15px] text-studio-sandbox" />
          <span className="text-[11px] font-extrabold tracking-[1.4px] text-studio-sandbox">
            MODE TEST · SANDBOX
          </span>
        </div>
      )}

      <div className="ml-auto flex items-center gap-2.5">
        {mode === "live" ? (
          <span className="relative flex animate-onair-pulse items-center gap-1.5 rounded-[10px] border border-studio-onair/32 bg-studio-onair/15 px-3 py-[7px] text-[11px] font-extrabold tracking-[1px] text-[#ff9a9a]">
            <span className="size-2 animate-studio-blink rounded-full bg-studio-onair" />
            EN DIRECT
          </span>
        ) : (
          <span className="flex items-center gap-1.5 rounded-[10px] border border-white/8 bg-white/4 px-3 py-[7px] text-[11px] font-extrabold tracking-[1px] text-white/50">
            <span className="size-2 rounded-full bg-white/30" />
            HORS DIRECT
          </span>
        )}

        {recording && (
          <span
            className={cn(
              "flex items-center gap-1.5 rounded-[10px] border border-studio-onair/25 bg-studio-onair/10 px-2.5 py-[7px] text-[12px] font-bold text-[#ff9a9a]",
              MONO,
            )}
          >
            <span className="size-[9px] animate-rec-blink rounded-full bg-studio-onair" />
            REC {recLabel}
          </span>
        )}

        {mode === "live" ? (
          <button
            type="button"
            onClick={() => onModeChange("preview")}
            className="flex cursor-pointer items-center gap-1.5 rounded-[10px] border border-studio-onair/40 bg-studio-onair/15 px-4 py-[7px] text-[11px] font-extrabold tracking-[0.6px] text-[#ff9a9a] transition hover:bg-studio-onair/25"
          >
            <Square className="size-3 fill-current" />
            Arrêter le direct
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onModeChange("live")}
            className="flex cursor-pointer items-center gap-1.5 rounded-[10px] border border-emerald-400/40 bg-emerald-500/15 px-4 py-[7px] text-[11px] font-extrabold tracking-[0.6px] text-emerald-300 shadow-[0_0_16px_rgba(16,185,129,0.18)] transition hover:bg-emerald-500/25"
          >
            <Radio className="size-3.5" />
            Passer en direct
          </button>
        )}
      </div>
    </header>
  );
}
