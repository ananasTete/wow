import type {
  ThreadListResponse,
  ThreadSearchResponse,
  ThreadSummary,
} from "@wow/shared";

import { api } from "#/lib/axios";

export async function fetchThreads(opts: {
  limit?: number;
  cursor?: string | null;
}): Promise<ThreadListResponse> {
  const params = new URLSearchParams({ limit: String(opts.limit ?? 20) });
  if (opts.cursor) params.set("cursor", opts.cursor);
  return api.get<unknown, ThreadListResponse>(`/api/threads?${params}`);
}

export async function searchThreads(
  q: string,
  limit = 20,
): Promise<ThreadSearchResponse> {
  const params = new URLSearchParams({ q, limit: String(limit) });
  return api.get<unknown, ThreadSearchResponse>(`/api/threads/search?${params}`);
}

export async function createThread(title?: string): Promise<ThreadSummary> {
  return api.post<unknown, ThreadSummary>("/api/threads", { title });
}

export async function updateThread(
  id: string,
  patch: { title?: string; pinned?: boolean },
): Promise<ThreadSummary> {
  return api.patch<unknown, ThreadSummary>(`/api/threads/${id}`, patch);
}

export async function deleteThread(id: string): Promise<void> {
  await api.delete(`/api/threads/${id}`);
}
