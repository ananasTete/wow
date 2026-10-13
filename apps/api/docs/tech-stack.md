# wow 后端技术选型及原因

> 确定时间：2026-10。本文记录各选型的决策理由和边界，供后续回顾与新人 onboard 使用。

## 总览

| 层 | 选型 | 版本基线 |
| --- | --- | --- |
| 语言 | TypeScript（strict） | ^5.9（暂不上 TS7 原生编译器） |
| 运行时 | Node.js 22 LTS + `@hono/node-server` | — |
| Web 框架 | Hono | ^4.13 |
| Agent 框架 | Mastra（后续接入） | — |
| ORM | Drizzle ORM + drizzle-kit | ^0.45 |
| 数据库 | PostgreSQL + pgvector（生产）／ PGLite（本地 dev/test） | — |
| 认证 | better-auth（email + password） | ^1.7 |
| 校验 | Zod + @t3-oss/env-core | zod ^4 |

## 数据库：PostgreSQL + pgvector

**为什么是 PG：**

1. **Mastra 的存储后端**支持 LibSQL 与 Postgres，LibSQL 仅适合 demo；生产路径官方推荐 PG。
2. **Agent 应用的核心是向量检索**（memory / RAG）。pgvector 一个扩展同时覆盖结构化数据与向量，
   千万级向量规模之前不需要独立向量库（Pinecone / Qdrant）。
   额外优势：向量列可以和业务表 JOIN（如"只检索当前租户的文档"），这是独立向量库难以做到的。
3. **Drizzle 对 PG 支持最成熟**（`drizzle-orm/pg-core`，pgvector 列类型原生支持），
   drizzle-kit 迁移工具同样 PG 优先。

**部署形态：** 托管选 Neon / Supabase（serverless driver 场景 Neon 更顺）；自托管用
`pgvector/pgvector` 镜像。驱动用 `postgres.js`（Drizzle 官方默认推荐）。

## 本地开发：PGLite（为什么不用 Docker）

PGLite 是编译为 WASM 的**真 PostgreSQL 引擎**，不是"语法兼容替代品"，行为与生产 PG 一致。

- **零安装、零进程管理**：`new PGlite()` 即数据库，数据落本地目录。没有 Docker Desktop
  内存占用、端口冲突、"容器没起导致服务挂"的问题；克隆仓库后 `pnpm dev` 直接可跑。
- **测试体验**：每个测试可用独立的内存实例（`dataDir: ":memory:"`），完全隔离、可并行、
  无 TCP 开销；CI 不再需要 services 容器或 Testcontainers。
- **一致性风险低**：同一引擎，唯一差异是 PGLite 单连接（无连接池），本地开发无所谓。

**边界：** PGLite 单连接、单进程，仅限 dev/test，不能承载生产。

**生产 PG 的优势（对照）：** 真正的多连接并发与连接池；pgvector 的 HNSW 索引与高并发
向量查询能力；托管服务的备份 / 时间点恢复 / 扩容；事务与持久性保证的生产级负载。

**实现：** `packages/db` 的 `createDb()` —— 传 `url` 走 postgres.js 连真 PG，不传则用
PGLite（数据固定在 `packages/db/.data/pg`，与迁移脚本写入的是同一个库）。
同一套 schema 与迁移文件服务两种环境。

## 认证：better-auth（email + password）

- **email 作账号标识**：有格式与唯一性校验，后续加 OAuth / 忘记密码 / 邮箱验证都顺；
  纯 username 方案（username 插件）留给确实不能要邮箱的场景。
- **注册 / 登录分开两个端点**（`POST /auth/sign-up/email`、`POST /auth/sign-in/email`），
  刻意不做"用户不存在就自动注册"的统一端点——那会引入撞库式探测用户是否存在的风险。
- 密码哈希用内置 argon2/scrypt，最小长度 8；session 走默认 cookie 方案。
- **表结构**（user / session / account / verification）由 `packages/db/src/schema.ts` 定义，
  走 drizzle adapter，纳入同一套 drizzle-kit 迁移管理。
- cookie 前缀 `wow`，避免与其他服务的 auth cookie 冲突；better-auth `basePath` 设为
  `/auth`（默认是 `/api/auth`，会与本项目的 `/api/*` 受保护路由冲突）。

## 结构约定

```
packages/agent   # Mastra 实例 + 唯一 provider + agent 定义；`pnpm --filter @wow/agent dev` 起 playground（:4111）
packages/db      # schema、迁移、双模式 client（单一来源，api 与 Mastra storage 共用）
packages/shared  # 共享 env schema 片段等
apps/api         # Hono + better-auth；env 校验、路由、session 中间件
```

### AI provider（packages/agent）

- **唯一 provider**：`@ai-sdk/openai-compatible`，所有 agent 从 `src/provider.ts` 取模型。
- **环境变量**：`OPENAI_BASE_URL`（默认 `https://api.openai.com/v1`）、`OPENAI_API_KEY`、
  `OPENAI_MODEL`（默认 `gpt-4o-mini`）。可接入任意 OpenAI 端点规范的服务
  （官方 / DeepSeek / Groq / vLLM / Ollama）。
- **storage**：设了 `DATABASE_URL` 时用 `@mastra/pg` 的 `PostgresStore`（生产）；
  本地 playground 不设时回退内存存储（dev 可接受，playground 产生的 trace 不持久化）。
- **开发节奏**：先在 playground 调 agent（prompt / tools / memory）→ 固化数据模型与 API →
  再开发前端。playground 是无鉴权的本地 dev 工具，不部署。
- **为什么是 package 而不是独立 app**：`apps/api` 同进程 `import { mastra } from "@wow/agent"`
  直读 session，没有跨进程认证；未来要独立部署时只需新增 app 壳，`packages/agent` 不动。

- 版本统一由根 `pnpm-workspace.yaml` 的 catalog 管理，各包用 `catalog:` 引用。
- API 路由约定：`/auth/*` 归 better-auth；`/api/*` 需 session（中间件 401 拦截）；
  `/health` 公开。

## 明确暂不引入的

- **Turborepo**：pnpm 原生拓扑排序够用；待构建变慢、需要任务缓存时再上。
- **lint-staged**：lefthook 的 `{staged_files}` + `stage_fixed` 已覆盖其全部职责。
- **GraphQL**：Hono RPC + Zod / drizzle-zod 的类型推导在 TS 全栈下更省事。
- **独立向量库 / Redis 缓存**：pgvector 与 PG 当前容量足够，避免过早加组件。

## 踩坑记录（截至落地日）

- drizzle-orm 0.45 的 `migrate()` 选项从 `folder` 改名为 `migrationsFolder`。
- better-auth 默认 base path 是 `/api/auth`，需显式配置 `basePath`。
- TypeScript 默认会装到 7.x（原生编译器），行为差异尚多，锁定 ^5.9。
- PGLite 不会自建数据目录的父级，需先 `mkdirSync(dir, { recursive: true })`。
- @mastra/pg 的存储类导出名是 `PostgresStore`（不是文档示例里的 `PgStore`）。
- @mastra/core 1.76 起 `new Agent()` 必须显式传 `id`。
