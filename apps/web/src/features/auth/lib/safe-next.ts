/**
 * next 跳转参数的白名单校验：只接受站内相对路径。
 * 拒绝外链与协议相对地址（`//evil.com`），防开放重定向。
 */
export function safeNext(next?: string): string {
  if (next?.startsWith("/") && !next.startsWith("//")) {
    return next;
  }
  return "/";
}
