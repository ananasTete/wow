import axios from "axios";

import { env } from "#/env";

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
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        // 登录态失效：交由 auth feature 的 query 失效逻辑处理（跳转/弹登录框）
      }
      return Promise.reject(error);
    }
    return Promise.reject(error);
  },
);
