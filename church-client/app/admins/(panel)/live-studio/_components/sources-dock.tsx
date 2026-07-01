"use client";

import { useState } from "react";
import {
  SlidersHorizontal,
  BookOpen,
  Type,
  Music,
  ImageIcon,
  Radio,
  Video,
  Film,
  Volume2,
  Folder,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  GripVertical,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MONO } from "./studio-tokens";
import { ADD_TYPES, LAYER_META, type StudioLayer, type StudioLayerType } from "./studio-layers";

const TYPE_ICON: Record<StudioLayerType, typeof BookOpen> = {
  bible: BookOpen,
  text: Type,
  song: Music,
  image: ImageIcon,
  embed: Radio,
  camera: Video,
  video: Film,
  audio: Volume2,
  group: Folder,
};

/**
 * Dock 2 · Media sources (real layer stack). Click a source to load it into the
 * inspector; reorder changes z-order (top = front); the eye toggles visibility;
 * the cross requests removal (confirmed by the orchestrator). The bible layer is
 * the broadcast anchor and cannot be deleted.
 */
export function SourcesDock({
  layers,
  selectedLayerId,
  onSelect,
  onAdd,
  onToggle,
  onMove,
  onReorder,
  onRequestDelete,
}: {
  layers: StudioLayer[];
  selectedLayerId: string | null;
  onSelect: (id: string) => void;
  onAdd: (type: StudioLayerType) => void;
  onToggle: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  onReorder: (dragId: string, targetId: string) => void;
  onRequestDelete: (id: string) => void;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  return (
    <div className="relative flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/8 bg-studio-panel">
      <div className="flex flex-none items-center gap-2 border-b border-white/6 px-3.5 py-2.5">
        <SlidersHorizontal className="size-[15px] text-gold" strokeWidth={1.8} />
        <span className="text-[11px] font-extrabold tracking-[1.2px] text-white uppercase">
          Sources média
        </span>
        <button
          type="button"
          onClick={() => setAddOpen((o) => !o)}
          title="Ajouter une source"
          aria-expanded={addOpen}
          className="ml-auto flex size-[26px] items-center justify-center rounded-[7px] border border-gold/30 bg-gold/15 text-base leading-none font-bold text-gold transition-colors hover:bg-gold/25"
        >
          ＋
        </button>
      </div>

      {addOpen && (
        <div className="absolute top-[46px] right-3 z-50 w-[176px] rounded-xl border border-gold/25 bg-[#1a1130] p-1.5 shadow-[0_24px_50px_rgba(0,0,0,.6)]">
          <div className="px-2 pt-1.5 pb-1 text-[9px] font-extrabold tracking-[1px] text-white/40 uppercase">
            Ajouter une source
          </div>
          {ADD_TYPES.map((t) => {
            const Icon = TYPE_ICON[t];
            return (
              <button
                key={t}
                type="button"
                onClick={() => {
                  onAdd(t);
                  setAddOpen(false);
                }}
                className="flex w-full items-center gap-2.5 rounded-lg p-2 text-left text-[12px] font-semibold text-white transition-colors hover:bg-white/6"
              >
                <Icon className="size-3.5 shrink-0" style={{ color: LAYER_META[t].color }} />
                {LAYER_META[t].label}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex-none border-b border-white/4 px-3 py-1.5 text-[9px] tracking-[0.5px] text-white/30">
        Ordre = superposition (haut = premier plan)
      </div>

      <ScrollArea className="flex min-h-0 flex-1 flex-col gap-1.5 p-2.5">
        {layers.length === 0 ? (
          <div className="rounded-[9px] border border-dashed border-white/10 px-2.5 py-5 text-center text-[11px] text-white/30">
            Aucune source. Cliquez ＋ pour en ajouter.
          </div>
        ) : (
          layers.map((l, i) => {
            const Icon = TYPE_ICON[l.type];
            const active = l.id === selectedLayerId;
            return (
              <div
                key={l.id}
                draggable
                onDragStart={() => setDragId(l.id)}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (l.id !== overId) setOverId(l.id);
                }}
                onDrop={() => {
                  if (dragId) onReorder(dragId, l.id);
                  setDragId(null);
                  setOverId(null);
                }}
                onDragEnd={() => {
                  setDragId(null);
                  setOverId(null);
                }}
                onClick={() => onSelect(l.id)}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-[10px] border px-2.5 py-2 transition-colors",
                  active
                    ? "border-studio-purple/45 bg-studio-purple/10"
                    : "border-white/6 bg-white/[0.03] hover:border-white/15",
                  dragId === l.id && "opacity-40",
                  overId === l.id && dragId && dragId !== l.id && "border-studio-purple/70",
                )}
              >
                <GripVertical className="size-3.5 shrink-0 cursor-grab text-white/25" />
                <span className={cn("w-5 shrink-0 text-[9px] text-white/35", MONO)}>
                  z{layers.length - i}
                </span>
                <Icon className="size-3.5 shrink-0" style={{ color: LAYER_META[l.type].color }} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11.5px] font-bold text-white">{l.name}</span>
                  <span className="block text-[9px] text-white/40">{LAYER_META[l.type].typeLabel}</span>
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMove(l.id, -1);
                  }}
                  title="Monter"
                  className="p-0.5 text-white/30 transition-colors hover:text-white"
                >
                  <ChevronUp className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMove(l.id, 1);
                  }}
                  title="Descendre"
                  className="p-0.5 text-white/30 transition-colors hover:text-white"
                >
                  <ChevronDown className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggle(l.id);
                  }}
                  title={l.visible ? "Masquer" : "Afficher"}
                  className={cn(
                    "p-0.5 transition-colors",
                    l.visible ? "text-studio-preview-bright" : "text-white/25",
                  )}
                >
                  {l.visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                </button>
                {l.type !== "bible" && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRequestDelete(l.id);
                    }}
                    title="Supprimer"
                    className="p-0.5 text-white/30 transition-colors hover:text-[#ff8a8a]"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </ScrollArea>
    </div>
  );
}
