# 登录注册

## 后端

- better-auth 服务全量接管 honojs 的 /auth/* 路由（sign-up/email、sign-in/email、sign-out、get-session 等）
- betterAuth -> drizzleAdapter -> 连接 better-auth 要求的四张数据库表
- 配置邮箱密码登录
- 配置 session：httpOnly cookie，无需 refresh token，7 天绝对上限 + 每天滑动续期一次（get-session 时自动延长），活跃用户不掉线
- 

## 前端

1. 网站加载后如 session 未过期则进入主页，否则进入登录页面
2. 给 / 和 /chat/xx 路由的父路由做 beforeload 登录校验，未登录直接进入登录页面，并配置跳转路径方便登录成功后跳转；如在未登录下用户手动输入地址直接进主页，则跳转到 login ；直接进入某个会话详情，则跳转到 /login?next=xxx 

### 为主页和会话详情页添加路由守卫

```text
routes/
  login.tsx
  _chat.tsx            # beforeLoad 守卫（/ 与 /chat/:id 的父布局）
  _chat.index.tsx
  _chat.chat.$threadId.tsx
```

1. 在路由守卫请求用户信息，并设置新鲜时间，避免无意义的重复请求（每次进入主页和会话详情页都会执行路由守卫）
2. 未登录用户重定向到登录页，并将当前路由作为查询参数，方便登录成功后返回
3. location.href 而非 pathname——TanStack 的 location.href 是含 search 的相对路径（如 /chat/abc?tab=1），未来带参数的路由不丢信息。

```ts
// _chat.tsx
export const Route = createFileRoute("/_chat")({
  beforeLoad: async ({ context, location }) => {
    const me = await context.queryClient
      .fetchQuery({ queryKey: authKeys.me(), queryFn: fetchMe, staleTime: 5 * 60_000 })
      .catch(() => null); // 401/网络失败都视为未登录
    if (!me) {
      throw redirect({ to: "/login", search: { next: location.href } });
    }
  },
});
````
4. 在 /login 路由做反向守卫，避免已登录用户进入该页面。已登录用户直接重定向到主页

```ts
// login.tsx
export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>) => ({
    next: typeof s.next === "string" ? s.next : undefined,
  }),
  // 反向守卫：已登录的人不该看见登录页
  beforeLoad: ({ context, search }) => {
    if (context.queryClient.getQueryData(authKeys.me())) {
      throw redirect({ to: safeNext(search.next) });
    }
  },
  component: LoginPage,
});

````
5. 手动登出建议显式 router.navigate({ to: "/login" })

## 为什么当前项目不需要 access/refresh token 双令牌体系

better-auth 1.7.7 实际的会话机制

- 登录后 DB session 表存会话记录，浏览器只持有一个 httpOnly + SameSite=Lax 的签名 cookie（wow.session_token）——JS 完全读不到，XSS 偷不走。
- expiresIn 默认 7 天，cookie maxAge 同步 7 天。
- updateAge 默认 1 天：每次 get-session 时若会话年龄超过 1 天，自动延长 expiresAt 并轮换 token（下发新 Set-Cookie）。这就是滑动续期——活跃用户永不过期，闲置 7 天才失效。

也就是说“refresh token 想解决的续期问题”，updateAge 已经解决了，而且不暴露任何凭据给 JS。双令牌体系（access 短 token + refresh 长 token）是为了无状态 JWT + 不能每次都验签 DB
的场景发明的；你们是 Hono 单体 + PGLite，每个请求本来就要查库（中间件里 auth.api.getSession），服务端会话零额外成本。

前端用户信息的“存”，原则一句话：身份真源是 cookie + DB，前端只做缓存，不做存储。

- 现有 authKeys.me + tanstack-query（staleTime 5 分钟）就是正确形态——不落 localStorage、不进 zustand。zustand 继续只管 UI 草稿态（与 features/chat/store.ts 的定位一致）。
- 登录成功：invalidateQueries(authKeys.all)。
- 登出：qc.clear()（已有，正确——会话数据全部不可再见）+ 显式导航 /login。
