import type { LucideIcon } from "lucide-react";
import { ArrowDown, ArrowUp } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Stat tile: label (sentence case) · value (semibold, auto-compact) · an
 * optional signed delta vs a named period. One hero number per card — this
 * is the "figure" form from the dataviz skill, not a chart.
 */
export function KpiCard({
  label,
  value,
  icon: Icon,
  delta,
  deltaLabel = "vs période précédente",
  className,
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
  /** Signed percent change; up isn't always "good" so no color is baked in beyond direction. */
  delta?: number;
  deltaLabel?: string;
  className?: string;
}) {
  const hasDelta = delta !== undefined && Number.isFinite(delta);
  const isUp = hasDelta && delta > 0;
  const isFlat = hasDelta && delta === 0;

  return (
    <div
      className={cn(
        "rounded-[18px] border border-[rgba(40,25,80,0.08)] bg-white p-5 shadow-[0_1px_3px_rgba(22,15,51,0.05)]",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <span className="text-[13px] font-semibold text-faint">{label}</span>
        {Icon && (
          <span className="flex size-9 items-center justify-center rounded-xl bg-lilac text-indigo-mid">
            <Icon className="size-4.5" />
          </span>
        )}
      </div>
      <div className="mt-3 font-sans text-[28px] font-semibold text-indigo">{value}</div>
      {hasDelta && (
        <div className="mt-1.5 flex items-center gap-1 text-[12px] font-semibold">
          <span
            className={cn(
              "inline-flex items-center gap-0.5",
              isFlat ? "text-faint" : isUp ? "text-online" : "text-live"
            )}
          >
            {!isFlat && (isUp ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
            {Math.abs(delta).toFixed(1)}%
          </span>
          <span className="text-faint">{deltaLabel}</span>
        </div>
      )}
    </div>
  );
}
