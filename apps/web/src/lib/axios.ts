import axios from "axios";

import { env } from "#/env";
import { notifySessionExpired } from "#/lib/session-expired";

export const api = axios.create({
  // 留空 = 同源相对路径（本地 dev 走 vite proxy；鉴权用 better-auth cookie，同源天然携带）
  baseURL: env.VITE_API_BASE_URL ?? "",
  timeout: 10_000,
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // 统一错误归一：业务代码只处理归一后的结构
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      // 只拦 /api/*：/auth/sign-in 密码错误也是 401，不能触发"会话过期跳转"
      error.config?.url?.startsWith("/api/")
    ) {
      // 会话过期的统一出口：清缓存 + 跳 /login?next=当前路径（处理器由 main.tsx 注册）
      notifySessionExpired(window.location.pathname + window.location.search);
    }
    return Promise.reject(error);
  },
);
