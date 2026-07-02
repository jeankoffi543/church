"use client";

import { useEffect, useState, type ReactNode } from "react";
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
  EyeOff
} from "lucide-react";

import { uploadStudioMedia } from "@/lib/admin-api";

import { DEFAULT_STUDIO_SETTINGS, type ScriptureVerse, type StudioSettings } from "@/lib/studio";
import { cn } from "@/lib/utils";
import { getVideoController, type VideoTransportState } from "./studio-video";
import { Slider } from "@/components/ui/slider";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MONO,
  COLOR_SWATCHES,
  FONT_OPTIONS,
  WEIGHT_OPTIONS,
  PREDEFINED_POSITIONS,
  CONTAINER_SHAPES,
  BORDER_STYLES,
  ANIM_OPTIONS,
  EASING_OPTIONS,
  TYPO_ELEMENTS,
} from "./studio-tokens";
import { LAYER_META, layerTabs, type InspTab, type StudioLayer } from "./studio-layers";

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
};

type Patch = (patch: Partial<StudioLayer>) => void;

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
  onImageFile,
  bible,
  presets,
  newPresetName,
  onNewPresetNameChange,
  onSavePreset,
  onDeletePreset,
  onRestoreDefaults,
  onPlayAnim,
}: {
  selectedLayer: StudioLayer | null;
  effectiveStyle: StudioSettings;
  patchStyleField: <K extends keyof StudioSettings>(key: K, value: StudioSettings[K]) => void;
  setSelectedStyle: (s: StudioSettings) => void;
  onRename: (name: string) => void;
  patchLayerData: Patch;
  onImageFile: (file: File) => void;
  bible: InspectorBible;
  presets: { name: string; settings: StudioSettings }[];
  newPresetName: string;
  onNewPresetNameChange: (v: string) => void;
  onSavePreset: () => void;
  onDeletePreset: (name: string) => void;
  onRestoreDefaults?: () => void;
  onPlayAnim?: () => void;
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
            <div>
              <Label className="mb-1.5">Nom de la source</Label>
              <input value={selectedLayer.name} onChange={(e) => onRename(e.target.value)} className={FIELD} />
            </div>

            {activeTab === "contenu" && (
              <ContentPanel
                layer={selectedLayer}
                patchLayerData={patchLayerData}
                onImageFile={onImageFile}
                onRestoreDefaults={onRestoreDefaults}
                bible={bible}
                onPlayAnim={onPlayAnim}
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
}: {
  layer: StudioLayer;
  patchLayerData: Patch;
  onRestoreDefaults?: () => void;
}) {
  const childLayers = layer.layers ?? [];
  const groupLiveActive = layer.groupLiveActive ?? false;

  const [childType, setChildType] = useState<"text" | "image">("text");
  const [childName, setChildName] = useState("");
  const [childContent, setChildContent] = useState("");
  const [editIdx, setEditIdx] = useState<number | null>(null);

  const handleAddOrUpdateChild = () => {
    const name = childName.trim();
    const content = childContent.trim();
    if (!name || !content) return;

    const nextChildLayers = [...childLayers];
    if (editIdx !== null) {
      const existing = nextChildLayers[editIdx];
      nextChildLayers[editIdx] = {
        ...existing,
        name,
        type: childType,
        imageUrl: childType === "image" ? content : undefined,
        content: childType === "text" ? content : undefined,
      };
      setEditIdx(null);
    } else {
      nextChildLayers.push({
        id: `layer-${Date.now()}-group-child-${nextChildLayers.length + 1}`,
        type: childType,
        name,
        visible: true,
        style: {
          ...DEFAULT_STUDIO_SETTINGS,
          fontBodySize: childType === "text" ? 28 : DEFAULT_STUDIO_SETTINGS.fontBodySize,
          fontBodyColor: "#ffffff",
        },
        imageUrl: childType === "image" ? content : undefined,
        content: childType === "text" ? content : undefined,
      });
    }

    patchLayerData({ layers: nextChildLayers });
    setChildName("");
    setChildContent("");
  };

  const handleEditChild = (index: number) => {
    const child = childLayers[index];
    if (!child) return;
    setChildType(child.type as "text" | "image");
    setChildName(child.name);
    setChildContent((child.type === "image" ? child.imageUrl : child.content) ?? "");
    setEditIdx(index);
  };

  const handleDeleteChild = (index: number) => {
    const nextChildLayers = childLayers.filter((_, idx) => idx !== index);
    patchLayerData({ layers: nextChildLayers });
  };

  const handleToggleChildVisibility = (index: number) => {
    const nextChildLayers = childLayers.map((c, idx) =>
      idx === index ? { ...c, visible: !c.visible } : c
    );
    patchLayerData({ layers: nextChildLayers });
  };

  const handleApplyGroupStyleToChildren = () => {
    const nextChildLayers = childLayers.map((c) => {
      const preservedPosition = {
        positionMode: c.style.positionMode,
        predefinedPosition: c.style.predefinedPosition,
        customX: c.style.customX,
        customY: c.style.customY,
        customWidth: c.style.customWidth,
        customHeight: c.style.customHeight,
      };
      return {
        ...c,
        style: {
          ...layer.style,
          ...preservedPosition,
        },
      };
    });
    patchLayerData({ layers: nextChildLayers });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Action button to uniformise styles */}
      <button
        type="button"
        onClick={handleApplyGroupStyleToChildren}
        className="w-full rounded-lg border border-gold/30 bg-gold/10 hover:bg-gold/20 py-2 text-[11px] font-bold text-gold transition flex items-center justify-center gap-1.5"
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

      {/* Form to add or edit a child layer */}
      <div className="flex flex-col gap-2 rounded-[10px] border border-white/5 bg-black/[0.18] p-3">
        <Label className="text-white/70">
          {editIdx !== null ? "Modifier le calque groupé" : "Ajouter un calque au groupe"}
        </Label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setChildType("text")}
            className={cn(
              "flex-1 rounded-md py-1 text-[10.5px] font-bold transition",
              childType === "text" ? "bg-studio-purple text-white" : "bg-white/5 text-white/60"
            )}
          >
            Texte
          </button>
          <button
            type="button"
            onClick={() => setChildType("image")}
            className={cn(
              "flex-1 rounded-md py-1 text-[10.5px] font-bold transition",
              childType === "image" ? "bg-studio-purple text-white" : "bg-white/5 text-white/60"
            )}
          >
            Image
          </button>
        </div>
        <input
          value={childName}
          onChange={(e) => setChildName(e.target.value)}
          placeholder="Nom du calque (ex: Titre, Logo...)"
          className={FIELD}
        />
        <textarea
          value={childContent}
          onChange={(e) => setChildContent(e.target.value)}
          placeholder={childType === "image" ? "URL de l'image..." : "Contenu textuel..."}
          rows={2}
          className={cn(FIELD, "resize-y")}
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleAddOrUpdateChild}
            disabled={!childName.trim() || !childContent.trim()}
            className="flex-1 rounded-lg bg-gold py-1.5 text-[11.5px] font-extrabold text-ink transition hover:brightness-105 disabled:opacity-50"
          >
            {editIdx !== null ? "Mettre à jour" : "Ajouter au groupe"}
          </button>
          {editIdx !== null && (
            <button
              type="button"
              onClick={() => {
                setChildName("");
                setChildContent("");
                setEditIdx(null);
              }}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-[11.5px] font-bold text-white/75 transition hover:bg-white/5"
            >
              Annuler
            </button>
          )}
        </div>
      </div>

      {/* List of group child layers */}
      <div>
        <Label className="mb-1.5">Calques regroupés</Label>
        {childLayers.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/10 p-4 text-center text-[11px] text-white/35">
            Aucun calque dans ce groupe.
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {childLayers.map((c, idx) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 hover:bg-white/5"
              >
                <div className="flex-1 text-left min-w-0">
                  <div className="text-[11.5px] font-bold text-white flex items-center gap-1.5">
                    <span className={cn("size-2 rounded-full", c.visible ? "bg-studio-preview-bright" : "bg-white/20")} />
                    {c.name}
                  </div>
                  <div className="mt-0.5 truncate text-[10px] text-white/45">
                    {c.type === "image" ? c.imageUrl : c.content}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleToggleChildVisibility(idx)}
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
                    onClick={() => handleEditChild(idx)}
                    className="text-white/30 transition hover:text-white"
                    title="Modifier"
                  >
                    <Sparkles className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteChild(idx)}
                    className="text-white/30 transition hover:text-[#ff8a8a]"
                    title="Supprimer"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              </div>
            ))}
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

function ContentPanel({
  layer,
  patchLayerData,
  onImageFile,
  onRestoreDefaults,
  bible,
  onPlayAnim,
}: {
  layer: StudioLayer;
  patchLayerData: Patch;
  onImageFile: (file: File) => void;
  onRestoreDefaults?: () => void;
  bible: InspectorBible;
  onPlayAnim?: () => void;
}) {
  if (layer.type === "bible") return <BibleContent bible={bible} />;

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
      <>
        <div>
          <Label className="mb-1.5">Périphérique</Label>
          <input
            value={layer.device ?? ""}
            onChange={(e) => patchLayerData({ device: e.target.value })}
            placeholder="Micro prédicateur, table de mixage…"
            className={FIELD}
          />
        </div>
        <div className="rounded-[9px] border border-white/8 bg-white/[0.03] p-3 text-[10px] leading-relaxed text-white/50">
          Source audio (sans rendu visuel). Réglez son niveau dans la table de mixage.
        </div>
      </>
    );
  }

  if (layer.type === "group") {
    return (
      <GroupInspector
        layer={layer}
        patchLayerData={patchLayerData}
        onRestoreDefaults={onRestoreDefaults}
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
          <input
            value={layer.imageUrl ?? ""}
            onChange={(e) => patchLayerData({ imageUrl: e.target.value })}
            placeholder="https://… ou /storage/…"
            className={MONO_FIELD}
          />
        </div>
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-white/14 bg-white/[0.03] py-3 text-[11px] font-bold text-white/55 transition-colors hover:border-gold/40 hover:text-gold">
          <Upload className="size-3.5" /> Importer un fichier…
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                void onImageFile(f);
              }
              e.target.value = ""; // Clear file path value
            }}
          />
        </label>
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
    return <VideoContent layer={layer} patchLayerData={patchLayerData} />;
  }

  // camera
  return (
    <>
      <div>
        <Label className="mb-1.5">Source NDI</Label>
        <input
          value={layer.feedUrl ?? ""}
          onChange={(e) => patchLayerData({ feedUrl: e.target.value })}
          placeholder="ndi://camera-autel"
          className={MONO_FIELD}
        />
      </div>
      <div className="rounded-[9px] border border-white/8 bg-white/[0.03] p-3 text-[10px] leading-relaxed text-white/50">
        <div className="flex justify-between">
          <span>Type</span>
          <span className="font-semibold text-white">Capture NDI</span>
        </div>
        <div className="flex justify-between">
          <span>Résolution</span>
          <span className={cn("text-white", MONO)}>1920×1080</span>
        </div>
      </div>
    </>
  );
}

const fmtTime = (s: number) => {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

/**
 * Contenu for a "Vidéo" source: paste a link, OR drag-drop / click to import a
 * local video (uploaded → persistent stream URL, not a blob), plus a transport
 * bar (play / pause / stop / seek / replay) wired to the Preview `<video>` via
 * the video-controller registry.
 */
function VideoContent({ layer, patchLayerData }: { layer: StudioLayer; patchLayerData: Patch }) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transport, setTransport] = useState<VideoTransportState | null>(null);

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
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { url } = await uploadStudioMedia(fd);
      patchLayerData({ feedUrl: url });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de l'envoi de la vidéo.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <div>
        <Label className="mb-1.5">URL du flux vidéo (.m3u8 / .mp4 / réseau VLC)</Label>
        <input
          value={layer.feedUrl ?? ""}
          onChange={(e) => patchLayerData({ feedUrl: e.target.value })}
          placeholder="https://…/live.m3u8  ·  https://…/clip.mp4"
          className={MONO_FIELD}
        />
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
          {uploading ? "Envoi de la vidéo…" : "Glissez une vidéo ici ou cliquez pour l'importer"}
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

function BibleContent({ bible }: { bible: InspectorBible }) {
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
      <div>
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
      </div>

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
              ["customX", "Position X", "%", 0, 100],
              ["customY", "Position Y", "%", 0, 100],
              ["customWidth", "Largeur", "%", 15, 100],
            ] as const
          ).map(([key, label, unit, min, max]) => (
            <div key={key}>
              <SliderLabel label={label} value={`${settings[key]}${unit}`} />
              <Slider min={min} max={max} value={settings[key]} onValueChange={(v) => setStudioField(key, v)} />
            </div>
          ))}
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
      <div className="flex rounded-[9px] bg-black/25 p-[3px]">
        {TYPO_ELEMENTS.map((e) => (
          <button
            key={e.id}
            type="button"
            onClick={() => setTypoEl(e.id)}
            className={cn(
              "flex-1 rounded-[7px] py-1.5 text-[10.5px] font-bold transition-colors",
              typoEl === e.id ? "bg-studio-purple/20 text-studio-purple" : "text-white/55",
            )}
          >
            {e.label}
          </button>
        ))}
      </div>

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
        <SliderLabel label="Taille" value={`${tv("Size")}px`} />
        <Slider
          min={8}
          max={120}
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
          min={-1}
          max={20}
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
      <div>
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
      </div>

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
          max={40}
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
            max={8}
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
          max={80}
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
      <div>
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
      </div>

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
