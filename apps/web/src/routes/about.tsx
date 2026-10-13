import { createFileRoute } from "@tanstack/react-router";

import { AboutPage } from "#/features/about";

export const Route = createFileRoute("/about")({
  // 如需进入页面前预取：loader 用 ensureQueryData(aboutListQueryOptions())
  component: AboutPage,
});
