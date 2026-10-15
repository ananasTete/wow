import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import type { ThreadDetail, ThreadListResponse, ThreadSummary } from "@wow/shared";

import { threadKeys } from "../query-keys";

/** 侧栏会话列表分页大小（首载与滚动加载共用） */
export const PAGE_SIZE = 20;

type ListData = InfiniteData<ThreadListResponse, string | null>;

/**
 * 会话列表乐观手术：重命名/置顶切换/删除/发消息/草稿落库直接改写缓存里的
 * items/pinned 数组，不触发列表请求（列表请求只剩首载与滚动加载两种）。
 * 安全性依赖 keyset 分页的两个性质：
 * ① 各页 nextCursor 是服务端签发的锚点，本地重排永不触碰 → 后续滚动取页仍正确；
 * ② 被 bump 的会话 updatedAt 为全局最大值，必在所有锚点之前 → 未来页不会带回它。
 * stale/聚焦触发的整页重取会用服务端真相覆盖，手术痕迹自愈；手术 bug 最多造成
 * 短暂显示异常（渲染层按 id 去重兜底），不会破坏分页。
 */

/** 对全部 list 查询实例（覆盖任意 limit）应用变换 */
function mutateLists(qc: QueryClient, transform: (data: ListData) => ListData) {
  for (const [key, data] of qc.getQueriesData<ListData>({
    queryKey: threadKeys.lists(),
  })) {
    if (data && data.pages.length > 0) qc.setQueryData<ListData>(key, transform(data));
  }
}

/** 两段（items/pinned）中原位移除指定会话 */
function stripThread(data: ListData, id: string): ListData {
  const pages = data.pages.map((page) => ({
    ...page,
    items: page.items.filter((t) => t.id !== id),
    pinned: page.pinned.filter((t) => t.id !== id),
  }));
  return { ...data, pages };
}

/** 会话移动/插入到普通段顶部（未加载过的会话 = 合成置顶插入，如搜索打开后发消息） */
export function upsertTop(qc: QueryClient, summary: ThreadSummary) {
  mutateLists(qc, (data) => {
    const stripped = stripThread(data, summary.id);
    const [first, ...rest] = stripped.pages;
    return {
      ...stripped,
      pages: [{ ...first, items: [summary, ...first.items] }, ...rest],
    };
  });
}

/** 置顶：两段移除后进入各页置顶段，按 pinnedAt DESC 归位（新置顶在最前） */
export function moveToPinned(qc: QueryClient, summary: ThreadSummary) {
  mutateLists(qc, (data) => {
    const stripped = stripThread(data, summary.id);
    const pages = stripped.pages.map((page) => ({
      ...page,
      pinned: [...page.pinned, summary].sort((a, b) =>
        (b.pinnedAt ?? "").localeCompare(a.pinnedAt ?? ""),
      ),
    }));
    return { ...stripped, pages };
  });
}

/** 删除：两段全移除（keyset 下删除对后续取页无影响，无需补偿） */
export function removeThread(qc: QueryClient, id: string) {
  mutateLists(qc, (data) => stripThread(data, id));
}

/** 原地覆盖字段（不移动位置）：详情数据就绪后纠偏列表条目（如草稿的临时标题） */
export function patchSummary(qc: QueryClient, summary: ThreadSummary) {
  mutateLists(qc, (data) => {
    const pages = data.pages.map((page) => ({
      ...page,
      items: page.items.map((t) => (t.id === summary.id ? { ...t, ...summary } : t)),
      pinned: page.pinned.map((t) => (t.id === summary.id ? { ...t, ...summary } : t)),
    }));
    return { ...data, pages };
  });
}

/** 详情 → 列表条目（剥掉 messages 字段，保持缓存条目形状一致） */
export function summaryOf(detail: ThreadDetail): ThreadSummary {
  return {
    id: detail.id,
    title: detail.title,
    pinnedAt: detail.pinnedAt,
    createdAt: detail.createdAt,
    updatedAt: detail.updatedAt,
  };
}

/** 渲染兜底：与在途 fetchNextPage 竞态时同 id 可能短暂双份，先出现的（新位置）优先 */
export function dedupeThreads(items: ThreadSummary[]): ThreadSummary[] {
  const seen = new Set<string>();
  return items.filter((t) => {
    if (seen.has(t.id)) return false;
    seen.add(t.id);
    return true;
  });
}
