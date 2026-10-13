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
  createdAt: z.string(),
  lastMessageAt: z.string(),
  updatedAt: z.string(),
});
export type ThreadSummary = z.infer<typeof threadSummarySchema>;

/** 会话列表响应：keyset 分页，cursor 指向下一页起点 */
export const threadListResponseSchema = z.object({
  items: z.array(threadSummarySchema),
  nextCursor: z.string().nullable(),
});
export type ThreadListResponse = z.infer<typeof threadListResponseSchema>;

/** 列表查询参数 */
export const threadListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  /** 复合游标 "<lastMessageAtISO>|<id>"，来自上一页 nextCursor */
  cursor: z.string().optional(),
});

/** 创建会话请求 */
export const createThreadRequestSchema = z.object({
  title: z.string().min(1).max(80).optional(),
});

/** 重命名请求 */
export const updateThreadRequestSchema = z.object({
  title: z.string().min(1).max(80),
});

/** 历史消息（= UIMessage + createdAt） */
export const threadMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant", "system"]),
  parts: z.array(uiPartSchema),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  createdAt: z.string(),
});
export type ThreadMessage = z.infer<typeof threadMessageSchema>;

/** 会话消息全量响应（正序，无分页） */
export const messageListResponseSchema = z.object({
  data: z.array(threadMessageSchema),
});
export type MessageListResponse = z.infer<typeof messageListResponseSchema>;

/** 发消息请求：只发最新一条 UIMessage，历史由服务端组装 */
export const sendMessageRequestSchema = z.object({
  message: z.object({
    id: z.string().min(1),
    role: z.literal("user"),
    parts: z.array(uiPartSchema).min(1),
  }),
});
export type SendMessageRequest = z.infer<typeof sendMessageRequestSchema>;
