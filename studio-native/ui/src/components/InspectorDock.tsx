import { ReactNode, useEffect, useState } from "react";
import { Sparkles, Italic, Underline, X, Camera, RefreshCw, Volume2, VolumeX, FolderOpen, Music } from "lucide-react";
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
import { ANIM_EFFECTS, ANIM_EASINGS, type Style, type StudioLayer } from "../lib/api";

const MONO = "font-studio-mono";
const FIELD = "w-full rounded-lg border border-white/10 bg-studio-field px-2 py-2 text-[12px] text-white outline-none";
const MONO_FIELD = cn(FIELD, MONO, "text-[11px]");

// Inspector tabs offered per layer kind (church-client layerTabs, minus the
// "reaction" tab which needs on-air tracking — a later step).
type InspTab = "contenu" | "layout" | "typo" | "container" | "anim" | "presets";
const TAB_LABELS: Record<InspTab, string> = {
  contenu: "Contenu",
  layout: "Mise en page",
  typo: "Typo",
  container: "Cadre",
  anim: "Anim",
  presets: "Presets",
};
function layerTabs(kind: string): InspTab[] {
  if (["bible", "text", "song", "group"].includes(kind))
    return ["contenu", "layout", "typo", "container", "anim", "presets"];
  if (kind === "image") return ["contenu", "layout", "container", "anim", "presets"];
  if (["camera", "screen", "video", "embed"].includes(kind))
    return ["contenu", "layout", "anim", "presets"];
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
}: {
  layer: StudioLayer | null;
  onChange: (l: StudioLayer) => void;
  onPlayAnim?: () => void;
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
            {activeTab === "anim" && <AnimPanel s={s} setField={setStudioField} onPlayAnim={onPlayAnim} />}
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

/* ── Anim (compact) ── */
function AnimPanel({ s, setField, onPlayAnim }: { s: Style; setField: (k: string, v: unknown) => void; onPlayAnim?: () => void }) {
  return (
    <>
      <StickyBar>
        <Label className="mb-1.5">Effet d'entrée</Label>
        <Select value={s.animation} onValueChange={(v) => setField("animation", v)} className={FIELD}>
          {ANIM_EFFECTS.map((a) => (
            <option key={a} value={a} className="bg-studio-field">
              {a}
            </option>
          ))}
        </Select>
      </StickyBar>
      <div>
        <Label className="mb-1.5">Courbe</Label>
        <div className="flex items-center gap-2">
          <Select value={s.animEasing} onValueChange={(v) => setField("animEasing", v)} className={FIELD}>
            {ANIM_EASINGS.map((a) => (
              <option key={a} value={a} className="bg-studio-field">
                {a}
              </option>
            ))}
          </Select>
          <EasingCurve easing={s.animEasing} />
        </div>
      </div>
      <div>
        <SliderLabel label="Durée" value={`${Math.round(s.animDuration ?? 500)} ms`} />
        <Slider min={0} max={2000} step={50} value={s.animDuration ?? 500} onValueChange={(v) => setField("animDuration", v)} />
      </div>
      {onPlayAnim && (
        <button
          type="button"
          onClick={onPlayAnim}
          className="w-full rounded-lg bg-studio-purple/15 py-2 text-[12px] font-bold text-studio-purple transition hover:bg-studio-purple/25"
        >
          ▶ Rejouer l'animation
        </button>
      )}
    </>
  );
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
