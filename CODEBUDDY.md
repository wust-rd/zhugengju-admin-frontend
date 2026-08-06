# CODEBUDDY.md This file provides guidance to CodeBuddy when working with code in this repository.

## 工作流程（必读文档）

开始任何任务前，先读取以下文档（按优先级）。本文件（CODEBUDDY.md）随每个会话自动全文载入，其余文档按需读取：

| 优先级 | 文档 | 用途 |
|--------|------|------|
| ★★★ | `CODE_WIKI.md` | 项目全景：依赖、技术架构、模块划分（包图）及各模块用例图/流程图/顺序图，**任何任务前先读** |
| ★★★ | `RULES.md` | 通用开发模式 R1~R11 与规范，**写代码前对照** |
| ★★☆ | `AGENT.md` | AI 工作指南、任务处理 SOP 与文档同步规则 |

> 涉及架构、模块、通用模式的代码变更，必须按 `AGENT.md` §4 同步更新上述文档，避免文档漂移。

## 常用命令

| 命令 | 说明 |
|------|------|
| `cd web && pnpm dev` | 启动开发服务器，后端代理默认指向 `http://127.0.0.1:8980/js` |
| `cd web && pnpm build` | 生产构建，输出到 `web/dist/`，内存限制 4096MB |
| `cd web && pnpm build:tomcat` | Tomcat 部署模式构建（空输出目录） |
| `cd web && pnpm type:check` | TypeScript 类型检查（vue-tsc） |
| `cd web && pnpm preview` | 构建后使用 `vite preview --port 3100` 预览 |
| `cd web && pnpm report` | 构建并生成打包体积分析报告 |
| `pnpm install` | 安装所有依赖（pnpm workspace） |
| `pnpm lint` | 运行 oxlint + ESLint |
| `pnpm stylelint` | 运行 Stylelint 样式检查 |
| `pnpm format` | 使用 Prettier 格式化代码 |

**单测**：项目目前未配置 Vitest 运行脚本，测试工具位于 `packages/test/`。

## 架构总览

### Monorepo 组织

项目采用 **pnpm workspace + Turbo** 管理多包架构，所有包版本统一为 `5.18.0`，scope 为 `@jeesite/`。

```
jeesite-vue/
├── web/                    # 主应用入口（极薄层：main.ts + App.vue + vite.config）
├── packages/
│   ├── core/               # 核心包：hooks、组件、页面、路由、状态、API、布局、工具函数
│   ├── cms/                # 内容管理系统模块
│   ├── dbm/                # 数据库管理模块
│   ├── dfm/                # 动态表单设计器模块
│   ├── vite/               # Vite 工具链（插件、主题系统、构建配置）
│   ├── types/              # 全局 TypeScript 类型声明
│   ├── assets/             # 静态资源
│   └── test/               # 测试工具
├── pnpm-workspace.yaml     # workspace 范围定义
├── turbo.json              # Turbo 构建编排
└── uno.config.ts           # UnoCSS 配置（Wind3 preset）
```

**包依赖关系**：`web` → `core`/`cms`/`dbm`/`dfm`（应用层）→ `vite`/`types`（基础层）。

### 技术栈

Vue 3.5（Composition API）+ Vite 8 + TypeScript 6 + Pinia 2.3 + Ant Design Vue Next (`antdv-next`) 1.3 + Vue Router 5 + Axios + Less + UnoCSS + ECharts 6 + vue-i18n。代码检查使用 oxlint + ESLint + Prettier + Stylelint。

### 启动流程

`web/src/main.ts` 中 `bootstrap()` 严格按以下顺序初始化：

1. `createApp(App)` → 2. `setupStore(app)` 挂载 Pinia → 3. `initAppConfigStore()` 初始化系统配置 → 4. `registerGlobComp(app)` 全局注册 Input/Button → 5. `setupI18n(app)` await 国际化 → 6. `setupRouter(app)` 挂载路由 → 7. `setupRouterGuard(router)` 6个路由守卫 → 8. `setupGlobDirectives(app)` 全局指令 → 9. `setupErrorHandle(app)` 错误处理 → 10. `app.mount('#app')` → 11. `setupDForm()` 延迟加载动态表单

### 应用组件树

`App.vue` → `AppProvider`（Application 组件，负责全局配置注入和主题应用）→ `RouterView` → `DefaultLayout`（`layouts/default/index.vue`）→ `LayoutFeatures`(异步) + `LayoutHeader` + `LayoutSideBar`(可选) + `LayoutMultipleHeader` + `LayoutContent`(内容区 RouterView + iframe) + `LayoutFooter`(异步)

### 核心包内部结构

`packages/core/` 按功能分目录：
- `api/` — 接口层，按模块分目录（sys/ msg/ state/）
- `components/` — 35+ 业务组件，每个组件独立目录含 `src/` 和 `index.ts`（withInstall 包装）
- `hooks/` — 30+ 组合式函数，分 5 类：core/event/web/setting/component
- `layouts/` — 布局系统：default/ iframe/ page/ views/
- `router/` — 路由：guard/ helper/ menus/ routes/
- `store/` — Pinia stores：app, user, permission, multipleTab, errorLog, locale, lock
- `utils/` — 工具函数：http/axios, auth, cache, cipher, env 等
- `views/` — 业务页面：sys/ msg/ state/
- `locales/` — 国际化语言包 + setupI18n
- `settings/` — projectSetting（项目配置）+ designSetting（设计令牌）
- `logics/` — 业务逻辑：初始化、错误处理、主题切换、路由事件
- `enums/` — 枚举：appEnum, pageEnum, httpEnum, menuEnum 等
- `directives/` — 全局指令（权限、加载等）
- `design/` — 全局 Less 样式

### 构建系统

Vite 配置从 `@jeesite/vite` 包导入，该包导出：
- `plugins/`：compress、html、legacy、monacoEditor、unocss、visualizer
- `options/`：build、css、define、server
- `config/`：appConfig、getEnvConfigName
- `theme/`：主题系统（亮/暗切换、颜色变量、Less 预处理器）

环境变量在 `web/.env*` 中配置，通过 `wrapperEnv(loadEnv(mode, root))` 加载。

### 权限系统

在 `projectSetting.ts` 中配置三种权限模式：
- **BACK**（默认）：后端返回菜单路由，前端动态注册
- **ROUTE_MAPPING**：前端定义路由 + 角色过滤
- **ROLE**：前端定义路由 + 角色过滤（不走菜单映射）

权限码以冒号分隔（如 `sys:menu:edit`），通过 `usePermission().hasPermission()` 判断。

### 路由系统

路由位于 `packages/core/router/`：
- **基础路由**（`basicRoutes`）：Login、ModPwd、Root、mainOut、Redirect、404
- **异步路由**（`asyncRoutes`）：通过 `import.meta.glob('./modules/**/*.ts', { eager: true })` 自动收集
- **路由守卫**（按序）：createPageGuard → createPageLoadingGuard → createHttpGuard → createScrollGuard → createMessageGuard → createPermissionGuard → createStateGuard

`permission.ts` store 的 `buildRoutesAction()` 根据权限模式构建路由树。BACK 模式下调用后端 `menuRouteApi()` 获取菜单，通过 `transformObjToRoute` 动态注册组件。

### 页面组织规范

页面采用"三文件模式"：`index.vue`（入口页组合布局）+ `list.vue`（列表页使用 BasicTable）+ `form.vue`（表单页使用 Form Schema）。树形页面用 `BasicTree` + `PageWrapper` 的 sidebar 插槽组合。新增页面需要：创建页面文件 → 添加 API → 添加路由模块 → 配置菜单 → 国际化。

### HTTP 请求封装

`packages/core/utils/http/axios/` 封装 Axios：
- 请求头包含 `x-requested-with: XMLHttpRequest` 和 `x-ajax: json`
- Token 通过 `x-token` 头传递
- 后端统一返回 `{ sessionid, result, message }`，`result` 为 `"true"|"false"|"login"`
- `result === 'login'` 自动跳转登录页，`result === 'false'` 根据 errorMessageMode 显示错误
- errorMessageMode：`'none'`（不提示）、`'message'`（顶部消息）、`'modal'`（弹窗）

### 布局系统

`layouts/default/` 是主后台布局，由 Header + Sider + Content + Tabs + Footer 组成。所有区域的显示/隐藏/样式通过 `projectSetting.ts` 和对应的 settings hooks 控制（`useHeaderSetting`、`useMenuSetting`、`useMultipleTabSetting`、`useRootSetting`、`useTransitionSetting`）。

### 关键路径速查

| 用途 | 路径 |
|------|------|
| 应用入口 | `web/src/main.ts` |
| 根组件 | `web/src/App.vue` |
| 全局设置 | `packages/core/settings/projectSetting.ts` |
| HTTP 封装 | `packages/core/utils/http/axios/` |
| 路由入口 | `packages/core/router/index.ts` |
| Store 入口 | `packages/core/store/index.ts` |
| 布局入口 | `packages/core/layouts/default/index.vue` |
| 环境变量 | `web/.env*` |
| Vite 配置 | `web/vite.config.ts` |

### 组件规范

每个业务组件遵循统一目录结构：`ComponentName/index.ts`（withInstall 入口）+ `src/index.vue`（主组件）+ `src/props.ts`（Props 定义）+ 可选的 `src/hooks/`、`src/types/`、`src/components/`。

核心组件包括：BasicTable（高级表格，支持分页/排序/筛选/行内编辑）、BasicForm（JSON Schema 驱动动态表单）、BasicTree（支持搜索/异步加载/拖拽）、PageWrapper（页面容器）、BasicUpload（文件上传）、CodeEditor（Monaco/CodeMirror）、WangEditor（富文本）、BasicModal/Drawer、Icon（支持 Iconify 和 ant-design 图标）、Dict（数据字典）等。

### 全局函数

`window.tabPage` 和 `window.toastr` 在 `router/index.ts` 的 `setupRouter` 中初始化，用于 iframe 页面标签管理和兼容旧版 JeeSite 消息提示。
