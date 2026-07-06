"use client";

import { useEffect, useState, useRef, useSyncExternalStore, type ReactNode } from "react";
import {
  Sparkles,
  Search,
  Plus,
  X,
  Italic,
  Underline,
  Upload,
  Play,
  Zap,
  Square,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  Repeat,
  Eye,
  EyeOff,
  Camera,
  RefreshCw,
  Volume2,
  VolumeX,
  Music,
  Trash2,
  Headphones,
  Type,
  ImageIcon,
  BookOpen,
  Video,
  Film,
  Folder,
  Radio,
} from "lucide-react";

import { importStudioMediaFromUrl } from "@/lib/admin-api";
import { uploadStudioMediaWithProgress } from "@/lib/studio-upload";

import { type ScriptureVerse, type StudioSettings } from "@/lib/studio";
import { cn } from "@/lib/utils";
import { getVideoController, type VideoTransportState } from "./studio-video";
import { listInputs, requestCameraPermission, type MediaDeviceLite } from "./studio-camera";
import { getAudioController, type AudioTransportState, getMonitorMuted, setMonitorMuted, subscribeMonitorMuted } from "./studio-audio";
import { Slider } from "@/components/ui/slider";
import { NativeSelect as Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MONO,
  COLOR_SWATCHES,
  TEXT_GRADIENTS,
  FONT_OPTIONS,
  WEIGHT_OPTIONS,
  PREDEFINED_POSITIONS,
  CONTAINER_SHAPES,
  BORDER_STYLES,
  ANIM_OPTIONS,
  EASING_OPTIONS,
  TYPO_ELEMENTS,
} from "./studio-tokens";
import { LAYER_META, layerTabs, type InspTab, type StudioLayer, type StudioLayerType } from "./studio-layers";

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

export type InspectorBible = {
  query: string;
  onQueryChange: (v: string) => void;
  suggestions: ScriptureVerse[];
  searching: boolean;
  prepared: ScriptureVerse[];
  onLoadVerse: (v: ScriptureVerse) => void;
  onPrepare: (v: ScriptureVerse) => void;
  onRemovePrepared: (v: ScriptureVerse) => void;
  visibleVersions: string[];
  defaultVersion: string;
  onToggleVersion: (v: string) => void;
  onSetDefaultVersion: (v: string) => void;
  translationSearch: string;
  onTranslationSearchChange: (v: string) => void;
  visibleTranslations: string[];
  hasMoreTranslations: boolean;
  onShowMoreTranslations: () => void;
  /** Antenne gate — false keeps the bible in the PREVIEW but off the diffusion;
   *  disabling also pulls a verse that is currently on air. */
  onAir: boolean;
  onToggleOnAir: () => void;
};

type Patch = (patch: Partial<StudioLayer>) => void;

/** Bar pinned to the top of the inspector's scroll area while it scrolls, so
 *  the panel's primary control stays reachable (CHR-55 P4/P5). */
function StickyBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky top-0 z-20 -mx-3.5 -mt-3.5 bg-studio-panel px-3.5 pt-3.5 pb-2.5 shadow-[0_10px_14px_-10px_rgba(0,0,0,.8)]">
      {children}
    </div>
  );
}

const TAB_LABELS: Record<InspTab, string> = {
  contenu: "Contenu",
  layout: "Mise en page",
  typo: "Typo",
  container: "Cadre",
  anim: "Anim",
  presets: "Presets",
};

const FIELD =
  "w-full rounded-lg border border-white/10 bg-studio-field px-2 py-2 text-[12px] text-white outline-none";
const MONO_FIELD = cn(FIELD, MONO, "text-[11px]");

const fmtTime = (s: number) => {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

function SliderLabel({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-1.5 flex justify-between text-[11px] font-semibold text-white/60">
      <span>{label}</span>
      <span className={cn("text-gold", MONO)}>{value}</span>
    </div>
  );
}

/**
 * Dock 4 · Studio · Style Pro. Contextual inspector bound to the selected source
 * (`selectedLayer`). Available tabs and the Contenu panel depend on the layer
 * type; the style tabs edit the selected layer's style (the real broadcast
 * `settings` for the bible layer).
 */
export function InspectorDock({
  selectedLayer,
  effectiveStyle,
  patchStyleField,
  setSelectedStyle,
  onRename,
  patchLayerData,
  onImageUrl,
  bible,
  presets,
  newPresetName,
  onNewPresetNameChange,
  onSavePreset,
  onDeletePreset,
  onRestoreDefaults,
  onPlayAnim,
  allLayers,
  onAddChild,
  onSelectLayer,
  onToggleLayer,
  onRemoveLayer,
  onPatchLayer,
}: {
  selectedLayer: StudioLayer | null;
  effectiveStyle: StudioSettings;
  patchStyleField: <K extends keyof StudioSettings>(key: K, value: StudioSettings[K]) => void;
  setSelectedStyle: (s: StudioSettings) => void;
  onRename: (name: string) => void;
  patchLayerData: Patch;
  onImageUrl: (url: string) => void;
  bible: InspectorBible;
  presets: { name: string; settings: StudioSettings }[];
  newPresetName: string;
  onNewPresetNameChange: (v: string) => void;
  onSavePreset: () => void;
  onDeletePreset: (name: string) => void;
  onRestoreDefaults?: () => void;
  onPlayAnim?: () => void;
  /** Full scene layer list — the group inspector derives its flat children. */
  allLayers?: StudioLayer[];
  onAddChild?: (type: StudioLayerType, parentId: string) => void;
  onSelectLayer?: (id: string) => void;
  onToggleLayer?: (id: string) => void;
  onRemoveLayer?: (id: string) => void;
  onPatchLayer?: (id: string, patch: Partial<StudioLayer>) => void;
}) {
  const [tab, setTab] = useState<InspTab>("contenu");
  const [typoEl, setTypoEl] = useState<"fontRef" | "fontBody" | "fontVer">("fontBody");

  const type = selectedLayer?.type ?? null;
  const available = type ? layerTabs(type) : [];
  const activeTab: InspTab = available.includes(tab) ? tab : "contenu";

  const tk = <S extends string>(suffix: S) => `${typoEl}${suffix}` as keyof StudioSettings;
  const tv = (suffix: string) => effectiveStyle[`${typoEl}${suffix}` as keyof StudioSettings];

  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-studio-purple/20 bg-studio-panel">
      <div className="flex flex-none items-center gap-2 border-b border-white/6 px-3.5 py-2.5">
        <Sparkles className="size-3.75 text-studio-purple" strokeWidth={1.8} />
        <span className="text-[11px] font-extrabold tracking-[1px] text-white uppercase">
          Studio · Style Pro
        </span>
        <span className="ml-auto rounded-md bg-studio-purple/12 px-1.5 py-0.75 text-[9px] font-bold text-studio-purple">
          {selectedLayer ? LAYER_META[selectedLayer.type].typeLabel : "Aucune"}
        </span>
      </div>

      {!selectedLayer ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center text-white/35">
          <div className="mb-1 text-[12px] font-bold">Aucune source sélectionnée</div>
          <div className="text-[11px] leading-relaxed">
            Cliquez une source média (ou dans l&apos;aperçu) pour configurer son style.
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-none flex-wrap gap-0.75 border-b border-white/5 px-2 py-2">
            {available.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  "min-w-12.5 flex-1 rounded-[7px] px-1 py-1.5 text-[10px] font-bold transition-colors",
                  activeTab === t
                    ? "bg-studio-purple/15 text-studio-purple"
                    : "text-white/55 hover:text-white",
                )}
              >
                {TAB_LABELS[t]}
              </button>
            ))}
          </div>

          <ScrollArea className="flex min-h-0 flex-1 flex-col gap-3 p-3.5">
            {activeTab === "contenu" && (
              <StickyBar>
                <div className="flex items-end gap-2">
                  <div className="min-w-0 flex-1">
                    <Label className="mb-1.5">Nom de la source</Label>
                    <input
                      value={selectedLayer.name}
                      onChange={(e) => onRename(e.target.value)}
                      className={FIELD}
                    />
                  </div>
                  {selectedLayer.type === "bible" && (
                    <button
                      type="button"
                      onClick={bible.onToggleOnAir}
                      title={
                        bible.onAir
                          ? "Diffusée à l'antenne — cliquer pour la retirer (l'aperçu reste visible)"
                          : "Retirée de l'antenne — cliquer pour la remettre en direct"
                      }
                      className={cn(
                        "flex h-[35px] shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[10.5px] font-extrabold whitespace-nowrap transition",
                        bible.onAir
                          ? "bg-studio-onair/20 text-[#ff9a9a] hover:bg-studio-onair/30"
                          : "bg-white/8 text-white/50 hover:bg-white/15",
                      )}
                    >
                      {bible.onAir ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                      {bible.onAir ? "À l'antenne" : "Retirée"}
                    </button>
                  )}
                </div>
              </StickyBar>
            )}

            {activeTab === "contenu" && (
               <ContentPanel
                 layer={selectedLayer}
                 patchLayerData={patchLayerData}
                 onImageUrl={onImageUrl}
                 onRestoreDefaults={onRestoreDefaults}
                 bible={bible}
                 onPlayAnim={onPlayAnim}
                 allLayers={allLayers}
                 onAddChild={onAddChild}
                 onSelectLayer={onSelectLayer}
                 onToggleLayer={onToggleLayer}
                 onRemoveLayer={onRemoveLayer}
                 onPatchLayer={onPatchLayer}
               />
            )}
            {activeTab === "layout" && (
              <LayoutPanel settings={effectiveStyle} setStudioField={patchStyleField} />
            )}
            {activeTab === "typo" && (
              <TypoPanel
                setStudioField={patchStyleField}
                typoEl={typoEl}
                setTypoEl={setTypoEl}
                tk={tk}
                tv={tv}
              />
            )}
            {activeTab === "container" && (
              <ContainerPanel settings={effectiveStyle} setStudioField={patchStyleField} />
            )}
            {activeTab === "anim" && (
              <AnimPanel settings={effectiveStyle} setStudioField={patchStyleField} onPlayAnim={onPlayAnim} />
            )}
            {activeTab === "presets" && (
              <PresetsPanel
                effectiveStyle={effectiveStyle}
                setSelectedStyle={setSelectedStyle}
                presets={presets}
                newPresetName={newPresetName}
                onNewPresetNameChange={onNewPresetNameChange}
                onSavePreset={onSavePreset}
                onDeletePreset={onDeletePreset}
              />
            )}
          </ScrollArea>
        </>
      )}
    </div>
  );
}

/* ─────────────────────── Contenu (per layer type) ─────────────────────── */

function SongInspector({
  layer,
  patchLayerData,
  onPlayAnim,
  onRestoreDefaults,
}: {
  layer: StudioLayer;
  patchLayerData: Patch;
  onPlayAnim?: () => void;
  onRestoreDefaults?: () => void;
}) {
  const stanzas = layer.stanzas ?? [];
  const activeIndex = layer.activeStanzaIndex ?? 0;

  const [stanzaName, setStanzaName] = useState("");
  const [stanzaContent, setStanzaContent] = useState("");
  const [editIndex, setEditIndex] = useState<number | null>(null);

  const handleAddOrUpdateStanza = () => {
    const name = stanzaName.trim();
    const content = stanzaContent.trim();
    if (!name || !content) return;

    const nextStanzas = [...stanzas];
    if (editIndex !== null) {
      nextStanzas[editIndex] = { name, content };
      setEditIndex(null);
    } else {
      nextStanzas.push({ name, content });
    }

    patchLayerData({
      stanzas: nextStanzas,
      activeStanzaIndex: editIndex !== null ? activeIndex : nextStanzas.length - 1,
    });

    setStanzaName("");
    setStanzaContent("");
  };

  const handleEditStanza = (index: number) => {
    const target = stanzas[index];
    if (!target) return;
    setStanzaName(target.name);
    setStanzaContent(target.content);
    setEditIndex(index);
  };

  const handleDeleteStanza = (index: number) => {
    const nextStanzas = stanzas.filter((_, idx) => idx !== index);
    let nextActive = activeIndex;
    if (nextActive >= nextStanzas.length) {
      nextActive = Math.max(0, nextStanzas.length - 1);
    }
    patchLayerData({
      stanzas: nextStanzas,
      activeStanzaIndex: nextActive,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Form to add or edit a stanza */}
      <div className="flex flex-col gap-2 rounded-[10px] border border-white/5 bg-black/[0.18] p-3">
        <Label className="text-white/70">{editIndex !== null ? "Modifier le couplet/refrain" : "Ajouter un couplet, refrain, pont..."}</Label>
        <input
          value={stanzaName}
          onChange={(e) => setStanzaName(e.target.value)}
          placeholder="Ex: Couplet 1, Refrain, Pont..."
          className={FIELD}
        />
        <textarea
          value={stanzaContent}
          onChange={(e) => setStanzaContent(e.target.value)}
          placeholder="Saisissez les paroles..."
          rows={3}
          className={cn(FIELD, "resize-y")}
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleAddOrUpdateStanza}
            disabled={!stanzaName.trim() || !stanzaContent.trim()}
            className="flex-1 rounded-lg bg-gold py-1.5 text-[11.5px] font-extrabold text-ink transition hover:brightness-105 disabled:opacity-50"
          >
            {editIndex !== null ? "Mettre à jour" : "Ajouter au chant"}
          </button>
          {editIndex !== null && (
            <button
              type="button"
              onClick={() => {
                setStanzaName("");
                setStanzaContent("");
                setEditIndex(null);
              }}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-[11.5px] font-bold text-white/75 transition hover:bg-white/5"
            >
              Annuler
            </button>
          )}
        </div>
      </div>

      {/* Toggle Live Mode for Song (feature/CHR-39) */}
      <div className="flex items-center justify-between rounded-lg border border-white/5 bg-black/[0.18] p-2.5">
        <div className="flex flex-col">
          <span className="text-[11px] font-bold text-white">Mode de diffusion direct (Antenne)</span>
          <span className="text-[9.5px] text-white/40">
            {layer.songLiveActive ? "Activé · Clic = Envoi immédiat en direct" : "Désactivé · Clic = Aperçu uniquement"}
          </span>
        </div>
        <button
          type="button"
          onClick={() => patchLayerData({ songLiveActive: !layer.songLiveActive })}
          className={cn(
            "rounded-md px-3 py-1.5 text-[10.5px] font-extrabold transition",
            layer.songLiveActive
              ? "bg-red-500 hover:bg-red-600 text-white"
              : "bg-studio-onair hover:brightness-110 text-white"
          )}
        >
          {layer.songLiveActive ? (
            <span className="flex items-center gap-1">
              <Square className="size-3 fill-current" />
              STOPPER
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <Zap className="size-3 fill-current" />
              DÉMARRER
            </span>
          )}
        </button>
      </div>

      {/* List of stanzas */}
      <div>
        <Label className="mb-1.5">Liste des couplets & refrains (cliquez pour projeter)</Label>
        {stanzas.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/10 p-4 text-center text-[11px] text-white/35">
            Aucun couplet ou refrain. Créez-en un ci-dessus.
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {stanzas.map((st, idx) => {
              const isActive = idx === activeIndex;
              return (
                <div
                  key={idx}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-lg border px-3 py-2 transition-colors",
                    isActive
                      ? "border-gold/45 bg-gold/[0.08]"
                      : "border-white/5 bg-white/[0.02] hover:bg-white/5"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => {
                      patchLayerData({ activeStanzaIndex: idx });
                      setTimeout(() => onPlayAnim?.(), 50);
                    }}
                    className="flex-1 text-left"
                  >
                    <div className="text-[11.5px] font-bold text-white flex items-center gap-1.5">
                      <span className={cn("size-2 rounded-full", isActive ? "bg-gold" : "bg-white/20")} />
                      {st.name}
                    </div>
                    <div className="mt-0.5 truncate text-[10px] text-white/45">
                      {st.content.replace(/\n/g, " / ")}
                    </div>
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleEditStanza(idx)}
                      className="text-white/30 transition hover:text-white"
                      title="Modifier"
                    >
                      <Sparkles className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteStanza(idx)}
                      className="text-white/30 transition hover:text-[#ff8a8a]"
                      title="Supprimer"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Restore defaults button */}
      <button
        type="button"
        onClick={onRestoreDefaults}
        className="w-full rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 py-2 text-[11.5px] font-bold text-red-400 transition"
      >
        Réinitialiser aux paramètres par défaut
      </button>
    </div>
  );
}

function GroupInspector({
  layer,
  patchLayerData,
  onRestoreDefaults,
  childLayers,
  onAddChild,
  onSelectChild,
  onToggleChild,
  onRemoveChild,
  onPatchChild,
}: {
  layer: StudioLayer;
  patchLayerData: Patch;
  onRestoreDefaults?: () => void;
  /** Real, flat scene layers whose `parentId` points at this group. */
  childLayers: StudioLayer[];
  onAddChild?: (type: StudioLayerType, parentId: string) => void;
  onSelectChild?: (id: string) => void;
  onToggleChild?: (id: string) => void;
  onRemoveChild?: (id: string) => void;
  onPatchChild?: (id: string, patch: Partial<StudioLayer>) => void;
}) {
  const groupLiveActive = layer.groupLiveActive ?? false;

  // Push the group's style onto every child while keeping each child's own
  // position/size — a one-click way to unify look across the group.
  const handleApplyGroupStyleToChildren = () => {
    if (!onPatchChild) return;
    childLayers.forEach((c) => {
      onPatchChild(c.id, {
        style: {
          ...layer.style,
          positionMode: c.style.positionMode,
          predefinedPosition: c.style.predefinedPosition,
          customX: c.style.customX,
          customY: c.style.customY,
          customWidth: c.style.customWidth,
          customHeight: c.style.customHeight,
        },
      });
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Action button to uniformise styles */}
      <button
        type="button"
        onClick={handleApplyGroupStyleToChildren}
        disabled={childLayers.length === 0}
        className="w-full rounded-lg border border-gold/30 bg-gold/10 hover:bg-gold/20 py-2 text-[11px] font-bold text-gold transition flex items-center justify-center gap-1.5 disabled:opacity-40"
      >
        <Sparkles className="size-3.5" />
        Uniformiser le style sur tout le groupe
      </button>
      {/* Toggle Live Mode for Group */}
      <div className="flex items-center justify-between rounded-lg border border-white/5 bg-black/[0.18] p-2.5">
        <div className="flex flex-col">
          <span className="text-[11px] font-bold text-white">Mode de diffusion direct (Antenne)</span>
          <span className="text-[9.5px] text-white/40">
            {groupLiveActive ? "Activé · Clic = Envoi immédiat en direct" : "Désactivé · Clic = Aperçu uniquement"}
          </span>
        </div>
        <button
          type="button"
          onClick={() => patchLayerData({ groupLiveActive: !groupLiveActive })}
          className={cn(
            "rounded-md px-3 py-1.5 text-[10.5px] font-extrabold transition",
            groupLiveActive
              ? "bg-red-500 hover:bg-red-600 text-white"
              : "bg-studio-onair hover:brightness-110 text-white"
          )}
        >
          {groupLiveActive ? (
            <span className="flex items-center gap-1">
              <Square className="size-3 fill-current" />
              STOPPER
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <Zap className="size-3 fill-current" />
              DÉMARRER
            </span>
          )}
        </button>
      </div>

      {/* Quick-add a real child layer (rendered + diffused) */}
      <div className="flex flex-col gap-2 rounded-[10px] border border-white/5 bg-black/[0.18] p-3">
        <Label className="text-white/70">Ajouter un calque au groupe</Label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onAddChild?.("text", layer.id)}
            className="flex-1 rounded-md bg-white/5 py-1.5 text-[10.5px] font-bold text-white/70 transition hover:bg-white/10 flex items-center justify-center gap-1.5"
          >
            <Type className="size-3.5" style={{ color: LAYER_META.text.color }} />
            Texte
          </button>
          <button
            type="button"
            onClick={() => onAddChild?.("image", layer.id)}
            className="flex-1 rounded-md bg-white/5 py-1.5 text-[10.5px] font-bold text-white/70 transition hover:bg-white/10 flex items-center justify-center gap-1.5"
          >
            <ImageIcon className="size-3.5" style={{ color: LAYER_META.image.color }} />
            Image
          </button>
        </div>
        <p className="text-[9.5px] leading-relaxed text-white/35">
          Le nouveau calque s&apos;ajoute au groupe et s&apos;ouvre dans l&apos;inspecteur pour
          régler son contenu, son style et son animation.
        </p>
      </div>

      {/* List of group child layers (flat, parentId-linked) */}
      <div>
        <Label className="mb-1.5">Calques regroupés</Label>
        {childLayers.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/10 p-4 text-center text-[11px] text-white/35">
            Aucun calque dans ce groupe.
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {childLayers.map((c) => {
              const ChildIcon = TYPE_ICON[c.type];
              return (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 hover:bg-white/5"
                >
                  <button
                    type="button"
                    onClick={() => onSelectChild?.(c.id)}
                    className="flex-1 text-left min-w-0"
                    title="Ouvrir dans l'inspecteur"
                  >
                    <div className="text-[11.5px] font-bold text-white flex items-center gap-1.5">
                      <span className={cn("size-2 rounded-full", c.visible ? "bg-studio-preview-bright" : "bg-white/20")} />
                      <ChildIcon className="size-3 shrink-0" style={{ color: LAYER_META[c.type].color }} />
                      {c.name}
                    </div>
                    <div className="mt-0.5 truncate text-[10px] text-white/45">
                      {c.type === "image" ? c.imageUrl || "Aucune image" : c.content || LAYER_META[c.type].typeLabel}
                    </div>
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onToggleChild?.(c.id)}
                      className={cn(
                        "p-0.5 transition-colors",
                        c.visible ? "text-studio-preview-bright" : "text-white/25"
                      )}
                      title={c.visible ? "Masquer" : "Afficher"}
                    >
                      {c.visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveChild?.(c.id)}
                      className="text-white/30 transition hover:text-[#ff8a8a]"
                      title="Retirer du groupe"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Restore defaults button */}
      <button
        type="button"
        onClick={onRestoreDefaults}
        className="w-full rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 py-2 text-[11.5px] font-bold text-red-400 transition"
      >
        Réinitialiser aux paramètres par défaut
      </button>
    </div>
  );
}

function AudioInspector({
  layer,
  patchLayerData,
  onRestoreDefaults,
}: {
  layer: StudioLayer;
  patchLayerData: Patch;
  onRestoreDefaults?: () => void;
}) {
  const audioLevel = layer.audioLevel ?? 80;
  const audioMuted = layer.audioMuted ?? false;
  const audioGain = layer.audioGain ?? 0;
  const audioBalance = layer.audioBalance ?? 0;
  const audioLoop = layer.audioLoop ?? false;
  const audioSpeed = layer.audioSpeed ?? 1.0;
  const audioLiveActive = layer.audioLiveActive ?? false;

  const monitorMuted = useSyncExternalStore(subscribeMonitorMuted, getMonitorMuted, () => false);

  const [dragOver, setDragOver] = useState(false);
  const [transport, setTransport] = useState<AudioTransportState | null>(null);
  const [scrubTime, setScrubTime] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const sliderRef = useRef<HTMLInputElement>(null);
  const isDraggingRef = useRef(false);

  const hasSource = !!layer.audioFileUrl;

  const ctl = () => getAudioController(layer.id);
  const ready = !!transport?.ready;
  const paused = transport?.paused ?? true;
  const duration = transport?.duration ?? 0;
  const current = transport?.currentTime ?? 0;

  // Poll the Audio player's playback state to drive the scrubber/timeline slider
  useEffect(() => {
    if (!hasSource) return;
    const t = setInterval(() => {
      if (isDraggingRef.current) return;
      const state = ctl()?.getState();
      if (state) {
        setTransport(state);
        if (sliderRef.current) {
          sliderRef.current.value = String(Math.min(state.currentTime, state.duration || state.currentTime));
        }
      }
    }, 250);
    return () => clearInterval(t);
  }, [hasSource, layer.id]);

  // Window-level mouseup/touchend listeners to commit seek
  useEffect(() => {
    const handleRelease = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        if (sliderRef.current) {
          const parsedVal = parseFloat(sliderRef.current.value);
          if (!isNaN(parsedVal) && isFinite(parsedVal)) {
            ctl()?.seek(parsedVal);
          }
        }
        setScrubTime(null);
      }
    };
    window.addEventListener("mouseup", handleRelease);
    window.addEventListener("touchend", handleRelease);
    return () => {
      window.removeEventListener("mouseup", handleRelease);
      window.removeEventListener("touchend", handleRelease);
    };
  }, [layer.id]);

  // Upload to the CORS-enabled /studio/media route (with progress) so Web Audio
  // can mix the file into the Facebook feed without tainting it.
  const handleAudioFile = async (file: File) => {
    if (!file.type.startsWith("audio/")) {
      setUploadError("Choisissez un fichier audio (MP3, WAV…).");
      return;
    }
    setUploadError(null);
    setUploading(true);
    setUploadProgress(0);
    try {
      const { url } = await uploadStudioMediaWithProgress(file, setUploadProgress);
      patchLayerData({ audioFileUrl: url, audioFileName: file.name });
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Échec de l'envoi de l'audio.");
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleAudioFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleAudioFile(file);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Toggle Live Mode & Local Monitor Mute for Audio (feature/CHR-42) */}
      <div className="flex flex-col gap-2 rounded-lg border border-white/5 bg-black/[0.18] p-2.5">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-white">Mode de diffusion direct (Antenne)</span>
            <span className="text-[9.5px] text-white/40">
              {audioLiveActive ? "Activé · Diffusion en direct" : "Désactivé · Hors antenne"}
            </span>
          </div>
          <button
            type="button"
            onClick={() => patchLayerData({ audioLiveActive: !audioLiveActive })}
            className={cn(
              "rounded-md px-3 py-1.5 text-[10.5px] font-extrabold transition",
              audioLiveActive
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-studio-onair hover:brightness-110 text-white"
            )}
          >
            {audioLiveActive ? (
              <span className="flex items-center gap-1">
                <Square className="size-3 fill-current" />
                STOPPER
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Zap className="size-3 fill-current" />
                DÉMARRER
              </span>
            )}
          </button>
        </div>

        {/* Local Monitor Mute / Retour Local */}
        <div className="flex items-center justify-between border-t border-white/5 pt-2 mt-1">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-white/70">Retour Local (Régie)</span>
            <span className="text-[9px] text-white/40">
              {monitorMuted ? "Sourdine active · Aucun son local" : "Actif · Écoute locale"}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setMonitorMuted(!monitorMuted)}
            className={cn(
              "rounded px-2.5 py-1 text-[9.5px] font-extrabold transition flex items-center gap-1 border",
              monitorMuted
                ? "bg-red-500/10 border-red-500/30 text-red-400"
                : "bg-studio-purple/10 border-studio-purple/30 text-studio-purple hover:bg-studio-purple/20"
            )}
          >
            <Headphones className="size-3" />
            {monitorMuted ? "ACTIVER L'ÉCOUTE" : "COUPER L'ÉCOUTE"}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-[10px] border border-white/5 bg-black/[0.18] p-3">
        <Label className="text-white/70 flex items-center gap-1">
          <Music className="size-3.5" /> Fichier de la bande sonore
        </Label>

        {/* Upload Drop Zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={cn(
            "relative grid place-items-center rounded-lg border border-dashed py-5 text-center transition-colors cursor-pointer",
            dragOver ? "border-gold bg-gold/10" : "border-white/12 hover:bg-white/[0.02]"
          )}
          onClick={() => document.getElementById(`audio-file-upload-${layer.id}`)?.click()}
        >
          <input
            id={`audio-file-upload-${layer.id}`}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={handleFileChange}
          />
          {uploading ? (
            <div className="flex w-full flex-col items-center gap-2 px-4">
              <span className="text-[11px] font-bold text-gold">
                Envoi… {Math.round(uploadProgress * 100)}%
              </span>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gold transition-[width] duration-150"
                  style={{ width: `${Math.round(uploadProgress * 100)}%` }}
                />
              </div>
            </div>
          ) : layer.audioFileUrl ? (
            <div className="flex flex-col items-center px-3">
              <span className="text-[11.5px] font-bold text-white max-w-[200px] truncate">
                {layer.audioFileName || "Bande audio chargée"}
              </span>
              <span className="text-[9.5px] text-white/40 mt-1">Cliquez pour remplacer</span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <Upload className="size-5 text-white/30 mb-1" />
              <span className="text-[11px] text-white/60">Glissez-déposez ou cliquez</span>
              <span className="text-[9px] text-white/30 mt-0.5">Formats MP3, WAV...</span>
            </div>
          )}
        </div>
        {uploadError && <span className="text-[10px] text-[#ff8a8a]">{uploadError}</span>}

        {/* Audio Player Controls */}
        {layer.audioFileUrl && (
          <div className="flex flex-col gap-3 border-t border-white/5 pt-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-white/55">LECTEUR AUDIO</span>
              {!paused && (
                <span className="text-[9px] text-emerald-400 font-extrabold flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" /> En lecture
                </span>
              )}
            </div>

            {/* Scrubber / Control Slide */}
            <div className="flex items-center gap-2">
              <span className={cn("w-9 text-right text-[10px] text-white/50", MONO)}>
                {fmtTime(scrubTime !== null ? scrubTime : current)}
              </span>
              <Slider
                ref={sliderRef}
                min={0}
                max={Math.max(1, Math.floor(duration))}
                defaultValue={Math.min(current, duration || current)}
                onMouseDown={() => {
                  isDraggingRef.current = true;
                }}
                onTouchStart={() => {
                  isDraggingRef.current = true;
                }}
                onChange={(e) => {
                  setScrubTime(Number(e.target.value));
                }}
                className="flex-1"
              />
              <span className={cn("w-9 text-[10px] text-white/50", MONO)}>{fmtTime(duration)}</span>
            </div>

            {/* Play, Pause, Stop, Trash, Loop, Speed */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (paused) {
                    ctl()?.play();
                    patchLayerData({ audioPlaying: true });
                  } else {
                    ctl()?.pause();
                    patchLayerData({ audioPlaying: false });
                  }
                }}
                className={cn(
                  "flex-1 rounded-md py-1.5 text-[10.5px] font-bold transition flex items-center justify-center gap-1.5",
                  paused ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"
                )}
              >
                {paused ? (
                  <>
                    <Play className="size-3.5 fill-current" /> LECTURE
                  </>
                ) : (
                  <>
                    <Pause className="size-3.5 fill-current" /> PAUSE
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  ctl()?.stop();
                  patchLayerData({ audioPlaying: false });
                }}
                className="rounded-md border border-white/10 px-3 py-1.5 text-[10.5px] font-bold text-white/70 hover:bg-white/5 transition flex items-center justify-center"
                title="Arrêter"
              >
                <Square className="size-3.5 fill-current" />
              </button>
              <button
                type="button"
                onClick={() => {
                  ctl()?.stop();
                  patchLayerData({ audioFileUrl: undefined, audioFileName: undefined, audioPlaying: false });
                }}
                className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-[10.5px] font-bold text-red-400 hover:bg-red-500/20 transition flex items-center justify-center"
                title="Supprimer"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>

            {/* Loop and Playback Speed */}
            <div className="flex items-center justify-between border-t border-white/5 pt-2 mt-1">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => patchLayerData({ audioLoop: !audioLoop })}
                  className={cn(
                    "rounded px-2 py-0.5 text-[9.5px] font-bold border transition flex items-center gap-1",
                    audioLoop ? "bg-studio-purple border-studio-purple text-white" : "border-white/10 text-white/50"
                  )}
                >
                  <Repeat className="size-3" /> Boucle
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[9.5px] text-white/40">Vitesse :</span>
                <select
                  value={audioSpeed}
                  onChange={(e) => patchLayerData({ audioSpeed: parseFloat(e.target.value) })}
                  className="bg-black/30 border border-white/10 text-[10px] text-white rounded px-1.5 py-0.5 outline-none"
                >
                  <option value={0.5}>0.5x</option>
                  <option value={0.75}>0.75x</option>
                  <option value={1.0}>Normal</option>
                  <option value={1.25}>1.25x</option>
                  <option value={1.5}>1.5x</option>
                  <option value={2.0}>2.0x</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mixer Audio Controls */}
      <div className="flex flex-col gap-3.5 rounded-[10px] border border-white/5 bg-black/[0.18] p-3">
        <span className="text-[10px] font-bold text-white/55">RÉGLAGES AUDIO DE LA TRANCHE</span>

        {/* Fader Volume */}
        <div>
          <SliderLabel label="Volume (Fader)" value={`${audioLevel}%`} />
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => patchLayerData({ audioMuted: !audioMuted })}
              className={cn(
                "rounded-md p-1.5 transition-colors border",
                audioMuted ? "bg-red-500/10 border-red-500/30 text-red-400" : "bg-white/5 border-white/10 text-white/60"
              )}
              title={audioMuted ? "Activer le son" : "Couper le son"}
            >
              <Music className="size-4" />
            </button>
            <Slider
              value={audioLevel}
              onValueChange={(v) => patchLayerData({ audioLevel: v })}
              min={0}
              max={100}
              step={1}
              className="flex-1"
            />
          </div>
        </div>

        {/* Gain Slider */}
        <div>
          <SliderLabel label="Gain" value={`${audioGain > 0 ? "+" : ""}${audioGain} dB`} />
          <Slider
            value={audioGain}
            onValueChange={(v) => patchLayerData({ audioGain: v })}
            min={-20}
            max={20}
            step={1}
          />
        </div>

        {/* Balance Slider */}
        <div>
          <SliderLabel
            label="Panoramique / Balance"
            value={
              audioBalance === 0
                ? "Centré"
                : audioBalance < 0
                ? `L ${Math.abs(audioBalance)}`
                : `R ${audioBalance}`
            }
          />
          <Slider
            value={audioBalance}
            onValueChange={(v) => patchLayerData({ audioBalance: v })}
            min={-100}
            max={100}
            step={5}
          />
        </div>
      </div>

      {/* Restore defaults button */}
      <button
        type="button"
        onClick={onRestoreDefaults}
        className="w-full rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 py-2 text-[11.5px] font-bold text-red-400 transition"
      >
        Réinitialiser aux paramètres par défaut
      </button>
    </div>
  );
}

/** Image URL field that imports on commit (never binds the raw URL to the layer,
 *  so the image is only ever displayed from our re-hosted, CORS-safe copy). */
function ImageUrlImport({ current, onImport }: { current: string; onImport: (url: string) => void }) {
  const [draft, setDraft] = useState(current);
  return (
    <div className="flex gap-1.5">
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onImport(draft);
        }}
        placeholder="https://…"
        className={MONO_FIELD}
      />
      <button
        type="button"
        onClick={() => onImport(draft)}
        className="shrink-0 rounded-lg border border-gold/30 bg-gold/15 px-3 text-[11px] font-bold text-gold transition hover:bg-gold/25"
      >
        Importer
      </button>
    </div>
  );
}

/** Image file upload with a real progress bar (drag-drop or click). */
function ImageUpload({ onUploaded }: { onUploaded: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Choisissez un fichier image.");
      return;
    }
    setError(null);
    setUploading(true);
    setProgress(0);
    try {
      const { url } = await uploadStudioMediaWithProgress(file, setProgress);
      onUploaded(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de l'envoi de l'image.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files?.[0];
          if (f) void upload(f);
        }}
        className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-white/14 bg-white/[0.03] py-3 text-[11px] font-bold text-white/55 transition-colors hover:border-gold/40 hover:text-gold"
      >
        <Upload className="size-3.5" />
        {uploading ? `Envoi… ${Math.round(progress * 100)}%` : "Importer ou glisser-déposer…"}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          disabled={uploading}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
            e.target.value = "";
          }}
        />
      </label>
      {uploading && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gold transition-[width] duration-150"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      )}
      {error && <span className="text-[10px] text-[#ff8a8a]">{error}</span>}
    </div>
  );
}

function ContentPanel({
  layer,
  patchLayerData,
  onImageUrl,
  onRestoreDefaults,
  bible,
  onPlayAnim,
  allLayers,
  onAddChild,
  onSelectLayer,
  onToggleLayer,
  onRemoveLayer,
  onPatchLayer,
}: {
  layer: StudioLayer;
  patchLayerData: Patch;
  onImageUrl: (url: string) => void;
  onRestoreDefaults?: () => void;
  bible: InspectorBible;
  onPlayAnim?: () => void;
  allLayers?: StudioLayer[];
  onAddChild?: (type: StudioLayerType, parentId: string) => void;
  onSelectLayer?: (id: string) => void;
  onToggleLayer?: (id: string) => void;
  onRemoveLayer?: (id: string) => void;
  onPatchLayer?: (id: string, patch: Partial<StudioLayer>) => void;
}) {
  if (layer.type === "bible") return <BibleContent bible={bible} onRestoreDefaults={onRestoreDefaults} />;

  if (layer.type === "song") {
    return (
      <SongInspector
        layer={layer}
        patchLayerData={patchLayerData}
        onPlayAnim={onPlayAnim}
        onRestoreDefaults={onRestoreDefaults}
      />
    );
  }

  if (layer.type === "embed") {
    return (
      <>
        <div>
          <Label className="mb-1.5">Lien du direct (YouTube, Facebook, HLS…)</Label>
          <input
            value={layer.feedUrl ?? ""}
            onChange={(e) => patchLayerData({ feedUrl: e.target.value })}
            placeholder="https://youtube.com/watch?v=…  ·  https://facebook.com/…/videos/…"
            className={MONO_FIELD}
          />
        </div>
        <div className="rounded-[9px] border border-white/8 bg-white/[0.03] p-3 text-[10px] leading-relaxed text-white/50">
          L&apos;aperçu de la vidéo s&apos;affiche dans les moniteurs.
        </div>
      </>
    );
  }

  if (layer.type === "audio") {
    return (
      <AudioInspector
        layer={layer}
        patchLayerData={patchLayerData}
        onRestoreDefaults={onRestoreDefaults}
      />
    );
  }

  if (layer.type === "group") {
    return (
      <GroupInspector
        layer={layer}
        patchLayerData={patchLayerData}
        onRestoreDefaults={onRestoreDefaults}
        childLayers={(allLayers ?? []).filter((l) => l.parentId === layer.id)}
        onAddChild={onAddChild}
        onSelectChild={onSelectLayer}
        onToggleChild={onToggleLayer}
        onRemoveChild={onRemoveLayer}
        onPatchChild={onPatchLayer}
      />
    );
  }

  if (layer.type === "text") {
    return (
      <>
        <div>
          <Label className="mb-1.5">Contenu</Label>
          <textarea
            value={layer.content ?? ""}
            onChange={(e) => patchLayerData({ content: e.target.value })}
            rows={2}
            className={cn(FIELD, "resize-y")}
          />
        </div>
        <div>
          <Label className="mb-1.5">Sous-titre (optionnel)</Label>
          <input
            value={layer.sub ?? ""}
            onChange={(e) => patchLayerData({ sub: e.target.value })}
            placeholder="Prédicateur, référence…"
            className={FIELD}
          />
        </div>
        <button
          type="button"
          onClick={onRestoreDefaults}
          className="mt-4 w-full rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 py-2 text-[11.5px] font-bold text-red-400 transition"
        >
          Réinitialiser aux paramètres par défaut
        </button>
      </>
    );
  }

  if (layer.type === "image") {
    return (
      <>
        <div>
          <Label className="mb-1.5">URL de l&apos;image</Label>
          <ImageUrlImport key={layer.id} current={layer.imageUrl ?? ""} onImport={onImageUrl} />
          <span className="mt-1 block text-[10px] text-white/35">
            L&apos;image est téléchargée sur le serveur puis affichée (jamais directement depuis
            l&apos;URL).
          </span>
        </div>
        <ImageUpload onUploaded={(url) => patchLayerData({ imageUrl: url })} />
        <div>
          <Label className="mb-1.5">Cadrage</Label>
          <div className="flex rounded-[9px] bg-black/25 p-[3px]">
            {(["cover", "frame"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => patchLayerData({ fill: m })}
                className={cn(
                  "flex-1 rounded-[7px] py-1.5 text-[11px] font-bold transition-colors",
                  (layer.fill ?? "cover") === m
                    ? "bg-studio-purple/20 text-studio-purple"
                    : "text-white/55",
                )}
              >
                {m === "cover" ? "Plein cadre" : "Encadré"}
              </button>
            ))}
          </div>
        </div>
        {!layer.imageUrl && (
          <div>
            <SliderLabel label="Teinte du fond" value={`${layer.imageHue ?? 0}°`} />
            <Slider
              min={0}
              max={360}
              value={layer.imageHue ?? 0}
              onValueChange={(v) => patchLayerData({ imageHue: v })}
            />
          </div>
        )}
        <button
          type="button"
          onClick={onRestoreDefaults}
          className="mt-4 w-full rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 py-2 text-[11.5px] font-bold text-red-400 transition"
        >
          Réinitialiser aux paramètres par défaut
        </button>
      </>
    );
  }

  if (layer.type === "video") {
    return <VideoContent key={layer.id} layer={layer} patchLayerData={patchLayerData} />;
  }

  // camera / capture
  return <CameraContent layer={layer} patchLayerData={patchLayerData} />;
}

/**
 * Contenu for a "Caméra / Capture" source: pick a local device (webcam, capture
 * card, or an NDI source exposed as a virtual webcam). Real NDI isn't consumable
 * in a browser — capture devices are.
 */
function CameraContent({ layer, patchLayerData }: { layer: StudioLayer; patchLayerData: Patch }) {
  const [videoDevices, setVideoDevices] = useState<MediaDeviceLite[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceLite[]>([]);
  const [asking, setAsking] = useState(false);

  const refresh = async () => {
    const vids = await listInputs("videoinput");
    const auds = await listInputs("audioinput");
    setVideoDevices(vids);
    setAudioDevices(auds);
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const vids = await listInputs("videoinput");
      const auds = await listInputs("audioinput");
      if (!cancelled) {
        setVideoDevices(vids);
        setAudioDevices(auds);
      }
    };
    void load();
    const md = typeof navigator !== "undefined" ? navigator.mediaDevices : undefined;
    const onChange = () => void load();
    md?.addEventListener?.("devicechange", onChange);
    return () => {
      cancelled = true;
      md?.removeEventListener?.("devicechange", onChange);
    };
  }, []);

  // Labels are hidden until the operator grants permission at least once.
  const needsPermission = videoDevices.length === 0 || videoDevices.every((d) => !d.label);
  const listenLocal = layer.listenLocal ?? false;

  const grant = async () => {
    setAsking(true);
    await requestCameraPermission();
    await refresh();
    setAsking(false);
  };

  return (
    <>
      <div>
        <Label className="mb-1.5">Périphérique caméra</Label>
        <Select
          value={layer.deviceId ?? ""}
          onValueChange={(v) => {
            const dev = videoDevices.find((d) => d.deviceId === v);
            patchLayerData({ deviceId: v, deviceLabel: dev?.label ?? "" });
          }}
          className={FIELD}
        >
          <option value="" className="bg-studio-field">
            — Choisir une caméra —
          </option>
          {videoDevices.map((d, i) => (
            <option key={d.deviceId} value={d.deviceId} className="bg-studio-field">
              {d.label || layer.deviceLabel || `Caméra ${i + 1}`}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={grant}
          disabled={asking}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-studio-purple/30 bg-studio-purple/10 py-2 text-[11px] font-bold text-studio-purple transition hover:bg-studio-purple/20 disabled:opacity-50"
        >
          <Camera className="size-3.5" />
          {asking ? "…" : "Autoriser l'accès"}
        </button>
        <button
          type="button"
          onClick={() => void refresh()}
          title="Rafraîchir la liste"
          className="flex items-center justify-center gap-2 rounded-lg border border-white/12 bg-white/[0.04] px-3 py-2 text-[11px] font-bold text-white/60 transition hover:text-white"
        >
          <RefreshCw className="size-3.5" />
        </button>
      </div>

      {needsPermission && (
        <div className="rounded-[9px] border border-white/8 bg-white/[0.03] p-3 text-[10px] leading-relaxed text-white/50">
          Cliquez « Autoriser l&apos;accès » pour lister vos caméras. Pour une source NDI, activez
          « NDI Virtual Input » : elle apparaîtra comme une webcam.
        </div>
      )}

      <div>
        <Label className="mb-1.5">Périphérique audio (optionnel)</Label>
        <Select
          value={layer.audioDeviceId ?? ""}
          onValueChange={(v) => patchLayerData({ audioDeviceId: v || undefined })}
          className={FIELD}
        >
          <option value="" className="bg-studio-field">
            Audio de la caméra / par défaut
          </option>
          {audioDevices.map((d, i) => (
            <option key={d.deviceId} value={d.deviceId} className="bg-studio-field">
              {d.label || `Micro ${i + 1}`}
            </option>
          ))}
        </Select>
      </div>

      <button
        type="button"
        onClick={() => patchLayerData({ listenLocal: !listenLocal })}
        className={cn(
          "flex items-center justify-center gap-2 rounded-lg border py-2 text-[11.5px] font-bold transition-colors",
          listenLocal
            ? "border-gold/40 bg-gold/15 text-gold"
            : "border-white/12 bg-white/[0.03] text-white/60 hover:text-white",
        )}
      >
        {listenLocal ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5" />}
        {listenLocal ? "Écoute locale activée" : "Écouter en local (risque de Larsen)"}
      </button>

      <div className="rounded-[9px] border border-white/8 bg-white/[0.03] p-3 text-[10px] leading-relaxed text-white/50">
        Aperçu live dans les moniteurs, déplaçable/redimensionnable. Le son passe par la table de
        mixage (VU réel) — coupé en local par défaut pour éviter l&apos;effet Larsen.
      </div>
    </>
  );
}

/**
 * Contenu for a "Vidéo" source: paste a link, OR drag-drop / click to import a
 * local video (uploaded → persistent stream URL, not a blob), plus a transport
 * bar (play / pause / stop / seek / replay) wired to the Preview `<video>` via
 * the video-controller registry.
 */
function VideoContent({ layer, patchLayerData }: { layer: StudioLayer; patchLayerData: Patch }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transport, setTransport] = useState<VideoTransportState | null>(null);
  const [urlDraft, setUrlDraft] = useState(layer.feedUrl ?? "");

  const hasSource = !!layer.feedUrl?.trim();
  const loop = layer.loop ?? true;

  // Poll the Preview video's playback state to drive the scrubber. (setState
  // lives inside the interval callback, never synchronously in the effect body.)
  useEffect(() => {
    if (!hasSource) return;
    const t = setInterval(() => {
      setTransport(getVideoController(layer.id)?.getState() ?? null);
    }, 250);
    return () => clearInterval(t);
  }, [hasSource, layer.id]);

  const ctl = () => getVideoController(layer.id);
  const ready = !!transport?.ready;
  const paused = transport?.paused ?? true;
  const duration = transport?.duration ?? 0;
  const current = transport?.currentTime ?? 0;

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("video/")) {
      setError("Choisissez un fichier vidéo (.mp4, .webm, .mov…).");
      return;
    }
    setError(null);
    setUploading(true);
    setProgress(0);
    try {
      const { url } = await uploadStudioMediaWithProgress(file, setProgress);
      patchLayerData({ feedUrl: url });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de l'envoi de la vidéo.");
    } finally {
      setUploading(false);
    }
  };

  // Import an external URL server-side (CORS-safe, drawable on the canvas). Our
  // own /studio/media urls are used directly; nothing is played straight from an
  // external URL.
  const importUrl = async () => {
    const url = urlDraft.trim();
    if (!url) {
      patchLayerData({ feedUrl: "" });
      return;
    }
    if (url.includes("/studio/media/") || url.startsWith("/storage")) {
      patchLayerData({ feedUrl: url });
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const { url: hosted } = await importStudioMediaFromUrl(url);
      patchLayerData({ feedUrl: hosted });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible d'importer la vidéo depuis cette URL.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <div>
        <Label className="mb-1.5">URL du flux vidéo (.mp4 / .webm)</Label>
        <div className="flex gap-1.5">
          <input
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void importUrl();
            }}
            placeholder="https://…/clip.mp4"
            className={MONO_FIELD}
          />
          <button
            type="button"
            onClick={() => void importUrl()}
            disabled={uploading}
            className="shrink-0 rounded-lg border border-gold/30 bg-gold/15 px-3 text-[11px] font-bold text-gold transition hover:bg-gold/25 disabled:opacity-50"
          >
            Importer
          </button>
        </div>
        <span className="mt-1 block text-[10px] text-white/35">
          Le lien est téléchargé sur le serveur puis diffusé (requis pour Facebook).
        </span>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!dragOver) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) void handleFile(f);
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed py-5 text-center transition-colors",
          dragOver ? "border-gold/60 bg-gold/[0.08]" : "border-white/14 bg-white/[0.03]",
        )}
      >
        <Upload className={cn("size-4", uploading ? "animate-pulse text-gold" : "text-white/45")} />
        <label className="cursor-pointer px-2 text-[11px] font-bold text-white/60 transition-colors hover:text-gold">
          {uploading
            ? `Envoi de la vidéo… ${Math.round(progress * 100)}%`
            : "Glissez une vidéo ici ou cliquez pour l'importer"}
          <input
            type="file"
            accept="video/*"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
              e.target.value = "";
            }}
          />
        </label>
        <span className="text-[9px] text-white/30">MP4 / WebM / MOV — importé et persisté sur le serveur</span>
      </div>

      {uploading && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gold transition-[width] duration-150"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      )}

      {error && <div className="text-[10px] leading-relaxed text-[#ff8a8a]">{error}</div>}

      {/* Transport controls (drive the Preview video) */}
      {hasSource && (
        <div className="flex flex-col gap-2 rounded-[10px] border border-white/6 bg-black/[0.18] p-3">
          <div className="flex items-center justify-between">
            <Label>Lecture</Label>
            <button
              type="button"
              onClick={() => patchLayerData({ loop: !loop })}
              title={loop ? "Lecture en boucle activée" : "Lecture en boucle désactivée"}
              className={cn(
                "flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] font-bold transition-colors",
                loop ? "bg-gold/15 text-gold" : "text-white/40 hover:text-white",
              )}
            >
              <Repeat className="size-3" /> Boucle
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <TransportBtn title="Recommencer" onClick={() => ctl()?.restart()} disabled={!ready}>
              <RotateCcw className="size-3.5" />
            </TransportBtn>
            <TransportBtn title="Reculer de 10 s" onClick={() => ctl()?.skip(-10)} disabled={!ready}>
              <SkipBack className="size-3.5" />
            </TransportBtn>
            <TransportBtn
              title={paused ? "Lire" : "Pause"}
              onClick={() => ctl()?.toggle()}
              disabled={!ready}
              primary
            >
              {paused ? <Play className="size-4 fill-current" /> : <Pause className="size-4 fill-current" />}
            </TransportBtn>
            <TransportBtn title="Avancer de 10 s" onClick={() => ctl()?.skip(10)} disabled={!ready}>
              <SkipForward className="size-3.5" />
            </TransportBtn>
            <TransportBtn title="Arrêter (retour au début)" onClick={() => ctl()?.stop()} disabled={!ready}>
              <Square className="size-3.5" />
            </TransportBtn>
          </div>

          <div className="flex items-center gap-2">
            <span className={cn("w-9 text-right text-[10px] text-white/50", MONO)}>{fmtTime(current)}</span>
            <Slider
              min={0}
              max={Math.max(1, Math.floor(duration))}
              value={Math.min(current, duration || current)}
              onValueChange={(v) => ctl()?.seek(v)}
              className="flex-1"
            />
            <span className={cn("w-9 text-[10px] text-white/50", MONO)}>{fmtTime(duration)}</span>
          </div>

          {!ready && (
            <div className="text-[10px] leading-relaxed text-white/35">
              Ouvrez l&apos;aperçu (moniteur Aperçu) pour piloter la lecture. Le son démarre après un
              premier clic dans la page.
            </div>
          )}
        </div>
      )}

      <div className="rounded-[9px] border border-white/8 bg-white/[0.03] p-3 text-[10px] leading-relaxed text-white/50">
        L&apos;aperçu s&apos;affiche dans les moniteurs. Déplacez-le et redimensionnez-le dans
        l&apos;aperçu, et réglez son niveau dans la table de mixage.
      </div>
    </>
  );
}

function TransportBtn({
  title,
  onClick,
  disabled,
  primary,
  children,
}: {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center justify-center rounded-lg border transition-colors disabled:opacity-35",
        primary ? "h-9 flex-[1.4]" : "h-9 flex-1",
        primary
          ? "border-gold/40 bg-gold/15 text-gold hover:bg-gold/25"
          : "border-white/10 bg-white/[0.04] text-white/70 hover:text-white",
      )}
    >
      {children}
    </button>
  );
}

function BibleContent({
  bible,
  onRestoreDefaults,
}: {
  bible: InspectorBible;
  onRestoreDefaults?: () => void;
}) {
  return (
    <>
      <div>
        <Label className="mb-1.5">Versions ({bible.visibleVersions.length})</Label>
        <div className="mb-1.5 flex items-center gap-1.5 rounded-lg border border-white/10 bg-studio-field px-2.5 py-1.5">
          <Search className="size-3 text-white/40" />
          <input
            value={bible.translationSearch}
            onChange={(e) => bible.onTranslationSearchChange(e.target.value)}
            placeholder="Rechercher une version…"
            className="min-w-0 flex-1 bg-transparent text-[11px] text-white outline-none"
          />
        </div>
        <ScrollArea className="flex max-h-28 flex-col gap-[3px]">
          {bible.visibleTranslations.length === 0 ? (
            <div className="rounded-[7px] border border-dashed border-white/10 px-2.5 py-3 text-center text-[10px] text-white/30">
              Aucune version chargée.
            </div>
          ) : (
            bible.visibleTranslations.map((v) => {
              const isVisible = bible.visibleVersions.includes(v);
              const isDefault = bible.defaultVersion === v;
              return (
                <div
                  key={v}
                  className={cn(
                    "flex items-center gap-2 rounded-[7px] border px-2.5 py-1.5",
                    isVisible ? "border-gold/30 bg-gold/[0.08]" : "border-white/8 bg-white/[0.02]",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => bible.onSetDefaultVersion(v)}
                    title="Version par défaut"
                    className="flex size-[13px] shrink-0 items-center justify-center rounded-full border-2"
                    style={{ borderColor: isDefault ? "#e2b85f" : "rgba(255,255,255,.3)" }}
                  >
                    {isDefault && <span className="size-1.5 rounded-full bg-gold" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => bible.onToggleVersion(v)}
                    className={cn(
                      "flex-1 text-left text-[11.5px] font-semibold",
                      isVisible ? "text-white" : "text-white/45",
                    )}
                  >
                    {v}
                  </button>
                </div>
              );
            })
          )}
          {bible.hasMoreTranslations && (
            <button
              type="button"
              onClick={bible.onShowMoreTranslations}
              className="mt-0.5 rounded-[7px] border border-dashed border-white/10 py-1.5 text-[10px] font-bold text-white/45 hover:text-white"
            >
              Voir plus de versions…
            </button>
          )}
        </ScrollArea>
      </div>

      <div>
        <Label className="mb-1.5">Recherche de versets</Label>
        <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-studio-field px-2.5 py-2">
          <Search className="size-3.5 text-white/40" />
          <input
            value={bible.query}
            onChange={(e) => bible.onQueryChange(e.target.value)}
            placeholder="Jean 3:16, Psaume 23…"
            className="min-w-0 flex-1 bg-transparent text-[11.5px] text-white outline-none"
          />
          {bible.searching && <span className="text-[9px] text-white/40">…</span>}
        </div>
        {bible.suggestions.length > 0 && (
          <ScrollArea className="mt-1.5 flex max-h-36 flex-col gap-1">
            {bible.suggestions.map((r, idx) => (
              <div key={`${r.reference}-${idx}`} className="flex items-stretch gap-1.5">
                <button
                  type="button"
                  onClick={() => bible.onLoadVerse(r)}
                  className="flex-1 rounded-[7px] border border-white/6 bg-white/[0.03] px-2.5 py-2 text-left transition-colors hover:border-gold/40"
                >
                  <span className="block text-[10.5px] font-extrabold text-gold">{r.reference}</span>
                  <span className="mt-0.5 block line-clamp-2 text-[10px] leading-snug text-white/55">
                    {r.text}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => bible.onPrepare(r)}
                  title="Préparer"
                  className="flex w-[30px] shrink-0 items-center justify-center rounded-[7px] border border-dashed border-gold/30 bg-gold/[0.06] text-gold transition-colors hover:bg-gold/15"
                >
                  <Plus className="size-3.5" />
                </button>
              </div>
            ))}
          </ScrollArea>
        )}
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <Label>Versets préparés</Label>
          <span className={cn("text-[10px] text-gold", MONO)}>{bible.prepared.length}</span>
        </div>
        {bible.prepared.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/10 p-2.5 text-center text-[10.5px] leading-relaxed text-white/30">
            Préparez vos versets avant le culte (bouton ＋).
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {bible.prepared.map((p, idx) => (
              <div
                key={`${p.reference}-${idx}`}
                className="flex items-center gap-1.5 rounded-[7px] border border-white/6 bg-white/[0.03] px-2.5 py-1.5"
              >
                <button
                  type="button"
                  onClick={() => bible.onLoadVerse(p)}
                  className="flex-1 text-left text-[11.5px] font-bold text-white"
                >
                  {p.reference}
                </button>
                <button
                  type="button"
                  onClick={() => bible.onRemovePrepared(p)}
                  className="text-white/30 transition-colors hover:text-[#ff8a8a]"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reset the bible's style (the global broadcast settings) to defaults. */}
      <button
        type="button"
        onClick={onRestoreDefaults}
        className="w-full rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 py-2 text-[11.5px] font-bold text-red-400 transition"
      >
        Réinitialiser aux paramètres par défaut
      </button>
    </>
  );
}

/* ─────────────────────────── Mise en page ─────────────────────────── */

function LayoutPanel({
  settings,
  setStudioField,
}: {
  settings: StudioSettings;
  setStudioField: <K extends keyof StudioSettings>(key: K, value: StudioSettings[K]) => void;
}) {
  const custom = settings.positionMode === "custom";
  return (
    <>
      <StickyBar>
        <Label className="mb-1.5">Mode de position</Label>
        <div className="flex rounded-[9px] bg-black/25 p-[3px]">
          {(["predefined", "custom"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setStudioField("positionMode", m)}
              className={cn(
                "flex-1 rounded-[7px] py-1.5 text-[11px] font-bold transition-colors",
                settings.positionMode === m
                  ? "bg-studio-purple/20 text-studio-purple"
                  : "text-white/55",
              )}
            >
              {m === "predefined" ? "Prédéfini" : "Libre (glisser)"}
            </button>
          ))}
        </div>
      </StickyBar>

      {!custom && (
        <div>
          <Label className="mb-1.5">Disposition</Label>
          <Select
            value={settings.predefinedPosition}
            onValueChange={(v) =>
              setStudioField("predefinedPosition", v as StudioSettings["predefinedPosition"])
            }
            className={FIELD}
          >
            {PREDEFINED_POSITIONS.map((o) => (
              <option key={o.value} value={o.value} className="bg-studio-field">
                {o.label}
              </option>
            ))}
          </Select>
        </div>
      )}

      {custom && (
        <>
          {(
            [
              // OBS-like: allow off-frame positions and oversized boxes (the
              // stage + broadcast canvas clip the overflow).
              ["customX", "Position X", "%", -50, 150],
              ["customY", "Position Y", "%", -50, 150],
              ["customWidth", "Largeur", "%", 10, 200],
            ] as const
          ).map(([key, label, unit, min, max]) => (
            <div key={key}>
              <SliderLabel label={label} value={`${settings[key]}${unit}`} />
              <Slider min={min} max={max} value={settings[key]} onValueChange={(v) => setStudioField(key, v)} />
            </div>
          ))}

          <div>
            <Label className="mb-1.5">Débordement du contenu</Label>
            <Select
              value={settings.overflowDirection ?? "down"}
              onValueChange={(v) =>
                setStudioField("overflowDirection", v as StudioSettings["overflowDirection"])
              }
              className={FIELD}
            >
              <option value="down" className="bg-studio-field">Agrandir vers le bas</option>
              <option value="up" className="bg-studio-field">Agrandir vers le haut</option>
              <option value="center" className="bg-studio-field">Agrandir des deux côtés (centré)</option>
            </Select>
            <p className="mt-1 text-[10px] leading-relaxed text-white/40">
              Quand le texte (ex. un verset long) dépasse la hauteur du cadre, le cadre
              s&apos;agrandit dans cette direction.
            </p>
          </div>
          <div className="text-[10px] leading-relaxed text-white/40">
            Astuce : glissez directement la source dans l&apos;aperçu pour la positionner.
          </div>
        </>
      )}

      <div>
        <Label className="mb-1.5">Alignement Horizontal</Label>
        <div className="flex rounded-[9px] bg-black/25 p-[3px]">
          {(["left", "center", "right"] as const).map((align) => (
            <button
              key={align}
              type="button"
              onClick={() => setStudioField("textAlign", align)}
              className={cn(
                "flex-1 rounded-[7px] py-1.5 text-[10px] font-bold transition-colors capitalize",
                (settings.textAlign || "center") === align
                  ? "bg-studio-purple/20 text-studio-purple"
                  : "text-white/55",
              )}
            >
              {align === "left" ? "Gauche" : align === "center" ? "Centre" : "Droite"}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label className="mb-1.5">Alignement Vertical</Label>
        <div className="flex rounded-[9px] bg-black/25 p-[3px]">
          {(["top", "center", "bottom"] as const).map((valign) => (
            <button
              key={valign}
              type="button"
              onClick={() => setStudioField("textVerticalAlign", valign)}
              className={cn(
                "flex-1 rounded-[7px] py-1.5 text-[10px] font-bold transition-colors capitalize",
                (settings.textVerticalAlign || "center") === valign
                  ? "bg-studio-purple/20 text-studio-purple"
                  : "text-white/55",
              )}
            >
              {valign === "top" ? "Haut" : valign === "center" ? "Milieu" : "Bas"}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────── Typo ─────────────────────────── */

function TypoPanel({
  setStudioField,
  typoEl,
  setTypoEl,
  tk,
  tv,
}: {
  setStudioField: <K extends keyof StudioSettings>(key: K, value: StudioSettings[K]) => void;
  typoEl: "fontRef" | "fontBody" | "fontVer";
  setTypoEl: (v: "fontRef" | "fontBody" | "fontVer") => void;
  tk: <S extends string>(suffix: S) => keyof StudioSettings;
  tv: (suffix: string) => StudioSettings[keyof StudioSettings];
}) {
  const flag = (suffix: "Style" | "Transform" | "Decoration", on: string, off: string) => {
    const active = tv(suffix) === on;
    setStudioField(tk(suffix), (active ? off : on) as StudioSettings[keyof StudioSettings]);
  };

  return (
    <>
      <StickyBar>
        <Label className="mb-1.5">Élément à styler</Label>
        <div className="flex rounded-[9px] border border-studio-purple/25 bg-black/25 p-[3px]">
          {TYPO_ELEMENTS.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => setTypoEl(e.id)}
              className={cn(
                "flex-1 rounded-[7px] py-2 text-[11.5px] font-bold transition-colors",
                typoEl === e.id
                  ? "bg-studio-purple text-white shadow-[0_2px_8px_rgba(178,112,255,.35)]"
                  : "text-white/55 hover:text-white",
              )}
            >
              {e.label}
            </button>
          ))}
        </div>
      </StickyBar>
      <p className="-mt-1 text-[10px] leading-relaxed text-white/40">
        Police, graisse, taille et couleur ci-dessous s&apos;appliquent à l&apos;élément
        sélectionné : la référence (titre), le verset ou la version.
      </p>

      <div>
        <Label className="mb-1.5">Police</Label>
        <Select
          value={tv("Family") as string}
          onValueChange={(v) => setStudioField(tk("Family"), v as StudioSettings[keyof StudioSettings])}
          className={FIELD}
        >
          {FONT_OPTIONS.map((f) => (
            <option key={f} value={f} className="bg-studio-field">
              {f}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label className="mb-1.5">Graisse</Label>
        <Select
          value={tv("Weight") as string}
          onValueChange={(v) => setStudioField(tk("Weight"), v as StudioSettings[keyof StudioSettings])}
          className={FIELD}
        >
          {WEIGHT_OPTIONS.map((w) => (
            <option key={w.value} value={w.value} className="bg-studio-field">
              {w.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => flag("Style", "italic", "normal")}
          className={cn(
            "flex flex-1 items-center justify-center rounded-[7px] border py-1.5",
            tv("Style") === "italic"
              ? "border-studio-purple/45 bg-studio-purple/15 text-studio-purple"
              : "border-white/10 text-white/60",
          )}
        >
          <Italic className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => flag("Transform", "uppercase", "none")}
          className={cn(
            "flex-1 rounded-[7px] border py-1.5 text-[11px] font-bold",
            tv("Transform") === "uppercase"
              ? "border-studio-purple/45 bg-studio-purple/15 text-studio-purple"
              : "border-white/10 text-white/60",
          )}
        >
          MAJ
        </button>
        <button
          type="button"
          onClick={() => flag("Decoration", "underline", "none")}
          className={cn(
            "flex flex-1 items-center justify-center rounded-[7px] border py-1.5",
            tv("Decoration") === "underline"
              ? "border-studio-purple/45 bg-studio-purple/15 text-studio-purple"
              : "border-white/10 text-white/60",
          )}
        >
          <Underline className="size-3.5" />
        </button>
      </div>

      <div>
        {/* Sizes are composition px (1080p canvas) — a broadcast headline easily
            needs 100-300px there, hence the wide range. */}
        <SliderLabel label="Taille" value={`${tv("Size")}px`} />
        <Slider
          min={16}
          max={360}
          value={tv("Size") as number}
          onValueChange={(v) => setStudioField(tk("Size"), v as StudioSettings[keyof StudioSettings])}
        />
      </div>
      <div>
        <SliderLabel label="Hauteur de ligne" value={`${tv("LineHeight")}`} />
        <Slider
          min={1}
          max={2.4}
          step={0.1}
          value={tv("LineHeight") as number}
          onValueChange={(v) => setStudioField(tk("LineHeight"), v as StudioSettings[keyof StudioSettings])}
        />
      </div>
      <div>
        <SliderLabel label="Interlettrage" value={`${tv("Spacing")}px`} />
        <Slider
          min={-3}
          max={60}
          step={0.5}
          value={tv("Spacing") as number}
          onValueChange={(v) => setStudioField(tk("Spacing"), v as StudioSettings[keyof StudioSettings])}
        />
      </div>

      <div>
        <Label className="mb-1.5">Couleur du texte</Label>
        <div className="flex gap-1.5">
          {COLOR_SWATCHES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setStudioField(tk("Color"), c as StudioSettings[keyof StudioSettings])}
              className={cn(
                "size-[26px] rounded-[7px] border-2",
                tv("Color") === c ? "border-white" : "border-white/15",
              )}
              style={{ background: c }}
            />
          ))}
          <input
            type="color"
            value={(tv("Color") as string)?.startsWith("#") ? (tv("Color") as string) : "#ffffff"}
            onChange={(e) =>
              setStudioField(tk("Color"), e.target.value as StudioSettings[keyof StudioSettings])
            }
            className="size-[26px] cursor-pointer rounded-[7px] border-2 border-white/15 bg-transparent"
          />
        </div>
        <div className="mt-1.5 flex gap-1.5">
          {TEXT_GRADIENTS.map((g) => (
            <button
              key={g}
              type="button"
              title="Dégradé"
              onClick={() => setStudioField(tk("Color"), g as StudioSettings[keyof StudioSettings])}
              className={cn(
                "h-[26px] flex-1 rounded-[7px] border-2",
                tv("Color") === g ? "border-white" : "border-white/15",
              )}
              style={{ backgroundImage: g }}
            />
          ))}
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────── Cadre (container) ─────────────────────────── */

function ContainerPanel({
  settings,
  setStudioField,
}: {
  settings: StudioSettings;
  setStudioField: <K extends keyof StudioSettings>(key: K, value: StudioSettings[K]) => void;
}) {
  return (
    <>
      <StickyBar>
        <Label className="mb-1.5">Forme du conteneur</Label>
        <Select
          value={settings.containerShape}
          onValueChange={(v) => setStudioField("containerShape", v as StudioSettings["containerShape"])}
          className={FIELD}
        >
          {CONTAINER_SHAPES.map((o) => (
            <option key={o.value} value={o.value} className="bg-studio-field">
              {o.label}
            </option>
          ))}
        </Select>
      </StickyBar>

      <div>
        <Label className="mb-1.5">Arrière-plan (CSS)</Label>
        <input
          value={settings.containerBg}
          onChange={(e) => setStudioField("containerBg", e.target.value)}
          placeholder="rgba(13,8,24,.86)"
          className={MONO_FIELD}
        />
      </div>

      <div>
        <SliderLabel label="Arrondi des angles" value={`${settings.containerBorderRadius}px`} />
        <Slider
          min={0}
          max={120}
          value={settings.containerBorderRadius}
          onValueChange={(v) => setStudioField("containerBorderRadius", v)}
        />
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <div className="mb-1 text-[10px] text-white/50">Bordure (px)</div>
          <input
            type="number"
            min={0}
            max={24}
            value={settings.containerBorderWidth}
            onChange={(e) => setStudioField("containerBorderWidth", Number(e.target.value))}
            className={FIELD}
          />
        </div>
        <div className="flex-[1.4]">
          <div className="mb-1 text-[10px] text-white/50">Style</div>
          <Select
            value={settings.containerBorderStyle}
            onValueChange={(v) =>
              setStudioField("containerBorderStyle", v as StudioSettings["containerBorderStyle"])
            }
            className={cn(FIELD, "text-[11px]")}
          >
            {BORDER_STYLES.map((o) => (
              <option key={o.value} value={o.value} className="bg-studio-field">
                {o.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div>
        <Label className="mb-1.5">Couleur bordure</Label>
        <input
          value={settings.containerBorderColor}
          onChange={(e) => setStudioField("containerBorderColor", e.target.value)}
          placeholder="rgba(226,184,95,.4)"
          className={MONO_FIELD}
        />
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <div className="mb-1 text-[10px] text-white/50">Marge X</div>
          <input
            type="number"
            min={0}
            max={80}
            value={settings.containerPaddingX}
            onChange={(e) => setStudioField("containerPaddingX", Number(e.target.value))}
            className={FIELD}
          />
        </div>
        <div className="flex-1">
          <div className="mb-1 text-[10px] text-white/50">Marge Y</div>
          <input
            type="number"
            min={0}
            max={80}
            value={settings.containerPaddingY}
            onChange={(e) => setStudioField("containerPaddingY", Number(e.target.value))}
            className={FIELD}
          />
        </div>
      </div>

      <div>
        <SliderLabel label="Flou de l'ombre" value={`${settings.shadowBlur}px`} />
        <Slider
          min={0}
          max={240}
          value={settings.shadowBlur}
          onValueChange={(v) => setStudioField("shadowBlur", v)}
        />
      </div>
    </>
  );
}

/* ─────────────────────────── Anim ─────────────────────────── */

function AnimPanel({
  settings,
  setStudioField,
  onPlayAnim,
}: {
  settings: StudioSettings;
  setStudioField: <K extends keyof StudioSettings>(key: K, value: StudioSettings[K]) => void;
  onPlayAnim?: () => void;
}) {
  const durLabel = settings.duration === 0 ? "Manuel" : `${settings.duration}s`;
  return (
    <>
      <StickyBar>
        <Label className="mb-1.5">Effet d&apos;apparition</Label>
        <Select
          value={settings.animation}
          onValueChange={(v) => {
            setStudioField("animation", v as StudioSettings["animation"]);
            setTimeout(() => onPlayAnim?.(), 50);
          }}
          className={FIELD}
        >
          {ANIM_OPTIONS.map((o) => (
            <option key={o.value} value={o.value} className="bg-studio-field">
              {o.label}
            </option>
          ))}
        </Select>
      </StickyBar>

      <div>
        <SliderLabel label="Durée de transition" value={`${settings.animDuration}ms`} />
        <Slider
          min={100}
          max={2000}
          step={50}
          value={settings.animDuration}
          onValueChange={(v) => {
            setStudioField("animDuration", v);
          }}
          onMouseUp={() => setTimeout(() => onPlayAnim?.(), 50)}
          onTouchEnd={() => setTimeout(() => onPlayAnim?.(), 50)}
        />
      </div>

      <div>
        <Label className="mb-1.5">Courbe (easing)</Label>
        <Select
          value={settings.animEasing}
          onValueChange={(v) => {
            setStudioField("animEasing", v as StudioSettings["animEasing"]);
            setTimeout(() => onPlayAnim?.(), 50);
          }}
          className={FIELD}
        >
          {EASING_OPTIONS.map((o) => (
            <option key={o.value} value={o.value} className="bg-studio-field">
              {o.label}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <SliderLabel label="Durée d'affichage" value={durLabel} />
        <Slider
          min={0}
          max={60}
          step={5}
          value={settings.duration}
          onValueChange={(v) => setStudioField("duration", v)}
        />
        <div className="mt-1 text-[10px] text-white/35">0 = reste affiché jusqu&apos;au masquage manuel.</div>
      </div>

      {onPlayAnim && (
        <button
          type="button"
          onClick={onPlayAnim}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-studio-purple/30 bg-studio-purple/10 py-2.5 text-[11px] font-bold text-studio-purple transition hover:bg-studio-purple/20"
        >
          <Play className="size-3.5 fill-current" />
          Aperçu de l&apos;animation
        </button>
      )}
    </>
  );
}

/* ─────────────────────────── Presets ─────────────────────────── */

function PresetsPanel({
  setSelectedStyle,
  presets,
  newPresetName,
  onNewPresetNameChange,
  onSavePreset,
  onDeletePreset,
}: {
  effectiveStyle: StudioSettings;
  setSelectedStyle: (s: StudioSettings) => void;
  presets: { name: string; settings: StudioSettings }[];
  newPresetName: string;
  onNewPresetNameChange: (v: string) => void;
  onSavePreset: () => void;
  onDeletePreset: (name: string) => void;
}) {
  return (
    <>
      <StickyBar>
        <div className="flex flex-col gap-2 rounded-[10px] border border-white/5 bg-black/[0.18] p-3">
          <Label>Enregistrer le style actuel</Label>
        <input
          value={newPresetName}
          onChange={(e) => onNewPresetNameChange(e.target.value)}
          placeholder="Nom du preset…"
          className={FIELD}
        />
        <button
          type="button"
          onClick={onSavePreset}
          className="w-full rounded-lg bg-gold py-2 text-[12px] font-extrabold text-ink transition hover:brightness-105"
        >
          Sauvegarder le preset
          </button>
        </div>
      </StickyBar>

      <div>
        <Label className="mb-1.5">Presets sauvegardés</Label>
        {presets.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/10 p-2.5 text-center text-[10.5px] text-white/30">
            Aucun preset. Créez-en un ci-dessus.
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {presets.map((p) => (
              <div
                key={p.name}
                className="flex items-center gap-1.5 rounded-lg border border-white/6 bg-white/4 px-2.5 py-2"
              >
                <button
                  type="button"
                  onClick={() => setSelectedStyle(p.settings)}
                  className="flex-1 text-left text-[11.5px] font-bold text-white"
                >
                  {p.name}
                </button>
                <button
                  type="button"
                  onClick={() => onDeletePreset(p.name)}
                  className="text-white/30 transition-colors hover:text-[#ff8a8a]"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
