"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { Volume2, MicOff, Headphones, VolumeX } from "lucide-react";

import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MONO } from "./studio-tokens";
import { LAYER_META, isAudioActive, type StudioLayer } from "./studio-layers";
import {
  readAudioLevel,
  hasAudioProbe,
  getMonitorMuted,
  setMonitorMuted,
  subscribeMonitorMuted,
} from "./studio-audio";

/**
 * Dock 3 · Audio mixer. Real channels are the audio-bearing sources of the
 * current scene (`channels`) — Direct externe / Flux VLC / entrées audio. Faders
 * write straight back to the layer via `onChange` (volume / mute / gain / pan),
 * so the config persists with the scene. The VU meters are an animated peak
 * simulation driven off each channel's live level.
 */
export type AudioPatch = Pick<StudioLayer, "audioLevel" | "audioMuted" | "audioGain" | "audioBalance">;

/** Fader level (0-100) → dB readout, coloured by headroom. */
function dbLabel(level: number) {
  if (level <= 0) return { v: "-∞", color: "rgba(255,255,255,.4)" };
  const db = Math.round((level / 100) * 60 - 60);
  return { v: db > 0 ? `+${db}` : String(db), color: db > -6 ? "#fbbf24" : "#34d399" };
}

const gainLabel = (g: number) => `${g > 0 ? "+" : ""}${g} dB`;
const panLabel = (p: number) => {
  if (p === 0) return "Centre";
  return p < 0 ? `G ${Math.abs(p)}` : `D ${p}`;
};

/**
 * Animated VU bar for one channel. The peak is written STRAIGHT to the DOM from
 * its own timer — a `setState` version of this ticking at 70ms re-rendered the
 * entire dock ~14×/s and pinned the CPU (measured: the biggest idle burner of
 * the whole console). Prefer the REAL captured level (Web Audio RMS for owned
 * media, or YouTube player-state sync); only fall back to a synthesised level
 * for hardware audio-device inputs, which the browser can't meter.
 */
function VuMeter({ channel }: { channel: StudioLayer }) {
  const barRef = useRef<HTMLDivElement>(null);
  const peakRef = useRef(0);
  const channelRef = useRef(channel);
  useEffect(() => {
    channelRef.current = channel;
  }, [channel]);

  useEffect(() => {
    const timer = setInterval(() => {
      const ch = channelRef.current;
      const real = readAudioLevel(ch.id);
      let target = 0;
      if (real != null) {
        target = real;
      } else if (ch.type === "audio" && isAudioActive(ch)) {
        target = Math.random() * ((ch.audioLevel ?? 80) * 0.9);
      }
      const peak = Math.max(0, Math.min(100, peakRef.current + (target - peakRef.current) * 0.4));
      // Skip the DOM write when the meter is parked at 0 (idle channel).
      if (peak !== peakRef.current || peak > 0.2) {
        peakRef.current = peak;
        const el = barRef.current;
        // scaleX (not width): transform transitions run on the compositor —
        // animating `width` recalced style+layout every frame, ~60×/s.
        if (el) el.style.transform = `scaleX(${(100 - peak) / 100})`;
      }
    }, 70);
    return () => clearInterval(timer);
  }, []);

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

export function MixerDock({
  channels,
  onChange,
}: {
  channels: StudioLayer[];
  onChange: (id: string, patch: Partial<AudioPatch>) => void;
}) {
  const monitorMuted = useSyncExternalStore(subscribeMonitorMuted, getMonitorMuted, () => false);

  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/8 bg-studio-panel">
      <div className="flex flex-none items-center gap-2 border-b border-white/6 px-3.5 py-2.5">
        <Volume2 className="size-[15px] text-studio-preview-bright" strokeWidth={1.8} />
        <span className="text-[11px] font-extrabold tracking-[1.2px] text-white uppercase">
          Table de mixage
        </span>
        <button
          type="button"
          onClick={() => setMonitorMuted(!monitorMuted)}
          title={
            monitorMuted
              ? "Retour local coupé — le direct continue. Cliquez pour réécouter en local."
              : "Couper le retour local (n'affecte pas le direct)"
          }
          className={cn(
            "ml-auto flex items-center gap-1 rounded-md px-1.5 py-1 text-[9px] font-bold tracking-wide uppercase transition-colors",
            monitorMuted
              ? "bg-studio-onair/15 text-studio-onair"
              : "text-white/45 hover:text-white",
          )}
        >
          {monitorMuted ? <VolumeX className="size-3.5" /> : <Headphones className="size-3.5" />}
          {monitorMuted ? "Local coupé" : "Retour local"}
        </button>
        <span className="rounded-md bg-white/6 px-1.5 py-[3px] text-[9px] font-bold text-white/50">
          {channels.length} voie{channels.length > 1 ? "s" : ""}
        </span>
      </div>

      {channels.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center text-white/35">
          <div className="mb-1 text-[12px] font-bold">Aucune voie audio</div>
          <div className="text-[11px] leading-relaxed">
            Ajoutez une source « Direct externe », un flux VLC ou une entrée audio pour la mixer ici.
          </div>
        </div>
      ) : (
        <ScrollArea className="flex min-h-0 flex-1 flex-col gap-4 p-3">
          {channels.map((ch) => {
            const level = ch.audioLevel ?? 80;
            const gain = ch.audioGain ?? 0;
            const balance = ch.audioBalance ?? 0;
            const muted = ch.audioMuted ?? false;
            const hasSrc =
              ch.type === "audio"
                ? !!ch.device?.trim()
                : ch.type === "camera"
                  ? !!ch.deviceId
                  : !!ch.feedUrl?.trim();
            const probed = hasAudioProbe(ch.id);
            // "Capturable" = real probe registered, or a hardware audio device.
            const capturable = probed || ch.type === "audio";
            const on = hasSrc && ch.visible && !muted && capturable;
            const db = dbLabel(on ? level : 0);
            const meta = LAYER_META[ch.type];
            const stateLabel = !hasSrc
              ? "Aucune source"
              : muted
                ? "Coupé"
                : !ch.visible
                  ? "Masqué"
                  : "Non capté";
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
                    <span className="text-[9px] font-bold tracking-wide text-white/30 uppercase">
                      {stateLabel}
                    </span>
                  )}
                </div>

                {/* Animated VU meter (peak) — DOM-driven, no React re-render */}
                <VuMeter channel={ch} />

                {/* Volume fader + mute */}
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
                  <Slider
                    min={0}
                    max={100}
                    value={level}
                    onValueChange={(v) => onChange(ch.id, { audioLevel: v })}
                    className="flex-1"
                  />
                  <span className={cn("w-[30px] text-right text-[10px] text-white/50", MONO)}>
                    {level}
                  </span>
                </div>

                {/* Gain (dB) */}
                <div className="flex items-center gap-2.5">
                  <span className="w-[30px] shrink-0 text-[9px] font-bold tracking-wide text-white/40 uppercase">
                    Gain
                  </span>
                  <Slider
                    min={-20}
                    max={20}
                    step={1}
                    value={gain}
                    onValueChange={(v) => onChange(ch.id, { audioGain: v })}
                    className="flex-1"
                  />
                  <span className={cn("w-[46px] text-right text-[10px] text-white/50", MONO)}>
                    {gainLabel(gain)}
                  </span>
                </div>

                {/* Balance / pan (L ── R) */}
                <div className="flex items-center gap-2.5">
                  <span className="w-[30px] shrink-0 text-[9px] font-bold tracking-wide text-white/40 uppercase">
                    Pan
                  </span>
                  <Slider
                    min={-100}
                    max={100}
                    step={5}
                    value={balance}
                    onValueChange={(v) => onChange(ch.id, { audioBalance: v })}
                    className="flex-1"
                  />
                  <span className={cn("w-[46px] text-right text-[10px] text-white/50", MONO)}>
                    {panLabel(balance)}
                  </span>
                </div>
              </div>
            );
          })}
        </ScrollArea>
      )}
    </div>
  );
}
