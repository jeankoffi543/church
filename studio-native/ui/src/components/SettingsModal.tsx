import { useState } from "react";
import { createPortal } from "react-dom";
import { Settings2, Radio, HardDrive, Volume2, Monitor, Keyboard, X } from "lucide-react";
import { cn } from "../lib/cn";
import type { EncoderConfig } from "../lib/api";

const MONO = "font-studio-mono";
const FIELD = "w-full rounded-[9px] border border-white/10 bg-studio-bg px-3 py-2.5 text-[13px] text-white outline-none";

const TABS = [
  { id: "stream", label: "Stream (Flux)", Icon: Radio },
  { id: "output", label: "Sortie", Icon: HardDrive },
  { id: "general", label: "Général", Icon: Settings2 },
  { id: "audio", label: "Audio", Icon: Volume2 },
  { id: "video", label: "Vidéo", Icon: Monitor },
  { id: "hotkeys", label: "Raccourcis", Icon: Keyboard },
];

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="mb-1.5 block text-[11px] font-bold text-white/55">{children}</span>;
}

/**
 * Live console settings modal — ported from the web `settings-modal.tsx`. Stream
 * (Facebook RTMPS + key) and Sortie (encoder) are wired to our commands; the
 * other tabs are faithful OBS chrome stubs.
 */
export function SettingsModal({
  open,
  onClose,
  rtmpsUrl,
  onRtmpsUrl,
  streamKey,
  onStreamKey,
  encoders,
  encCfg,
  encResolved,
  onEncoder,
}: {
  open: boolean;
  onClose: () => void;
  rtmpsUrl: string;
  onRtmpsUrl: (v: string) => void;
  streamKey: string;
  onStreamKey: (v: string) => void;
  encoders: string[];
  encCfg: EncoderConfig | null;
  encResolved: string | null;
  onEncoder: (patch: Partial<EncoderConfig>) => void;
}) {
  const [tab, setTab] = useState("stream");
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm">
      <button type="button" aria-label="Fermer" className="absolute inset-0 cursor-default" onClick={onClose} />
      <div className="animate-modal-in relative flex h-[560px] max-h-[85vh] w-[760px] max-w-full overflow-hidden rounded-2xl border border-white/10 bg-studio-panel shadow-[0_40px_90px_rgba(0,0,0,.6)]">
        {/* Tab sidebar */}
        <div className="flex w-[188px] shrink-0 flex-col gap-1 border-r border-white/8 bg-studio-rail p-3">
          <div className="mb-2 flex items-center gap-2 px-1">
            <Settings2 className="size-4 text-gold" />
            <span className="text-[12px] font-extrabold text-white">Paramètres</span>
          </div>
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[12px] font-bold transition-colors",
                tab === t.id ? "bg-studio-purple/15 text-studio-purple" : "text-white/55 hover:text-white",
              )}
            >
              <t.Icon className="size-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="studio-scroll flex-1 overflow-y-auto p-6">
          <div className="mb-4 flex items-center justify-between border-b border-white/8 pb-3.5">
            <h3 className="text-[18px] font-extrabold text-white">
              {TABS.find((t) => t.id === tab)?.label}
            </h3>
            <button type="button" onClick={onClose} className="text-white/40 hover:text-white">
              <X className="size-4.5" />
            </button>
          </div>

          {tab === "stream" && (
            <div className="flex flex-col gap-4">
              <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
                <span className="mb-3 block text-[12px] font-bold tracking-wide text-white">Diffusion Facebook</span>
                <FieldLabel>URL RTMPS Facebook</FieldLabel>
                <input
                  value={rtmpsUrl}
                  onChange={(e) => onRtmpsUrl(e.target.value)}
                  placeholder="rtmps://live-api-s.facebook.com:443/rtmp/"
                  className={cn(FIELD, MONO)}
                />
                <p className="mt-1 mb-3 text-[10.5px] text-white/40">Laissez vide pour l&apos;URL Facebook par défaut.</p>
                <FieldLabel>Clé de stream Facebook</FieldLabel>
                <input
                  value={streamKey}
                  onChange={(e) => onStreamKey(e.target.value)}
                  placeholder="Collez la clé depuis Facebook Live Producer"
                  className={cn(FIELD, MONO)}
                />
              </div>
              <p className="text-[11px] leading-relaxed text-white/45">
                « Démarrer le live » publiera vers <span className={cn("text-gold", MONO)}>{(rtmpsUrl || "rtmps://live-api-s.facebook.com:443/rtmp/") + streamKey || "…"}</span>.
              </p>
            </div>
          )}

          {tab === "output" && encCfg && (
            <div className="flex flex-col gap-4">
              <div>
                <FieldLabel>Encodeur</FieldLabel>
                <select
                  value={encCfg.kind}
                  onChange={(e) => onEncoder({ kind: e.target.value })}
                  className={FIELD}
                >
                  <option value="auto" className="bg-studio-bg">
                    auto{encResolved ? ` → ${encResolved}` : ""}
                  </option>
                  {encoders.map((k) => (
                    <option key={k} value={k} className="bg-studio-bg">
                      {k}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel>Débit (kbps)</FieldLabel>
                <input
                  type="number"
                  min={500}
                  max={20000}
                  step={500}
                  value={encCfg.bitrate_kbps}
                  onChange={(e) => onEncoder({ bitrate_kbps: Number(e.target.value) || 4000 })}
                  className={FIELD}
                />
              </div>
              <div>
                <FieldLabel>Qualité</FieldLabel>
                <select
                  value={encCfg.preset}
                  onChange={(e) => onEncoder({ preset: e.target.value as EncoderConfig["preset"] })}
                  className={FIELD}
                >
                  <option value="speed" className="bg-studio-bg">Vitesse</option>
                  <option value="balanced" className="bg-studio-bg">Équilibré</option>
                  <option value="quality" className="bg-studio-bg">Qualité</option>
                </select>
              </div>
            </div>
          )}

          {!["stream", "output"].includes(tab) && (
            <div className="flex h-[360px] flex-col items-center justify-center text-center text-white/35">
              <Settings2 className="mb-3 size-8 text-white/15" />
              <div className="text-[13px] font-bold">Bientôt disponible</div>
              <div className="mt-1 text-[11px]">Ce panneau OBS sera câblé dans une prochaine étape.</div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
