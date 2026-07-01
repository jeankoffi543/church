"use client";

import { useState } from "react";
import { Layers, GripVertical, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MONO } from "./studio-tokens";
import type { StudioScene } from "./studio-layers";

/**
 * Dock 1 · Scenes. Each scene owns its own media-source stack. Click to switch
 * the Preview (and inspector) to that scene; drag to reorder; double-click the
 * name to rename; the cross requests removal (confirmed by the orchestrator).
 */
export function ScenesDock({
  scenes,
  currentSceneId,
  programSceneId,
  onSelect,
  onAdd,
  onReorder,
  onRequestDelete,
  onRename,
}: {
  scenes: StudioScene[];
  currentSceneId: string;
  programSceneId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onReorder: (dragId: string, targetId: string) => void;
  onRequestDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const canDelete = scenes.length > 1;

  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/8 bg-studio-panel">
      <div className="flex flex-none items-center gap-2 border-b border-white/6 px-3.5 py-2.5">
        <Layers className="size-[15px] text-studio-purple" strokeWidth={1.8} />
        <span className="text-[11px] font-extrabold tracking-[1.2px] text-white uppercase">Scènes</span>
        <span className={cn("ml-auto text-[10px] text-white/40", MONO)}>{scenes.length}</span>
      </div>

      <ScrollArea className="flex min-h-0 flex-1 flex-col gap-1.5 p-2.5">
        {scenes.map((sc, i) => {
          const isCurrent = sc.id === currentSceneId;
          const isProgram = sc.id === programSceneId;
          return (
            <div
              key={sc.id}
              draggable={editingId !== sc.id}
              onDragStart={(e) => {
                setDragId(sc.id);
                // Required for the drag to actually start (esp. Firefox).
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", sc.id);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (sc.id !== overId) setOverId(sc.id);
              }}
              onDrop={() => {
                if (dragId) onReorder(dragId, sc.id);
                setDragId(null);
                setOverId(null);
              }}
              onDragEnd={() => {
                setDragId(null);
                setOverId(null);
              }}
              onClick={() => onSelect(sc.id)}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-[10px] border px-2.5 py-2.5 transition-colors",
                isCurrent
                  ? "border-studio-purple/40 bg-studio-purple/10"
                  : isProgram
                    ? "border-studio-onair/40 bg-studio-onair/[0.06]"
                    : "border-white/6 bg-white/[0.03] hover:border-studio-purple/45",
                dragId === sc.id && "opacity-40",
                overId === sc.id && dragId && dragId !== sc.id && "border-studio-purple/70",
              )}
            >
              <GripVertical className="size-3.5 shrink-0 cursor-grab text-white/25" />
              <span
                className={cn(
                  "shrink-0 text-[11px] font-bold",
                  isCurrent ? "text-studio-purple" : isProgram ? "text-[#ff8a8a]" : "text-white/40",
                  MONO,
                )}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0 flex-1">
                {editingId === sc.id ? (
                  <input
                    autoFocus
                    defaultValue={sc.name}
                    onClick={(e) => e.stopPropagation()}
                    onBlur={(e) => {
                      onRename(sc.id, e.target.value.trim() || sc.name);
                      setEditingId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="w-full rounded border border-white/15 bg-studio-field px-1.5 py-0.5 text-[12.5px] font-bold text-white outline-none"
                  />
                ) : (
                  <span
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setEditingId(sc.id);
                    }}
                    className="block truncate text-[12.5px] font-bold text-white"
                  >
                    {sc.name}
                  </span>
                )}
                <span className="mt-0.5 block text-[9.5px] text-white/40">
                  {sc.layers.length} source(s)
                </span>
              </span>
              {isProgram && <Badge variant="onair">ANTENNE</Badge>}
              {isCurrent && <Badge variant="preview">APERÇU</Badge>}
              {canDelete && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRequestDelete(sc.id);
                  }}
                  title="Supprimer la scène"
                  className="p-0.5 text-white/30 transition-colors hover:text-[#ff8a8a]"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          );
        })}

        <button
          type="button"
          onClick={onAdd}
          className="mt-0.5 flex items-center justify-center gap-1.5 rounded-[9px] border border-dashed border-white/14 bg-white/[0.03] p-2 text-[11px] font-bold text-white/45 transition-colors hover:border-studio-purple/40 hover:text-studio-purple"
        >
          ＋ Nouvelle scène
        </button>
      </ScrollArea>
    </div>
  );
}
