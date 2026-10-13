import { createTool } from "@mastra/core/tools";
import { z } from "zod";

/**
 * 天气查询：魅族天气聚合接口（免费、无需 key）。
 * 文档收录页：https://www.free-api.com/doc/518
 * 接口只认中国天气网城市码（cityIds=101xxxxxx），城市名映射表内置于此。
 */
const WEATHER_API = "http://aider.meizu.com/app/weather/listWeather";

/** 常用城市 → 中国天气网城市码（接口仅支持码表查询，不支持城市名） */
const CITY_IDS: Record<string, string> = {
  北京: "101010100",
  上海: "101020100",
  天津: "101030100",
  重庆: "101040100",
  哈尔滨: "101050101",
  长春: "101060101",
  沈阳: "101070101",
  大连: "101070201",
  呼和浩特: "101080101",
  石家庄: "101090101",
  太原: "101100101",
  乌鲁木齐: "101130101",
  拉萨: "101140101",
  西宁: "101150101",
  兰州: "101160101",
  银川: "101170101",
  郑州: "101180101",
  南京: "101190101",
  无锡: "101190201",
  苏州: "101190401",
  合肥: "101220101",
  杭州: "101210101",
  宁波: "101210401",
  福州: "101230101",
  厦门: "101230201",
  南昌: "101240101",
  长沙: "101250101",
  贵阳: "101260101",
  成都: "101270101",
  广州: "101280101",
  佛山: "101280800",
  东莞: "101281601",
  南宁: "101300101",
  海口: "101310101",
  三亚: "101310201",
  济南: "101120101",
  青岛: "101120201",
};

/** 接口原始返回（只声明用到的字段，全部是字符串） */
interface MeizuWeather {
  code: string;
  message?: string;
  value: {
    city: string;
    provinceName: string;
    realtime: {
      temp: string;
      sendibleTemp: string;
      weather: string;
      wD: string;
      wS: string;
      time: string;
    };
    weathers: {
      date: string;
      week: string;
      weather: string;
      nightWeather: string;
      temp_day_c: string;
      temp_night_c: string;
    }[];
    pm25: { aqi: string; quality: string; pm25: string; pm10: string };
    indexes: { name: string; level: string; content: string }[];
  }[];
}

export const weatherTool = createTool({
  id: "get-weather",
  description:
    "查询指定城市的实时天气与未来 7 天预报。用户问天气、气温、穿衣建议、空气质量时使用。" +
    "仅支持中国主要城市；输入城市中文名（如：上海）。",
  inputSchema: z.object({
    city: z.string().describe("城市中文名，如：上海、北京"),
  }),
  outputSchema: z.object({
    city: z.string().describe("城市名"),
    province: z.string().describe("省份"),
    current: z.object({
      temperature: z.number().describe("当前气温（°C）"),
      feelsLike: z.number().describe("体感温度（°C）"),
      condition: z.string().describe("天气状况，如：晴"),
      windDirection: z.string().describe("风向"),
      windScale: z.string().describe("风力，如：3级"),
      updatedAt: z.string().describe("数据更新时间"),
    }),
    forecast: z
      .array(
        z.object({
          date: z.string().describe("日期 YYYY-MM-DD"),
          week: z.string().describe("星期"),
          dayCondition: z.string().describe("白天天气"),
          nightCondition: z.string().describe("夜间天气"),
          highC: z.number().describe("最高温（°C）"),
          lowC: z.number().describe("最低温（°C）"),
        }),
      )
      .describe("未来 7 天预报"),
    airQuality: z.object({
      aqi: z.number().describe("AQI 指数"),
      quality: z.string().describe("空气质量等级，如：良"),
      pm25: z.number().describe("PM2.5"),
      pm10: z.number().describe("PM10"),
    }),
    tips: z
      .array(
        z.object({
          name: z.string().describe("指数名，如：穿衣指数"),
          level: z.string().describe("等级，如：短袖"),
          content: z.string().describe("建议正文"),
        }),
      )
      .describe("生活指数（穿衣、感冒、运动等）"),
  }),
  execute: async ({ city }) => {
    // 接口只认城市码：去掉常见行政后缀后查表
    const normalized = city.replace(/[市区县]$/, "");
    const cityId = CITY_IDS[normalized] ?? CITY_IDS[city];
    if (!cityId) {
      throw new Error(
        `不支持的城市「${city}」，目前仅支持：${Object.keys(CITY_IDS).join("、")}`,
      );
    }

    const res = await fetch(`${WEATHER_API}?cityIds=${cityId}`);
    if (!res.ok) {
      throw new Error(`weather api failed: ${res.status}`);
    }
    const data = (await res.json()) as MeizuWeather;
    if (data.code !== "200" || !data.value?.[0]) {
      throw new Error(`weather api error: ${data.message || data.code}`);
    }
    const v = data.value[0];

    return {
      city: v.city,
      province: v.provinceName,
      current: {
        temperature: Number(v.realtime.temp),
        feelsLike: Number(v.realtime.sendibleTemp),
        condition: v.realtime.weather,
        windDirection: v.realtime.wD,
        windScale: v.realtime.wS,
        updatedAt: v.realtime.time,
      },
      forecast: v.weathers.map((w) => ({
        date: w.date,
        week: w.week,
        dayCondition: w.weather,
        nightCondition: w.nightWeather,
        highC: Number(w.temp_day_c),
        lowC: Number(w.temp_night_c),
      })),
      airQuality: {
        aqi: Number(v.pm25.aqi),
        quality: v.pm25.quality,
        pm25: Number(v.pm25.pm25),
        pm10: Number(v.pm25.pm10),
      },
      tips: v.indexes
        .filter((i) => i.content)
        .map((i) => ({ name: i.name, level: i.level, content: i.content })),
    };
  },
});
