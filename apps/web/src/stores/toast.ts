import { create } from "zustand";

export interface ToastItem {
  id: number;
  title: string;
  description?: string;
  variant?: "default" | "destructive";
}

interface ToastState {
  toasts: ToastItem[];
  push: (toast: Omit<ToastItem, "id">) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;
const AUTO_DISMISS_MS = 5000;

/**
 * 极简 toast 队列（zustand）：不引入 sonner 等新依赖。
 * 长驻提示（如校验错误）仍走页面内 Alert，这里只承载一次性事件通知。
 */
export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (toast) => {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, AUTO_DISMISS_MS);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
