import { useEffect, useRef, useState } from "react";
import { Volume2, MicOff, Headphones, VolumeX } from "lucide-react";
import { cn } from "../lib/cn";
import { Slider } from "./Slider";
import { layerMeta } from "../lib/studio-layers";
import type { StudioLayer } from "../lib/api";

const MONO = "font-studio-mono";

/** Faders write these back to the layer (persists with the scene). */
export type AudioPatch = {
  audioLevel?: number;
  audioMuted?: boolean;
  audioGain?: number;
  audioBalance?: number;
};

function isAudioActive(l: StudioLayer): boolean {
  if (!l.visible || l.audioMuted) return false;
  if (l.kind === "camera") return !!l.deviceId;
  if (l.kind === "screen") return !!l.captureActive;
  if (l.kind === "audio") return !!l.audioPlaying && !!l.audioFileUrl;
  return !!l.feedUrl?.trim();
}

function dbLabel(level: number) {
  if (level <= 0) return { v: "-∞", color: "rgba(255,255,255,.4)" };
  const db = Math.round((level / 100) * 60 - 60);
  return { v: db > 0 ? `+${db}` : String(db), color: db > -6 ? "#fbbf24" : "#34d399" };
}
const gainLabel = (g: number) => `${g > 0 ? "+" : ""}${g} dB`;
const panLabel = (p: number) => (p === 0 ? "Centre" : p < 0 ? `G ${Math.abs(p)}` : `D ${p}`);

/** Animated VU bar. Uses the REAL engine level (dB peak → %) when the channel has
 * a bus channel (CHR-124); otherwise synthesises for active audio. DOM-driven
 * (no React re-render on the hot path). Ported from the web VuMeter. */
function VuMeter({ channel, levelDb }: { channel: StudioLayer; levelDb: number | null }) {
  const barRef = useRef<HTMLDivElement>(null);
  const peakRef = useRef(0);
  const channelRef = useRef(channel);
  const hasReal = levelDb != null && Number.isFinite(levelDb);
  useEffect(() => {
    channelRef.current = channel;
  }, [channel]);
  // Real level: drive the bar from the polled dB peak.
  useEffect(() => {
    if (!hasReal || !barRef.current) return;
    const pct = Math.max(0, Math.min(100, (((levelDb as number) + 60) / 60) * 100));
    barRef.current.style.transform = `scaleX(${(100 - pct) / 100})`;
  }, [levelDb, hasReal]);
  // Synthesised fallback only when there's no real bus channel.
  useEffect(() => {
    if (hasReal) return;
    const timer = setInterval(() => {
      const ch = channelRef.current;
      const target = isAudioActive(ch) ? Math.random() * ((ch.audioLevel ?? 80) * 0.9) : 0;
      const peak = Math.max(0, Math.min(100, peakRef.current + (target - peakRef.current) * 0.4));
      if (peak !== peakRef.current || peak > 0.2) {
        peakRef.current = peak;
        if (barRef.current) barRef.current.style.transform = `scaleX(${(100 - peak) / 100})`;
      }
    }, 70);
    return () => clearInterval(timer);
  }, [hasReal]);
  return (
    <div className="relative h-[9px] overflow-hidden rounded-[5px] border border-white/6 bg-[#0a0613]">
      <div className="absolute inset-0 bg-gradient-to-r from-studio-preview via-[#fbbf24] to-studio-onair" />
      <div
        ref={barRef}
        className="absolute inset-0 origin-right bg-[#0a0613] transition-transform duration-75 ease-out"
        style={{ transform: "scaleX(1)" }}
      />
    </div>
  );
}

/**
 * Dock 3 · Audio mixer — ported 1:1 from the web console's `mixer-dock.tsx`.
 * Channels are the audio-bearing sources of the current scene; faders write the
 * volume/mute/gain/pan straight back to the layer via `onChange` (persists).
 */
export function MixerDock({
  channels,
  levels = {},
  onChange,
}: {
  channels: StudioLayer[];
  levels?: Record<string, number>;
  onChange: (id: string, patch: AudioPatch) => void;
}) {
  const [monitorMuted, setMonitorMuted] = useState(false);

  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/8 bg-studio-panel">
      <div className="flex flex-none items-center gap-2 border-b border-white/6 px-3.5 py-2.5">
        <Volume2 className="size-[15px] shrink-0 text-studio-preview-bright" strokeWidth={1.8} />
        <span className="min-w-0 truncate text-[11px] font-extrabold tracking-[1.2px] text-white uppercase">
          Table de mixage
        </span>
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <span
            className={cn(
              "rounded-full border px-2 py-[3px] text-[9px] font-bold tracking-wide",
              channels.length > 0
                ? "border-studio-preview/30 bg-studio-preview/10 text-studio-preview-bright"
                : "border-white/10 bg-white/5 text-white/40",
            )}
          >
            {channels.length} voie{channels.length > 1 ? "s" : ""}
          </span>
          <button
            type="button"
            onClick={() => setMonitorMuted((m) => !m)}
            aria-pressed={monitorMuted}
            title={
              monitorMuted
                ? "Retour local coupé — le direct continue. Cliquez pour réécouter en local."
                : "Couper le retour local (n'affecte pas le direct)"
            }
            className={cn(
              "flex size-7 items-center justify-center rounded-full border transition-colors",
              monitorMuted
                ? "border-studio-onair/50 bg-studio-onair/15 text-studio-onair"
                : "border-white/10 bg-white/5 text-white/55 hover:border-white/25 hover:text-white",
            )}
          >
            {monitorMuted ? <VolumeX className="size-3.5" /> : <Headphones className="size-3.5" />}
          </button>
        </div>
      </div>

      {channels.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center text-white/35">
          <div className="mb-1 text-[12px] font-bold">Aucune voie audio</div>
          <div className="text-[11px] leading-relaxed">
            Ajoutez une source « Direct externe », un flux VLC ou une entrée audio pour la mixer ici.
          </div>
        </div>
      ) : (
        <div className="studio-scroll flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-3">
          {channels.map((ch) => {
            const level = ch.audioLevel ?? 80;
            const gain = ch.audioGain ?? 0;
            const balance = ch.audioBalance ?? 0;
            const muted = ch.audioMuted ?? false;
            const hasSrc =
              ch.kind === "camera"
                ? !!ch.deviceId
                : ch.kind === "screen"
                  ? !!ch.captureActive
                  : ch.kind === "audio"
                    ? !!ch.audioFileUrl
                    : !!ch.feedUrl?.trim();
            const on = hasSrc && ch.visible && !muted;
            const db = dbLabel(on ? level : 0);
            const meta = layerMeta(ch.kind);
            const stateLabel = !hasSrc ? "Aucune source" : muted ? "Coupé" : !ch.visible ? "Masqué" : "Non capté";
            return (
              <div key={ch.id} className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn("size-2 rounded-full transition-opacity", !on && "opacity-30")}
                      style={{ background: meta.color }}
                    />
                    <span className="text-[11.5px] font-bold text-white">{ch.name}</span>
                  </div>
                  {on ? (
                    <span className={cn("text-[10px]", MONO)} style={{ color: db.color }}>
                      {db.v} dB
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold tracking-wide text-white/30 uppercase">{stateLabel}</span>
                  )}
                </div>

                <VuMeter channel={ch} levelDb={ch.id in levels ? levels[ch.id] : null} />

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => onChange(ch.id, { audioMuted: !muted })}
                    title={muted ? "Réactiver" : "Couper"}
                    className={cn(
                      "flex h-[26px] w-[30px] shrink-0 items-center justify-center rounded-[7px] border transition-colors",
                      muted
                        ? "border-studio-onair/40 bg-studio-onair/15 text-studio-onair"
                        : "border-white/10 bg-white/4 text-white/55 hover:text-white",
                    )}
                  >
                    <MicOff className="size-3.5" />
                  </button>
                  <Slider min={0} max={100} value={level} onValueChange={(v) => onChange(ch.id, { audioLevel: v })} className="flex-1" />
                  <span className={cn("w-[30px] text-right text-[10px] text-white/50", MONO)}>{level}</span>
                </div>

                <div className="flex items-center gap-2.5">
                  <span className="w-[30px] shrink-0 text-[9px] font-bold tracking-wide text-white/40 uppercase">Gain</span>
                  <Slider min={-20} max={20} step={1} value={gain} onValueChange={(v) => onChange(ch.id, { audioGain: v })} className="flex-1" />
                  <span className={cn("w-[46px] text-right text-[10px] text-white/50", MONO)}>{gainLabel(gain)}</span>
                </div>

                <div className="flex items-center gap-2.5">
                  <span className="w-[30px] shrink-0 text-[9px] font-bold tracking-wide text-white/40 uppercase">Pan</span>
                  <Slider min={-100} max={100} step={5} value={balance} onValueChange={(v) => onChange(ch.id, { audioBalance: v })} className="flex-1" />
                  <span className={cn("w-[46px] text-right text-[10px] text-white/50", MONO)}>{panLabel(balance)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
