import axios from "axios";

import { api } from "#/lib/axios";

export interface Me {
  id: string;
  email: string;
  name: string;
}

/** better-auth 错误响应体：{ message, code } */
interface AuthErrorBody {
  code?: string;
  message?: string;
}

const ERROR_TEXT: Record<string, string> = {
  // 错误码以本地 better-auth 1.7.7 实测响应为准
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "该邮箱已被注册",
  INVALID_EMAIL_OR_PASSWORD: "邮箱或密码错误",
  INVALID_PASSWORD: "密码不符合要求（至少 8 位）",
};

/** 从 better-auth 响应里取用户可读文案；未知错误不瞎猜原因，展示服务端信息 */
export function authErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as AuthErrorBody | undefined;
    if (body?.code && ERROR_TEXT[body.code]) {
      return ERROR_TEXT[body.code];
    }
    if (body?.message) {
      return body.message;
    }
  }
  return "请求失败，请稍后重试";
}

/** better-auth email/password 登录（cookie 会话） */
export async function signIn(email: string, password: string) {
  await api.post("/auth/sign-in/email", { email, password });
}

export async function signUp(name: string, email: string, password: string) {
  await api.post("/auth/sign-up/email", { name, email, password });
}

export async function signOut() {
  // better-auth 要求 POST 必须带 Content-Type: application/json；无 body 时 axios 不设该头，传空对象触发
  await api.post("/auth/sign-out", {});
}

export async function fetchMe(): Promise<Me> {
  return api.get<unknown, Me>("/api/me");
}

/**
 * better-auth 原生会话探测：走 /auth/*（不匹配 axios 401 拦截器的 /api/* 前缀，
 * 不会在登录页反向守卫里误触发"会话过期跳转"）。无会话时接口返回 200 + null。
 */
export async function fetchSessionExists(): Promise<boolean> {
  const data = await api.get<unknown, { session?: unknown } | null>("/auth/get-session");
  return data != null && data.session != null;
}
