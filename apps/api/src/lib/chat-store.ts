import { schema } from "@wow/db";
import type {
  ThreadDetail,
  ThreadMessage,
  ThreadSearchResponse,
  ThreadSummary,
} from "@wow/shared";
import {
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lt,
  or,
  sql,
} from "drizzle-orm";

import { db } from "../db";

/**
 * 会话/消息存储层：全部 db 访问集中于此，路由只做参数校验与编排。
 * 协议契约见 docs/chat-api.md。
 */

const { chatThread, chatMessage } = schema;

/** 非本人或不存在统一抛此错误，路由层转 404（防枚举） */
export class ThreadNotFoundError extends Error {
  constructor() {
    super("thread not found");
  }
}

type ThreadRow = typeof chatThread.$inferSelect;
type MessageRow = typeof chatMessage.$inferSelect;

const toSummary = (row: ThreadRow): ThreadSummary => ({
  id: row.id,
  title: row.title,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
  pinnedAt: row.pinnedAt ? row.pinnedAt.toISOString() : null,
});

const toMessage = (row: MessageRow): ThreadMessage => ({
  id: row.id,
  role: row.role as ThreadMessage["role"],
  parts: row.parts as ThreadMessage["parts"],
  metadata: (row.metadata as ThreadMessage["metadata"]) ?? null,
  createdAt: row.createdAt.toISOString(),
});

/** 从 UIMessage parts 提取纯文本（首条消息自动命名的来源） */
export function extractText(parts: Array<{ type: string }>): string {
  return parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join(" ")
    .trim();
}

/** 首条消息 → 会话标题：纯文本前 20 字符，超长补省略号 */
export function deriveTitle(parts: Array<{ type: string }>): string {
  const text = extractText(parts).replace(/\s+/g, " ");
  if (!text) return "新对话";
  return text.length <= 20 ? text : `${text.slice(0, 20)}…`;
}

/**
 * 会话列表（两段式）：置顶段（pinnedAt DESC，全量，上限防御）+
 * 普通段（排除置顶，(updatedAt, id) 复合游标 keyset 分页）。
 * cursor 格式 "<updatedAtISO>|<id>"，取 limit+1 判断 hasMore。
 */
export async function listThreads(opts: {
  userId: string;
  limit: number;
  cursor?: string;
}): Promise<{
  pinned: ThreadSummary[];
  items: ThreadSummary[];
  nextCursor: string | null;
}> {
  const { userId, limit, cursor } = opts;

  const pinnedRows = await db
    .select()
    .from(chatThread)
    .where(and(eq(chatThread.userId, userId), isNotNull(chatThread.pinnedAt)))
    .orderBy(desc(chatThread.pinnedAt))
    .limit(50);

  const conditions = [eq(chatThread.userId, userId), isNull(chatThread.pinnedAt)];
  if (cursor) {
    const sep = cursor.lastIndexOf("|");
    const cursorTime = new Date(cursor.slice(0, sep));
    const cursorId = cursor.slice(sep + 1);
    if (Number.isNaN(cursorTime.getTime()) || !cursorId) {
      throw new Error("invalid cursor");
    }
    const keyset = or(
      lt(chatThread.updatedAt, cursorTime),
      and(eq(chatThread.updatedAt, cursorTime), lt(chatThread.id, cursorId)),
    );
    if (keyset) conditions.push(keyset);
  }

  const rows = await db
    .select()
    .from(chatThread)
    .where(and(...conditions))
    .orderBy(desc(chatThread.updatedAt), desc(chatThread.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page.at(-1);

  return {
    pinned: pinnedRows.map(toSummary),
    items: page.map(toSummary),
    nextCursor: hasMore && last ? `${last.updatedAt.toISOString()}|${last.id}` : null,
  };
}

/** ILIKE 通配符转义（PG 默认转义符为反斜杠） */
const escapeLike = (s: string) => s.replace(/[\\%_]/g, "\\$&");

/** 消息任一 text part 命中关键字的条件（参数化绑定，无注入风险） */
const textPartLike = (pattern: string) =>
  sql`EXISTS (SELECT 1 FROM jsonb_array_elements(${chatMessage.parts}) p WHERE p->>'type' = 'text' AND p->>'text' ILIKE ${pattern})`;

/** 搜索摘要：命中位置前 30 字 + 关键词 + 后 90 字，越界补省略号；未命中回退开头 120 字 */
function buildSnippet(text: string, q: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  const idx = normalized.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) {
    return normalized.length <= 120 ? normalized : `${normalized.slice(0, 120)}…`;
  }
  const start = Math.max(0, idx - 30);
  const end = Math.min(normalized.length, idx + q.length + 90);
  return `${start > 0 ? "…" : ""}${normalized.slice(start, end)}${end < normalized.length ? "…" : ""}`;
}

/**
 * 全局搜索：标题 ILIKE 命中，或任一消息 text part 命中（jsonb 展开匹配）。
 * 标题与正文命中按会话去重（单表查询），按 updatedAt DESC 截 limit（与列表排序一致）。
 * snippet 取每个会话最早命中消息的关键词上下文；仅标题命中时回退首条消息开头。
 */
export async function searchThreads(opts: {
  userId: string;
  q: string;
  limit: number;
}): Promise<ThreadSearchResponse> {
  const { userId, q, limit } = opts;
  const pattern = `%${escapeLike(q)}%`;

  const threads = await db
    .select()
    .from(chatThread)
    .where(
      and(
        eq(chatThread.userId, userId),
        or(
          ilike(chatThread.title, pattern),
          sql`EXISTS (SELECT 1 FROM ${chatMessage} WHERE ${chatMessage.threadId} = ${chatThread.id} AND ${textPartLike(pattern)})`,
        ),
      ),
    )
    .orderBy(desc(chatThread.updatedAt), desc(chatThread.id))
    .limit(limit);

  if (threads.length === 0) return { items: [] };
  const threadIds = threads.map((t) => t.id);

  const messageCols = {
    threadId: chatMessage.threadId,
    parts: chatMessage.parts,
    createdAt: chatMessage.createdAt,
    id: chatMessage.id,
  };

  // 每个命中会话的最早命中消息（正文 snippet 来源）
  const matchedRows = await db
    .select(messageCols)
    .from(chatMessage)
    .where(and(inArray(chatMessage.threadId, threadIds), textPartLike(pattern)))
    .orderBy(asc(chatMessage.createdAt), asc(chatMessage.id));
  const firstMatched = new Map<string, string>();
  for (const row of matchedRows) {
    if (!firstMatched.has(row.threadId)) {
      firstMatched.set(row.threadId, extractText(row.parts as ThreadMessage["parts"]));
    }
  }

  // 仅标题命中的会话：回退为首条消息开头
  const fallbackIds = threadIds.filter((id) => !firstMatched.has(id));
  const firstMessage = new Map<string, string>();
  if (fallbackIds.length > 0) {
    const rows = await db
      .select(messageCols)
      .from(chatMessage)
      .where(inArray(chatMessage.threadId, fallbackIds))
      .orderBy(asc(chatMessage.createdAt), asc(chatMessage.id));
    for (const row of rows) {
      if (!firstMessage.has(row.threadId)) {
        firstMessage.set(row.threadId, extractText(row.parts as ThreadMessage["parts"]));
      }
    }
  }

  return {
    items: threads.map((t) => ({
      id: t.id,
      title: t.title,
      snippet: buildSnippet(firstMatched.get(t.id) ?? firstMessage.get(t.id) ?? "", q),
    })),
  };
}

export async function createThread(opts: {
  userId: string;
  threadId?: string;
  title?: string;
}): Promise<ThreadSummary> {
  const now = new Date();
  const [row] = await db
    .insert(chatThread)
    .values({
      id: opts.threadId ?? crypto.randomUUID(),
      userId: opts.userId,
      title: opts.title ?? "新对话",
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  return toSummary(row);
}

/** 所有权校验：非本人或不存在一律返回 null（调用方转 404） */
export async function getOwnedThread(
  threadId: string,
  userId: string,
): Promise<ThreadSummary | null> {
  const [row] = await db
    .select()
    .from(chatThread)
    .where(and(eq(chatThread.id, threadId), eq(chatThread.userId, userId)));
  return row ? toSummary(row) : null;
}

/** 更新会话：重命名 / 置顶 / 取消置顶（只处理提供的字段） */
export async function updateThread(opts: {
  threadId: string;
  userId: string;
  title?: string;
  pinned?: boolean;
}): Promise<ThreadSummary> {
  const owned = await getOwnedThread(opts.threadId, opts.userId);
  if (!owned) throw new ThreadNotFoundError();

  const set: Partial<typeof chatThread.$inferInsert> = { updatedAt: new Date() };
  if (opts.title !== undefined) set.title = opts.title;
  if (opts.pinned !== undefined) set.pinnedAt = opts.pinned ? new Date() : null;

  const [row] = await db
    .update(chatThread)
    .set(set)
    .where(eq(chatThread.id, opts.threadId))
    .returning();
  return toSummary(row);
}

export async function deleteThread(opts: {
  threadId: string;
  userId: string;
}): Promise<void> {
  const owned = await getOwnedThread(opts.threadId, opts.userId);
  if (!owned) throw new ThreadNotFoundError();
  await db.delete(chatThread).where(eq(chatThread.id, opts.threadId));
}

/** 会话详情：元信息 + 全量消息（正序），详情页一次取齐 */
export async function getThreadDetail(
  threadId: string,
  userId: string,
): Promise<ThreadDetail> {
  const owned = await getOwnedThread(threadId, userId);
  if (!owned) throw new ThreadNotFoundError();
  const rows = await db
    .select()
    .from(chatMessage)
    .where(eq(chatMessage.threadId, threadId))
    .orderBy(desc(chatMessage.createdAt), desc(chatMessage.id));
  return { ...owned, messages: rows.reverse().map(toMessage) };
}

/**
 * 追加用户消息（延迟创建落地点）：
 * 新会话 insert（标题 = 首条消息截断），已存在则校验所有权；
 * 同事务更新 updatedAt（会话顶到列表头）。
 */
export async function appendUserMessage(opts: {
  threadId: string;
  userId: string;
  message: { id: string; parts: Array<{ type: string }> };
}): Promise<void> {
  const { threadId, userId, message } = opts;
  const now = new Date();

  await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(chatThread)
      .values({
        id: threadId,
        userId,
        title: deriveTitle(message.parts),
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing()
      .returning();

    // 插入未命中说明会话已存在：校验所有权（非本人视同不存在）
    if (inserted.length === 0) {
      const [row] = await tx
        .select({ userId: chatThread.userId })
        .from(chatThread)
        .where(eq(chatThread.id, threadId));
      if (!row || row.userId !== userId) throw new ThreadNotFoundError();
    }

    await tx.insert(chatMessage).values({
      id: message.id,
      threadId,
      role: "user",
      parts: message.parts,
      createdAt: now,
    });

    await tx
      .update(chatThread)
      .set({ updatedAt: now })
      .where(eq(chatThread.id, threadId));
  });
}

/** 追加 assistant 消息（SSE onFinish 时调用，流已结束，失败只记日志） */
export async function appendAssistantMessage(opts: {
  threadId: string;
  message: {
    id: string;
    parts: Array<{ type: string }>;
    metadata?: Record<string, unknown> | null;
  };
}): Promise<void> {
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.insert(chatMessage).values({
      id: opts.message.id,
      threadId: opts.threadId,
      role: "assistant",
      parts: opts.message.parts,
      metadata: opts.message.metadata ?? null,
      createdAt: now,
    });
    await tx
      .update(chatThread)
      .set({ updatedAt: now })
      .where(eq(chatThread.id, opts.threadId));
  });
}

/** 组装发给模型的历史上下文：最近 n 条（UIMessage 形状，含刚写入的最新 user 消息） */
export async function recentUiMessages(
  threadId: string,
  n = 40,
): Promise<Array<{ id: string; role: string; parts: unknown }>> {
  const rows = await db
    .select()
    .from(chatMessage)
    .where(eq(chatMessage.threadId, threadId))
    .orderBy(desc(chatMessage.createdAt), desc(chatMessage.id))
    .limit(n);
  return rows.reverse().map((r) => ({
    id: r.id,
    role: r.role,
    parts: r.parts,
  }));
}
