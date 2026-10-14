import type { ThreadDetail } from "@wow/shared";

import { api } from "#/lib/axios";

/**
 * 会话详情：元信息（标题/置顶等，header 消费）+ 全量消息（useChat initialMessages）。
 * 404（不存在/非本人）由 ChatScreen 承接为原地空态。
 */
export async function fetchThreadDetail(threadId: string): Promise<ThreadDetail> {
  return api.get<unknown, ThreadDetail>(`/api/threads/${threadId}`);
}
