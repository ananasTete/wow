import { handleChatStream } from "@mastra/ai-sdk";
import { mastra } from "@wow/agent";
import { sendMessageRequestSchema } from "@wow/shared";
import type { UIMessage } from "ai";
import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { Hono } from "hono";
import { z } from "zod";

import type { Session } from "../auth";
import {
  appendAssistantMessage,
  appendUserMessage,
  listMessages,
  recentUiMessages,
  ThreadNotFoundError,
} from "../lib/chat-store";

/**
 * 会话消息：挂载于 /api/threads
 * GET  /:id/messages  全量拉取该会话消息（正序，无分页）
 * POST /:id/messages  发消息：存 user 消息 → 组装历史 → agent 流式 → SSE → onFinish 落库
 */
export const chatRoutes = new Hono<{ Variables: { session: Session } }>();

chatRoutes.get("/:id/messages", async (c) => {
  const { user } = c.get("session");
  try {
    const data = await listMessages(c.req.param("id"), user.id);
    return c.json({ data });
  } catch (e) {
    if (e instanceof ThreadNotFoundError) return c.json({ error: "not_found" }, 404);
    throw e;
  }
});

chatRoutes.post("/:id/messages", async (c) => {
  const body = sendMessageRequestSchema.safeParse(await c.req.json().catch(() => null));
  if (!body.success) {
    return c.json({ error: "invalid_request", details: z.treeifyError(body.error) }, 400);
  }
  const { user } = c.get("session");
  const threadId = c.req.param("id");

  // 存 user 消息（延迟创建落地点：会话不存在则建，非本人则 404）
  try {
    await appendUserMessage({
      threadId,
      userId: user.id,
      message: body.data.message,
    });
  } catch (e) {
    if (e instanceof ThreadNotFoundError) return c.json({ error: "not_found" }, 404);
    throw e;
  }

  // 组装历史（含刚写入的 user 消息）交给 agent；40 条为模型上下文窗口，非 API 分页
  const history = (await recentUiMessages(threadId, 40)) as unknown as UIMessage[];

  const agentStream = await handleChatStream({
    mastra,
    agentId: "wowAgent",
    version: "v7",
    params: { messages: history },
  });

  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      writer.merge(agentStream);
    },
    onFinish: async ({ responseMessage }) => {
      // 流已送达客户端，落库失败只记日志（消息丢失可在后续对账/重试中补偿）
      try {
        await appendAssistantMessage({
          threadId,
          message: {
            id: responseMessage.id,
            parts: responseMessage.parts as Array<{ type: string }>,
            metadata: (responseMessage.metadata as Record<string, unknown>) ?? null,
          },
        });
      } catch (e) {
        console.error("[chat] failed to persist assistant message:", e);
      }
    },
  });

  return createUIMessageStreamResponse({ stream });
});
