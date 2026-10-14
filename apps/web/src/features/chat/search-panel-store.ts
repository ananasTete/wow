import { create } from "zustand";

import type { WebSearchResult } from "./types";

/**
 * 搜索结果侧边栏状态：点击会话里的 webSearch 行内条时，
 * 存入该次搜索的数据快照（tool output 落定后不可变，快照无同步问题）。
 * 面板渲染时校验 threadId 与当前活动会话一致，切换会话自动失效，无需手动清理。
 */
interface SearchPanelSnapshot {
  threadId: string;
  /** 打开面板的那次 tool 调用（行内条据此高亮"当前展示的是哪次搜索"） */
  toolCallId: string;
  query: string;
  results: WebSearchResult[];
}

interface SearchPanelStore {
  panel: SearchPanelSnapshot | null;
  openPanel: (snapshot: SearchPanelSnapshot) => void;
  closePanel: () => void;
}

export const useSearchPanelStore = create<SearchPanelStore>((set) => ({
  panel: null,
  openPanel: (panel) => set({ panel }),
  closePanel: () => set({ panel: null }),
}));
