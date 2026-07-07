"use client";

import {
  Target,
  MonitorPlay,
  ExternalLink,
  TriangleAlert,
  SquareSplitHorizontal,
  RadioTower,
  Square,
  Loader2,
  Columns3,
  Sparkles,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MONO } from "./studio-tokens";
import type { WhipState } from "./whip-publisher";

/**
 * Dock 5 · Studio controls. The primary action — "Démarrer le live" — runs the
 * program-out compositor + Facebook broadcast AND flips the public site live in
 * one gesture. Record / Sandbox / Console layout are OBS chrome (stub). "Aperçu
 * spectateur" opens the public live page in a new tab.
 */
export function ControlsDock({
  liveActive,
  liveBusy,
  liveState,
  liveError,
  onStartLive,
  onStopLive,
  recording,
  onToggleRecord,
  recLabel,
  sandbox,
  onToggleSandbox,
  dualLayout,
  onToggleLayout,
  onResetDockWidths,
  replayOnCut,
  onToggleReplayOnCut,
}: {
  liveActive: boolean;
  liveBusy: boolean;
  liveState: WhipState | "idle";
  liveError: string | null;
  onStartLive: () => void;
  onStopLive: () => void;
  recording: boolean;
  onToggleRecord: () => void;
  recLabel: string;
  sandbox: boolean;
  onToggleSandbox: () => void;
  dualLayout: boolean;
  onToggleLayout: () => void;
  onResetDockWidths: () => void;
  /** Replay entrance animations on every CUT (true), or only on first appearance. */
  replayOnCut: boolean;
  onToggleReplayOnCut: () => void;
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
        {/* Primary action — Facebook broadcast + public site live in one gesture. */}
        <button
          type="button"
          onClick={liveActive ? onStopLive : onStartLive}
          disabled={liveBusy}
          className={cn(
            "flex items-center gap-2.5 rounded-[10px] border px-3 py-3 text-left transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60",
            liveActive
              ? "border-studio-onair/45 bg-studio-onair/12"
              : "border-[#1877f2]/45 bg-[#1877f2]/12",
          )}
        >
          <span className="flex size-8 shrink-0 items-center justify-center">
            {liveBusy ? (
              <Loader2 className="size-5 animate-spin text-white/80" />
            ) : liveActive ? (
              <Square className="size-4 fill-studio-onair text-studio-onair" />
            ) : (
              <RadioTower className="size-5 text-[#4a94ff]" strokeWidth={1.9} />
            )}
          </span>
          <span className="flex-1">
            <span className="block text-[12px] font-bold text-white">
              {liveActive ? "Arrêter le live" : "Démarrer le live"}
            </span>
            <span className={cn("block text-[9.5px] text-white/50", MONO)}>
              {liveActive
                ? liveState === "connected"
                  ? "En direct · Facebook + site"
                  : liveState === "failed"
                    ? "Diffusion en échec"
                    : liveState === "connecting"
                      ? "Connexion à Facebook…"
                      : "En direct · site"
                : "Facebook + site en même temps"}
            </span>
          </span>
          {liveActive && (
            <span
              className={cn(
                "size-2 shrink-0 rounded-full",
                liveState === "connected"
                  ? "relative animate-onair-pulse bg-studio-onair"
                  : liveState === "failed"
                    ? "bg-red-400"
                    : "bg-studio-sandbox",
              )}
            />
          )}
        </button>
        {liveError && (
          <p className="-mt-1 px-1 text-[10.5px] leading-snug text-red-400">{liveError}</p>
        )}

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
          onClick={onToggleReplayOnCut}
          title={
            replayOnCut
              ? "Défaut : chaque CUT rejoue l'animation des sources réglées sur « Auto ». Réglable par source dans l'onglet Anim."
              : "Défaut : les sources « Auto » s'animent seulement à leur première apparition. Une source peut forcer « Toujours » dans l'onglet Anim. La bible s'anime au changement de verset."
          }
          className="flex items-center gap-2.5 rounded-[10px] border border-white/10 bg-white/[0.03] px-3 py-3 text-left transition-colors hover:border-studio-purple/45"
        >
          <Sparkles className="size-[17px] shrink-0 text-studio-purple" strokeWidth={1.7} />
          <span className="flex-1">
            <span className="block text-[12px] font-bold text-white">Animer à chaque CUT</span>
            <span className="block text-[9.5px] text-white/45">
              {replayOnCut ? "Défaut : rejoue à l'antenne" : "Défaut : 1re apparition seule"}
            </span>
          </span>
          <span
            className={cn(
              "relative h-5 w-[34px] shrink-0 rounded-full transition-colors",
              replayOnCut ? "bg-studio-purple" : "bg-white/15",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 size-4 rounded-full bg-white transition-all",
                replayOnCut ? "left-4" : "left-0.5",
              )}
            />
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

        <button
          type="button"
          onClick={onResetDockWidths}
          className="flex items-center gap-2.5 rounded-[10px] border border-white/10 bg-white/[0.03] px-3 py-3 text-left transition-colors hover:border-studio-purple/45"
        >
          <Columns3 className="size-[17px] shrink-0 text-studio-purple" strokeWidth={1.7} />
          <span className="flex-1">
            <span className="block text-[12px] font-bold text-white">Disposition par défaut</span>
            <span className="block text-[9.5px] text-white/45">
              Position, visibilité et largeur des panneaux
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
