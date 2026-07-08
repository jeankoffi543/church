"use client";

// Shared tooltip content for every chart in the admin — value leads (bold,
// high-contrast), series name follows (secondary), keyed with a short line/
// swatch rather than a filled box. Never gates data reachable elsewhere.

interface TooltipPayloadItem {
  name?: string;
  value?: number | string;
  color?: string;
  payload?: Record<string, unknown>;
}

export function ChartTooltip({
  active,
  payload,
  label,
  formatValue = (v) => String(v),
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
  formatValue?: (value: number | string) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="min-w-[160px] rounded-xl border border-[rgba(40,25,80,0.1)] bg-white px-3.5 py-2.5 shadow-lg shadow-indigo/10">
      {label !== undefined && (
        <div className="mb-1.5 text-[11px] font-bold text-faint">{label}</div>
      )}
      <div className="flex flex-col gap-1">
        {payload.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between gap-4 text-[13px]">
            <span className="flex items-center gap-1.5 text-body">
              <span
                className="inline-block h-[2px] w-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              {item.name}
            </span>
            <span className="font-bold text-indigo">
              {item.value !== undefined ? formatValue(item.value) : "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
