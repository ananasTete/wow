type SessionExpiredHandler = (currentHref: string) => void;

let handler: SessionExpiredHandler | null = null;

/**
 * 会话过期（/api/* 401）的统一出口。axios 拦截器只上报，
 * 实际的"清缓存 + 跳 /login?next=xxx"由 main.tsx 注册（router/queryClient 单例都在那），
 * 避免本模块与 React 组件树形成循环依赖。
 */
export function setSessionExpiredHandler(h: SessionExpiredHandler) {
  handler = h;
}

export function notifySessionExpired(currentHref: string) {
  handler?.(currentHref);
}
