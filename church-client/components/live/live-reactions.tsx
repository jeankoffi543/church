"use client";

import { Flame, Heart, HeartHandshake } from "lucide-react";
import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";

import type { ReactionType } from "@/lib/live";

const REACTIONS: { type: ReactionType; Icon: typeof Heart; color: string; label: string }[] = [
  { type: "flame", Icon: Flame, color: "#ff9b3d", label: "Flamme" },
  { type: "heart", Icon: Heart, color: "#ff5b8a", label: "Cœur" },
  { type: "hands", Icon: HeartHandshake, color: "#ffd36b", label: "Amen" },
];

const COLOR: Record<ReactionType, string> = { flame: "#ff9b3d", heart: "#ff5b8a", hands: "#ffd36b" };
const ICON: Record<ReactionType, typeof Heart> = { flame: Flame, heart: Heart, hands: HeartHandshake };

type Particle = { id: number; type: ReactionType; left: number; drift: number; scale: number };

export type ReactionsHandle = { spawn: (type: ReactionType) => void };

/**
 * Floating-emoji layer + the reaction buttons. Particles are spawned only from
 * the WebSocket echo (via the `ref.spawn` imperative handle), so every viewer
 * sees the same bursts. Each particle clears its own timer, and all pending
 * timers are flushed on unmount — no leak even under a reaction storm.
 */
export function LiveReactions({
  onReact,
  ref,
}: {
  onReact: (type: ReactionType) => void;
  ref?: Ref<ReactionsHandle>;
}) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const timers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const seq = useRef(0);

  useImperativeHandle(ref, () => ({
    spawn(type: ReactionType) {
      const id = ++seq.current;
      const particle: Particle = {
        id,
        type,
        left: 12 + Math.random() * 70,
        drift: Math.random() * 40 - 20,
        scale: 0.85 + Math.random() * 0.5,
      };
      setParticles((prev) => (prev.length > 60 ? [...prev.slice(-40), particle] : [...prev, particle]));

      const timer = setTimeout(() => {
        setParticles((prev) => prev.filter((p) => p.id !== id));
        timers.current.delete(timer);
      }, 2400);
      timers.current.add(timer);
    },
  }));

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
      pending.clear();
    };
  }, []);

  return (
    <>
      {/* Floating particles overlay */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {particles.map((p) => {
          const Icon = ICON[p.type];
          return (
            <span
              key={p.id}
              className="absolute bottom-4 animate-reaction-float"
              style={
                {
                  left: `${p.left}%`,
                  color: COLOR[p.type],
                  "--reaction-drift": `${p.drift}px`,
                  "--reaction-scale": p.scale,
                } as React.CSSProperties
              }
            >
              <Icon className="size-7 fill-current drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]" />
            </span>
          );
        })}
      </div>

      {/* Reaction buttons */}
      <div className="pointer-events-auto absolute right-4 bottom-4 flex gap-2">
        {REACTIONS.map(({ type, Icon, color, label }) => (
          <button
            key={type}
            type="button"
            aria-label={label}
            onClick={() => onReact(type)}
            className="grid size-11 cursor-pointer place-items-center rounded-full border border-white/15 bg-black/40 backdrop-blur-md transition hover:scale-110 hover:bg-black/60 active:scale-95"
          >
            <Icon className="size-5 transition" style={{ color }} />
          </button>
        ))}
      </div>
    </>
  );
}
