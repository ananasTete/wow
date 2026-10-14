# AGENTS.md

## 维护规则（必须遵守）

**每次遇到运行问题及其解决方案，都必须追加记录到本文档的「问题与解决方案」章节。**
记录格式：现象 → 原因 → 解决办法。修复问题后随代码一起提交，避免同样的坑踩第二次。

## 协作纪律

- **验证用的后台进程只允许杀自己启动时记录的具体 PID**，禁止用 `pkill`、`lsof -ti:<port> | xargs kill`
  这类无差别清理——用户可能同时在运行自己的 dev 服务（曾误杀用户开启的 mastra dev）。
- 需要重启共享环境里的服务（占端口、清进程）时，先说明再做。
- `mastra dev` 由 pnpm 启动时，杀外层 pnpm 不会连带杀掉 Node 子进程，会留下占 4111 端口的孤儿进程；
  启动时应记下实际 PID 以便精确清理。

## 环境与命令

- 所有命令在仓库根目录执行：`pnpm agent`（playground，:4111）、`pnpm check`（biome）、
  `pnpm -r run typecheck`。
- 本地开发零 Docker：API 用 PGLite（`packages/db/.data/pg`），agent 记忆用 LibSQL
  （`packages/agent/.data/memory.db`）。生产设 `DATABASE_URL` 切换真 PG。
- 环境变量见各包 `.env.example`：`packages/agent/.env`（OPENAI_*、TAVILY_API_KEY）、`apps/api/.env`。

## 问题与解决方案

### mastra dev 报 "Another development server instance is already running"

- **现象**：启动 `mastra dev` 失败，提示某 PID 仍活跃、4111 被占。
- **原因**：上一次 dev server 的 Node 子进程成了孤儿（杀 pnpm 不杀子进程）。
- **解决**：`ps aux | grep "mastra/dist"` 找到孤儿 PID 后 `kill <PID>`（精确 PID，勿 pkill）。

### drizzle-orm 0.45 migrate() 报 "Can't find meta/_journal.json"

- **现象**：迁移文件明明存在，`migrate()` 却说找不到 journal。
- **原因**：0.45 把选项从 `folder` 改名为 `migrationsFolder`，传 `folder` 被静默忽略。
- **解决**：`migrate(db, { migrationsFolder })`。见 `packages/db/scripts/migrate.ts`。

### PGLite 报 ENOENT mkdir .../.data/pg

- **现象**：`PGlite.create(".data/pg")` 失败。
- **原因**：PGLite 不自建数据目录的父级。
- **解决**：先 `mkdirSync(dir, { recursive: true })` 再 create。

### better-auth 路由 404

- **现象**：`POST /auth/sign-up/email` 404。
- **原因**：better-auth 默认 base path 是 `/api/auth`，与挂载点 `/auth/*` 不符。
- **解决**：`betterAuth({ basePath: "/auth", ... })`；Hono 挂载用 `app.all("/auth/*", ...)`（`*path` 命名写法无效）。

### TypeScript 装到 7.x 后报 "Cannot find name 'process'"

- **现象**：`@types/node` 已装仍报 process 未定义。
- **原因**：TS 7（原生编译器）行为差异。
- **解决**：全仓锁 `typescript@^5.9.0`（catalog 管理）。

### mastra 相关 API 与文档不一致（1.76 / 1.34）

- `new Agent()` 必须显式传 `id`。
- `@mastra/pg` 的存储类导出名是 `PostgresStore`（不是 `PgStore`）。
- `createTool` 的 `execute` 回调参数直接是解析后的输入对象（不是老写法 `{ context }`）。
- `LibSQLStore` 配置必须含 `id` 字段。
- 遇到类型不匹配时先查 `node_modules` 里对应包的 `.d.ts`，别只看官方文档。

### mastra dev 打包导致 import.meta.url / cwd 路径漂移

- **现象**：数据文件（memory.db）落到 `.mastra/.data/` 或 `src/mastra/public/.data/` 等意外位置。
- **原因**：`mastra dev` 会把代码打包到 `.mastra/output`（`import.meta.url` 指向打包产物），
  且 dev server 的 cwd 是 `src/mastra`。
- **解决**：从 cwd 向上找最近的 `package.json` 锚定包根目录。见 `packages/agent/src/memory.ts` 的 `pkgRoot()`。

### biome 2.x 配置与命令变化

- `linter.rules.recommended` 已废弃，用 `preset: "recommended"`（`biome migrate --write` 可自动迁移）。
- `--no-errors-on-unmatched-files` 已移除（lefthook 的 glob 已过滤，直接不传）。
- import 顺序检查（organizeImports）会拦下未排序的导入，hook 里因此失败过——提交前先 `pnpm check`。
- 构建产物目录（`.mastra/`、`dist/`）靠 `vcs.useIgnoreFile` + `.gitignore` 排除，新增产物目录记得加 gitignore。

### lefthook 里 biome 命令找不到

- **现象**：pre-commit 时 `sh: biome: command not found`。
- **原因**：git hook 环境没有 node_modules/.bin。
- **解决**：hook 命令用 `pnpm exec biome ...`。

### better-auth 注册 403 "Invalid origin"（前端误报"邮箱可能已被使用"）

- **现象**：`POST /auth/sign-up/email` 返回 403 `{"code":"INVALID_ORIGIN"}`；前端表单对任何注册失败都显示"注册失败，邮箱可能已被使用"，掩盖真实原因。
- **原因**：better-auth 1.7.7 的 origin 校验（`origin-check.mjs` 的 `validateOrigin`）：非 GET 请求**带 Cookie 头**时，`Origin`（或 Referer）必须命中 trustedOrigins（含 baseURL 源）。浏览器用 `http://127.0.0.1:5173` 打开 vite 页面时，proxy 原样转发 Origin，而 trustedOrigins 只配了 `http://localhost:5173`——`localhost` 与 `127.0.0.1`/`[::1]` 对浏览器是三个不同 origin；且 vite 端口被占时会自动跳到 5174/5175…，写死端口同样会再踩坑。不带 Cookie 的请求（如干净的 curl）反而不会被拦。
- **解决**：
  - trustedOrigins 默认用端口通配符 `http://localhost:*,http://127.0.0.1:*,http://[::1]:*`（better-auth 的 `matchesOriginPattern` 支持 glob，`*` 匹配除 `/` 外任意字符）；生产用 `TRUSTED_ORIGINS` 覆盖为真实前端域名。
  - 前端按 better-auth 错误码映射文案——重复邮箱的实际错误码是 `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL`（不是 `USER_ALREADY_EXISTS`），未知错误透传服务端 message，不再瞎猜原因。
  - 验证 origin 校验的技巧：用"错误密码登录"当探针，origin 被拦返回 403，放行则返回 401（INVALID_EMAIL_OR_PASSWORD），不会产生测试数据。

### agent 问天气时先调天气工具、又叠加 tavily 搜索

- **现象**：问"上海天气怎么样"，agent 先调 get-weather 输出一段文本，再调 tavily-search 又输出一段，最后才给图表；天气数据明明已够，还多花一次搜索。
- **原因**：系统指令规则重叠——"涉及实时信息先用 tavily-search 并附来源链接"与"涉及天气先用 get-weather"同时命中（天气⊂实时信息），模型为满足全部指令把两条都执行；且"附来源链接"只有搜索工具能兑现（天气工具无 url 字段），tavily 工具描述里的"实时数据"又构成双重暗示。图表规范与此无关（`<chart>` 只是输出语法，不依赖任何工具）。
- **解决**：指令改为互斥路由（天气只走 getWeather、禁止叠加搜索、无需来源链接；新闻/天气以外的实时信息才走 webSearch 并附链接），搜索工具描述显式排除天气。注意：OpenAI 兼容接口的函数名仅允许 `[a-zA-Z0-9_-]`，中文"网络搜索"只能放工具描述与前端展示名（`message-view.tsx` 的 TOOL_TITLES 映射，含旧名 tavilySearch 的历史消息兼容）。
