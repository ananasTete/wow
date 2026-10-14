import {
  createThreadRequestSchema,
  threadListQuerySchema,
  threadSearchQuerySchema,
  updateThreadRequestSchema,
} from "@wow/shared";
import { Hono } from "hono";
import { z } from "zod";

import type { Session } from "../auth";
import {
  createThread,
  deleteThread,
  getThreadDetail,
  listThreads,
  searchThreads,
  ThreadNotFoundError,
  updateThread,
} from "../lib/chat-store";

/**
 * 会话列表 CRUD：/api/threads
 * GET    /            列表（置顶段全量 + 普通段 keyset cursor 分页）
 * GET    /search      全局搜索（标题 + 消息正文关键字）
 * GET    /:id         会话详情（元信息 + 全量消息正序）
 * POST   /            预建会话（延迟创建模式下前端通常不调）
 * PATCH  /:id         重命名 / 置顶 / 取消置顶
 * DELETE /:id         删除（消息级联）
 */
export const threadsRoutes = new Hono<{ Variables: { session: Session } }>();

threadsRoutes.get("/", async (c) => {
  const query = threadListQuerySchema.safeParse(c.req.query());
  if (!query.success) {
    return c.json(
      {
        code: "INVALID_REQUEST",
        message: "请求参数错误",
        details: z.treeifyError(query.error),
      },
      400,
    );
  }
  const { user } = c.get("session");
  const result = await listThreads({ userId: user.id, ...query.data });
  return c.json(result);
});

threadsRoutes.get("/search", async (c) => {
  const query = threadSearchQuerySchema.safeParse(c.req.query());
  if (!query.success) {
    return c.json(
      {
        code: "INVALID_REQUEST",
        message: "请求参数错误",
        details: z.treeifyError(query.error),
      },
      400,
    );
  }
  const { user } = c.get("session");
  const result = await searchThreads({
    userId: user.id,
    q: query.data.q,
    limit: query.data.limit,
  });
  return c.json(result);
});

// 注意注册顺序：/:id 会吞掉单段路径，必须排在 /search 之后
threadsRoutes.get("/:id", async (c) => {
  const { user } = c.get("session");
  try {
    const detail = await getThreadDetail(c.req.param("id"), user.id);
    return c.json(detail);
  } catch (e) {
    if (e instanceof ThreadNotFoundError)
      return c.json({ code: "NOT_FOUND", message: "会话不存在或无权访问" }, 404);
    throw e;
  }
});

threadsRoutes.post("/", async (c) => {
  const body = createThreadRequestSchema.safeParse(await c.req.json().catch(() => null));
  if (!body.success) {
    return c.json(
      {
        code: "INVALID_REQUEST",
        message: "请求参数错误",
        details: z.treeifyError(body.error),
      },
      400,
    );
  }
  const { user } = c.get("session");
  const thread = await createThread({ userId: user.id, title: body.data.title });
  return c.json(thread, 201);
});

threadsRoutes.patch("/:id", async (c) => {
  const body = updateThreadRequestSchema.safeParse(await c.req.json().catch(() => null));
  if (!body.success) {
    return c.json(
      {
        code: "INVALID_REQUEST",
        message: "请求参数错误",
        details: z.treeifyError(body.error),
      },
      400,
    );
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
    if (e instanceof ThreadNotFoundError)
      return c.json({ code: "NOT_FOUND", message: "会话不存在或无权访问" }, 404);
    throw e;
  }
});

threadsRoutes.delete("/:id", async (c) => {
  const { user } = c.get("session");
  try {
    await deleteThread({ threadId: c.req.param("id"), userId: user.id });
    return c.body(null, 204);
  } catch (e) {
    if (e instanceof ThreadNotFoundError)
      return c.json({ code: "NOT_FOUND", message: "会话不存在或无权访问" }, 404);
    throw e;
  }
});
