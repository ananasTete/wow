import axios from "axios";

import { env } from "#/env";

export const api = axios.create({
  baseURL: env.VITE_API_BASE_URL,
  timeout: 10_000,
});

api.interceptors.request.use((config) => {
  // TODO: 按实际认证方案注入 token
  // const token = useAuthStore.getState().token
  // if (token) config.headers.Authorization = `Bearer ${token}`
  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // 统一错误归一：业务代码只处理归一后的结构
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        // TODO: 清除本地会话并跳转登录页
      }
      return Promise.reject(error);
    }
    return Promise.reject(error);
  },
);
