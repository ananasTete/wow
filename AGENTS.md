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
