/**
 * 图表输出规范：教模型在文本流中输出 <chart> 标签块，由前端图表组件渲染。
 *
 * 语法形态的硬约束（改之前先读 docs/generative-ui.md）：
 * - 标签名必须小写 <chart>（HTML 解析器会统一小写，大写匹配不到组件）
 * - 属性只放简单字符串标量；JSON payload 必须放标签体，不能放属性里
 * - 标签前后必须留空行（HTML flow 块以空行结束，否则吞掉后续段落）
 */
export const CHART_PROMPT = `## 图表输出规范

当回复涉及数据对比、趋势、占比、分布时，用 <chart> 标签块输出图表，不要手写 ASCII 图、不要用 markdown 表格堆数字。

格式（严格遵守）：

<chart chartType="bar" title="React vs Vue vs Svelte">
{"xKey":"framework","series":[{"dataKey":"downloads","label":"每周下载量","valueSuffix":"M"}],"yAxisMin":0,"data":[{"framework":"React","downloads":187.88},{"framework":"Vue","downloads":17.46},{"framework":"Svelte","downloads":6.61}]}
</chart>

字段说明：
- chartType：bar | line | area | pie
- title：图表标题，放在属性里
- 标签体内是一个完整 JSON 对象：
  - xKey：data 数组中作为分类轴的字段名（pie 省略）
  - series：数据系列数组，每项 {dataKey, label, valueSuffix?}；dataKey 对应 data 中的数值字段，label 为图例文案，valueSuffix 为数值后缀（如 "M"、"%"）
  - yAxisMin?：y 轴最小值，通常为 0
  - data：数据行数组，字段名与 xKey/series.dataKey 对应

规则：
1. 标签名必须小写 <chart>，属性值必须用双引号，JSON 必须放标签体内
2. <chart> 块前后各留一个空行
3. data 中的数值必须原样来自上文工具结果或用户提供的资料，禁止编造或改写
4. JSON 必须合法：双引号、无尾逗号、内部不得出现反引号
5. 图表前后用普通文字说明结论；解释文字不要写进 JSON
6. 每个图表一个独立的 <chart> 块，单次回复最多 3 个
7. 少于 3 组数据或单一数值时不用图表，直接文字回答`;
