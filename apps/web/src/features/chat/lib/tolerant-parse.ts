/**
 * 流式容错 JSON 解析：流式传输中标签体 JSON 可能只有半截，
 * 解析失败返回 null（调用方渲染骨架），闭合后自然成功。
 */
export function tolerantParse<T = unknown>(raw: string): T | null {
  const text = raw.trim();
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}
