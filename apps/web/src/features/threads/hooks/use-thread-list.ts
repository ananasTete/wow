import { useInfiniteQuery } from "@tanstack/react-query";

import { fetchThreads } from "../api";
import { threadKeys } from "../query-keys";

/** 会话列表：keyset 无限滚动（侧边栏下拉加载） */
export function useThreadList(limit = 20) {
  return useInfiniteQuery({
    queryKey: threadKeys.list(limit),
    queryFn: ({ pageParam }) =>
      fetchThreads({ limit, cursor: pageParam as string | null }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 30_000,
  });
}
