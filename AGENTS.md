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

## 前端约定

- ICON 库统一用 `lucide-react`（版本走 pnpm catalog），具名导入 `XxxIcon` 后缀写法（如 `SquarePenIcon`），不引入其他图标库。
- 图标尺寸在宿主元素上用 `size-*` class 显式声明（按钮内可依赖 button 变体的默认 `[&_svg]:size-4`）。
- 路由：`/` 与 `/chat/:id` 的 UI 全部在 `_chat` 布局（ChatShell）渲染，两个子路由组件是 `() => null` 占位。
  这是为了 ChatScreen 实例跨路由存活（草稿首发 / → /chat/:id 时不丢流式状态、不重拉历史），
  不要把 UI 移回子路由。会话真源是 URL；zustand 只管草稿 id（落库即轮换，见 `features/chat/store.ts`）。
- 登录鉴权走路由守卫，不要回退到组件级 AuthGate：`_chat` 布局 `beforeLoad` 用 `context.queryClient.fetchQuery`
  （queryClient 由 main.tsx 注入 router context，类型经 `createRootRouteWithContext` 声明）探 `/api/me`，
  未登录 `redirect` 到 `/login?next=<location.href>`；`/login` 反向守卫探 `/auth/get-session`（**不能走 /api/***，
  否则会触发 axios 401 拦截器把登录页自己弹走）。`next` 必须经 `safeNext` 白名单（只收站内相对路径）防开放重定向。
  `/chat/$threadId` **不做路由级归属校验**：404（不存在/非本人统一）由 ChatScreen 的消息查询承接，
  原地渲染"会话不存在或已被删除"空态 + 返回主页链接，不跳转、不发 toast——URL 如实反映所指向会话的状态，
  且与"聊天中会话被删"的原地 alert 语义一致（曾做过 redirect + `?notice=` + toast 方案后移除：
  为跨路由传一条提示引入四个间接件，成本高于收益）。若未来重新给该路由加 beforeLoad 预取，
  注意草稿首发与落库并发的 404 竞态（比对 `draftThreadId` 跳过）。
  会话过期统一出口在 axios 拦截器 → `lib/session-expired.ts` 回调（main.tsx 注册），避免 axios↔router 循环依赖。

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

### SSE 流内 error 事件被前端吞成"出错了，请稍后重试"

- **现象**：agent 执行中 provider 返回敏感内容拦截（智谱 code 1301），SSE 流出 `data: {"type":"error","errorText":"{\"message\":\"系统检测到…\",\"name\":\"Error\",\"code\":\"1301\"}"}`，前端只显示兜底文案，真实原因被掩盖。
- **原因**：mastra 把 provider 错误 `JSON.stringify` 后作为 errorText 下发（apps/api 的 `createUIMessageStream` 原样透传）；ai v7 客户端把 error part 抛成 `UIMessageStreamError` 落进 `useChat` 的 `error` 状态，`error.message` 是那段 **JSON 字符串**而非可读文案，旧 UI 不解析直接显示兜底。
- **解决**：`chat-error-alert.tsx` 尝试 `JSON.parse(error.message)` 取 `message`/`code`（1301 → "内容安全审查未通过" + ShieldAlert 图标），解析失败（如网络错误）则原样展示 message，仍空才用兜底文案；用 shadcn Alert(destructive) 渲染。发送下一条消息时 `useChat` 自动 `setStatus({status:"submitted", error:undefined})` 清除，无需手动重置。

### 内联自定义标签 `<citation i="1" />` 自闭合写法导致嵌套错乱

- **现象**：正文里连续多个 `<citation i="N" />`，渲染时第 2 个起全部嵌进第 1 个胶囊内部，段落结构混乱（用 remark-parse@11 + rehype-raw + rehype-sanitize 同源栈实测发现）。
- **原因**：HTML 规范里自闭合斜杠只对 void 元素（br/img 等）生效；parse5（rehype-raw 底层）把 `<citation i="1" />` 当**开放标签**，后续内容全部成为它的 children，直到段末。
- **解决**：交给 streamdown 前先规范化——`message-view.tsx` 的 `normalizeCitations` 把 `<citation i="N" />` 正则替换为 `<citation i="N"></citation>`（显式闭合两种形态都兼容）。推广：任何**内联**自定义标签都必须显式闭合或在渲染前规范化；chart 不受影响（块级标签自带闭合）。

### Tavily search 能力边界（引用卡片改造时实测，2026-10）

- **content 默认即片段非全文**：不开 `include_raw_content` 时，`results[].content` 是 query 相关提取段落纯文本（约 200-400 字，含全角空格缩进与 `...` 多片段拼接痕迹），`raw_content` 为 null。无法指定"取页面首段"——工具层 `stripMarkdown` 只做清洗（markdown 标记删除、全角空格规范化），不切段不截断完整返回；展示层截断由 hover 卡片的 line-clamp 承担。
- **没有 favicon 字段**：result 只有 `url/title/content/score/raw_content/id`。favicon 不进 schema，前端 `SiteIcon` 直接加载 `<origin>/favicon.ico`，失败（404/不可达/畸形 URL）显示 Globe 兜底图标。曾试过 Google s2 代理（`google.com/s2/favicons?domain=<host>`）作为第一级，因部分网络不可达且与旧数据降级链路复杂而移除——单一来源 + 兜底最简。
- 调研技巧：`.env.local` 里有真 key，直接 curl 一次 search API 看真实返回结构，比翻文档快且准。

### curl 访问本地 dev 服务返回 502 空响应（全局搜索冒烟时踩到，2026-10）

- **现象**：curl 打 `http://localhost:5173`（走 vite 代理）稳定 502，响应体为空，响应头带 `Proxy-Connection: keep-alive`；直连 `localhost:3000/health` 却正常，浏览器访问也正常，极易误判为 vite 代理配置坏了。
- **原因**：shell 环境有 `http_proxy/https_proxy=http://127.0.0.1:7890`（本机代理），curl 对 localhost 的请求被代理接管，代理拒绝回环目标返回 502。`Proxy-Connection` 头是它暴露的身份特征；直连 3000 正常只是该代理对部分回环端口行为不同，别被迷惑。
- **解决**：本地冒烟一律 `curl --noproxy '*' ...`。

### IAB 自动化测试里 Radix Dialog 关闭后 DOM 残留、press() 失灵（全局搜索 UI 验证时踩到，2026-10）

- **现象**：用浏览器自动化验证搜索弹窗：选中结果/Escape 关闭后，遮罩与内容长时间不卸载，截图看似弹窗还开着挡住页面；另 `locator.press("Enter")` 对 cmdk 输入框和聊天输入框都不触发动作（fill 正常）。
- **原因**：IAB 视图不可见时 rAF 冻结，CSS 退场动画（`animate-out`）永不推进，Radix Presence 等 `animationend` 等不到就不卸载元素——**逻辑上早已关闭**（`data-state="closed"`、受控 state 已翻转、输入已清空）。真实可见浏览器 200ms 内正常完成卸载。press 失灵同理是该环境对合成键盘事件的派发路径问题。
- **解决**：断言弹窗"是否关闭"看逻辑状态（`data-state` / 受控 open / 输入重置），别等 DOM 卸载；交互用 `evaluate(() => el.click())` 或 `dispatchEvent(new KeyboardEvent(...))` 驱动。

### Tailwind v4 `duration-*` 隐式开启 transition(all)，布局类切换被平滑插值（居中输入框改造时踩到，2026-10）

- **现象**：新会话输入框居中（外层挂 `flex-1 justify-center`）→ 发送首条消息切到底部布局时，输入框不是瞬时跳变，而是平滑滑动 ~280px、耗时 300ms——正是明确不想要的"从中间滑到底部"拖沓效果。
- **原因**：Tailwind v4 的 `duration-300` 不只喂给 `animate-in` 的 `--tw-duration`，还会**直接设置 `transition-duration: .3s`**；而 `transition-property` 的 CSS 初始值就是 `all`。居中态移除 `flex-1` 时 flex-grow 1→0 是可插值属性，被 `transition(all, .3s)` 捕获，整个布局平滑过渡。computed `transition-property: all; transition-duration: 0.3s` 可确认。
- **解决**：让元素在状态切换前后**布局相关类保持不变**——居中改用上下两个 `flex-1` 占位 div 实现，composer 外层两种状态下高度恒随内容（auto→auto 不可插值，天然瞬切）。教训：给挂 `duration-*` 的元素切布局类（flex/宽高/定位）前，先想 `transition(all)` 会不会把它变成可见动画。
- **连带坑：入场动画向下偏移会顶出页面滚动条**。贴着视口底边的 composer 挂 `slide-in-from-bottom-4`（起点 translateY +16px），动画起帧把元素推出视口 → html 溢出 → 出现页面滚动条。解决：动画方向避开"向下顶出"（改 `slide-in-from-top-*` 从上方落位），并在组件根容器加 `overflow-hidden` 兜底所有 transform 偏移。tw-animate-css 的 `slide-in-from-left-*`（设 `--tw-enter-translate-x`）与 `slide-in-from-bottom-*`（设 `--tw-enter-translate-y`）是不同变量，可叠加出斜向入场（如用户消息"左下偏移入位"）。

### POST /auth/sign-out 415 UNSUPPORTED_MEDIA_TYPE

- **现象**：退出登录请求 `POST /auth/sign-out` 返回 415 `{"code":"UNSUPPORTED_MEDIA_TYPE","message":"Content-Type is required. Allowed types: application/json"}`。
- **原因**：better-auth 1.7.7 要求所有 POST 必须带 `Content-Type: application/json`；前端 `api.post("/auth/sign-out")` 没传 body，axios 对无 body 的请求**不设置 Content-Type 头**，于是被 better-auth 拒收。
- **解决**：`api.post("/auth/sign-out", {})`——传空对象让 axios 序列化并自动带上 `application/json`。经验：对 better-auth 的所有 POST（包括无参的 sign-out）都要保证有 JSON body 或显式设头。curl 验证：带头 `-H 'Content-Type: application/json' -d '{}'` 返回 200，不带则 415。

### 登录重构落地：路由守卫 + next 回跳 + 越权 404（2026-10）

- **改动概览**：`/login` 独立路由（validateSearch 声明 `next?` 可选键——**键必须带 `?`**，否则所有 `to="/"`、`to:"/login"` 的导航/链接都被 TS 强制要求传 search）；`_chat` 布局 beforeLoad 守卫（fetchQuery `/api/me`，失败 redirect `/login?next=location.href`）；`/login` 反向守卫探 `/auth/get-session`。**迭代**：`/chat/$threadId` 的越权 404 初版做"redirect 回主页 + notice 参数 + toast"，后按需求方意见改为 ChatScreen 原地空态（见前端约定），notice/toast 机制整体移除——教训：为"跨路由传一条提示"引入的间接层（search 参数、全局 Toaster、渲染后清参）成本远超收益，能原地展示的就原地展示。
- **踩坑 1（类型）**：`createFileRoute` 的 beforeLoad 里 `context.queryClient` 报"不存在 on {}"——文件路由的 context 类型**不来自 Register**，必须用 `createRootRouteWithContext<{ queryClient: QueryClient }>()` 在 `__root.tsx` 声明。
- **踩坑 2（并发竞态）**：草稿首发消息时 `navigate({ to: "/chat/$threadId" })` 与服务端落库并发，beforeLoad 的消息预取可能赶在落库前拿到 404 把人踢回主页。解法：守卫开头比对 `useChatStore.getState().draftThreadId === params.threadId` 则跳过校验（活动实例已接管渲染）。
- **踩坑 3（拦截器误伤）**：登录页反向守卫若用 `/api/me` 探测，401 会触发 axios 拦截器的"会话过期跳转"，把登录页自己弹去 `/login?next=/login`。解法：探测走 better-auth 原生 `/auth/get-session`（200 + null 表示未登录，不匹配拦截器的 `/api/*` 前缀）；拦截器也要排除已在 /login 的场景。
- **踩坑 4（循环依赖）**：axios 拦截器需要 router 导航，直接 import router 会成环。解法：`lib/session-expired.ts` 只暴露 set/notify 回调，main.tsx 创建 router 后注册（清 queryClient + `router.navigate({ to: "/login", search: { next } })`）。
- **登出导航**：`useSignOut` 里显式 `navigate({ to: "/login" })` 且**不带 next**——靠守卫重定向会带上 next=原会话，重新登录后弹回一个空会话，语义不对。

### PGLite 数据目录 WAL 损坏（API 进程被杀后无法启动，2026-10）

- **现象**：API 启动即崩，日志里是压缩过的 `RuntimeError: Aborted(). Build with -sASSERTIONS for more info.`（tsAP 终端只有一行 minified 堆栈，极难定位）。任何进程（包括独立探针脚本）打开同一数据目录都崩。
- **定位方法**：用 `PGlite.create(dir, { debug: 1 })` 的最小脚本直连，真实原因才会打出来：`PANIC: could not locate a valid checkpoint record` / `invalid xl_info in checkpoint record`——API 进程被 SIGTERM/崩溃（tsx watch 被 kill、pnpm 外层被杀连带子进程）后 WAL 留下撕裂的 checkpoint 记录，postgres 拒绝启动。
- **修复（标准 PostgreSQL 手段）**：① 先 `cp -r .data/pg .data/pg.bak-<date>` 备份；② 删掉陈旧锁文件 `postmaster.pid`（PGLite 里面是假 pid "-42"）；③ 用同大版本的 `pg_resetwal -f -D <数据目录>` 重置 WAL（本机没装 PG，`brew install postgresql@18` 后用 `/opt/homebrew/opt/postgresql@18/bin/pg_resetwal`；npm 的 `@embedded-postgres/darwin-arm64` 只有 initdb/pg_ctl/postgres 三个二进制，没有 resetwal）。代价：丢失最后一个 checkpoint 之后的少量事务，存量数据完好（实测 38 会话全在）。
- **预防**：杀 dev 服务用优雅方式；API 进程加 SIGTERM 时 `await pglite.close()` 的处理器可彻底避免（待办）。同理，写完数据就 `process.exit(0)` 的临时脚本也可能触发（短查询实测未触发，长驻服务被杀必触发）。

### IAB 补充：Radix DropdownMenu 触发要 pointerdown（2026-10）

- **现象**：浏览器自动化点侧栏用户菜单里的"退出登录"，Playwright 的 click 对 menuitem 一直 timeout（动画冻结 + actionability 检查不过）；先点开菜单再找 menuitem 时菜单又已被关掉。
- **解决**：在**同一个 evaluate 里完成**：对 trigger 按钮先 `dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }))` 再 `click()`（Radix DropdownMenuTrigger 靠 pointerdown 打开），等 500ms 后对 menuitem 同样 pointerdown + click。拆成两次 locator 调用必失败。

### IAB 补充：evaluate 里 el.focus() 不触发 React onBlur（会话 header 编辑验证时踩到，2026-10）

- **现象**：自动化验证"blur 退出编辑不提交"——对另一个输入框 `evaluate((el) => el.focus())` 后，焦点确实移走（`activeElement` 已变），但编辑态组件的 React `onBlur` 没执行，输入框仍渲染。与 press("Enter") 失灵同类：该环境对部分焦点/键盘事件的派发路径不完整。
- **解决**：验证 blur 语义时手动 `el.dispatchEvent(new FocusEvent("focusout", { bubbles: true }))`（React 的 onBlur 监听冒泡的 focusout）；验证 Enter 时 `dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }))`。真实浏览器不受影响（侧栏重命名同模式久经使用）。

### Radix portal 内的点击会沿 React 树冒泡回宿主行（侧栏菜单误触进入会话，2026-10）

- **现象**：侧栏会话行（div[role=button] + 行级 onClick 进入会话）里嵌 DropdownMenu，点菜单项"重命名/删除"时**同时**触发了进入会话详情。
- **原因**：Radix 菜单/弹窗内容 DOM 上挂在 body portal，但 **React 合成事件沿 React 组件树冒泡**（portal 只隔离 DOM 不隔离 React 事件）——`DropdownMenuContent`、`DialogContent` 的 React 父级仍是宿主行 div，click/keydown 冒泡到行级 handler。原来只给触发按钮加了 `stopPropagation`，覆盖不到面板内容。
- **解决**：两层处理——①操作区容器 div 统一 `onClick/onKeyDown` stopPropagation（菜单面板在它的 React 子树内，一次拦截全部）；②`DeleteThreadDialog` 移出行 div（fragment 兄弟节点），彻底脱离冒泡路径。教训：portal 组件只要 React 祖先上有交互 handler，就必须在两者之间断掉合成事件冒泡，给 trigger 加 stopPropagation 是不够的。

### 登出后多发 /api/threads 与 /api/me（queryClient.clear 触发活跃 observer 立即重发，2026-10）

- **现象**：点"退出登录"跳到登录页后，Network 里多出 `/api/threads?limit=20` 和 `/api/me` 两个必 401 的请求（`/auth/get-session` 是登录页反向守卫，正常）。
- **原因**：`useSignOut` onSuccess 里先 `qc.clear()` 后 `navigate()`——clear 时侧栏（ChatShell）仍挂载，`useThreadList`/`useSession` 的 observer 还活着。query-core 5.x 的 `clear()` 把 query 从缓存移除并 destroy；组件下一次渲染（mutation 状态翻转、路由状态更新都必然触发）时 observer 走 `#updateQuery()` 重建空 query 并立即 `#executeFetch()`——等于带着已销毁的会话主动重发一轮请求，401 还会再触发会话过期拦截器。
- **解决**：调换顺序——`await navigate({ to: "/login" })` 完成后（TanStack Router 的 navigate promise 在**新路由渲染完成、旧组件卸载后**才 resolve，见 router-core 的 `_commitPromise` 在 `startTransition` 后 resolve）再 `qc.clear()`，此时已无活跃 observer，清缓存零副作用。main.tsx 的会话过期处理器（401 → 清缓存 + 跳登录）是同一模式，同步改为 `navigate(...).then(() => queryClient.clear())`。教训：`queryClient.clear()/removeQueries()` 只能在相关查询**无挂载 observer** 时调用（导航卸载之后），否则等于主动触发一轮全量 refetch。
- **同族变体（2026-10，删除会话后多发一次已删会话的详情 GET）**：mutation hook 的 onSuccess 里 `invalidateQueries(detail(id))` 时 ChatScreen 的 observer 仍挂载（导航在组件级 onSuccess 里才发出，且 mutate 是异步的），invalidate 默认 `refetchType: "active"` 立即触发在挂 observer 重取。当失效意图只是"作废缓存"而非"立刻刷新视图"时，用 `refetchType: "none"` 只标 stale 不重取——无多余请求，后续新 observer 挂载时自然重取。

### shadcn Charts 容器选择器在 recharts 3.10 下刻度失灵（图表主题化改造时踩到，2026-10）

- **现象**：接入 shadcn `ui/chart.tsx`（new-york-v4 registry，recharts 3 兼容版）后，网格线成功变 `border/50`，但坐标轴刻度文字仍是 recharts 默认 `#666`，`fill-muted-foreground` 没生效。
- **原因**：两层。① recharts 3.10 的刻度文字类名变成了 `recharts-cartesian-axis-tick-value`（挂在 `<text>` 上，父级是 `...-tick-label`），官方选择器 `[&_.recharts-cartesian-axis-tick_text]` 展开后是 `.recharts-cartesian-axis-tick text`，匹配不到新的 DOM 结构；② Tailwind 任意变体把 `_` 转成空格——`.a_b[c]` 实际编译为 `.a` 后代 `b[c]`，所以 `.recharts-cartesian-grid_line[stroke='#ccc']` 实际匹配 `.recharts-cartesian-grid` 下的 `line[stroke='#ccc']` 而仍能命中。网格"碰巧能用"正是这个机制，别被误导为选择器语法没问题。
- **解决**：vendored 的 `ui/chart.tsx` ChartContainer 类名里补充 `[&_.recharts-cartesian-axis-tick-value]:fill-muted-foreground`（保留官方选择器便于升级 diff）。排查手法：`querySelectorAll("svg [class]")` 枚举真实类名再比对选择器，比盯着 computed style 猜更快。

### IAB：合成鼠标事件触发不了 recharts Tooltip（图表视觉冒烟时踩到，2026-10）

- **现象**：`evaluate` 里对 `.recharts-wrapper` 派发 `mousemove`/`pointermove`（bubbles: true），Tooltip 和 cursor 始终不出现；CUA `move` 真实移动鼠标立即触发。
- **原因**：recharts 的 hover 激活路径对事件有额外要求（合成 `dispatchEvent` 的 `isTrusted: false` 事件走不通），属 IAB 合成事件局限的又一变体（同族：press 失灵、focus 不触发 onBlur）。
- **解决**：验证 hover 用 `tab.cua.move({ x, y })` 移真实鼠标，坐标从截图里量。

### 新机器上登录/注册一律 500（本地库未迁移，2026-10）

- **现象**：换一台机器 clone 后直接 `pnpm dev`，`POST /auth/sign-in/email` 稳定 500（响应体为空），`/auth/get-session` 却正常 200——极像代码坏了，其实代码没动过。
- **原因**：`.data/pg` 在 gitignore 里不随仓库走；API 启动时 `createDb` 会自动 `mkdirSync` + `PGlite.create` 初始化出一个**零表裸库**，而建表靠独立的手动步骤 `pnpm --filter @wow/db migrate`（API 启动不自动迁移，仓库也没有 README 提醒）。better-auth 登录第一条 SQL 查 `user` 表 → `relation "user" does not exist` → 500。旧机器正常是因为当初跑过迁移且数据目录留存。
- **排查手段**：① 错误密码当探针——库健康应 401 INVALID_EMAIL_OR_PASSWORD，500 即 DB 层炸了；② 看 `.data/pg/base/5/` 里有没有 OID ≥ 16384 的关系文件（用户表都在这个区间，全小于即无用户表）；③ 隔离复现：`createDb({ dataDir: "/tmp/..." })` + `migrate()` + 同款 betterAuth 配置跑 signUpEmail/signInEmail，证明代码无恙。
- **解决**：`pnpm --filter @wow/db migrate` 建表。**踩坑补充**：对运行中的 API 建表后接口仍 500——API 进程是建表前打开的库，内嵌 postgres 看不到另一个进程后来创建的表，必须重启 API。不要杀用户终端里的进程，`touch apps/api/src/index.ts` 触发 tsx watch 自身重启即可（零杀进程、终端不乱）。重启后 401 恢复正常。
- **连带提醒**：迁移只建表不搬数据，旧账号在旧机器的本地库里，新机器需重新注册。


### JSX 注释写在表达式位置导致 PARSE_ERROR（侧栏动画实验时连踩两次，2026-10）

- **现象**：vite:oxc 报 `PARSE_ERROR: Expected "," or ")" but found Identifier`，报错位置指向 JSX 标签的属性名（如 `className`），乍看完全莫名。
- **原因**：把 `{/* 注释 */}` 写在了三元/return 括号内、**元素的外面**（`: ( {/* 注释 */} <div> ... )`）。括号内是"单个表达式"位置，`{/* */}` 是一个表达式容器，后面再跟 `<div>` 就成了两个表达式，解析器在 `className` 处报错。同族错误在两个文件各踩一次。
- **解决**：JSX 注释（`{/* */}`）只能放在**标签内部（children 位置）**；`return (`、`: (`、`&&` 后这类表达式位置需要注释时，用 JS 行注释 `//`（位于 JSX 外的 JS 代码位）或把注释挪进元素的 children 里。
