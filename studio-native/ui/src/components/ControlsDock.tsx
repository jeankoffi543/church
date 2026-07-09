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
import { cn } from "../lib/cn";

const MONO = "font-studio-mono";

/**
 * Dock 5 · Studio controls — ported 1:1 from the web `controls-dock.tsx`.
 * Primary action = Démarrer le live (broadcast, or a sandbox rehearsal); then
 * record, "Animer à chaque CUT", Mode Test, console layout, reset docks, and the
 * viewer preview. Data adapted to our Tauri output commands.
 */
export function ControlsDock({
  liveActive,
  liveBusy = false,
  liveState,
  liveError,
  onStartLive,
  onStopLive,
  sandboxRehearsal = false,
  recording,
  recBusy = false,
  onToggleRecord,
  recLabel,
  sandbox,
  sandboxLocked = false,
  onToggleSandbox,
  dualLayout,
  onToggleLayout,
  onResetDockWidths,
  replayOnCut,
  onToggleReplayOnCut,
  onOpenSettings,
}: {
  liveActive: boolean;
  liveBusy?: boolean;
  liveState: "idle" | "connecting" | "connected" | "failed";
  liveError: string | null;
  onStartLive: () => void;
  onStopLive: () => void;
  sandboxRehearsal?: boolean;
  recording: boolean;
  recBusy?: boolean;
  onToggleRecord: () => void;
  recLabel: string;
  sandbox: boolean;
  sandboxLocked?: boolean;
  onToggleSandbox: () => void;
  dualLayout: boolean;
  onToggleLayout: () => void;
  onResetDockWidths: () => void;
  replayOnCut: boolean;
  onToggleReplayOnCut: () => void;
  onOpenSettings: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/8 bg-studio-panel">
      <div className="flex flex-none items-center gap-2 border-b border-white/6 px-3.5 py-2.5">
        <Target className="size-[15px] text-gold" strokeWidth={1.8} />
        <span className="text-[11px] font-extrabold tracking-[1px] text-white uppercase">Commandes studio</span>
      </div>

      <div className="studio-scroll flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto p-2.5">
        <button
          type="button"
          onClick={liveActive ? onStopLive : onStartLive}
          disabled={liveBusy}
          className={cn(
            "flex items-center gap-2.5 rounded-[10px] border px-3 py-3 text-left transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60",
            liveActive
              ? "border-studio-onair/45 bg-studio-onair/12"
              : sandboxRehearsal
                ? "border-studio-sandbox/45 bg-studio-sandbox/12"
                : "border-[#1877f2]/45 bg-[#1877f2]/12",
          )}
        >
          <span className="flex size-8 shrink-0 items-center justify-center">
            {liveBusy ? (
              <Loader2 className="size-5 animate-spin text-white/80" />
            ) : liveActive ? (
              <Square className="size-4 fill-studio-onair text-studio-onair" />
            ) : sandboxRehearsal ? (
              <TriangleAlert className="size-5 text-studio-sandbox" strokeWidth={1.9} />
            ) : (
              <RadioTower className="size-5 text-[#4a94ff]" strokeWidth={1.9} />
            )}
          </span>
          <span className="flex-1">
            <span className="block text-[12px] font-bold text-white">
              {sandboxRehearsal
                ? liveActive
                  ? "Arrêter le test"
                  : "Démarrer le test"
                : liveActive
                  ? "Arrêter le live"
                  : "Démarrer le live"}
            </span>
            <span className={cn("block text-[9.5px] text-white/50", MONO)}>
              {sandboxRehearsal
                ? "Répétition locale · rien n'est diffusé"
                : liveActive
                  ? liveState === "connected"
                    ? "En direct · Facebook"
                    : liveState === "failed"
                      ? "Diffusion en échec"
                      : "En direct"
                  : "Diffusion Facebook (RTMPS)"}
            </span>
          </span>
          {liveActive && (
            <span
              className={cn(
                "size-2 shrink-0 rounded-full",
                sandboxRehearsal
                  ? "bg-studio-sandbox"
                  : liveState === "failed"
                    ? "bg-red-400"
                    : "relative animate-onair-pulse bg-studio-onair",
              )}
            />
          )}
        </button>
        {liveError && <p className="-mt-1 px-1 text-[10.5px] leading-snug text-red-400">{liveError}</p>}

        <button
          type="button"
          onClick={onToggleRecord}
          disabled={recBusy}
          title="Enregistre le flux du programme (compositeur + mixage) dans un fichier local, que le direct soit lancé ou non."
          className={cn(
            "flex items-center gap-2.5 rounded-[10px] border px-3 py-3 text-left transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60",
            recording ? "border-studio-onair/40 bg-studio-onair/12" : "border-white/10 bg-white/[0.03]",
          )}
        >
          {recBusy ? (
            <Loader2 className="size-[11px] shrink-0 animate-spin text-white/60" />
          ) : (
            <span className={cn("size-[11px] shrink-0", recording ? "rounded-full bg-studio-onair" : "rounded-[2px] bg-white/40")} />
          )}
          <span className="flex-1">
            <span className="block text-[12px] font-bold text-white">
              {recording ? "Arrêter l'enregistrement" : "Démarrer l'enregistrement"}
            </span>
            <span className={cn("block text-[9.5px] text-white/45", MONO)}>{recording ? recLabel : "Fichier local (.mp4)"}</span>
          </span>
        </button>

        <button
          type="button"
          onClick={onToggleReplayOnCut}
          title="Défaut : chaque CUT rejoue l'animation des sources réglées sur « Auto »."
          className="flex items-center gap-2.5 rounded-[10px] border border-white/10 bg-white/[0.03] px-3 py-3 text-left transition-colors hover:border-studio-purple/45"
        >
          <Sparkles className="size-[17px] shrink-0 text-studio-purple" strokeWidth={1.7} />
          <span className="flex-1">
            <span className="block text-[12px] font-bold text-white">Animer à chaque CUT</span>
            <span className="block text-[9.5px] text-white/45">
              {replayOnCut ? "Défaut : rejoue à l'antenne" : "Défaut : 1re apparition seule"}
            </span>
          </span>
          <span className={cn("relative h-5 w-[34px] shrink-0 rounded-full transition-colors", replayOnCut ? "bg-studio-purple" : "bg-white/15")}>
            <span className={cn("absolute top-0.5 size-4 rounded-full bg-white transition-all", replayOnCut ? "left-4" : "left-0.5")} />
          </span>
        </button>

        <button
          type="button"
          onClick={onToggleSandbox}
          disabled={sandboxLocked}
          title={sandboxLocked ? "Arrêtez le direct avant d'activer le mode test." : "Rien n'est jamais envoyé à Facebook tant que ce mode est actif."}
          className="flex items-center gap-2.5 rounded-[10px] border border-white/10 bg-white/[0.03] px-3 py-3 text-left disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className={cn("relative h-5 w-[34px] shrink-0 rounded-full transition-colors", sandbox ? "bg-studio-sandbox" : "bg-white/15")}>
            <span className={cn("absolute top-0.5 size-4 rounded-full bg-white transition-all", sandbox ? "left-4" : "left-0.5")} />
          </span>
          <span className="flex-1">
            <span className="block text-[12px] font-bold text-white">Mode Test · Sandbox</span>
            <span className="block text-[9.5px] text-white/45">Jamais sur Facebook</span>
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
            <span className="block text-[9.5px] text-white/45">{dualLayout ? "Aperçu + Antenne" : "Antenne seule"}</span>
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
            <span className="block text-[9.5px] text-white/45">Position, visibilité et largeur des panneaux</span>
          </span>
        </button>

        <button
          type="button"
          onClick={onOpenSettings}
          className="flex items-center gap-2.5 rounded-[10px] border border-gold/25 bg-gold/[0.07] px-3 py-3 text-left transition-colors hover:bg-gold/[0.13]"
        >
          <ExternalLink className="size-4 shrink-0 text-gold" strokeWidth={1.8} />
          <span className="flex-1">
            <span className="block text-[12px] font-bold text-gold">Paramètres de la régie</span>
            <span className="block text-[9.5px] text-gold/55">Stream Facebook, encodeur, sortie</span>
          </span>
          <MonitorPlay className="size-4 shrink-0 text-gold/40" />
        </button>

        {sandbox && (
          <div className="mt-0.5 rounded-[9px] border border-studio-sandbox/28 bg-studio-sandbox/[0.08] px-3 py-2.5">
            <div className="mb-1.5 flex items-center gap-1.5">
              <TriangleAlert className="size-3 text-studio-sandbox" />
              <span className="text-[10px] font-extrabold tracking-[0.6px] text-studio-sandbox">SANDBOX ACTIF</span>
            </div>
            <p className="m-0 text-[10.5px] leading-relaxed text-white/60">
              La diffusion encode tout localement (les stats sont réelles) mais rien n&apos;est envoyé à Facebook
              tant que ce mode est actif.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
