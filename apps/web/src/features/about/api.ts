import { api } from "#/lib/axios";

export interface AboutItem {
  id: string;
  title: string;
  description: string;
}

export async function fetchAboutList(): Promise<AboutItem[]> {
  const data = await api.get<AboutItem[], AboutItem[]>("/about");
  return data;
}

export async function fetchAboutDetail(id: string): Promise<AboutItem> {
  const data = await api.get<AboutItem, AboutItem>(`/about/${id}`);
  return data;
}
