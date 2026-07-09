import { useRef } from "react";

export type Box = { x: number; y: number; w: number; h: number };

/** A draggable / resizable selection box drawn over a monitor, in canvas
 * fractions (0..1). Moving or resizing it drives the selected source's
 * compositor pad live (set_layer_transform). Rendered as an absolutely-
 * positioned overlay inside `.monitor-stage`. */
export function TransformBox({ box, onChange }: { box: Box; onChange: (b: Box) => void }) {
  const drag = useRef<{ mode: "move" | "resize"; sx: number; sy: number; start: Box; rect: DOMRect } | null>(null);

  const begin = (mode: "move" | "resize") => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const stage = (e.currentTarget as HTMLElement).closest(".monitor-stage") as HTMLElement;
    drag.current = { mode, sx: e.clientX, sy: e.clientY, start: box, rect: stage.getBoundingClientRect() };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.sx) / d.rect.width;
    const dy = (e.clientY - d.sy) / d.rect.height;
    const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
    if (d.mode === "move") {
      onChange({
        ...d.start,
        x: clamp(d.start.x + dx, 0, 1 - d.start.w),
        y: clamp(d.start.y + dy, 0, 1 - d.start.h),
      });
    } else {
      onChange({
        ...d.start,
        w: clamp(d.start.w + dx, 0.05, 1 - d.start.x),
        h: clamp(d.start.h + dy, 0.05, 1 - d.start.y),
      });
    }
  };

  const end = () => { drag.current = null; };

  return (
    <div
      className="tbox"
      style={{ left: `${box.x * 100}%`, top: `${box.y * 100}%`, width: `${box.w * 100}%`, height: `${box.h * 100}%` }}
      onPointerDown={begin("move")}
      onPointerMove={move}
      onPointerUp={end}
    >
      <div className="tbox-handle" onPointerDown={begin("resize")} onPointerMove={move} onPointerUp={end} />
    </div>
  );
}
