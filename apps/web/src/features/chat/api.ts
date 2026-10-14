import type { MessageListResponse } from "@wow/shared";

import { api } from "#/lib/axios";

/**
 * 会话消息全量拉取（正序，直接作为 useChat 的 initialMessages）。
 * 404（不存在/非本人）不再吞成空列表：由 /chat/:id 路由守卫统一重定向 + toast。
 */
export async function fetchThreadMessages(
  threadId: string,
): Promise<MessageListResponse> {
  return api.get<unknown, MessageListResponse>(`/api/threads/${threadId}/messages`);
}
