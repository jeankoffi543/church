import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { Eye, EyeOff, GripHorizontal } from "lucide-react";
import { cn } from "../lib/cn";

export type DockItem = {
  id: string;
  label: string;
  node: React.ReactNode;
};
// Back-compat alias for callers using `Panel`.
export type Panel = DockItem;

function lsGetJSON<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function lsSetJSON(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage disabled */
  }
}

/**
 * The console docks row — ported 1:1 from the web console's `resizable-row.tsx`.
 * Every panel is width-resizable (grab handle between neighbours), REORDERABLE
 * (drag the top grip or a toolbar chip), and HIDEABLE (click a chip). Order /
 * visibility / widths are persisted per `storageKey`. `resetNonce` (or a
 * double-click on a handle) restores the default layout. Below `lg` it stacks.
 */
export function ResizableRow({
  storageKey,
  minPx = 218,
  className,
  resetNonce = 0,
  items,
}: {
  storageKey: string;
  minPx?: number;
  className?: string;
  resetNonce?: number;
  items: DockItem[];
}) {
  const defaultOrder = items.map((i) => i.id);
  const rowRef = useRef<HTMLDivElement>(null);

  const [order, setOrder] = useState<string[]>(() => {
    const saved = lsGetJSON<string[]>(`${storageKey}:order`);
    if (!saved) return defaultOrder;
    const known = saved.filter((id) => defaultOrder.includes(id));
    return [...known, ...defaultOrder.filter((id) => !known.includes(id))];
  });
  const [hidden, setHidden] = useState<string[]>(
    () => (lsGetJSON<string[]>(`${storageKey}:hidden`) ?? []).filter((id) => defaultOrder.includes(id)),
  );
  const [weights, setWeights] = useState<Record<string, number>>(() => {
    const saved = lsGetJSON<Record<string, number>>(`${storageKey}:weights`);
    const base: Record<string, number> = {};
    for (const id of defaultOrder) {
      const w = saved?.[id];
      base[id] = Number.isFinite(w) && (w as number) > 0 ? (w as number) : 1;
    }
    return base;
  });
  const weightsRef = useRef(weights);
  useEffect(() => {
    weightsRef.current = weights;
  }, [weights]);
  useEffect(() => lsSetJSON(`${storageKey}:order`, order), [storageKey, order]);
  useEffect(() => lsSetJSON(`${storageKey}:hidden`, hidden), [storageKey, hidden]);

  const visibleIds = order.filter((id) => !hidden.includes(id));
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const resetLayout = useCallback(() => {
    setOrder(defaultOrder);
    setHidden([]);
    setWeights(Object.fromEntries(defaultOrder.map((id) => [id, 1])));
    try {
      window.localStorage.removeItem(`${storageKey}:order`);
      window.localStorage.removeItem(`${storageKey}:hidden`);
      window.localStorage.removeItem(`${storageKey}:weights`);
    } catch {
      /* storage disabled */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, items]);
  const lastResetRef = useRef(resetNonce);
  useEffect(() => {
    if (resetNonce !== lastResetRef.current) {
      lastResetRef.current = resetNonce;
      resetLayout();
    }
  }, [resetNonce, resetLayout]);

  const toggleHidden = (id: string) =>
    setHidden((h) => {
      if (h.includes(id)) return h.filter((x) => x !== id);
      if (order.filter((x) => !h.includes(x)).length <= 1) return h;
      return [...h, id];
    });

  const dropOn = (targetId: string, e?: React.DragEvent) => {
    const src = e?.dataTransfer.getData("text/dock") || dragId;
    setDragId(null);
    setOverId(null);
    if (!src || src === targetId) return;
    setOrder((o) => {
      const next = o.filter((x) => x !== src);
      next.splice(next.indexOf(targetId), 0, src);
      return next;
    });
  };

  const startResize = useCallback(
    (e: React.PointerEvent, leftId: string, rightId: string) => {
      e.preventDefault();
      const row = rowRef.current;
      if (!row) return;
      const rowW = row.getBoundingClientRect().width;
      const startX = e.clientX;
      const start = { ...weightsRef.current };
      const visible = order.filter((id) => !hidden.includes(id));
      const total = visible.reduce((a, id) => a + start[id], 0);
      const pxPerWeight = rowW / total;
      const minW = minPx / pxPerWeight;
      const pair = start[leftId] + start[rightId];

      const move = (ev: PointerEvent) => {
        const dw = (ev.clientX - startX) / pxPerWeight;
        const left = Math.min(Math.max(start[leftId] + dw, minW), pair - minW);
        setWeights({ ...start, [leftId]: left, [rightId]: pair - left });
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        lsSetJSON(`${storageKey}:weights`, weightsRef.current);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [minPx, storageKey, order, hidden],
  );

  const [isRow, setIsRow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const apply = () => setIsRow(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const byId = new Map(items.map((i) => [i.id, i]));

  return (
    <div className={className}>
      <div className="mb-1.5 hidden items-center justify-end gap-1 lg:flex">
        <span className="mr-1 text-[9px] font-bold tracking-[1px] text-white/30 uppercase">Panneaux</span>
        {order.map((id) => {
          const item = byId.get(id);
          if (!item) return null;
          const isHidden = hidden.includes(id);
          return (
            <button
              key={id}
              type="button"
              draggable
              onDragStart={(e) => {
                setDragId(id);
                e.dataTransfer.setData("text/dock", id);
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (overId !== id) setOverId(id);
              }}
              onDrop={(e) => dropOn(id, e)}
              onDragEnd={() => {
                setDragId(null);
                setOverId(null);
              }}
              onClick={() => toggleHidden(id)}
              title={isHidden ? "Afficher le panneau" : "Masquer le panneau (glisser pour déplacer)"}
              className={cn(
                "flex cursor-grab items-center gap-1 rounded-md border px-2 py-1 text-[9.5px] font-bold transition-colors",
                isHidden
                  ? "border-white/8 bg-white/[0.02] text-white/30"
                  : "border-white/12 bg-white/6 text-white/75 hover:text-white",
                overId === id && dragId && dragId !== id && "border-gold/70",
                dragId === id && "opacity-40",
              )}
            >
              {isHidden ? <EyeOff className="size-2.5" /> : <Eye className="size-2.5" />}
              {item.label}
            </button>
          );
        })}
      </div>

      <div
        ref={rowRef}
        className="flex flex-col gap-3 lg:h-full lg:min-h-0 lg:flex-1 lg:flex-row lg:gap-0"
      >
        {visibleIds.map((id, i) => {
          const item = byId.get(id);
          if (!item) return null;
          return (
            <Fragment key={id}>
              <div
                onDragOver={(e) => {
                  if (!dragId) return;
                  e.preventDefault();
                  if (overId !== id) setOverId(id);
                }}
                onDrop={(e) => dropOn(id, e)}
                className={cn(
                  "group/dock relative flex h-[clamp(360px,52vh,520px)] min-h-0 min-w-0 flex-col lg:h-full [&>*]:min-h-0 [&>*]:flex-1",
                  overId === id && dragId && dragId !== id && "rounded-2xl ring-2 ring-gold/60",
                )}
                style={isRow ? { flex: `${weights[id]} 1 0%` } : undefined}
              >
                <div
                  draggable
                  onDragStart={(e) => {
                    setDragId(id);
                    e.dataTransfer.setData("text/dock", id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragEnd={() => {
                    setDragId(null);
                    setOverId(null);
                  }}
                  title="Glisser pour déplacer le panneau"
                  className="absolute top-0 left-1/2 z-30 hidden -translate-x-1/2 cursor-grab rounded-b-md border border-t-0 border-white/10 bg-black/60 px-2 py-0.5 opacity-0 transition-opacity group-hover/dock:opacity-100 lg:block"
                >
                  <GripHorizontal className="size-3.5 text-white/50" />
                </div>
                {item.node}
              </div>
              {i < visibleIds.length - 1 && (
                <div
                  role="separator"
                  aria-orientation="vertical"
                  onPointerDown={(e) => startResize(e, id, visibleIds[i + 1])}
                  onDoubleClick={resetLayout}
                  title="Glisser pour redimensionner · double-clic pour réinitialiser"
                  className="group hidden w-3 shrink-0 cursor-col-resize items-center justify-center lg:flex"
                >
                  <div className="h-10 w-[3px] rounded-full bg-white/10 transition-colors group-hover:bg-gold/60 group-active:bg-gold" />
                </div>
              )}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
