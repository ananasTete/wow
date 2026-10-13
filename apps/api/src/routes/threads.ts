import {
  createThreadRequestSchema,
  threadListQuerySchema,
  updateThreadRequestSchema,
} from "@wow/shared";
import { Hono } from "hono";
import { z } from "zod";

import type { Session } from "../auth";
import {
  createThread,
  deleteThread,
  listThreads,
  ThreadNotFoundError,
  updateThread,
} from "../lib/chat-store";

/**
 * 会话列表 CRUD：/api/threads
 * GET    /            列表（置顶段全量 + 普通段 keyset cursor 分页）
 * POST   /            预建会话（延迟创建模式下前端通常不调）
 * PATCH  /:id         重命名 / 置顶 / 取消置顶
 * DELETE /:id         删除（消息级联）
 */
export const threadsRoutes = new Hono<{ Variables: { session: Session } }>();

threadsRoutes.get("/", async (c) => {
  const query = threadListQuerySchema.safeParse(c.req.query());
  if (!query.success) {
    return c.json(
      { error: "invalid_request", details: z.treeifyError(query.error) },
      400,
    );
  }
  const { user } = c.get("session");
  const result = await listThreads({ userId: user.id, ...query.data });
  return c.json(result);
});

threadsRoutes.post("/", async (c) => {
  const body = createThreadRequestSchema.safeParse(await c.req.json().catch(() => null));
  if (!body.success) {
    return c.json({ error: "invalid_request", details: z.treeifyError(body.error) }, 400);
  }
  const { user } = c.get("session");
  const thread = await createThread({ userId: user.id, title: body.data.title });
  return c.json(thread, 201);
});

threadsRoutes.patch("/:id", async (c) => {
  const body = updateThreadRequestSchema.safeParse(await c.req.json().catch(() => null));
  if (!body.success) {
    return c.json({ error: "invalid_request", details: z.treeifyError(body.error) }, 400);
  }
  const { user } = c.get("session");
  try {
    const thread = await updateThread({
      threadId: c.req.param("id"),
      userId: user.id,
      title: body.data.title,
      pinned: body.data.pinned,
    });
    return c.json(thread);
  } catch (e) {
    if (e instanceof ThreadNotFoundError) return c.json({ error: "not_found" }, 404);
    throw e;
  }
});

threadsRoutes.delete("/:id", async (c) => {
  const { user } = c.get("session");
  try {
    await deleteThread({ threadId: c.req.param("id"), userId: user.id });
    return c.body(null, 204);
  } catch (e) {
    if (e instanceof ThreadNotFoundError) return c.json({ error: "not_found" }, 404);
    throw e;
  }
});
