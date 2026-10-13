# Chat 业务 API 契约

> 左侧会话目录 + 右侧对话的 chatbot 结构。本文档是前后端共同遵守的契约：DTO 定义在 `@wow/shared`（`packages/shared/src/dto/chat.ts`），存储 schema 在 `@wow/db`（`chat_thread` / `chat_message`），实现于 `apps/api`。

## 设计决策（为什么这么做）

| 决策 | 理由 |
|---|---|
| 自建 drizzle 业务表存会话/消息，不用 Mastra Memory 持久化 | Mastra `listThreads` 只支持 page/perPage 偏移分页（无 cursor，并发插入下翻页会重复行）；本地开发时 Mastra 走独立 LibSQL 文件（`memory.db`）与业务库（pglite）分裂；消息格式是 Mastra v2 需转换回 UIMessage。自建表后：keyset cursor 滚动加载、与 better-auth 同库同事务、parts 原生存 UIMessage（前端零转换）。`wowAgent` 已移除 `memory` 挂载，历史由 chat 端点组装传入（`memory.ts` 保留备用）。 |
| threadId 由前端生成（UUID），延迟创建 | 「新建对话」仅前端切状态，首条消息 POST 时服务端 upsert 会话。列表永远不出现空会话，也避免了「先建再传 id」的竞态。`POST /api/threads` 仍保留给需要预建的场景。 |
| 标题：首条消息落库时截断命名 | AI SDK 的 SSE 协议没有 title 语义事件（最接近的通道是 `message-metadata`，但业界标准做法是流外处理）。服务端在首条 user 消息入库的同一事务里用其纯文本前 20 字符生成标题，零成本零延迟。将来升级 LLM 起名只改服务端，契约不变。 |
| 会话内消息全量返回（无分页） | 单会话消息量与聊天上下文同量级（模型窗口也就 40 条），分页收益低、状态复杂。模型上下文窗口（40 条）是服务端内部裁剪，不影响 API 返回。 |
| 非本人与不存在统一 404 | 防止会话 id 枚举探测。 |

## 数据结构

**消息 = UIMessage（AI SDK v7）**，存储与传输同构：

```ts
interface UIMessage {
  id: string;                          // 前端生成（crypto.randomUUID()）
  role: "user" | "assistant" | "system";
  metadata?: Record<string, unknown>;  // model、usage 等（assistant 落库时保存）
  parts: UIMessagePart[];              // text / tool-xxx / reasoning / file / data-*
}
```

存储表（`packages/db/src/schema.ts`，migration `0001`）：

- `chat_thread`：id（前端 UUID）、userId（FK user，级联删）、title、lastMessageAt（列表排序与 cursor 锚点）、createdAt/updatedAt。索引 `(userId, lastMessageAt DESC, id DESC)`。
- `chat_message`：id（= UIMessage.id）、threadId（FK，级联删）、role、parts（JSONB，UIMessage parts 原样）、metadata（JSONB）、createdAt。索引 `(threadId, createdAt DESC, id DESC)`。

## API 总览

全部要求登录（现有 better-auth 中间件，未登录 401）。所有权校验失败或资源不存在统一 404。zod 校验失败 400（`{ error: "invalid_request", details }`）。

### 会话列表（滚动加载）

```
GET /api/threads?limit=20&cursor=<nextCursor>
```

- `limit`：1–50，默认 20
- `cursor`：首屏不传；后续传上一页返回的 `nextCursor`
- **两段式响应**：`pinned` 为置顶段（`pinnedAt DESC` 全量返回，服务端上限 50），`items` 为普通段（排除置顶后按 `(lastMessageAt, id)` 复合游标 keyset 分页，DESC，并发插入不重不漏）。置顶段随每页重复返回，前端取首页即可
- 响应：

```json
{
  "pinned": [
    { "id": "uuid", "title": "上海天气怎么样", "pinnedAt": "ISO 或 null", "createdAt": "ISO", "lastMessageAt": "ISO", "updatedAt": "ISO" }
  ],
  "items": [ ... ],
  "nextCursor": "2026-10-13T16:00:00.000Z|uuid 或 null"
}
```

- 前端消费：`useInfiniteQuery`，`getNextPageParam: (last) => last.nextCursor`

### 会话增删改

```
POST   /api/threads        body { "title"?: string /* 1–80 字 */ }            → 201 ThreadSummary
PATCH  /api/threads/:id    body { "title"?, "pinned"? }（至少一项）           → 200 ThreadSummary
DELETE /api/threads/:id                                                      → 204（消息级联删除）
```

- `PATCH` 语义：`title` 重命名；`pinned: true` 置顶（写当前时间为 `pinnedAt`，置顶区按此排序——最近置顶的在前），`pinned: false` 取消置顶（`pinnedAt` 置 null）

### 会话消息

```
GET /api/threads/:id/messages → { "data": ThreadMessage[] }
```

- **全量正序返回**（无分页）。`ThreadMessage = UIMessage + createdAt`。
- 会话不存在/非本人 → 404。

```
POST /api/threads/:id/messages   （发消息，SSE 流式响应）
```

- body（只发最新一条，历史服务端组装）：

```json
{
  "message": {
    "id": "前端生成的 UUID",
    "role": "user",
    "parts": [{ "type": "text", "text": "上海天气怎么样" }]
  }
}
```

- 服务端流程：存 user 消息（延迟创建会话 + 首条截断命名 + 更新 lastMessageAt，同一事务）→ 读最近 40 条组装上下文 → `wowAgent.stream` → UI message stream 返回。
- 响应：`text/event-stream`（`x-vercel-ai-ui-message-stream: v1`），事件序列即 AI SDK 标准（`start` / `text-delta` / `tool-input-available` / `tool-output-available` / `finish` 等，详见 `docs/generative-ui.md`）。
- assistant 消息在流 `onFinish` 后落库；落库失败只记服务端日志（流已结束，不影响客户端）。
- 前端消费：`useChat` + `DefaultChatTransport`，`prepareSendMessagesRequest` 只带最新一条。

## 前端接入清单（下轮）

- `features/threads`：`api.ts`（列表/CRUD）、`query-keys.ts`、`hooks/`（useInfiniteQuery + mutations，删除后失效列表缓存）
- `features/chat`：`useChat` transport 指向 `POST /api/threads/:id/messages`；历史初始消息来自 `GET /:id/messages` 塞进 `initialMessages`
- `lib/axios.ts` baseURL 已有；注意 SSE 端点走 `DefaultChatTransport`（fetch），不过 axios

## 验证记录

- typecheck / biome 全绿；migration `0001` 已对本地 pglite 执行
- curl 冒烟（全部通过）：
  - CRUD：空列表 → 预建（201）→ 重命名 → 伪造 id 404 → 非法 limit 400
  - keyset 分页：26 会话，limit=10 翻页 `[10,10,6]`，与 limit=7 交叉验证集合一致（不重不漏），排序单调非增
  - SSE 发消息（真实模型调用）：标准 UI message stream 事件序列（`start` → `text-delta`…）
  - 延迟创建：前端生成 threadId 首跳成功 upsert；标题自动截断为「用一句话解释什么是SSE流式传输」
  - 落库回读：user + assistant 双消息正序返回
  - 防枚举：跨用户读/写他人会话均 404
  - 多轮上下文：第二跳模型准确复述第一跳问题（历史组装生效）

## 已知约束（本地开发）

- **PGLite 是单进程嵌入式库**：本地（未设 DATABASE_URL）时整个应用共享 `packages/db/.data/pg` 数据目录，但**同一时刻只能有一个进程打开**（api 与 mastra dev 不能同时跑、不能用脚本进程直接写库造数）。冒烟造数请走 API 本身；设 DATABASE_URL 走 postgres 后无此限制。
- `apps/api` 现在进程内实例化 `@wow/agent`，其 env（OPENAI/TAVILY）由 `apps/api/.env.local` 提供（dev 脚本 `tsx --env-file-if-exists` 加载）。
