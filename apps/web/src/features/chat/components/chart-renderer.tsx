import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "#/components/ui/chart";
import { Skeleton } from "#/components/ui/skeleton";

import type { ChartSpec } from "../types";

/** 主题色取 styles.css 的 --chart-1..N（亮/暗两套 oklch），超出循环 */
const CHART_COLOR_COUNT = 5;
const chartColor = (i: number) => `var(--chart-${(i % CHART_COLOR_COUNT) + 1})`;

/**
 * 由 ChartSpec 推导 shadcn ChartConfig：
 - 笛卡尔图按 series 建 key（颜色随系列序号走 --chart-N，修掉旧版多系列同色问题）；
 - 饼图按数据里的类目名（xKey 取值）建 key，扇区颜色随类目走。
 */
function buildChartConfig(spec: ChartSpec): ChartConfig {
  const config: ChartConfig = {};
  if (spec.chartType === "pie") {
    const nameKey = spec.xKey ?? "name";
    spec.data.forEach((item, i) => {
      const name = String(item[nameKey] ?? `#${i + 1}`);
      config[name] = { label: name, color: chartColor(i) };
    });
    const valueSeries = spec.series[0];
    if (valueSeries) {
      config[valueSeries.dataKey] = { label: valueSeries.label };
    }
  } else {
    spec.series.forEach((s, i) => {
      config[s.dataKey] = { label: s.label, color: chartColor(i) };
    });
  }
  return config;
}

/**
 * 通用图表解释器——消费 <chart> 标签体 JSON（ChartSpec），shadcn Charts（recharts）渲染。
 * 流式中 JSON 半截时由父级渲染骨架。
 */
export function ChartRenderer({ spec, title }: { spec: ChartSpec; title?: string }) {
  const { chartType, xKey, series, yAxisMin, data } = spec;
  const suffix = series[0]?.valueSuffix ?? "";
  const fmt = (v: number | string) =>
    typeof v === "number" ? `${v}${suffix}` : String(v);
  const chartConfig = buildChartConfig(spec);
  const showLegend = chartType !== "pie" && series.length > 1;

  const tooltip = (
    <ChartTooltip
      content={<ChartTooltipContent valueFormatter={suffix ? fmt : undefined} />}
    />
  );
  const legend = showLegend ? <ChartLegend content={<ChartLegendContent />} /> : null;

  return (
    <Card className="w-full">
      {title && (
        <CardHeader className="pb-0">
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className="pt-3">
        <ChartContainer config={chartConfig} className="h-[280px] w-full">
          {chartType === "pie" ? (
            <PieChart>
              <Pie
                cornerRadius={4}
                cx="50%"
                cy="50%"
                data={data.map((item, i) => ({
                  ...item,
                  fill: `var(--color-${String(item[xKey ?? "name"] ?? `#${i + 1}`)})`,
                }))}
                dataKey={series[0]?.dataKey}
                innerRadius={50}
                label={(entry: { name?: string; value?: number }) =>
                  fmt(Number(entry.value ?? 0))
                }
                nameKey={xKey}
                outerRadius={90}
                paddingAngle={3}
              />
              {tooltip}
            </PieChart>
          ) : chartType === "line" ? (
            <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis axisLine={false} dataKey={xKey} tickLine={false} tickMargin={8} />
              <YAxis
                axisLine={false}
                domain={[yAxisMin ?? "auto", "auto"]}
                tickFormatter={fmt}
                tickLine={false}
              />
              {tooltip}
              {legend}
              {series.map((s) => (
                <Line
                  activeDot={{ r: 4 }}
                  dataKey={s.dataKey}
                  dot={false}
                  key={s.dataKey}
                  name={s.label}
                  stroke={`var(--color-${s.dataKey})`}
                  strokeWidth={2}
                />
              ))}
            </LineChart>
          ) : chartType === "area" ? (
            <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis axisLine={false} dataKey={xKey} tickLine={false} tickMargin={8} />
              <YAxis
                axisLine={false}
                domain={[yAxisMin ?? "auto", "auto"]}
                tickFormatter={fmt}
                tickLine={false}
              />
              {tooltip}
              {legend}
              {series.map((s) => (
                <Area
                  dataKey={s.dataKey}
                  fill={`var(--color-${s.dataKey})`}
                  fillOpacity={0.15}
                  key={s.dataKey}
                  name={s.label}
                  stroke={`var(--color-${s.dataKey})`}
                  strokeWidth={2}
                  type="monotone"
                />
              ))}
            </AreaChart>
          ) : (
            <BarChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis axisLine={false} dataKey={xKey} tickLine={false} tickMargin={8} />
              <YAxis
                axisLine={false}
                domain={[yAxisMin ?? 0, "auto"]}
                tickFormatter={fmt}
                tickLine={false}
              />
              {tooltip}
              {legend}
              {series.map((s) => (
                <Bar
                  dataKey={s.dataKey}
                  fill={`var(--color-${s.dataKey})`}
                  key={s.dataKey}
                  name={s.label}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          )}
        </ChartContainer>
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
