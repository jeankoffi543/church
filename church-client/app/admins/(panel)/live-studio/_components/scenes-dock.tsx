"use client";

import { useState } from "react";
import { Layers } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MONO } from "./studio-tokens";

/**
 * Dock 1 · Scenes. OBS chrome — TODO(studio): wire to a real scene engine.
 * Holds local demo scenes so the broadcast layout is faithful; selecting a
 * scene only updates the local preview pointer for now.
 */
type StubScene = { id: string; name: string; count: number };

const DEMO_SCENES: StubScene[] = [
  { id: "sc1", name: "Culte · Bible", count: 2 },
  { id: "sc2", name: "Caméra Plein Cadre", count: 1 },
  { id: "sc3", name: "Louange (Paroles)", count: 2 },
  { id: "sc4", name: "Générique de Clôture", count: 2 },
];

export function ScenesDock() {
  const [scenes] = useState<StubScene[]>(DEMO_SCENES);
  const [current, setCurrent] = useState(0);
  const [program] = useState(1);

  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/8 bg-studio-panel">
      <div className="flex flex-none items-center gap-2 border-b border-white/6 px-3.5 py-2.5">
        <Layers className="size-[15px] text-studio-purple" strokeWidth={1.8} />
        <span className="text-[11px] font-extrabold tracking-[1.2px] text-white uppercase">
          Scènes
        </span>
        <span className={cn("ml-auto text-[10px] text-white/40", MONO)}>{scenes.length}</span>
      </div>

      <ScrollArea className="flex min-h-0 flex-1 flex-col gap-1.5 p-2.5">
        {scenes.map((sc, i) => {
          const isProgram = i === program;
          const isCurrent = i === current;
          return (
            <button
              key={sc.id}
              type="button"
              onClick={() => setCurrent(i)}
              className={cn(
                "relative flex items-center gap-2.5 rounded-[10px] border px-2.5 py-2.5 text-left transition-colors hover:border-studio-purple/45",
                isCurrent
                  ? "border-studio-purple/40 bg-studio-purple/10"
                  : "border-white/6 bg-white/[0.03]",
              )}
            >
              <span className={cn("shrink-0 text-[11px] font-bold text-studio-purple", MONO)}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] font-bold text-white">{sc.name}</span>
                <span className="mt-0.5 block text-[9.5px] text-white/40">
                  {sc.count} source(s)
                </span>
              </span>
              {isProgram && <Badge variant="onair">ANTENNE</Badge>}
              {isCurrent && <Badge variant="preview">APERÇU</Badge>}
            </button>
          );
        })}

        <button
          type="button"
          className="mt-0.5 flex items-center justify-center gap-1.5 rounded-[9px] border border-dashed border-white/14 bg-white/[0.03] p-2 text-[11px] font-bold text-white/45 transition-colors hover:border-studio-purple/40 hover:text-studio-purple"
        >
          ＋ Nouvelle scène
        </button>
      </ScrollArea>
    </div>
  );
}
