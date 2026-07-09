import { ReactNode, useCallback, useRef, useState } from "react";

export type Panel = { id: string; label: string; node: ReactNode };

/** A horizontal row of labelled dock panels separated by draggable dividers —
 * the régie's resizable dock strip. Widths are kept as flex weights so the row
 * reflows with the window; dragging a divider shifts weight between neighbours. */
export function ResizableRow({ panels }: { panels: Panel[] }) {
  const [weights, setWeights] = useState<number[]>(() => panels.map(() => 1));
  const rowRef = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{ i: number; startX: number; a: number; b: number } | null>(null);

  const onDown = useCallback(
    (i: number) => (e: React.PointerEvent) => {
      e.preventDefault();
      drag.current = { i, startX: e.clientX, a: weights[i], b: weights[i + 1] };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [weights],
  );

  const onMove = useCallback((e: React.PointerEvent) => {
    const d = drag.current;
    const row = rowRef.current;
    if (!d || !row) return;
    const total = d.a + d.b;
    const px = row.getBoundingClientRect().width || 1;
    const frac = ((e.clientX - d.startX) / px) * panelsCount(row);
    let a = d.a + frac * total;
    let b = d.b - frac * total;
    const min = 0.25;
    if (a < min || b < min) return;
    setWeights((w) => {
      const next = [...w];
      next[d.i] = a;
      next[d.i + 1] = b;
      return next;
    });
  }, []);

  const onUp = useCallback(() => {
    drag.current = null;
  }, []);

  return (
    <div className="dock-row" ref={rowRef} onPointerMove={onMove} onPointerUp={onUp}>
      {panels.map((p, i) => (
        <div className="dock" key={p.id} style={{ flexGrow: weights[i] }}>
          <div className="dock-head">{p.label}</div>
          <div className="dock-body">{p.node}</div>
          {i < panels.length - 1 && (
            <div className="dock-divider" onPointerDown={onDown(i)} />
          )}
        </div>
      ))}
    </div>
  );
}

function panelsCount(row: HTMLElement) {
  // Scale drag sensitivity by the number of panels so a divider tracks the cursor.
  return row.querySelectorAll(".dock").length || 1;
}
