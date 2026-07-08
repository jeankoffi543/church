"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { ChartTooltip } from "./chart-tooltip";

export interface DonutSlice {
  key: string;
  label: string;
  value: number;
  color: string;
}

/**
 * A categorical breakdown (e.g. giving by nature). A legend is always shown
 * for 2+ slices — color is never the only way to tell slices apart.
 */
export function DonutChart({
  data,
  formatValue = (v) => String(v),
  height = 220,
}: {
  data: DonutSlice[];
  formatValue?: (value: number) => string;
  height?: number;
}) {
  const total = data.reduce((acc, d) => acc + d.value, 0);

  if (total === 0) {
    return (
      <div style={{ height }} className="flex items-center justify-center text-sm text-faint">
        Aucune donnée sur cette période.
      </div>
    );
  }

  return (
    <div className="flex items-center gap-6">
      <ResponsiveContainer width={height} height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius="62%"
            outerRadius="100%"
            paddingAngle={2}
            stroke="#ffffff"
            strokeWidth={2}
          >
            {data.map((slice) => (
              <Cell key={slice.key} fill={slice.color} />
            ))}
          </Pie>
          <Tooltip
            content={<ChartTooltip formatValue={(v) => formatValue(Number(v))} />}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend — always present for 2+ series, doubles as the readable table */}
      <ul className="flex flex-1 flex-col gap-2">
        {data.map((slice) => (
          <li key={slice.key} className="flex items-center justify-between gap-3 text-[13px]">
            <span className="flex items-center gap-2 text-body-strong">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: slice.color }}
              />
              {slice.label}
            </span>
            <span className="font-bold text-indigo">
              {formatValue(slice.value)}
              <span className="ml-1.5 text-[11px] font-semibold text-faint">
                ({total > 0 ? Math.round((slice.value / total) * 100) : 0}%)
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
