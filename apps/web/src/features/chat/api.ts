import type { MessageListResponse } from "@wow/shared";
import axios from "axios";

import { api } from "#/lib/axios";

/** 会话消息全量拉取（正序，直接作为 useChat 的 initialMessages）；404（如会话已在他处被删）兜底视为空 */
export async function fetchThreadMessages(
  threadId: string,
): Promise<MessageListResponse> {
  try {
    return await api.get<unknown, MessageListResponse>(
      `/api/threads/${threadId}/messages`,
    );
  } catch (e) {
    if (axios.isAxiosError(e) && e.response?.status === 404) {
      return { data: [] };
    }
    throw e;
  }
}
