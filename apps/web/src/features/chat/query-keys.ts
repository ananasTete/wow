import { threadKeys } from "#/features/threads/query-keys";

export const chatKeys = {
  messages: (threadId: string) => [...threadKeys.all, "messages", threadId] as const,
};
