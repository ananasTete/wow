import { create } from "zustand";

/**
 * 草稿会话管理：URL 是会话真源（/ = 新对话、/chat/:id = 已有会话），
 * store 只负责 / 上使用的前端草稿 id（延迟创建：首条消息 POST 时服务端落库）。
 * 草稿一旦随首条消息落库即轮换，保证同一个 id 永远不会被再次当作空草稿复用。
 */
interface ChatState {
  /** 当前新对话可用的草稿 id（store 创建时即生成） */
  draftThreadId: string;
  /** 进入新对话：轮换全新草稿 id（配合导航回 /） */
  startNewThread: () => void;
  /** 会话已落库（URL 进入 /chat/:id）：若与当前草稿一致则轮换，避免已持久化 id 被复用 */
  consumeDraft: (id: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  draftThreadId: crypto.randomUUID(),
  startNewThread: () => set({ draftThreadId: crypto.randomUUID() }),
  consumeDraft: (id) => {
    if (get().draftThreadId === id) {
      set({ draftThreadId: crypto.randomUUID() });
    }
  },
}));
