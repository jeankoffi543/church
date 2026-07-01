"use client";

import { useState } from "react";
import { Volume2, MicOff } from "lucide-react";

import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MONO } from "./studio-tokens";

/**
 * Dock 3 · Audio mixer. OBS chrome — TODO(studio): wire channels to a real audio
 * graph (levels, mutes, VU peaks). The faders/meters operate on local state.
 */
type StubChannel = { name: string; level: number; muted: boolean; vu: number };

const DEMO_CHANNELS: StubChannel[] = [
  { name: "Audio Bureau", level: 62, muted: false, vu: 40 },
  { name: "Micro Prédicateur", level: 78, muted: false, vu: 22 },
  { name: "Boucle Média VLC", level: 34, muted: true, vu: 66 },
];

function dbLabel(level: number) {
  if (level <= 0) return { v: "-∞", color: "rgba(255,255,255,.4)" };
  const db = Math.round((level / 100) * 60 - 60);
  return { v: db > 0 ? `+${db}` : String(db), color: db > -6 ? "#fbbf24" : "#34d399" };
}

export function MixerDock() {
  const [channels, setChannels] = useState<StubChannel[]>(DEMO_CHANNELS);

  const setLevel = (i: number, level: number) =>
    setChannels((prev) => prev.map((c, idx) => (idx === i ? { ...c, level } : c)));
  const toggleMute = (i: number) =>
    setChannels((prev) => prev.map((c, idx) => (idx === i ? { ...c, muted: !c.muted } : c)));

  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/8 bg-studio-panel">
      <div className="flex flex-none items-center gap-2 border-b border-white/6 px-3.5 py-2.5">
        <Volume2 className="size-[15px] text-studio-preview-bright" strokeWidth={1.8} />
        <span className="text-[11px] font-extrabold tracking-[1.2px] text-white uppercase">
          Table de mixage
        </span>
      </div>

      <ScrollArea className="flex min-h-0 flex-1 flex-col gap-3.5 p-3">
        {channels.map((ch, i) => {
          const db = dbLabel(ch.muted ? 0 : ch.level);
          return (
            <div key={ch.name}>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[11.5px] font-bold text-white">{ch.name}</span>
                <span className={cn("text-[10px]", MONO)} style={{ color: db.color }}>
                  {db.v} dB
                </span>
              </div>

              {/* VU meter (stub fill) */}
              <div className="relative h-[9px] overflow-hidden rounded-[5px] border border-white/6 bg-[#0a0613]">
                <div className="absolute inset-0 bg-gradient-to-r from-studio-preview via-[#fbbf24] to-studio-onair" />
                <div
                  className="absolute inset-y-0 right-0 bg-[#0a0613]"
                  style={{ width: `${100 - (ch.muted ? 0 : ch.vu)}%` }}
                />
              </div>

              <div className="mt-2 flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => toggleMute(i)}
                  title={ch.muted ? "Réactiver" : "Couper"}
                  className={cn(
                    "flex h-[26px] w-[30px] shrink-0 items-center justify-center rounded-[7px] border transition-colors",
                    ch.muted
                      ? "border-studio-onair/40 bg-studio-onair/15 text-studio-onair"
                      : "border-white/10 bg-white/4 text-white/55 hover:text-white",
                  )}
                >
                  <MicOff className="size-3.5" />
                </button>
                <Slider
                  min={0}
                  max={100}
                  value={ch.level}
                  onValueChange={(v) => setLevel(i, v)}
                  className="flex-1"
                />
                <span className={cn("w-[30px] text-right text-[10px] text-white/50", MONO)}>
                  {ch.level}
                </span>
              </div>
            </div>
          );
        })}
      </ScrollArea>
    </div>
  );
}
