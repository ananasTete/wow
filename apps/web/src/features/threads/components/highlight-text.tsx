import type { ReactNode } from "react";

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** 关键词高亮文本：不区分大小写拆分，命中片段加粗（mark 去默认底色） */
export function HighlightText({
  className,
  keyword,
  text,
}: {
  className?: string;
  keyword: string;
  text: string;
}) {
  let nodes: ReactNode = text;
  if (keyword) {
    const lowered = keyword.toLowerCase();
    nodes = text.split(new RegExp(`(${escapeRegExp(keyword)})`, "gi")).map((part, i) =>
      part.toLowerCase() === lowered ? (
        <mark className="bg-transparent font-semibold text-foreground" key={i}>
          {part}
        </mark>
      ) : (
        part
      ),
    );
  }
  return <span className={className}>{nodes}</span>;
}
