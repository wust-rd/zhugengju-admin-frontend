# 01 — 项目架构

## 1. Monorepo 组织

采用 **pnpm workspace + Turbo** 管理多包：

```
jeesite-vue/
├── web/                       # 🚀 主应用（入口极薄，只含 main.ts + App.vue + vite.config）
├── packages/
│   ├── core/                  # 🔑 核心包：hooks、组件、页面、路由、状态、API、布局、工具
│   ├── cms/                   # 📄 内容管理系统（文章、栏目、站点、聊天）
│   ├── dbm/                   # 🗄️ 数据库管理（表管理、数据操作、数据源）
│   ├── dfm/                   # 📋 动态表单设计器
│   ├── vite/                  # ⚙️ Vite 工具链：插件、主题系统、构建配置
│   ├── types/                 # 🏷️ 全局 TypeScript 类型声明（axios/record/store/config）
│   ├── assets/                # 🖼️ 静态资源
│   └── test/                  # 🧪 测试工具
├── pnpm-workspace.yaml        # 定义 workspace 范围
├── turbo.json                 # Turbo 构建编排
├── tsconfig.json              # 根 TS 配置
└── uno.config.ts              # UnoCSS 配置
```

**包依赖关系**：`web` → `core`/`cms`/`dbm`/`dfm`（应用层）→ `vite`/`types`（基础层）

**包名规范**：所有包以 `@jeesite/` 为 scope，版本统一为 `5.18.0`

## 2. 技术栈

| 类别 | 技术 | 版本 |
|------|------|------|
| 框架 | Vue 3 (Composition API) | 3.5.38 |
| 构建 | Vite | 8.0.10 |
| 语言 | TypeScript | 6.0.3 |
| UI 库 | Ant Design Vue Next (`antdv-next`) | 1.3.7 |
| 图标 | `@antdv-next/icons` + `@iconify/json` | — |
| 路由 | Vue Router | 5.1.0 |
| 状态 | Pinia | 2.3.1 |
| HTTP | Axios | 1.17.0 |
| 样式 | Less + UnoCSS (Wind3 preset) | — |
| 国际化 | vue-i18n | 11.4.5 |
| 图表 | ECharts | 6.1.0 |
| 工具 | lodash-es, dayjs, crypto-js, qs | — |
| 包管理 | pnpm | 11.6.0 |
| 构建编排 | Turbo | 2.9.18 |
| 代码检查 | oxlint + ESLint + Prettier + Stylelint | — |

## 3. 启动流程

`web/src/main.ts` 中 `bootstrap()` 的初始化顺序：

```
1. createApp(App)              — 创建 Vue 应用
2. setupStore(app)             — 挂载 Pinia
3. initAppConfigStore()        — 初始化系统配置（主题、布局、多标签等）
4. registerGlobComp(app)       — 全局注册 Input + Button
5. setupI18n(app)              — await 国际化，确保首屏文字正确
6. setupRouter(app)            — 挂载路由 + 初始化 tabPage/toastr 全局函数
7. setupRouterGuard(router)    — 注册路由守卫（6个守卫按顺序）
8. setupGlobDirectives(app)    — 全局指令（权限、加载等）
9. setupErrorHandle(app)       — 全局错误处理
10. app.mount('#app')          — 先挂载，让用户尽快看到页面
11. setupDForm()               — 延迟加载动态表单设计器
```

## 4. 应用结构关系

```
App.vue
└── AppProvider (Application 组件)
    └── RouterView
        └── DefaultLayout (layouts/default/index.vue)
            ├── LayoutFeatures      (异步组件)
            ├── LayoutHeader        (顶部栏)
            ├── LayoutSideBar       (侧边栏，可选)
            ├── LayoutMultipleHeader (多标签头部)
            ├── LayoutContent       (内容区：RouterView + iframe)
            └── LayoutFooter        (页脚，异步组件)
```

## 5. 核心包内部结构

```
packages/core/
├── api/             # 接口层，按模块分目录（sys/ msg/ state/）
├── components/      # 业务组件，每个组件一个目录，内含 src/
├── design/          # 全局 Less 样式
├── directives/      # 全局 Vue 指令
├── enums/           # 枚举：appEnum, pageEnum, httpEnum, menuEnum, roleEnum, cacheEnum
├── hooks/           # 组合式函数，按功能分 core/ event/ web/ setting/ component/
├── layouts/         # 布局系统：default/ iframe/ page/
├── locales/         # 国际化语言包 + setupI18n
├── logics/          # 业务逻辑：初始化配置、错误处理、主题切换、路由变化事件
├── router/          # 路由：guard/ helper/ menus/ routes/
├── settings/        # 项目配置 (projectSetting) + 设计令牌 (designSetting)
├── store/           # Pinia stores: app, user, permission, multipleTab, errorLog, locale, lock
├── utils/           # 工具函数：http/axios, auth, cache, cipher, env, dateUtil 等
└── views/           # 业务页面：sys/ msg/ state/
```

## 6. 构建系统

Vite 配置从 `@jeesite/vite` 包导入，该包导出：
- **plugins/**：compress、html、legacy、monacoEditor、unocss、visualizer
- **options/**：build、css、define、server
- **config/**：appConfig、getEnvConfigName
- **theme/**：主题系统（亮/暗切换、颜色变量、Less 预处理器）

## 7. 权限模式

在 `projectSetting.ts` 中配置，支持三种模式：
- **BACK**（默认）：后端返回菜单路由，动态注册
- **ROUTE_MAPPING**：前端定义路由 + 角色过滤
- **ROLE**：前端定义路由 + 角色过滤（不走菜单映射）
