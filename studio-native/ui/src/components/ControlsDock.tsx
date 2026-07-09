import { Capabilities, EncoderConfig } from "../lib/api";

/** Commands dock: encoder settings + the two Outputs (record, broadcast) with
 * Test/sandbox mode. All wired to the existing CHR-108/109/111/112 commands. */
export function ControlsDock({
  caps,
  encoders,
  encCfg,
  encResolved,
  onEncoder,
  recording,
  recPath,
  onToggleRecord,
  live,
  liveEnded,
  sandbox,
  rtmpUrl,
  onSandbox,
  onRtmpUrl,
  onToggleLive,
}: {
  caps: Capabilities | null;
  encoders: string[];
  encCfg: EncoderConfig | null;
  encResolved: string | null;
  onEncoder: (patch: Partial<EncoderConfig>) => void;
  recording: boolean;
  recPath: string | null;
  onToggleRecord: () => void;
  live: boolean;
  liveEnded: string | null;
  sandbox: boolean;
  rtmpUrl: string;
  onSandbox: (v: boolean) => void;
  onRtmpUrl: (v: string) => void;
  onToggleLive: () => void;
}) {
  const hasOutputs = caps?.outputs.length;
  return (
    <div className="pane">
      {hasOutputs && encCfg && (
        <div className="ctl-block">
          <div className="ctl-title">Encodeur</div>
          <div className="ctl-grid">
            <select value={encCfg.kind} onChange={(e) => onEncoder({ kind: e.target.value })}>
              <option value="auto">auto{encResolved ? ` → ${encResolved}` : ""}</option>
              {encoders.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
            <label className="ctl-inline">
              <input
                type="number"
                min={500}
                max={20000}
                step={500}
                value={encCfg.bitrate_kbps}
                onChange={(e) => onEncoder({ bitrate_kbps: Number(e.target.value) || 4000 })}
              />
              kbps
            </label>
            <select
              value={encCfg.preset}
              onChange={(e) => onEncoder({ preset: e.target.value as EncoderConfig["preset"] })}
            >
              <option value="speed">Vitesse</option>
              <option value="balanced">Équilibré</option>
              <option value="quality">Qualité</option>
            </select>
          </div>
        </div>
      )}

      {caps?.outputs.includes("record") && (
        <div className="ctl-block">
          <div className="ctl-title">Enregistrement</div>
          <button className={`btn ${recording ? "btn-danger" : ""}`} onClick={onToggleRecord}>
            {recording ? "⏹ Arrêter" : "⏺ Enregistrer"}
          </button>
          {recPath && <div className="ctl-path">{recPath}</div>}
        </div>
      )}

      {caps?.outputs.includes("broadcast") && (
        <div className="ctl-block">
          <div className="ctl-title">Diffusion</div>
          {liveEnded && !live && <div className="ctl-err">Interrompue : {liveEnded}</div>}
          <label className="ctl-check">
            <input type="checkbox" checked={sandbox} disabled={live} onChange={(e) => onSandbox(e.target.checked)} />
            Mode Test (n'émet pas)
          </label>
          <input
            className="ctl-url"
            type="text"
            placeholder="rtmps://…/rtmp/CLÉ"
            value={rtmpUrl}
            disabled={live || sandbox}
            onChange={(e) => onRtmpUrl(e.target.value)}
          />
          <button
            className={`btn ${live ? "btn-danger" : ""}`}
            disabled={!live && !sandbox && !rtmpUrl.trim()}
            onClick={onToggleLive}
          >
            {live ? "⏹ Arrêter" : sandbox ? "🧪 Lancer le test" : "🔴 Passer en direct"}
          </button>
        </div>
      )}
    </div>
  );
}
