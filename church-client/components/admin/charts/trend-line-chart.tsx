"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { CHART_AXIS_TEXT_COLOR, CHART_GRID_COLOR, CHART_SURFACE } from "./palette";
import { ChartTooltip } from "./chart-tooltip";

export interface LineSeries {
  key: string;
  label: string;
  color: string;
}

/** A trend over time (e.g. giving per week/month). 2px lines, ≥8px end-dots
 * with a surface ring so they stay legible where lines cross. */
export function TrendLineChart({
  data,
  series,
  formatValue = (v) => String(v),
  height = 260,
}: {
  data: Array<Record<string, string | number>>;
  series: LineSeries[];
  formatValue?: (value: number) => string;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
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
        <Tooltip content={<ChartTooltip formatValue={(v) => formatValue(Number(v))} />} />
        {series.length > 1 && (
          <Legend
            iconType="plainline"
            wrapperStyle={{ fontSize: 12, color: "#6f6a85" }}
          />
        )}
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color}
            strokeWidth={2}
            dot={{ r: 4, fill: s.color, stroke: CHART_SURFACE, strokeWidth: 2 }}
            activeDot={{ r: 5, fill: s.color, stroke: CHART_SURFACE, strokeWidth: 2 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
