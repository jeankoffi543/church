"use client";

import { cn } from "@/lib/utils";
import { MONO } from "./studio-tokens";

/**
 * Bottom encoder/status strip. The technical readouts (encoder, bitrate, FPS,
 * dropped frames, CPU) are OBS chrome — TODO(studio): feed from a real encoder
 * stats source. `statusRight` carries the live console's real status message.
 */
export function StatusBar({ statusRight }: { statusRight: string }) {
  return (
    <footer
      className={cn(
        "flex flex-none flex-wrap items-center gap-x-[18px] gap-y-1 rounded-xl border border-white/6 bg-studio-rail px-3.5 py-2 text-[10.5px] text-white/50",
        MONO,
      )}
    >
      <span className="flex items-center gap-1.5">
        <span className="size-[7px] rounded-full bg-studio-preview" />
        ENCODEUR x264 · high
      </span>
      <span>4500 kb/s</span>
      <span>60 FPS</span>
      <span className="text-white/70">0 images perdues</span>
      <span>
        CPU <span className="text-studio-preview-bright">14%</span>
      </span>
      {statusRight && <span className="ml-auto text-gold/70">{statusRight}</span>}
    </footer>
  );
}
