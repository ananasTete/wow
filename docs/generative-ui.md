# 生成式 UI 方案（非 markdown 部分）

> 本文档定义 agent 回复中「超出普通 markdown」的 UI 呈现方案：已知场景的结构化卡片（方案 A）与图表（方案 B），并记录语法选型的依据——为什么不用 ChatGPT 的 `content={{...}}` 属性式 DSL。

## 全景：两条通道

Agent 的流式回复走 AI SDK UI message stream（SSE），前端 `useChat` 组装成 `UIMessage`。非 markdown 内容只有两条合法通道：

| 通道 | 协议事件 | 前端渲染 | 适用 |
|---|---|---|---|
| **tool part** | `tool-input-start → tool-input-available → tool-output-available` | 按 `part.type === "tool-<注册名>"` 映射专属组件 | 结构固定的已知场景（方案 A） |
| **text part** | `text-start → text-delta → text-end` | markdown 渲染器 + 自定义标签/围栏块 | 自由排版与图表（方案 B） |

两条通道都不需要改任何传输协议。

## 方案 A：已知场景 → 专属 tool + 前端专属组件

**已落地示例：天气。**

服务端（`packages/agent/src/tools/weather.ts`，数据源为免费魅族天气聚合接口）：

- `inputSchema`：`{ city }`，模型负责填参数；
- `outputSchema`：完整声明返回结构（`current` / `forecast` / `airQuality` / `tips`），**前端组件的 props 就是这个 schema**，类型全链路打通；
- 城市名 → 中国天气网城市码的映射内置在 tool 里，模型只管传中文城市名。

前端消费（示意）：

```tsx
// part.type 即 tool 注册名："tool-getWeather"
if (part.type === "tool-getWeather") {
  switch (part.state) {
    case "input-streaming":
    case "input-available":
      return <WeatherSkeleton />;            // 服务端执行中
    case "output-available":
      return <WeatherCard data={part.output} />; // schema 即 props
    case "output-error":
      return <InlineError text={part.errorText} />;
  }
}
```

**适用判断**：UI 结构能枚举（卡片、列表、详情面板）、字段能 schema 化的场景，一律走这条。新增一个场景 = 新增一个 tool + 一个组件 + 渲染分发表加一行。

## 方案 B：图表 → `<chart>` 标签块 + 通用图表组件

图表不适合方案 A：图表的「数据形状」是开放的（任意 xKey/series/行数），为每种图建 tool 会爆炸。所以图表走 text part 内嵌 DSL，由模型按内置提示词（`packages/agent/src/prompts/chart.ts`，已拼入 wowAgent instructions）输出：

````markdown
结论如下：

<chart chartType="bar" title="React vs Vue vs Svelte">
{"xKey":"framework","series":[{"dataKey":"downloads","label":"每周下载量","valueSuffix":"M"}],"yAxisMin":0,"data":[{"framework":"React","downloads":187.88},{"framework":"Vue","downloads":17.46},{"framework":"Svelte","downloads":6.61}]}
</chart>

数据来源：npm 周下载量，检索于 2026-10-13。
````

前端用 streamdown 的内建自定义标签通道渲染，`ChartRenderer` 内部做流式容错（JSON 半截 → 骨架屏，完整 → recharts 出图）：

```tsx
<Streamdown
  allowedTags={{ chart: ["chartType", "title"] }}
  components={{
    chart: ({ node, children }) => (
      <ChartRenderer attrs={node.properties} rawJson={String(children)} />
    ),
  }}
>
  {part.text}
</Streamdown>

function ChartRenderer({ attrs, rawJson }) {
  const spec = tolerantParse(rawJson); // 流式半截 JSON → null
  if (!spec) return <ChartSkeleton title={attrs?.title} />;
  return <RechartsChart {...spec} />; // chartType → Bar/Line/Area/Pie 分发
}
```

### 为什么是这个格式：三条实验证据

用本仓库同源解析器栈（`remark-parse@11`，streamdown/react-markdown 底层）实测四种写法：

| 写法 | remark 解析结果 | 组件钩子 |
|---|---|---|
| ChatGPT 原版 `content={{...}}` | **纯文本节点** | 永远不触发 |
| 属性式 `content='{...}'`（单引号） | `html` 节点 | 触发 |
| **块级：简单属性 + JSON 在标签体** | `html` 节点（整体） | **触发** |
| 块级·流式中途截断 | **仍是一个完整 `html` 节点**，内容持续增长 | 触发 |

由此得出格式的三条硬约束（已写进 `chart.ts` 提示词）：

1. **JSON 放标签体，不放属性**——属性只留简单字符串标量（`chartType`、`title`）。这是流式安全的核心：HTML flow 块的特性是标签一旦在行首开始，后续行全部吞进同一个节点，所以流式期间组件拿到的 `children` 是逐 delta 增长的字符串，增量渲染（骨架 → 完整图表）在组件内自然实现，**不需要预提取、缓冲或自建 tokenizer**。
2. **标签名小写**——HTML 解析器统一小写标签名，`<Chart>` 会被规范化成 `chart`，components 的 key 必须是 `chart` 才匹配得到，提示词直接教小写省掉一层心智。
3. **标签前后留空行**——HTML flow 块以空行结束，紧贴下一段会把后续文本吞进图表节点。

### 为什么不用 ChatGPT 的模式

ChatGPT 在回复中输出的是这样的语法（真实片段截取）：

```
<box border radius="lg" gap={0}>
  <row align=start padding={3} gap={3}>
    <box background="surface-secondary" radius="md" size="44px" align=center justify=center>
      <icon name="list-checks" size="xl"/>
    </box>
    <box flex="1" gap={1">
      **1. 选择与判断**
      <text color="secondary" size="sm">约 821 行 × 16 列</text>
    </box>
  </row>
  <divider color="subtle"/>
</row>
```

图表则是属性里塞 JSX 花括号 JSON（真实片段截取）：

```
<Chart content={{"chartType":"bar","meta":{"title":"React vs Vue vs Svelte","description":"同一数据来源展示的近期每周 npm 下载量…"},"xKey":"framework","series":[{"dataKey":"downloads","label":"每周下载量","valueSuffix":"M","valueFormat":"compact"}],"yAxisMin":0,"data":[{"framework":"React","downloads":187.88},…]}}/>
```

不采用的原因：

1. **不是标准语法，标准解析器直接放弃**。`content={{...}}` 是 JSX 属性表达式——裸花括号、属性值内嵌套双引号，既不是合法 HTML 也不是合法 markdown。实测（上表第一行）：remark 把它降级为**普通文本节点**，任何组件钩子（`components` / `fallbackComponent` / `allowedTags`）都不会触发，用户看到的是一串原始标签文字。OpenAI 能这么用，是因为他们前端跑的是**私有解析管线**且模型针对这套 DSL 做过训练——两者我们都无法复用。
2. **对模型的可靠性赌注太大**。嵌套属性语法（引号套引号）远比「标签体里放一个纯 JSON」容易写错；我们没有 RL 训练兜底，只能靠提示词约束，因此语法越简单、越接近 JSON 越稳。
3. **流式表现不可控**。属性式单行标签在流式传输中，闭合前的半截内容无法被结构化消费；而块级形态在截断状态下已是完整 `html` 节点（上表第四行），天然支持骨架屏过渡。

一句话对比：**ChatGPT 的 DSL 是「为自家解析器和自家模型定制的私有协议」；我们把它改写成「标准 HTML 标签 + 标签体 JSON」，语法表达力等价，但每一层都落在标准解析器和 streamdown 的承诺范围内。**

## 已落地内容

| 文件 | 内容 |
|---|---|
| `packages/agent/src/tools/weather.ts` | 方案 A 示例：天气 tool（outputSchema + 魅族免费天气接口 + 城市码映射） |
| `packages/agent/src/prompts/chart.ts` | 方案 B 的内置提示词：`<chart>` 语法规范与使用规则 |
| `packages/agent/src/agents/wow.ts` | 注册 `getWeather`，instructions 拼入天气路由规则与图表规范 |

验证方式：`pnpm agent` 起 Mastra Studio（localhost:4111）直接对话——问天气触发 tool（Studio 里看 JSON 输出），问「用图表对比 X 和 Y」检查模型输出的 `<chart>` 块语法合规性（Studio 里显示为原始标签文本，正好用来肉眼校验 JSON）。

## 后续（前端侧，未落地）

- `apps/web`：接入 `@mastra/ai-sdk` + `useChat`，渲染层实现 `WeatherCard` 与 `ChartRenderer`（recharts 封装）；
- 流式 spike：确认 streamdown 对未闭合 `<chart>` 的渲染时机（remark 层已验证节点存在），兜底方案是把语法换成 ```chart 围栏块，渲染层不用改。
