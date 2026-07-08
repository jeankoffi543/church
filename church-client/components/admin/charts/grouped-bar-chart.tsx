"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { CHART_AXIS_TEXT_COLOR, CHART_GRID_COLOR } from "./palette";
import { ChartTooltip } from "./chart-tooltip";

export interface BarSeries {
  key: string;
  label: string;
  color: string;
}

/**
 * Grouped/stacked bars across categories — e.g. giving by nature, split by
 * channel (en ligne vs espèces). Bars are capped thin, rounded at the data
 * end, with a surface gap between segments (never a stroke).
 */
export function GroupedBarChart({
  data,
  series,
  stacked = false,
  formatValue = (v) => String(v),
  height = 260,
}: {
  data: Array<Record<string, string | number>>;
  series: BarSeries[];
  stacked?: boolean;
  formatValue?: (value: number) => string;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} barCategoryGap="24%" barGap={2}>
        <CartesianGrid stroke={CHART_GRID_COLOR} strokeDasharray="0" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: CHART_AXIS_TEXT_COLOR, fontSize: 12 }}
          axisLine={{ stroke: CHART_GRID_COLOR }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: CHART_AXIS_TEXT_COLOR, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => formatValue(Number(v))}
          width={72}
        />
        <Tooltip
          cursor={{ fill: "rgba(40,25,80,0.04)" }}
          content={<ChartTooltip formatValue={(v) => formatValue(Number(v))} />}
        />
        {series.length > 1 && (
          <Legend
            iconType="rect"
            iconSize={10}
            wrapperStyle={{ fontSize: 12, color: "#6f6a85" }}
          />
        )}
        {series.map((s) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            fill={s.color}
            stackId={stacked ? "stack" : undefined}
            radius={[4, 4, 0, 0]}
            maxBarSize={24}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
