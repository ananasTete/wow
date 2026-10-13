import { Link } from "@tanstack/react-router";
import { Button } from "#/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#/components/ui/card";
import { Input } from "#/components/ui/input";

import { useAboutList } from "../hooks/use-about-list";
import { useAboutStore } from "../store";

export function AboutPage() {
  const keyword = useAboutStore((state) => state.keyword);
  const setKeyword = useAboutStore((state) => state.setKeyword);
  const { data, isPending, isError } = useAboutList();

  const items = data?.filter((item) =>
    item.title.toLowerCase().includes(keyword.toLowerCase()),
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-3xl">About</h1>
        <Button asChild variant="outline">
          <Link to="/">返回首页</Link>
        </Button>
      </div>

      <Input
        value={keyword}
        onChange={(event) => setKeyword(event.target.value)}
        placeholder="按标题过滤（zustand + query 示例）"
      />

      {isPending && <p className="text-muted-foreground">加载中…</p>}
      {isError && (
        <p className="text-destructive">
          请求失败：请确认 VITE_API_BASE_URL 指向的后端可用
        </p>
      )}

      {items?.map((item) => (
        <Card key={item.id}>
          <CardHeader>
            <CardTitle>{item.title}</CardTitle>
            <CardDescription>{item.description}</CardDescription>
          </CardHeader>
          <CardContent>{item.id}</CardContent>
        </Card>
      ))}
    </div>
  );
}
