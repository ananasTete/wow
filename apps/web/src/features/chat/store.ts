import { create } from "zustand";

interface ChatState {
  /** 当前打开的会话 id（含未落库的草稿 id） */
  activeThreadId: string | null;
  /** 新建对话：仅生成 id 切前端态，不发请求（延迟创建，首条消息时服务端 upsert） */
  startNewThread: () => void;
  selectThread: (id: string | null) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  activeThreadId: null,
  startNewThread: () => set({ activeThreadId: crypto.randomUUID() }),
  selectThread: (id) => set({ activeThreadId: id }),
}));
