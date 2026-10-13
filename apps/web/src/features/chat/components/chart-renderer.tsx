import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Skeleton } from "#/components/ui/skeleton";

import type { ChartSpec } from "../types";

const COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#6250d6"];

/**
 * 方案 B：通用图表解释器——消费 <chart> 标签体 JSON（ChartSpec），recharts 渲染。
 * 流式中 JSON 半截时由父级渲染骨架。
 */
export function ChartRenderer({ spec, title }: { spec: ChartSpec; title?: string }) {
  const { chartType, xKey, series, yAxisMin, data } = spec;
  const suffix = series[0]?.valueSuffix ?? "";
  const fmt = (v: number | string) =>
    typeof v === "number" ? `${v}${suffix}` : String(v);

  return (
    <Card className="w-full">
      {title && (
        <CardHeader className="pb-0">
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className="pt-3">
        <ResponsiveContainer height={280} width="100%">
          {chartType === "pie" ? (
            <PieChart>
              <Pie
                cx="50%"
                cy="50%"
                data={data}
                dataKey={series[0]?.dataKey}
                fill="#2a78d6"
                innerRadius={50}
                label={(entry: { name?: string; value?: number }) =>
                  fmt(Number(entry.value ?? 0))
                }
                nameKey={xKey}
                outerRadius={90}
              >
                {data.map((_, i) => (
                  <Cell fill={COLORS[i % COLORS.length]} key={i} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          ) : chartType === "line" ? (
            <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey={xKey} tickLine={false} />
              <YAxis domain={[yAxisMin ?? "auto", "auto"]} tickFormatter={fmt} />
              <Tooltip />
              {series.map((s) => (
                <Line
                  dataKey={s.dataKey}
                  key={s.dataKey}
                  name={s.label}
                  stroke={COLORS[0]}
                />
              ))}
            </LineChart>
          ) : chartType === "area" ? (
            <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey={xKey} tickLine={false} />
              <YAxis domain={[yAxisMin ?? "auto", "auto"]} tickFormatter={fmt} />
              <Tooltip />
              {series.map((s) => (
                <Area
                  dataKey={s.dataKey}
                  fill={COLORS[0]}
                  fillOpacity={0.15}
                  key={s.dataKey}
                  name={s.label}
                  stroke={COLORS[0]}
                  type="monotone"
                />
              ))}
            </AreaChart>
          ) : (
            <BarChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey={xKey} tickLine={false} />
              <YAxis domain={[yAxisMin ?? 0, "auto"]} tickFormatter={fmt} />
              <Tooltip />
              {series.map((s) => (
                <Bar
                  dataKey={s.dataKey}
                  fill={COLORS[0]}
                  key={s.dataKey}
                  name={s.label}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function ChartSkeleton({ title }: { title?: string }) {
  return (
    <Card className="w-full">
      <CardHeader className="pb-0">
        <Skeleton className="h-5 w-48" />
        {title && <span className="sr-only">{title}</span>}
      </CardHeader>
      <CardContent className="pt-3">
        <Skeleton className="h-[280px] w-full" />
      </CardContent>
    </Card>
  );
}
