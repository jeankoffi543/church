"use client";

import {
  Settings2,
  Radio,
  HardDrive,
  Volume2,
  Monitor,
  Keyboard,
  Accessibility,
  Save,
  Loader2,
  Plus,
  Trash,
  ImageIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MONO } from "./studio-tokens";

export type SermonPoint = { id: string; text: string; verse: string };

export type SettingsModalProps = {
  open: boolean;
  onClose: () => void;
  activeTab: string;
  onTabChange: (t: string) => void;
  saving: boolean;
  onSave: () => void;
  // General (real)
  title: string;
  onTitle: (v: string) => void;
  description: string;
  onDescription: (v: string) => void;
  sermonTitle: string;
  onSermonTitle: (v: string) => void;
  sermonPreacher: string;
  onSermonPreacher: (v: string) => void;
  sermonReference: string;
  onSermonReference: (v: string) => void;
  chatEnabled: boolean;
  onChatEnabled: (v: boolean) => void;
  sermonPoints: SermonPoint[];
  onAddPoint: () => void;
  onRemovePoint: (i: number) => void;
  onUpdatePoint: (i: number, field: "text" | "verse", value: string) => void;
  // Stream (real)
  embedUrl: string;
  onEmbedUrl: (v: string) => void;
  streamKey: string;
  onStreamKey: (v: string) => void;
  facebookRtmpsUrl: string;
  onFacebookRtmpsUrl: (v: string) => void;
  facebookStreamKey: string;
  onFacebookStreamKey: (v: string) => void;
  fallbackImage: string;
  getPreviewUrl: (u: string) => string;
  onImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  // Video (real) — OBS-like base (composition) / output canvas + framerate
  baseResolution: string;
  onBaseResolution: (v: string) => void;
  outputResolution: string;
  onOutputResolution: (v: string) => void;
  outputFps: string;
  onOutputFps: (v: string) => void;
  broadcasting: boolean;
};

const TABS = [
  { id: "general", label: "Général", Icon: Settings2 },
  { id: "stream", label: "Stream (Flux)", Icon: Radio },
  { id: "output", label: "Sortie", Icon: HardDrive },
  { id: "audio", label: "Audio", Icon: Volume2 },
  { id: "video", label: "Vidéo", Icon: Monitor },
  { id: "hotkeys", label: "Raccourcis", Icon: Keyboard },
  { id: "accessibility", label: "Accessibilité", Icon: Accessibility },
  { id: "advanced", label: "Avancé", Icon: Settings2 },
];

const FIELD =
  "w-full rounded-[9px] border border-white/10 bg-studio-bg px-3 py-2.5 text-[13px] text-white outline-none";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="mb-1.5 block text-[11px] font-bold text-white/55">{children}</span>;
}

/**
 * Live console settings modal. "Général" and "Stream" are fully wired to the
 * real live configuration (persisted via the orchestrator's saveLiveSettings —
 * including the stream key and fallback image upload). The remaining tabs are
 * faithful OBS chrome — TODO(studio): wire to a real encoder/output backend.
 */
export function SettingsModal(props: SettingsModalProps) {
  if (!props.open) return null;
  const { activeTab } = props;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[rgba(5,2,12,.78)] p-6 backdrop-blur-sm">
      <div className="flex h-[min(82vh,680px)] w-full max-w-[980px] animate-modal-in overflow-hidden rounded-2xl border border-studio-purple/30 bg-studio-panel shadow-[0_40px_90px_rgba(0,0,0,.6)]">
        {/* Sidebar */}
        <div className="flex w-[236px] shrink-0 flex-col border-r border-white/5 bg-studio-rail">
          <div className="border-b border-white/5 px-[18px] pt-[18px] pb-3.5">
            <div className="text-[9px] font-extrabold tracking-[2.2px] text-gold uppercase">
              MFM Studio
            </div>
            <div className="mt-0.5 text-[16px] font-extrabold tracking-[1px] text-white">
              PARAMÈTRES
            </div>
          </div>
          <ScrollArea className="flex flex-1 flex-col gap-0.5 p-2.5">
            {TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => props.onTabChange(id)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-[9px] px-3 py-2.5 text-left text-[13px] font-semibold transition-colors",
                  activeTab === id
                    ? "bg-studio-purple/15 text-white"
                    : "text-white/55 hover:bg-white/5 hover:text-white",
                )}
              >
                <Icon
                  className={cn("size-4", activeTab === id ? "text-studio-purple" : "text-white/40")}
                />
                {label}
              </button>
            ))}
          </ScrollArea>
          <div className="flex flex-col gap-2 border-t border-white/5 p-3">
            <button
              type="button"
              onClick={props.onClose}
              className="w-full rounded-[9px] bg-white/5 py-2.5 text-[12.5px] font-bold text-white transition-colors hover:bg-white/10"
            >
              Fermer
            </button>
            <button
              type="button"
              onClick={props.onSave}
              disabled={props.saving}
              className="flex w-full items-center justify-center gap-1.5 rounded-[9px] bg-studio-purple py-2.5 text-[12.5px] font-extrabold text-white shadow-[0_8px_20px_rgba(178,112,255,.25)] transition hover:brightness-105 disabled:opacity-60"
            >
              {props.saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              Appliquer
            </button>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="min-w-0 flex-1 px-[30px] py-[26px]">
          {activeTab === "general" && <GeneralPanel {...props} />}
          {activeTab === "stream" && <StreamPanel {...props} />}
          {activeTab === "video" && <VideoPanel {...props} />}
          {activeTab !== "general" && activeTab !== "stream" && activeTab !== "video" && (
            <StubPanel title={TABS.find((t) => t.id === activeTab)?.label ?? ""} />
          )}
        </ScrollArea>
      </div>
    </div>
  );
}

function PanelTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-[18px] border-b border-white/8 pb-3.5 text-[19px] font-extrabold text-white">
      {children}
    </h3>
  );
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-extrabold tracking-[1px] text-studio-purple uppercase">
      {children}
    </div>
  );
}

function GeneralPanel(p: SettingsModalProps) {
  return (
    <>
      <PanelTitle>Général</PanelTitle>
      <div className="flex max-w-[560px] flex-col gap-[22px]">
        <div className="flex flex-col gap-3">
          <GroupLabel>Informations de diffusion</GroupLabel>
          <label className="block">
            <FieldLabel>Titre du live</FieldLabel>
            <input value={p.title} onChange={(e) => p.onTitle(e.target.value)} className={FIELD} />
          </label>
          <label className="block">
            <FieldLabel>Description</FieldLabel>
            <textarea
              value={p.description}
              onChange={(e) => p.onDescription(e.target.value)}
              rows={3}
              className={cn(FIELD, "resize-y")}
            />
          </label>
          <label className="flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              checked={p.chatEnabled}
              onChange={(e) => p.onChatEnabled(e.target.checked)}
              className="size-4 cursor-pointer accent-studio-purple"
            />
            <span className="text-[13px] text-white">Activer le tchat en direct</span>
          </label>
        </div>

        <div className="flex flex-col gap-3">
          <GroupLabel>Détails du sermon</GroupLabel>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <FieldLabel>Titre du message</FieldLabel>
              <input
                value={p.sermonTitle}
                onChange={(e) => p.onSermonTitle(e.target.value)}
                className={FIELD}
              />
            </label>
            <label className="block">
              <FieldLabel>Prédicateur</FieldLabel>
              <input
                value={p.sermonPreacher}
                onChange={(e) => p.onSermonPreacher(e.target.value)}
                className={FIELD}
              />
            </label>
          </div>
          <label className="block">
            <FieldLabel>Référence biblique</FieldLabel>
            <input
              value={p.sermonReference}
              onChange={(e) => p.onSermonReference(e.target.value)}
              className={FIELD}
            />
          </label>

          <div className="flex items-center justify-between">
            <FieldLabel>Points du sermon</FieldLabel>
            <button
              type="button"
              onClick={p.onAddPoint}
              className="flex items-center gap-1 rounded-md border border-studio-purple/30 bg-studio-purple/10 px-2 py-1 text-[11px] font-bold text-studio-purple transition-colors hover:bg-studio-purple/20"
            >
              <Plus className="size-3" /> Point
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {p.sermonPoints.map((pt, i) => (
              <div key={pt.id} className="flex items-center gap-2">
                <span className={cn("w-6 shrink-0 text-[11px] text-white/40", MONO)}>{pt.id}</span>
                <input
                  value={pt.text}
                  onChange={(e) => p.onUpdatePoint(i, "text", e.target.value)}
                  placeholder="Intitulé du point"
                  className={cn(FIELD, "flex-1 py-2 text-[12px]")}
                />
                <input
                  value={pt.verse}
                  onChange={(e) => p.onUpdatePoint(i, "verse", e.target.value)}
                  placeholder="Réf."
                  className={cn(FIELD, "w-24 py-2 text-[12px]")}
                />
                <button
                  type="button"
                  onClick={() => p.onRemovePoint(i)}
                  className="text-white/30 transition-colors hover:text-[#ff8a8a]"
                >
                  <Trash className="size-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function StreamPanel(p: SettingsModalProps) {
  const preview = p.fallbackImage ? p.getPreviewUrl(p.fallbackImage) : "";
  return (
    <>
      <PanelTitle>Stream (Flux)</PanelTitle>
      <div className="flex max-w-[520px] flex-col gap-4">
        <label className="block">
          <FieldLabel>Clé de flux (Stream Key)</FieldLabel>
          <input
            value={p.streamKey}
            onChange={(e) => p.onStreamKey(e.target.value)}
            type="password"
            className={cn(FIELD, MONO, "text-[12px]")}
          />
          <span className="mt-2 block text-[10.5px] text-studio-sandbox/80">
            ⚠️ Ne partagez jamais votre clé de flux.
          </span>
        </label>

        <label className="block">
          <FieldLabel>Lien public (fallback)</FieldLabel>
          <input
            value={p.embedUrl}
            onChange={(e) => p.onEmbedUrl(e.target.value)}
            placeholder="https://…/hls/live.m3u8"
            className={cn(FIELD, MONO, "text-[12px]")}
          />
        </label>

        <div className="mt-1 rounded-[11px] border border-white/8 bg-white/[.02] p-4">
          <div className="mb-3 flex items-center gap-2">
            <Radio className="size-4 text-studio-purple" />
            <span className="text-[12px] font-bold tracking-wide text-white">Diffusion Facebook</span>
          </div>
          <div className="flex flex-col gap-4">
            <label className="block">
              <FieldLabel>URL du serveur (RTMPS)</FieldLabel>
              <input
                value={p.facebookRtmpsUrl}
                onChange={(e) => p.onFacebookRtmpsUrl(e.target.value)}
                placeholder="rtmps://live-api-s.facebook.com:443/rtmp/"
                className={cn(FIELD, MONO, "text-[12px]")}
              />
              <span className="mt-2 block text-[10.5px] text-white/40">
                Laissez vide pour l&apos;URL Facebook par défaut.
              </span>
            </label>
            <label className="block">
              <FieldLabel>Clé de stream Facebook</FieldLabel>
              <input
                value={p.facebookStreamKey}
                onChange={(e) => p.onFacebookStreamKey(e.target.value)}
                type="password"
                placeholder="Collez la clé depuis Facebook Live Producer"
                className={cn(FIELD, MONO, "text-[12px]")}
              />
              <span className="mt-2 block text-[10.5px] text-studio-sandbox/80">
                ⚠️ Reste sur notre serveur, jamais exposée. Ne la partagez pas.
              </span>
            </label>
          </div>
        </div>

        <div>
          <FieldLabel>Image de repli (hors-ligne)</FieldLabel>
          <div className="flex items-center gap-3">
            <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-[9px] border border-white/10 bg-studio-bg">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element -- dynamic blob/remote fallback preview; next/image breaks object-preview blobs
                <img src={preview} alt="Aperçu repli" className="size-full object-cover" />
              ) : (
                <ImageIcon className="size-6 text-white/25" />
              )}
            </div>
            <label className="cursor-pointer rounded-[9px] border border-white/10 bg-white/5 px-3 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-white/10">
              Choisir une image…
              <input type="file" accept="image/*" onChange={p.onImageSelect} className="hidden" />
            </label>
          </div>
        </div>
      </div>
    </>
  );
}

// Full range offered — a powerful régie machine can drive 4K/60. The heavy
// choices carry an explicit warning in the panel (a 4K@60 setting on a modest
// machine pins CPU/GPU until the browser dies), and `parseResolution` sanity-caps
// at 3840×2160. Note: Facebook receives the ffmpeg re-encode (30 fps); the site's
// WebRTC playback gets the full canvas rate.
const RESOLUTIONS = ["3840x2160", "2560x1440", "1920x1080", "1280x720", "854x480"];
const FPS_OPTIONS = ["24", "25", "30", "50", "60"];
const isHeavy = (res: string, fps: string) =>
  res === "3840x2160" || res === "2560x1440" || fps === "50" || fps === "60";

/**
 * Vidéo — REAL OBS-like canvas sizing. "Base (composition)" is the logical
 * canvas every layer style is authored in (drives the preview + program
 * stages); "Sortie" is the broadcast canvas + framerate (applied the next time
 * the live starts). Preview, antenne and diffusion share one metric space
 * whatever sizes are picked, so scaling/quality stay identical.
 */
function VideoPanel(p: SettingsModalProps) {
  return (
    <>
      <PanelTitle>Vidéo · Tailles du canevas</PanelTitle>

      <div className="grid max-w-[560px] gap-5">
        <div>
          <GroupLabel>Composition (aperçu &amp; antenne)</GroupLabel>
          <FieldLabel>Résolution de base — l&apos;espace dans lequel les calques sont composés</FieldLabel>
          <select
            value={p.baseResolution}
            onChange={(e) => p.onBaseResolution(e.target.value)}
            className={FIELD}
          >
            {[...new Set([p.baseResolution, ...RESOLUTIONS])].map((r) => (
              <option key={r} value={r}>
                {r.replace("x", " × ")}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-[11px] leading-relaxed text-white/40">
            L&apos;aperçu et l&apos;antenne affichent exactement cet espace, mis à l&apos;échelle
            pour tenir dans le moniteur — la mise en page est identique quelle que soit la
            taille de la fenêtre ou de l&apos;appareil.
          </p>
        </div>

        <div>
          <GroupLabel>Sortie (diffusion Facebook &amp; site)</GroupLabel>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Résolution de sortie</FieldLabel>
              <select
                value={p.outputResolution}
                onChange={(e) => p.onOutputResolution(e.target.value)}
                className={FIELD}
              >
                {[...new Set([p.outputResolution, ...RESOLUTIONS])].map((r) => (
                  <option key={r} value={r}>
                    {r.replace("x", " × ")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel>Images / seconde (FPS)</FieldLabel>
              <select
                value={p.outputFps}
                onChange={(e) => p.onOutputFps(e.target.value)}
                className={FIELD}
              >
                {[...new Set([p.outputFps, ...FPS_OPTIONS])].map((f) => (
                  <option key={f} value={f}>
                    {f} fps
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-white/40">
            La composition est rendue à cette résolution pour la diffusion — tous les
            éléments sont mis à l&apos;échelle proportionnellement, sans décalage.
          </p>
          {isHeavy(p.outputResolution, p.outputFps) && (
            <p className="mt-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-[11.5px] text-amber-300">
              ⚠ 1440p/4K et 50/60 fps demandent une machine de régie puissante (CPU/GPU).
              En cas de saccades ou de surchauffe, revenez à 1920 × 1080 / 30 fps.
            </p>
          )}
          {p.broadcasting && (
            <p className="mt-2 rounded-lg border border-studio-sandbox/30 bg-studio-sandbox/10 px-3 py-2 text-[11.5px] text-studio-sandbox">
              Un direct est en cours : la nouvelle résolution de sortie sera appliquée au
              prochain démarrage du live.
            </p>
          )}
        </div>
      </div>
    </>
  );
}

function StubPanel({ title }: { title: string }) {
  return (
    <>
      <PanelTitle>{title}</PanelTitle>
      <div className="max-w-[520px] rounded-xl border border-dashed border-white/12 bg-white/[0.02] p-6 text-[13px] leading-relaxed text-white/45">
        <Label className="mb-2">Bientôt disponible</Label>
        Ces réglages font partie de l&apos;habillage régie. Ils seront connectés à un moteur
        d&apos;encodage/sortie réel ultérieurement.
        {/* TODO(studio): wire output/audio/video/hotkeys/accessibility/advanced to a real backend. */}
      </div>
    </>
  );
}
