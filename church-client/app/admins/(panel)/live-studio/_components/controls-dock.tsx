"use client";

import { Target, MonitorPlay, ExternalLink, TriangleAlert, SquareSplitHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MONO } from "./studio-tokens";

/**
 * Dock 5 · Studio controls. Record / Sandbox / Console layout are OBS chrome
 * (stub — TODO(studio): wire to a real engine). "Aperçu spectateur" is real: it
 * opens the public live page in a new tab.
 */
export function ControlsDock({
  recording,
  onToggleRecord,
  recLabel,
  sandbox,
  onToggleSandbox,
  dualLayout,
  onToggleLayout,
}: {
  recording: boolean;
  onToggleRecord: () => void;
  recLabel: string;
  sandbox: boolean;
  onToggleSandbox: () => void;
  dualLayout: boolean;
  onToggleLayout: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/8 bg-studio-panel">
      <div className="flex flex-none items-center gap-2 border-b border-white/6 px-3.5 py-2.5">
        <Target className="size-[15px] text-gold" strokeWidth={1.8} />
        <span className="text-[11px] font-extrabold tracking-[1px] text-white uppercase">
          Commandes studio
        </span>
      </div>

      <ScrollArea className="flex min-h-0 flex-1 flex-col gap-2.5 p-2.5">
        <button
          type="button"
          onClick={onToggleRecord}
          className={cn(
            "flex items-center gap-2.5 rounded-[10px] border px-3 py-3 text-left transition hover:brightness-110",
            recording
              ? "border-studio-onair/40 bg-studio-onair/12"
              : "border-white/10 bg-white/[0.03]",
          )}
        >
          <span
            className={cn(
              "size-[11px] shrink-0",
              recording ? "rounded-full bg-studio-onair" : "rounded-[2px] bg-white/40",
            )}
          />
          <span className="flex-1">
            <span className="block text-[12px] font-bold text-white">
              {recording ? "Arrêter l'enregistrement" : "Démarrer l'enregistrement"}
            </span>
            <span className={cn("block text-[9.5px] text-white/45", MONO)}>
              {recording ? recLabel : "Prêt"}
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={onToggleSandbox}
          className="flex items-center gap-2.5 rounded-[10px] border border-white/10 bg-white/[0.03] px-3 py-3 text-left"
        >
          <span
            className={cn(
              "relative h-5 w-[34px] shrink-0 rounded-full transition-colors",
              sandbox ? "bg-studio-sandbox" : "bg-white/15",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 size-4 rounded-full bg-white transition-all",
                sandbox ? "left-4" : "left-0.5",
              )}
            />
          </span>
          <span className="flex-1">
            <span className="block text-[12px] font-bold text-white">Mode Test · Sandbox</span>
            <span className="block text-[9.5px] text-white/45">Environnement isolé</span>
          </span>
        </button>

        <button
          type="button"
          onClick={onToggleLayout}
          className="flex items-center gap-2.5 rounded-[10px] border border-white/10 bg-white/[0.03] px-3 py-3 text-left transition-colors hover:border-studio-purple/45"
        >
          <SquareSplitHorizontal className="size-[17px] shrink-0 text-studio-purple" strokeWidth={1.7} />
          <span className="flex-1">
            <span className="block text-[12px] font-bold text-white">Disposition console</span>
            <span className="block text-[9.5px] text-white/45">
              {dualLayout ? "Aperçu + Antenne" : "Antenne seule"}
            </span>
          </span>
        </button>

        <a
          href="/live"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 rounded-[10px] border border-gold/25 bg-gold/[0.07] px-3 py-3 text-left transition-colors hover:bg-gold/[0.13]"
        >
          <ExternalLink className="size-4 shrink-0 text-gold" strokeWidth={1.8} />
          <span className="flex-1">
            <span className="block text-[12px] font-bold text-gold">Aperçu spectateur</span>
            <span className="block text-[9.5px] text-gold/55">Ouvrir la page live</span>
          </span>
          <MonitorPlay className="size-4 shrink-0 text-gold/40" />
        </a>

        {sandbox && (
          <div className="mt-0.5 rounded-[9px] border border-studio-sandbox/28 bg-studio-sandbox/[0.08] px-3 py-2.5">
            <div className="mb-1.5 flex items-center gap-1.5">
              <TriangleAlert className="size-3 text-studio-sandbox" />
              <span className="text-[10px] font-extrabold tracking-[0.6px] text-studio-sandbox">
                SANDBOX ACTIF
              </span>
            </div>
            <p className="m-0 text-[10.5px] leading-relaxed text-white/60">
              Tchat et demandes de prière contournent la base : exécution en mémoire locale
              temporaire, jamais enregistrée.
            </p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
