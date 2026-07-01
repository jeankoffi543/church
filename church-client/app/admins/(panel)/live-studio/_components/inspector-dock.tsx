"use client";

import { useState } from "react";
import { Sparkles, Search, Plus, X, Italic, Underline, Upload, Radio, Play } from "lucide-react";

import type { ScriptureVerse, StudioSettings } from "@/lib/studio";
import { cn } from "@/lib/utils";
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
  onBroadcastEmbed,
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
  onBroadcastEmbed: (url: string) => void;
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
        <Sparkles className="size-[15px] text-studio-purple" strokeWidth={1.8} />
        <span className="text-[11px] font-extrabold tracking-[1px] text-white uppercase">
          Studio · Style Pro
        </span>
        <span className="ml-auto rounded-md bg-studio-purple/12 px-1.5 py-[3px] text-[9px] font-bold text-studio-purple">
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
          <div className="flex flex-none flex-wrap gap-[3px] border-b border-white/5 px-2 py-2">
            {available.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  "min-w-[50px] flex-1 rounded-[7px] px-1 py-1.5 text-[10px] font-bold transition-colors",
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
                onBroadcastEmbed={onBroadcastEmbed}
                onRestoreDefaults={onRestoreDefaults}
                bible={bible}
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

function ContentPanel({
  layer,
  patchLayerData,
  onImageFile,
  onBroadcastEmbed,
  onRestoreDefaults,
  bible,
}: {
  layer: StudioLayer;
  patchLayerData: Patch;
  onImageFile: (file: File) => void;
  onBroadcastEmbed: (url: string) => void;
  onRestoreDefaults?: () => void;
  bible: InspectorBible;
}) {
  if (layer.type === "bible") return <BibleContent bible={bible} />;

  if (layer.type === "song") {
    return (
      <div>
        <Label className="mb-1.5">Paroles (une ligne par vers)</Label>
        <textarea
          value={layer.content ?? ""}
          onChange={(e) => patchLayerData({ content: e.target.value })}
          rows={6}
          placeholder="Grâce infinie, quel doux son…"
          className={cn(FIELD, "resize-y leading-relaxed")}
        />
      </div>
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
        <button
          type="button"
          disabled={!layer.feedUrl}
          onClick={() => layer.feedUrl && onBroadcastEmbed(layer.feedUrl)}
          className="flex items-center justify-center gap-2 rounded-lg bg-studio-onair py-2.5 text-[12px] font-extrabold text-white transition hover:brightness-110 disabled:opacity-50"
        >
          <Radio className="size-3.5" /> Diffuser ce direct à l&apos;antenne
        </button>
        <div className="rounded-[9px] border border-white/8 bg-white/[0.03] p-3 text-[10px] leading-relaxed text-white/50">
          Le lien est intégré sur la page publique <span className="text-white">/live</span> et le
          direct passe automatiquement à l&apos;antenne.
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
      <div className="rounded-[9px] border border-dashed border-white/12 p-4 text-[11px] leading-relaxed text-white/45">
        Groupe de calques — regroupez vos sources pour les organiser. Renommez-le ci-dessus.
      </div>
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

  // camera / video
  return (
    <>
      <div>
        <Label className="mb-1.5">{layer.type === "video" ? "URL du flux (.m3u8 / rtmp)" : "Source NDI"}</Label>
        <input
          value={layer.feedUrl ?? ""}
          onChange={(e) => patchLayerData({ feedUrl: e.target.value })}
          placeholder={layer.type === "video" ? "https://…/live.m3u8" : "ndi://camera-autel"}
          className={MONO_FIELD}
        />
      </div>
      <div className="rounded-[9px] border border-white/8 bg-white/[0.03] p-3 text-[10px] leading-relaxed text-white/50">
        <div className="flex justify-between">
          <span>Type</span>
          <span className="font-semibold text-white">
            {layer.type === "video" ? "Flux réseau VLC (HLS)" : "Capture NDI"}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Résolution</span>
          <span className={cn("text-white", MONO)}>1920×1080</span>
        </div>
      </div>
    </>
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
