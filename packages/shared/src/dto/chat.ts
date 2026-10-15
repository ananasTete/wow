import { z } from "zod";

/**
 * Chat 业务 DTO：前后端共享的请求/响应契约。
 * 存储侧见 @wow/db schema（chat_thread / chat_message），协议文档见 docs/chat-api.md。
 */

/** UIMessage part：宽松校验（具体形状由 ai 包类型约束，传输层只保证结构） */
export const uiPartSchema = z.looseObject({
  type: z.string(),
});

/** 会话列表项（不含消息内容） */
export const threadSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  /** 置顶时间（置顶段排序键），null = 未置顶 */
  pinnedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ThreadSummary = z.infer<typeof threadSummarySchema>;

/** 会话列表响应：置顶段（全量）+ 普通段（keyset 分页） */
export const threadListResponseSchema = z.object({
  pinned: z.array(threadSummarySchema),
  items: z.array(threadSummarySchema),
  nextCursor: z.string().nullable(),
});
export type ThreadListResponse = z.infer<typeof threadListResponseSchema>;

/** 列表查询参数 */
export const threadListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  /** 复合游标 "<updatedAtISO>|<id>"，来自上一页 nextCursor（updatedAt 为普通段排序键） */
  cursor: z.string().optional(),
});

/** 创建会话请求 */
export const createThreadRequestSchema = z.object({
  title: z.string().min(1).max(80).optional(),
});

/** 更新会话请求：重命名 / 置顶 / 取消置顶（至少一项） */
export const updateThreadRequestSchema = z
  .object({
    title: z.string().min(1).max(80).optional(),
    pinned: z.boolean().optional(),
  })
  .refine((v) => v.title !== undefined || v.pinned !== undefined, {
    message: "至少提供 title 或 pinned 之一",
  });

/** 全局搜索查询参数：q 为标题/正文共用关键字 */
export const threadSearchQuerySchema = z.object({
  q: z.string().trim().min(1).max(100),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

/** 搜索结果项：snippet 为命中消息正文的关键词上下文截取（仅标题命中时为首条消息开头，可为空串） */
export const threadSearchItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  snippet: z.string(),
});
export type ThreadSearchItem = z.infer<typeof threadSearchItemSchema>;

/** 搜索响应：按 updatedAt DESC（与列表排序一致），标题与正文命中按会话去重 */
export const threadSearchResponseSchema = z.object({
  items: z.array(threadSearchItemSchema),
});
export type ThreadSearchResponse = z.infer<typeof threadSearchResponseSchema>;

/** 历史消息（= UIMessage + createdAt） */
export const threadMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant", "system"]),
  parts: z.array(uiPartSchema),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  createdAt: z.string(),
});
export type ThreadMessage = z.infer<typeof threadMessageSchema>;

/** 会话详情（详情页聚合：会话元信息 + 全量消息正序，无分页） */
export const threadDetailSchema = threadSummarySchema.extend({
  messages: z.array(threadMessageSchema),
});
export type ThreadDetail = z.infer<typeof threadDetailSchema>;

/** 发消息请求：只发最新一条 UIMessage，历史由服务端组装 */
export const sendMessageRequestSchema = z.object({
  message: z.object({
    id: z.string().min(1),
    role: z.literal("user"),
    parts: z.array(uiPartSchema).min(1),
  }),
});
export type SendMessageRequest = z.infer<typeof sendMessageRequestSchema>;
