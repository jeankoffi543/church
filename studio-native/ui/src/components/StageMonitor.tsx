import { ReactNode } from "react";

/** One of the two régie monitors. `tone` = "preview" (what you're editing) or
 * "program" (what's on air). The frame is the compositor's JPEG feed pushed over
 * IPC; `overlay` lets the caller draw a selection box / badges on top. */
export function StageMonitor({
  label,
  tone,
  frame,
  badge,
  dim,
  overlay,
}: {
  label: string;
  tone: "preview" | "program";
  frame: string | null;
  badge?: ReactNode;
  dim?: boolean;
  overlay?: ReactNode;
}) {
  return (
    <div className={`monitor monitor-${tone}`}>
      <div className="monitor-bar">
        <span className={`monitor-tag tag-${tone}`}>{label}</span>
        {badge}
      </div>
      <div className="monitor-stage">
        {frame ? (
          <img src={frame} alt={label} draggable={false} />
        ) : (
          <div className="monitor-empty">Aperçu hors ligne</div>
        )}
        {dim && <div className="monitor-black" />}
        {overlay}
      </div>
    </div>
  );
}
