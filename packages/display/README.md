# @jeesite/display 演示应用

独立的 `/display` 前端应用包，与后台管理（`/a` 前缀，后端菜单动态注册）完全解耦：

- 使用**独立 layout**（`layouts/index.vue`），不挂载后台 `DefaultLayout`；
- 路由**静态注册**（`router/index.ts`），组件懒加载，免登录访问（`meta.ignoreAuth`）；
- 根路由 `/` 默认跳转 `/display`（由 `setupDisplay` 覆盖 core 的 `RootRoute` 实现）。

## 目录结构

```
packages/display/
├── index.ts               # 包入口：export { displayRoutes, setupDisplay }
├── router/index.ts        # /display 路由定义
├── layouts/index.vue      # 独立布局（顶部导航 + RouterView + 页脚）
├── views/                 # 演示页面
│   └── home/index.vue     # 演示首页
└── README.md
```

## 新增演示页面

1. 在 `views/` 下新建页面组件；
2. 在 `router/index.ts` 的 `children` 中添加路由（`path` 相对 `/display`，`meta.ignoreAuth` 控制是否免登录）；
3. 如需展示于导航栏，在 `layouts/index.vue` 中追加 `RouterLink`。

## 挂载方式

`web/src/main.ts` 的 `bootstrap()` 中，在 `setupRouter(app)` 之后、`setupRouterGuard(router)` 之前调用：

```ts
setupRouter(app);
setupDisplay(router); // 注册 /display 路由 + 根路由重定向
setupRouterGuard(router);
```

## 与后台的关系

| 维度 | 后台（core + 各业务包） | 演示应用（display） |
|------|------------------------|---------------------|
| 路由前缀 | `/a/**`（后端菜单驱动） | `/display/**`（静态） |
| 布局 | DefaultLayout | 独立 layout |
| 鉴权 | 登录 + 权限码 | 默认公开（ignoreAuth） |
| 菜单 | 后端菜单 | 无（导航自绘） |

## 备注

- 依赖方向：`display → core`（可复用 core 组件/hooks，核心包零改动，便于从 source 同步）；
- 根 `package.json` 已声明 `@jeesite/display: workspace:*`，新增依赖后需 `pnpm install`。
