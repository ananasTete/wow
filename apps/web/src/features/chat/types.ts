/**
 * 前端展示层类型：与 packages/agent/src/tools/weather.ts 的 outputSchema 对齐
 * （agent 包是 Node 端依赖，不进浏览器 bundle，此处单独声明）。
 */
export interface WeatherOutput {
  city: string;
  province: string;
  current: {
    temperature: number;
    feelsLike: number;
    condition: string;
    windDirection: string;
    windScale: string;
    updatedAt: string;
  };
  forecast: Array<{
    date: string;
    week: string;
    dayCondition: string;
    nightCondition: string;
    highC: number;
    lowC: number;
  }>;
  airQuality: {
    aqi: number;
    quality: string;
    pm25: number;
    pm10: number;
  };
  tips: Array<{ name: string; level: string; content: string }>;
}

/** <chart> 标签体 JSON 的结构（与 agent 内置提示词规范对齐） */
export interface ChartSpec {
  chartType: "bar" | "line" | "area" | "pie";
  xKey?: string;
  series: Array<{
    dataKey: string;
    label: string;
    valueSuffix?: string;
  }>;
  yAxisMin?: number;
  data: Array<Record<string, string | number>>;
}

/** webSearch 单条结果（与 packages/agent/src/tools/web-search.ts 的 outputSchema 对齐） */
export interface WebSearchResult {
  index: number;
  title: string;
  url: string;
  content: string;
}
