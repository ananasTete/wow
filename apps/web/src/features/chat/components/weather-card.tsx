import { DropletsIcon, ThermometerIcon, WindIcon } from "lucide-react";
import { Badge } from "#/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Skeleton } from "#/components/ui/skeleton";

import type { WeatherOutput } from "../types";

/** 方案 A：天气工具卡片（part.type === "tool-getWeather" 的 output-available 渲染） */
export function WeatherCard({ data }: { data: WeatherOutput }) {
  const { current, forecast, airQuality } = data;
  const today = forecast[0];
  // 直辖市 city 与 province 同名（如「上海市/上海市」），此时不重复展示省份
  const province =
    data.province && !data.city.startsWith(data.province) ? data.province : "";

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-baseline justify-between">
          <span>
            {data.city}
            {province && (
              <span className="ml-1 text-muted-foreground text-xs font-normal">
                {province}
              </span>
            )}
          </span>
          <span className="flex items-baseline gap-1">
            <span className="text-3xl">{current.temperature}</span>
            <span className="text-sm">°C</span>
          </span>
        </CardTitle>
        <div className="text-muted-foreground flex items-center gap-3 text-sm">
          <span>{current.condition}</span>
          <span className="flex items-center gap-1">
            <ThermometerIcon className="size-3.5" />
            体感 {current.feelsLike}°C
          </span>
          <span className="flex items-center gap-1">
            <WindIcon className="size-3.5" />
            {current.windDirection} {current.windScale}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <Badge variant="secondary">
            <DropletsIcon className="size-3" />
            AQI {airQuality.aqi} · {airQuality.quality}
          </Badge>
          {today && (
            <span className="text-muted-foreground text-sm">
              今日 {today.lowC}° ~ {today.highC}°
            </span>
          )}
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {forecast.slice(0, 7).map((d) => (
            <div className="space-y-1" key={d.date}>
              <div className="text-muted-foreground text-xs">
                {d.week.replace("星期", "周")}
              </div>
              <div className="text-sm">{iconFor(d.dayCondition)}</div>
              <div className="text-xs">
                <span className="font-medium">{d.highC}°</span>
                <span className="text-muted-foreground">/{d.lowC}°</span>
              </div>
            </div>
          ))}
        </div>

        <p className="text-muted-foreground text-right text-xs">
          更新于 {current.updatedAt.slice(11, 16)}
        </p>
      </CardContent>
    </Card>
  );
}

export function WeatherCardSkeleton() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="pb-2">
        <Skeleton className="h-8 w-40" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-5 w-56" />
        <Skeleton className="h-14 w-full" />
      </CardContent>
    </Card>
  );
}

function iconFor(condition: string): string {
  if (condition.includes("雷")) return "⛈️";
  if (condition.includes("雨")) return condition.includes("小") ? "🌦️" : "🌧️";
  if (condition.includes("雪")) return "🌨️";
  if (condition.includes("雾") || condition.includes("霾")) return "🌫️";
  if (condition.includes("阴")) return "☁️";
  if (condition.includes("云")) return "⛅";
  return "☀️";
}
