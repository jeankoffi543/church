import { OutputStats } from "../lib/api";

/** The bottom status strip: engine health on the left, live encoder throughput
 * (CHR-112) in the middle, a free-text status on the right. */
export function StatusBar({
  running,
  fps,
  stats,
  live,
  sandbox,
  recording,
  message,
}: {
  running: boolean;
  fps: number;
  stats: { fps: number; kbps: number } | null;
  live: boolean;
  sandbox: boolean;
  recording: boolean;
  message: string;
}) {
  return (
    <div className="status-bar">
      <span className="status-item">
        <span className="dot" data-on={running ? "1" : "0"} />
        {running ? "Moteur actif" : "Moteur arrêté"}
      </span>
      <span className="status-item">{fps.toFixed(0)} fps programme</span>
      {live && (
        <span className="status-item status-live" data-sandbox={sandbox ? "1" : "0"}>
          ● {sandbox ? "TEST" : "DIRECT"}
        </span>
      )}
      {recording && <span className="status-item status-rec">● REC</span>}
      {stats && (
        <span className="status-item">
          sortie {stats.fps.toFixed(0)} fps · {stats.kbps.toFixed(0)} kbps
        </span>
      )}
      <span className="status-spacer" />
      <span className="status-item status-msg">{message}</span>
    </div>
  );
}

export type { OutputStats };
