import { ReactNode, useEffect, useState } from "react";
import { Sparkles, Italic, Underline, X, Camera, RefreshCw, Volume2, VolumeX, FolderOpen, Music, Play, Lock, Check, Repeat, Link2, Crosshair, Trash2 } from "lucide-react";
import { cn } from "../lib/cn";
import { Slider } from "./Slider";
import { layerMeta } from "../lib/studio-layers";
import * as api from "../lib/api";
import type { CameraDevice } from "../lib/api";
import {
  FONT_OPTIONS,
  WEIGHT_OPTIONS,
  PREDEFINED_POSITIONS,
  CONTAINER_SHAPES,
  BORDER_STYLES,
  TYPO_ELEMENTS,
  COLOR_SWATCHES,
  TEXT_GRADIENTS,
  EASING_BEZIER,
} from "../lib/studio-tokens";
import { type Style, type StudioLayer } from "../lib/api";
import {
  ANIM_EFFECTS,
  ANIM_CATEGORIES,
  EASING_OPTIONS,
  animInCategory,
  getAnimEffect,
  animKind,
  type AnimCategoryId,
  type AnimEffect,
  type AnimSourceKind,
} from "../lib/studio-animations";

const MONO = "font-studio-mono";
const FIELD = "w-full rounded-lg border border-white/10 bg-studio-field px-2 py-2 text-[12px] text-white outline-none";
const MONO_FIELD = cn(FIELD, MONO, "text-[11px]");

// Inspector tabs offered per layer kind (church-client layerTabs).
type InspTab = "contenu" | "layout" | "typo" | "container" | "anim" | "reaction" | "presets";
const TAB_LABELS: Record<InspTab, string> = {
  contenu: "Contenu",
  layout: "Mise en page",
  typo: "Typo",
  container: "Cadre",
  anim: "Anim",
  reaction: "Réaction",
  presets: "Presets",
};
function layerTabs(kind: string): InspTab[] {
  if (["bible", "text", "song", "group"].includes(kind))
    return ["contenu", "layout", "typo", "container", "anim", "reaction", "presets"];
  if (kind === "image") return ["contenu", "layout", "container", "anim", "reaction", "presets"];
  if (["camera", "screen", "video", "embed"].includes(kind))
    return ["contenu", "layout", "anim", "reaction", "presets"];
  return ["contenu"]; // audio
}

// ── shared field helpers (ported look) ──
function Label({ children, className }: { children: ReactNode; className?: string }) {
  return <label className={cn("block text-[11px] font-bold text-white/55", className)}>{children}</label>;
}
function Select({
  value,
  onValueChange,
  className,
  children,
}: {
  value: string;
  onValueChange: (v: string) => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <select value={value} onChange={(e) => onValueChange(e.target.value)} className={className}>
      {children}
    </select>
  );
}
function StickyBar({ children }: { children: ReactNode }) {
  return (
    <div className="sticky top-0 z-20 -mx-3.5 -mt-3.5 bg-studio-panel px-3.5 pt-3.5 pb-2.5 shadow-[0_10px_14px_-10px_rgba(0,0,0,.8)]">
      {children}
    </div>
  );
}
function SliderLabel({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-1.5 flex justify-between text-[11px] font-semibold text-white/60">
      <span>{label}</span>
      <span className={cn("text-gold", MONO)}>{value}</span>
    </div>
  );
}

// Flat StudioSettings key → nested Style path (only typography is nested here).
function patchStyle(style: Style, key: string, value: unknown): Style {
  const m = /^(fontRef|fontBody|fontVer)([A-Z].*)$/.exec(key);
  if (m) {
    const el = m[1] as "fontRef" | "fontBody" | "fontVer";
    const prop = m[2][0].toLowerCase() + m[2].slice(1);
    return { ...style, [el]: { ...(style[el] as object), [prop]: value } };
  }
  return { ...style, [key]: value } as Style;
}

/**
 * Dock 4 · Studio · Style Pro — ported from the web `inspector-dock.tsx`. The
 * tab bar + style panels (Mise en page / Typo / Cadre / Anim / Presets) edit the
 * selected layer's style; a flat→nested adapter bridges the web's flat
 * StudioSettings keys to our nested Style. (The full effect gallery + reaction
 * tab + hardware content panels are follow-ups.)
 */
export function InspectorDock({
  layer,
  onChange,
  onPlayAnim,
  allLayers = [],
  replayGlobalDefault = true,
  reactionTestActive = false,
  onToggleReactionTest,
}: {
  layer: StudioLayer | null;
  onChange: (l: StudioLayer) => void;
  onPlayAnim?: () => void;
  /** Every layer in the current scene — the reaction trigger candidates. */
  allLayers?: StudioLayer[];
  /** What replay "Auto" resolves to (the global "Animer à chaque CUT" toggle). */
  replayGlobalDefault?: boolean;
  /** CHR-57 — whether the preview is currently simulating this layer's reaction. */
  reactionTestActive?: boolean;
  onToggleReactionTest?: () => void;
}) {
  const [tab, setTab] = useState<InspTab>("contenu");
  const [typoEl, setTypoEl] = useState<"fontRef" | "fontBody" | "fontVer">("fontBody");

  const kind = layer?.kind ?? null;
  const available = kind ? layerTabs(kind) : [];
  const activeTab: InspTab = available.includes(tab) ? tab : "contenu";
  const s = layer?.style;

  const setStudioField = (key: string, value: unknown) => {
    if (!layer) return;
    onChange({ ...layer, style: patchStyle(layer.style, key, value) });
  };
  const setStyle = (st: Style) => layer && onChange({ ...layer, style: st });
  const patchData = (patch: Partial<StudioLayer>) => layer && onChange({ ...layer, ...patch });
  const tk = (suffix: string) => `${typoEl}${suffix}`;
  const tv = (suffix: string) => {
    const el = (s?.[typoEl] as Record<string, unknown>) ?? {};
    return el[suffix[0].toLowerCase() + suffix.slice(1)];
  };

  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-studio-purple/20 bg-studio-panel">
      <div className="flex flex-none items-center gap-2 border-b border-white/6 px-3.5 py-2.5">
        <Sparkles className="size-[15px] text-studio-purple" strokeWidth={1.8} />
        <span className="text-[11px] font-extrabold tracking-[1px] text-white uppercase">Studio · Style Pro</span>
        <span className="ml-auto rounded-md bg-studio-purple/12 px-1.5 py-0.5 text-[9px] font-bold text-studio-purple">
          {layer ? layerMeta(layer.kind).typeLabel : "Aucune"}
        </span>
      </div>

      {!layer || !s ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center text-white/35">
          <div className="mb-1 text-[12px] font-bold">Aucune source sélectionnée</div>
          <div className="text-[11px] leading-relaxed">
            Cliquez une source média (ou dans l&apos;aperçu) pour configurer son style.
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-none flex-wrap gap-0.5 border-b border-white/5 px-2 py-2">
            {available.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  "min-w-[50px] flex-1 rounded-[7px] px-1 py-1.5 text-[10px] font-bold transition-colors",
                  activeTab === t ? "bg-studio-purple/15 text-studio-purple" : "text-white/55 hover:text-white",
                )}
              >
                {TAB_LABELS[t]}
              </button>
            ))}
          </div>

          <div className="studio-scroll flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3.5">
            {activeTab === "contenu" && (
              <StickyBar>
                <Label className="mb-1.5">Nom de la source</Label>
                <input value={layer.name} onChange={(e) => patchData({ name: e.target.value })} className={FIELD} />
              </StickyBar>
            )}
            {activeTab === "contenu" && <ContentPanel layer={layer} patchData={patchData} />}
            {activeTab === "layout" && <LayoutPanel s={s} setField={setStudioField} />}
            {activeTab === "typo" && (
              <TypoPanel setField={setStudioField} typoEl={typoEl} setTypoEl={setTypoEl} tk={tk} tv={tv} />
            )}
            {activeTab === "container" && <ContainerPanel s={s} setField={setStudioField} />}
            {activeTab === "anim" && (
              <AnimPanel
                s={s}
                setField={setStudioField}
                onPlayAnim={onPlayAnim}
                layer={layer}
                patchData={patchData}
                replayGlobalDefault={replayGlobalDefault}
              />
            )}
            {activeTab === "reaction" && (
              <ReactionPanel
                layer={layer}
                allLayers={allLayers}
                patchData={patchData}
                testActive={reactionTestActive}
                onToggleTest={onToggleReactionTest}
              />
            )}
            {activeTab === "presets" && <PresetsPanel style={s} setStyle={setStyle} />}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Contenu (per kind) ── */
function ContentPanel({ layer, patchData }: { layer: StudioLayer; patchData: (p: Partial<StudioLayer>) => void }) {
  if (layer.kind === "text" || layer.kind === "song") {
    return (
      <>
        <div>
          <Label className="mb-1.5">Contenu</Label>
          <textarea
            value={layer.content ?? ""}
            onChange={(e) => patchData({ content: e.target.value })}
            rows={layer.kind === "song" ? 4 : 2}
            className={cn(FIELD, "resize-y")}
          />
        </div>
        <div>
          <Label className="mb-1.5">Sous-titre (optionnel)</Label>
          <input
            value={layer.sub ?? ""}
            onChange={(e) => patchData({ sub: e.target.value })}
            placeholder="Prédicateur, référence…"
            className={FIELD}
          />
        </div>
      </>
    );
  }
  if (layer.kind === "embed" || layer.kind === "video") {
    return (
      <div>
        <Label className="mb-1.5">Lien du direct (YouTube, Facebook, HLS…)</Label>
        <input
          value={layer.feedUrl ?? ""}
          onChange={(e) => patchData({ feedUrl: e.target.value })}
          placeholder="https://youtube.com/watch?v=…"
          className={MONO_FIELD}
        />
      </div>
    );
  }
  if (layer.kind === "camera") return <CameraContent layer={layer} patchData={patchData} />;
  if (layer.kind === "screen") {
    return (
      <div className="rounded-[9px] border border-white/8 bg-white/[0.03] p-3 text-[11px] leading-relaxed text-white/50">
        Rendez la source visible (œil) pour démarrer le partage d&apos;écran (sélecteur système via le
        portail). L&apos;aperçu apparaît dans les moniteurs, déplaçable/redimensionnable.
      </div>
    );
  }
  if (layer.kind === "image") {
    return (
      <div>
        <Label className="mb-1.5">URL de l&apos;image</Label>
        <input
          value={(layer.imageUrl as string) ?? ""}
          onChange={(e) => patchData({ imageUrl: e.target.value } as Partial<StudioLayer>)}
          placeholder="https://…/image.jpg"
          className={MONO_FIELD}
        />
      </div>
    );
  }
  if (layer.kind === "audio") return <AudioContent layer={layer} patchData={patchData} />;
  return (
    <div className="rounded-[9px] border border-white/8 bg-white/[0.03] p-3 text-[11px] leading-relaxed text-white/50">
      Réglez le style dans les onglets ci-dessus.
    </div>
  );
}

/* ── Contenu · Audio (sélecteur de fichier local natif + saisie URL) ── */
function AudioContent({ layer, patchData }: { layer: StudioLayer; patchData: (p: Partial<StudioLayer>) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const url = (layer.audioFileUrl as string) ?? "";
  // Friendly name = decoded last path segment (no separate stored field needed).
  const fileName = url ? safeDecode(url.split(/[\\/]/).pop() || url) : "";

  const browse = async () => {
    setErr(null);
    setBusy(true);
    try {
      const picked = await api.pickAudioFile();
      if (picked) patchData({ audioFileUrl: picked.uri } as Partial<StudioLayer>);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Impossible d'ouvrir le sélecteur de fichier.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2.5">
      {/* Local file picker — the primary path, matching the web's file input. */}
      <div>
        <Label className="mb-1.5">Fichier audio local</Label>
        {url ? (
          <div className="flex items-center gap-2 rounded-[9px] border border-studio-onair/30 bg-studio-onair/10 px-2.5 py-2">
            <Music className="size-4 shrink-0 text-studio-onair" />
            <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-white" title={fileName}>
              {fileName}
            </span>
            <button
              type="button"
              onClick={browse}
              disabled={busy}
              className="rounded-md px-2 py-1 text-[10px] font-bold text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-50"
            >
              Changer
            </button>
            <button
              type="button"
              onClick={() => patchData({ audioFileUrl: "", audioPlaying: false } as Partial<StudioLayer>)}
              className="rounded-md p-1 text-white/50 hover:bg-white/10 hover:text-white"
              title="Retirer"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={browse}
            disabled={busy}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-[9px] border border-dashed border-white/15",
              "bg-white/[0.03] px-3 py-3 text-[11px] font-bold text-white/70 transition",
              "hover:border-studio-purple/40 hover:bg-white/[0.06] hover:text-white disabled:opacity-50",
            )}
          >
            <FolderOpen className="size-4" />
            {busy ? "Ouverture…" : "Parcourir… (MP3, WAV, M4A…)"}
          </button>
        )}
        {err && <p className="mt-1.5 text-[10px] text-red-400">{err}</p>}
      </div>

      {/* Manual URL entry, for a remote stream/file. */}
      <div>
        <Label className="mb-1.5">…ou lien distant</Label>
        <input
          value={url}
          onChange={(e) => patchData({ audioFileUrl: e.target.value } as Partial<StudioLayer>)}
          placeholder="https://…/audio.mp3  ·  file:///chemin/son.mp3"
          className={MONO_FIELD}
        />
      </div>

      <div className="rounded-[9px] border border-white/8 bg-white/[0.03] p-3 text-[10px] leading-relaxed text-white/50">
        Rendez la source visible (œil) : le fichier est décodé dans la table de mixage (VU réel) et
        porté par l&apos;enregistrement / la diffusion. Réglez volume / gain / balance dans le Mixage.
      </div>
    </div>
  );
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/* ── Contenu · Caméra (sélecteur de périphérique natif via list_cameras) ── */
function CameraContent({ layer, patchData }: { layer: StudioLayer; patchData: (p: Partial<StudioLayer>) => void }) {
  const [devices, setDevices] = useState<CameraDevice[]>([]);
  const refresh = () => api.listCameras().then(setDevices).catch(() => {});
  useEffect(() => {
    refresh();
  }, []);
  const listenLocal = (layer.listenLocal as boolean) ?? false;
  return (
    <>
      <div>
        <Label className="mb-1.5">Périphérique caméra</Label>
        <div className="flex gap-2">
          <Select
            value={(layer.deviceId as string) ?? ""}
            onValueChange={(v) => {
              const dev = devices.find((d) => d.id === v);
              patchData({ deviceId: v, deviceLabel: dev?.label ?? "" } as Partial<StudioLayer>);
            }}
            className={FIELD}
          >
            <option value="" className="bg-studio-field">
              — Choisir une caméra —
            </option>
            {devices.map((d, i) => (
              <option key={d.id} value={d.id} className="bg-studio-field">
                {d.label || `Caméra ${i + 1}`}
              </option>
            ))}
          </Select>
          <button
            type="button"
            onClick={refresh}
            title="Rafraîchir la liste"
            className="flex items-center justify-center rounded-lg border border-white/12 bg-white/[0.04] px-3 text-white/60 transition hover:text-white"
          >
            <RefreshCw className="size-3.5" />
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={() => patchData({ listenLocal: !listenLocal } as Partial<StudioLayer>)}
        className={cn(
          "flex items-center justify-center gap-2 rounded-lg border py-2 text-[11.5px] font-bold transition-colors",
          listenLocal ? "border-gold/40 bg-gold/15 text-gold" : "border-white/12 bg-white/[0.03] text-white/60 hover:text-white",
        )}
      >
        {listenLocal ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5" />}
        {listenLocal ? "Écoute locale activée" : "Écouter en local (risque de Larsen)"}
      </button>
      <div className="rounded-[9px] border border-white/8 bg-white/[0.03] p-3 text-[10px] leading-relaxed text-white/50">
        <Camera className="mr-1 inline size-3" /> Rendez la source visible (œil) pour la mettre à l&apos;antenne.
        Le périphérique choisi est démarré sur le compositor natif.
      </div>
    </>
  );
}

/* ── Mise en page ── */
function LayoutPanel({ s, setField }: { s: Style; setField: (k: string, v: unknown) => void }) {
  const custom = s.positionMode === "custom";
  return (
    <>
      <StickyBar>
        <Label className="mb-1.5">Mode de position</Label>
        <div className="flex rounded-[9px] bg-black/25 p-[3px]">
          {(["predefined", "custom"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setField("positionMode", m)}
              className={cn(
                "flex-1 rounded-[7px] py-1.5 text-[11px] font-bold transition-colors",
                s.positionMode === m ? "bg-studio-purple/20 text-studio-purple" : "text-white/55",
              )}
            >
              {m === "predefined" ? "Prédéfini" : "Libre (glisser)"}
            </button>
          ))}
        </div>
      </StickyBar>

      {!custom ? (
        <div>
          <Label className="mb-1.5">Disposition</Label>
          <Select value={s.predefinedPosition} onValueChange={(v) => setField("predefinedPosition", v)} className={FIELD}>
            {PREDEFINED_POSITIONS.map((o) => (
              <option key={o.value} value={o.value} className="bg-studio-field">
                {o.label}
              </option>
            ))}
          </Select>
        </div>
      ) : (
        ([
          ["customX", "Position X", -50, 150],
          ["customY", "Position Y", -50, 150],
          ["customWidth", "Largeur", 10, 200],
          ["customHeight", "Hauteur", 10, 200],
        ] as const).map(([key, label, min, max]) => (
          <div key={key}>
            <SliderLabel label={label} value={`${(s as Record<string, number>)[key]}%`} />
            <Slider min={min} max={max} value={(s as Record<string, number>)[key]} onValueChange={(v) => setField(key, v)} />
          </div>
        ))
      )}

      {(["textAlign", "textVerticalAlign"] as const).map((axis) => {
        const opts =
          axis === "textAlign"
            ? [["left", "Gauche"], ["center", "Centre"], ["right", "Droite"]]
            : [["top", "Haut"], ["center", "Milieu"], ["bottom", "Bas"]];
        const cur = (s as Record<string, string>)[axis] || "center";
        return (
          <div key={axis}>
            <Label className="mb-1.5">{axis === "textAlign" ? "Alignement horizontal" : "Alignement vertical"}</Label>
            <div className="flex rounded-[9px] bg-black/25 p-[3px]">
              {opts.map(([v, l]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setField(axis, v)}
                  className={cn(
                    "flex-1 rounded-[7px] py-1.5 text-[10px] font-bold transition-colors",
                    cur === v ? "bg-studio-purple/20 text-studio-purple" : "text-white/55",
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}

/* ── Typo ── */
function TypoPanel({
  setField,
  typoEl,
  setTypoEl,
  tk,
  tv,
}: {
  setField: (k: string, v: unknown) => void;
  typoEl: "fontRef" | "fontBody" | "fontVer";
  setTypoEl: (v: "fontRef" | "fontBody" | "fontVer") => void;
  tk: (s: string) => string;
  tv: (s: string) => unknown;
}) {
  const flag = (suffix: "Style" | "Transform" | "Decoration", on: string, off: string) =>
    setField(tk(suffix), tv(suffix) === on ? off : on);
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

      <div>
        <Label className="mb-1.5">Police</Label>
        <Select value={(tv("Family") as string) ?? ""} onValueChange={(v) => setField(tk("Family"), v)} className={FIELD}>
          {FONT_OPTIONS.map((f) => (
            <option key={f} value={f} className="bg-studio-field">
              {f}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label className="mb-1.5">Graisse</Label>
        <Select value={(tv("Weight") as string) ?? "700"} onValueChange={(v) => setField(tk("Weight"), v)} className={FIELD}>
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
            tv("Style") === "italic" ? "border-studio-purple/45 bg-studio-purple/15 text-studio-purple" : "border-white/10 text-white/60",
          )}
        >
          <Italic className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => flag("Transform", "uppercase", "none")}
          className={cn(
            "flex-1 rounded-[7px] border py-1.5 text-[11px] font-bold",
            tv("Transform") === "uppercase" ? "border-studio-purple/45 bg-studio-purple/15 text-studio-purple" : "border-white/10 text-white/60",
          )}
        >
          MAJ
        </button>
        <button
          type="button"
          onClick={() => flag("Decoration", "underline", "none")}
          className={cn(
            "flex flex-1 items-center justify-center rounded-[7px] border py-1.5",
            tv("Decoration") === "underline" ? "border-studio-purple/45 bg-studio-purple/15 text-studio-purple" : "border-white/10 text-white/60",
          )}
        >
          <Underline className="size-3.5" />
        </button>
      </div>

      <div>
        <SliderLabel label="Taille" value={`${tv("Size")}px`} />
        <Slider min={16} max={360} value={(tv("Size") as number) ?? 48} onValueChange={(v) => setField(tk("Size"), v)} />
      </div>
      <div>
        <SliderLabel label="Hauteur de ligne" value={`${tv("LineHeight")}`} />
        <Slider min={1} max={2.4} step={0.1} value={(tv("LineHeight") as number) ?? 1.3} onValueChange={(v) => setField(tk("LineHeight"), v)} />
      </div>
      <div>
        <SliderLabel label="Interlettrage" value={`${tv("Spacing")}px`} />
        <Slider min={-3} max={60} step={0.5} value={(tv("Spacing") as number) ?? 0} onValueChange={(v) => setField(tk("Spacing"), v)} />
      </div>

      <div>
        <Label className="mb-1.5">Couleur du texte</Label>
        <div className="flex gap-1.5">
          {COLOR_SWATCHES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setField(tk("Color"), c)}
              className={cn("size-[26px] rounded-[7px] border-2", tv("Color") === c ? "border-white" : "border-white/15")}
              style={{ background: c }}
            />
          ))}
          <input
            type="color"
            value={(tv("Color") as string)?.startsWith("#") ? (tv("Color") as string) : "#ffffff"}
            onChange={(e) => setField(tk("Color"), e.target.value)}
            className="size-[26px] cursor-pointer rounded-[7px] border-2 border-white/15 bg-transparent"
          />
        </div>
        <div className="mt-1.5 flex gap-1.5">
          {TEXT_GRADIENTS.map((g) => (
            <button
              key={g}
              type="button"
              title="Dégradé"
              onClick={() => setField(tk("Color"), g)}
              className={cn("h-[26px] flex-1 rounded-[7px] border-2", tv("Color") === g ? "border-white" : "border-white/15")}
              style={{ backgroundImage: g }}
            />
          ))}
        </div>
      </div>
    </>
  );
}

/* ── Cadre ── */
function ContainerPanel({ s, setField }: { s: Style; setField: (k: string, v: unknown) => void }) {
  const num = (k: string) => (s as Record<string, number>)[k] ?? 0;
  const str = (k: string) => (s as Record<string, string>)[k] ?? "";
  return (
    <>
      <StickyBar>
        <Label className="mb-1.5">Forme du conteneur</Label>
        <Select value={str("containerShape")} onValueChange={(v) => setField("containerShape", v)} className={FIELD}>
          {CONTAINER_SHAPES.map((o) => (
            <option key={o.value} value={o.value} className="bg-studio-field">
              {o.label}
            </option>
          ))}
        </Select>
      </StickyBar>
      <div>
        <Label className="mb-1.5">Arrière-plan (CSS)</Label>
        <input value={str("containerBg")} onChange={(e) => setField("containerBg", e.target.value)} placeholder="rgba(13,8,24,.86)" className={MONO_FIELD} />
      </div>
      <div>
        <SliderLabel label="Arrondi des angles" value={`${num("containerBorderRadius")}px`} />
        <Slider min={0} max={120} value={num("containerBorderRadius")} onValueChange={(v) => setField("containerBorderRadius", v)} />
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <div className="mb-1 text-[10px] text-white/50">Bordure (px)</div>
          <input type="number" min={0} max={24} value={num("containerBorderWidth")} onChange={(e) => setField("containerBorderWidth", Number(e.target.value))} className={FIELD} />
        </div>
        <div className="flex-[1.4]">
          <div className="mb-1 text-[10px] text-white/50">Style</div>
          <Select value={str("containerBorderStyle")} onValueChange={(v) => setField("containerBorderStyle", v)} className={cn(FIELD, "text-[11px]")}>
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
        <input value={str("containerBorderColor")} onChange={(e) => setField("containerBorderColor", e.target.value)} placeholder="rgba(226,184,95,.4)" className={MONO_FIELD} />
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <div className="mb-1 text-[10px] text-white/50">Marge X</div>
          <input type="number" min={0} max={80} value={num("containerPaddingX")} onChange={(e) => setField("containerPaddingX", Number(e.target.value))} className={FIELD} />
        </div>
        <div className="flex-1">
          <div className="mb-1 text-[10px] text-white/50">Marge Y</div>
          <input type="number" min={0} max={80} value={num("containerPaddingY")} onChange={(e) => setField("containerPaddingY", Number(e.target.value))} className={FIELD} />
        </div>
      </div>
      <div>
        <SliderLabel label="Flou de l'ombre" value={`${num("shadowBlur")}px`} />
        <Slider min={0} max={240} value={num("shadowBlur")} onValueChange={(v) => setField("shadowBlur", v)} />
      </div>
    </>
  );
}

/** Mini SVG preview of the easing's cubic-bezier curve (ported EasingCurve). */
function EasingCurve({ easing }: { easing: string }) {
  const [x1, y1, x2, y2] = EASING_BEZIER[easing] ?? EASING_BEZIER["ease-out"];
  const d = `M 0 40 C ${x1 * 60} ${40 - y1 * 40}, ${x2 * 60} ${40 - y2 * 40}, 60 0`;
  return (
    <svg viewBox="-3 -14 66 58" className="h-[38px] w-[56px] shrink-0 rounded-md border border-white/8 bg-[#0a0613]" aria-hidden>
      <line x1="0" y1="40" x2="60" y2="40" stroke="rgba(255,255,255,.12)" strokeWidth="1" />
      <path d={d} fill="none" stroke="#e2b85f" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/* ── Anim gallery (CHR-128, ported from the web Anim tab) ── */

type ReplayMode = "auto" | "always" | "never";

/**
 * One gallery card. Static "Aa" glyph at rest; hovering plays the effect's CSS
 * `preview` archetype once (loops run only while hovered). Unavailable effects
 * (per-source rule) are greyed out with the reason.
 */
function EffectCard({
  fx,
  kind,
  selected,
  onSelect,
}: {
  fx: AnimEffect;
  kind: AnimSourceKind;
  selected: boolean;
  onSelect: () => void;
}) {
  const available = fx.availableFor(kind);
  const [nonce, setNonce] = useState(0);
  const [hover, setHover] = useState(false);
  const playing = hover && available && fx.id !== "none";
  const glyph = "grid h-7 w-12 place-items-center rounded-[6px] bg-gradient-to-br from-gold/80 to-studio-purple/80 text-[11px] font-extrabold text-[#160f33]";

  return (
    <button
      type="button"
      disabled={!available}
      onClick={onSelect}
      onMouseEnter={() => {
        setHover(true);
        setNonce((n) => n + 1);
      }}
      onMouseLeave={() => setHover(false)}
      title={available ? fx.hint : fx.unavailableHint || "Indisponible pour cette source."}
      className={cn(
        "group relative flex flex-col gap-1.5 rounded-[10px] border p-1.5 text-left transition",
        selected ? "border-studio-purple/70 bg-studio-purple/12" : "border-white/8 bg-white/[0.03] hover:border-white/20",
        !available && "cursor-not-allowed opacity-40 grayscale",
      )}
    >
      <div className="fxp-stage relative grid h-12 place-items-center overflow-hidden rounded-[7px] bg-[#0a0613]">
        <div
          key={nonce}
          className={cn(glyph, playing && `fxp-play fxp-${fx.preview}`, playing && fx.loop && "fxp-loop")}
        >
          Aa
        </div>
        {fx.loop && <Repeat className="absolute right-1 bottom-1 size-2.5 text-white/40" strokeWidth={2.2} />}
        {!available && <Lock className="absolute top-1 right-1 size-2.5 text-white/50" strokeWidth={2.2} />}
        {selected && (
          <span className="absolute top-1 left-1 grid size-3.5 place-items-center rounded-full bg-studio-purple">
            <Check className="size-2.5 text-white" strokeWidth={3} />
          </span>
        )}
      </div>
      <span className={cn("truncate text-[10px] leading-tight font-bold", selected ? "text-studio-purple" : "text-white/75")}>
        {fx.label}
      </span>
    </button>
  );
}

function AnimPanel({
  s,
  setField,
  onPlayAnim,
  layer,
  patchData,
  replayGlobalDefault,
}: {
  s: Style;
  setField: (k: string, v: unknown) => void;
  onPlayAnim?: () => void;
  layer: StudioLayer;
  patchData: (p: Partial<StudioLayer>) => void;
  replayGlobalDefault: boolean;
}) {
  const kind = animKind(layer.kind);
  const [cat, setCat] = useState<"all" | AnimCategoryId>("all");
  const current = getAnimEffect(s.animation);
  const currentAvailable = current.availableFor(kind);
  const effects = ANIM_EFFECTS.filter((e) => cat === "all" || animInCategory(e, cat));
  const durLabel = (s.duration as number) === 0 || s.duration == null ? "Manuel" : `${s.duration}s`;
  const showReplay = layer.kind !== "bible";
  const replayMode = ((layer.replayOnCut as ReplayMode) ?? "auto");
  const replayModes: { id: ReplayMode; label: string }[] = [
    { id: "auto", label: "Auto" },
    { id: "always", label: "Toujours" },
    { id: "never", label: "Jamais" },
  ];

  return (
    <>
      <StickyBar>
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <Label className="mb-1.5">Effet d&apos;apparition</Label>
            <div className="flex h-[30px] items-center gap-1.5 truncate rounded-lg border border-white/10 bg-studio-field px-2 text-[11.5px] font-bold text-white">
              <span className="truncate">{current.label}</span>
              {current.loop && <Repeat className="size-3 shrink-0 text-white/45" />}
            </div>
          </div>
          {onPlayAnim && (
            <button
              type="button"
              onClick={onPlayAnim}
              title="Rejouer l'animation dans l'aperçu"
              className="flex size-[30px] shrink-0 items-center justify-center rounded-lg border border-studio-purple/35 bg-studio-purple/12 text-studio-purple transition hover:bg-studio-purple/25"
            >
              <Play className="size-3.5 fill-current" />
            </button>
          )}
        </div>
        <div className="-mx-1 mt-2 flex gap-1 overflow-x-auto px-1 pb-0.5">
          {[{ id: "all" as const, label: "Tous" }, ...ANIM_CATEGORIES].map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCat(c.id as "all" | AnimCategoryId)}
              className={cn(
                "shrink-0 rounded-full border px-2 py-[3px] text-[9.5px] font-bold whitespace-nowrap transition",
                cat === c.id
                  ? "border-studio-purple/50 bg-studio-purple/15 text-studio-purple"
                  : "border-white/10 bg-white/[0.03] text-white/50 hover:text-white",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </StickyBar>

      {!currentAvailable && (
        <div className="rounded-[9px] border border-studio-sandbox/30 bg-studio-sandbox/[0.08] px-2.5 py-2 text-[10.5px] leading-snug text-white/65">
          «&nbsp;{current.label}&nbsp;» n&apos;est pas disponible pour cette source — elle s&apos;affiche
          sans animation. {current.unavailableHint}
        </div>
      )}

      <div className="grid grid-cols-2 gap-1.5">
        {effects.map((fx) => (
          <EffectCard
            key={fx.id}
            fx={fx}
            kind={kind}
            selected={s.animation === fx.id}
            onSelect={() => {
              setField("animation", fx.id);
              setTimeout(() => onPlayAnim?.(), 50);
            }}
          />
        ))}
      </div>

      {showReplay && (
        <div className="rounded-[10px] border border-white/8 bg-black/[0.18] p-2.5">
          <Label className="mb-1.5">Rejouer à l&apos;antenne (CUT)</Label>
          <div className="flex gap-1">
            {replayModes.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => patchData({ replayOnCut: m.id } as Partial<StudioLayer>)}
                className={cn(
                  "flex-1 rounded-[7px] border px-1 py-1.5 text-[10.5px] font-bold transition",
                  replayMode === m.id
                    ? "border-studio-purple/60 bg-studio-purple/15 text-studio-purple"
                    : "border-white/10 bg-white/[0.03] text-white/55 hover:text-white",
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
          <div className="mt-1.5 text-[10px] leading-snug text-white/40">
            {replayMode === "always"
              ? "Rejoue l'animation à chaque passage à l'antenne."
              : replayMode === "never"
                ? "Ne rejoue jamais au CUT (s'anime seulement à la 1re apparition)."
                : `Suit le réglage global « Animer à chaque CUT » (actuellement : ${
                    replayGlobalDefault ? "activé — rejoue" : "désactivé — ne rejoue pas"
                  }).`}
          </div>
        </div>
      )}

      <div>
        <SliderLabel label={current.loop ? "Vitesse du cycle" : "Durée de transition"} value={`${s.animDuration ?? 500}ms`} />
        <Slider min={100} max={2000} step={50} value={s.animDuration ?? 500} onValueChange={(v) => setField("animDuration", v)} />
        {current.loop && (
          <div className="mt-1 text-[10px] text-white/35">Effet en boucle : la durée règle la vitesse du cycle.</div>
        )}
      </div>

      <div>
        <Label className="mb-1.5">Courbe (easing)</Label>
        <div className="flex items-center gap-2">
          <Select value={s.animEasing} onValueChange={(v) => setField("animEasing", v)} className={FIELD}>
            {EASING_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} className="bg-studio-field">
                {o.label}
              </option>
            ))}
          </Select>
          <EasingCurve easing={s.animEasing} />
        </div>
      </div>

      <div>
        <SliderLabel label="Durée d'affichage" value={durLabel} />
        <Slider min={0} max={60} step={5} value={(s.duration as number) ?? 0} onValueChange={(v) => setField("duration", v)} />
        <div className="mt-1 text-[10px] text-white/35">0 = reste affiché jusqu&apos;au masquage manuel.</div>
      </div>
    </>
  );
}

/* ── Réaction (CHR-57) — inter-source reaction pose ── */
function ReactionPanel({
  layer,
  allLayers,
  patchData,
  testActive,
  onToggleTest,
}: {
  layer: StudioLayer;
  allLayers: StudioLayer[];
  patchData: (p: Partial<StudioLayer>) => void;
  testActive: boolean;
  onToggleTest?: () => void;
}) {
  const triggers = allLayers.filter((l) => l.id !== layer.id);
  const trigger = allLayers.find((l) => l.id === (layer.reactTo as string)) ?? null;
  const hasReaction = !!layer.reactStyle;

  return (
    <>
      <StickyBar>
        <Label className="mb-1.5 flex items-center gap-1.5">
          <Link2 className="size-3.5 text-studio-purple" />
          Réagir à une source (déclencheur)
        </Label>
        <Select
          value={(layer.reactTo as string) ?? ""}
          onValueChange={(v) => patchData({ reactTo: v || null } as Partial<StudioLayer>)}
          className={FIELD}
        >
          <option value="" className="bg-studio-field">
            Aucun déclencheur
          </option>
          {triggers.map((t) => (
            <option key={t.id} value={t.id} className="bg-studio-field">
              {t.name} · {layerMeta(t.kind).label}
            </option>
          ))}
        </Select>
      </StickyBar>

      {!layer.reactTo ? (
        <div className="rounded-[10px] border border-white/8 bg-black/[0.18] px-3 py-2.5 text-[11px] leading-relaxed text-white/55">
          Choisis une source <b>déclencheur</b>. Quand elle passe à l&apos;antenne, cette source basculera
          en douceur vers une <b>pose de réaction</b> (position, taille), puis reviendra à la normale quand
          le déclencheur quitte l&apos;antenne. Ex. : le verset apparaît → la caméra du pasteur se décale et
          rétrécit.
        </div>
      ) : (
        <>
          <div className="rounded-[10px] border border-white/8 bg-black/[0.18] p-3 text-[11px] leading-relaxed text-white/55">
            <p className="m-0 mb-1.5 font-bold text-white/70">Définir la pose de réaction</p>
            <ol className="m-0 list-decimal space-y-1 pl-4">
              <li>
                Place / redimensionne cette source (dans l&apos;aperçu) là où elle doit aller quand
                «&nbsp;{trigger?.name ?? "…"}&nbsp;» est à l&apos;antenne.
              </li>
              <li>Clique «&nbsp;Capturer l&apos;état réaction&nbsp;».</li>
              <li>Remets-la à sa position normale (elle y restera par défaut).</li>
            </ol>
          </div>

          <button
            type="button"
            onClick={() => patchData({ reactStyle: pickReactionStyle(layer.style) } as Partial<StudioLayer>)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-studio-purple/35 bg-studio-purple/12 py-2.5 text-[11.5px] font-bold text-studio-purple transition hover:bg-studio-purple/25"
          >
            <Crosshair className="size-3.5" />
            Capturer l&apos;état réaction (pose actuelle)
          </button>

          <div className="flex items-center justify-between rounded-[9px] border border-white/8 bg-black/[0.18] px-3 py-2 text-[11px]">
            <span className="text-white/55">Pose de réaction</span>
            <span className={cn("font-bold", hasReaction ? "text-studio-preview-bright" : "text-white/35")}>
              {hasReaction ? "définie ✓" : "non définie"}
            </span>
          </div>

          {hasReaction && (
            <>
              <div>
                <SliderLabel label="Durée de transition" value={`${(layer.reactTransitionMs as number) ?? 600}ms`} />
                <Slider
                  min={100}
                  max={2000}
                  step={50}
                  value={(layer.reactTransitionMs as number) ?? 600}
                  onValueChange={(v) => patchData({ reactTransitionMs: v } as Partial<StudioLayer>)}
                />
              </div>

              {onToggleTest && (
                <button
                  type="button"
                  onClick={onToggleTest}
                  title="Simuler la pose de réaction dans l'aperçu"
                  className={cn(
                    "flex w-full items-center justify-center gap-2 rounded-lg border py-2.5 text-[11.5px] font-bold transition",
                    testActive
                      ? "border-studio-preview/50 bg-studio-preview/15 text-studio-preview-bright"
                      : "border-white/10 bg-white/[0.03] text-white/60 hover:text-white",
                  )}
                >
                  <Play className="size-3.5 fill-current" />
                  {testActive ? "Arrêter le test" : "Tester la réaction (aperçu)"}
                </button>
              )}

              <button
                type="button"
                onClick={() => patchData({ reactStyle: null } as Partial<StudioLayer>)}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] py-2 text-[11px] font-bold text-white/50 transition hover:text-white"
              >
                <Trash2 className="size-3.5" />
                Effacer la pose de réaction
              </button>
            </>
          )}
        </>
      )}
    </>
  );
}

// Capture the current style's pose fields into a reaction StylePatch — the TS
// mirror of studio-core's pick_reaction_style (only REACTION_KEYS are stored).
const REACTION_KEYS = [
  "positionMode", "predefinedPosition", "containerShape", "containerBorderStyle",
  "containerBorderColor", "containerBg", "shadowColor", "customX", "customY",
  "customWidth", "customHeight", "containerBorderRadius", "containerBorderWidth",
  "containerPaddingX", "containerPaddingY", "shadowBlur", "shadowSpread",
  "shadowOffsetX", "shadowOffsetY",
] as const;
function pickReactionStyle(style: Style): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const k of REACTION_KEYS) if (style[k] !== undefined) patch[k] = style[k];
  return patch;
}

/* ── Presets (localStorage) ── */
type Preset = { name: string; settings: Style };
function loadPresets(): Preset[] {
  try {
    return JSON.parse(localStorage.getItem("studio-native-presets") || "[]");
  } catch {
    return [];
  }
}
function PresetsPanel({ style, setStyle }: { style: Style; setStyle: (s: Style) => void }) {
  const [presets, setPresets] = useState<Preset[]>(loadPresets);
  const [name, setName] = useState("");
  const persist = (p: Preset[]) => {
    setPresets(p);
    try {
      localStorage.setItem("studio-native-presets", JSON.stringify(p));
    } catch {
      /* storage disabled */
    }
  };
  return (
    <>
      <StickyBar>
        <div className="flex flex-col gap-2 rounded-[10px] border border-white/5 bg-black/[0.18] p-3">
          <Label>Enregistrer le style actuel</Label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom du preset…" className={FIELD} />
          <button
            type="button"
            onClick={() => {
              if (!name.trim()) return;
              persist([...presets.filter((p) => p.name !== name), { name, settings: style }]);
              setName("");
            }}
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
              <div key={p.name} className="flex items-center gap-1.5 rounded-lg border border-white/6 bg-white/4 px-2.5 py-2">
                <button type="button" onClick={() => setStyle(p.settings)} className="flex-1 text-left text-[11.5px] font-bold text-white">
                  {p.name}
                </button>
                <button type="button" onClick={() => persist(presets.filter((x) => x.name !== p.name))} className="text-white/30 transition-colors hover:text-[#ff8a8a]">
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
