# AGENT.md — 开发智能体（AI）工作指南

> 本文件面向 AI 编码助手与新加入的开发者。开始工作前，请先阅读**必读文档**；开发过程中**严格遵循 RULES.md 的通用模式**。

## 0. 必读文档（按优先级）

| 优先级 | 文档 | 用途 |
|--------|------|------|
| ★★★ | `CODE_WIKI.md` | 项目全景：依赖、技术架构、模块划分（包图）、各模块用例图/流程图/顺序图。**任何任务前先读** |
| ★★★ | `RULES.md` | 业务通用模式（R1~R12）与开发规范。**写代码前对照** |
| ★★☆ | `docs/README.md` 及 `docs/*.md` | 官方专题文档：架构、Hooks、组件、页面路由、状态 API、布局 |
| ★★☆ | 目标目录的 `README.md` | 涉及复杂实现目录时必读（见 §3 清单） |

## 1. 工作前须知（项目要点速记）

1. **Monorepo**：pnpm workspace + Turbo。业务代码在 `packages/core|cms|dbm|dfm|app`，入口在 `web/`。修改业务包代码**无需**改 `web/`。
2. **技术栈**：Vue 3.5（`<script setup>`）+ TypeScript + Ant Design Vue Next（`antdv-next`）+ Pinia + Vue Router 5 + Axios + UnoCSS + ECharts。
3. **启动**：`cd web && pnpm dev`（后端代理 `http://127.0.0.1:8980/js`）。
4. **HTTP 统一入口**：所有 API 必须走 `defHttp`（见 CODE_WIKI §4.4.2 与 `packages/core/utils/http/axios/README.md`）。
5. **响应协议**：后端返回 `{ sessionid, result, message, data }`，`result` 为 `"true"|"false"|"login"`。
6. **权限模式**：默认 BACK（后端返回菜单路由），权限码 `模块:实体:操作`，用 `v-auth` 指令或 `hasPermission()`。
7. **i18n**：展示文案必须走 `useI18n`，禁止硬编码中文。
8. **代码检查**：`pnpm lint` / `pnpm type:check` 通过后再交付。

## 2. 任务处理流程（SOP）

### 2.1 新增一个 CRUD 功能
1. 读 `RULES.md` R11（Checklist）+ 参考一个相似已有页面（如 `cms/site`）。
2. 按 R2 建 API → R1 建三文件页面 → R3 加权限 → R4 加 i18n → R9 注册路由。
3. 树形页面用 R6，复杂表单用 R5（CollapseForm 分区）。
4. 检查 `pnpm lint` 与 `vue-tsc` 无错误。

### 2.2 修改已有功能
1. 先读目标目录 `README.md`（若存在）+ 相关文档。
2. 在 `CODE_WIKI.md` 找到对应模块的流程图/顺序图，理解数据流后再改。
3. 修改后同步更新文档（见 §4）。

### 2.3 排查 Bug
1. 定位模块 → 读对应 README → 按 CODE_WIKI 时序图梳理数据流。
2. HTTP 问题先查 `defHttp` 拦截器与 `errorMessageMode`。
3. 权限问题查 `permissionGuard` 与 `buildRoutesAction`。

## 3. 复杂实现目录 README 索引

| 目录 | README | 说明 |
|------|--------|------|
| `packages/core/utils/http/axios/` | [README](packages/core/utils/http/axios/README.md) | defHttp 封装、响应协议、拦截器 |
| `packages/core/router/guard/` | [README](packages/core/router/guard/README.md) | 6 个路由守卫、权限校验 |
| `packages/core/router/helper/` | [README](packages/core/router/helper/README.md) | 后端菜单→Vue 路由转换、动态导入 |
| `packages/core/store/modules/` | [README](packages/core/store/modules/README.md) | Pinia store 一览与双入口模式 |
| `packages/core/layouts/default/` | [README](packages/core/layouts/default/README.md) | 主布局组件树与配置控制 |
| `packages/core/layouts/views/login/` | [README](packages/core/layouts/views/login/README.md) | 登录流程、状态机、会话超时 |
| `packages/cms/views/cms/article/` | [README](packages/cms/views/cms/article/README.md) | CollapseForm 分区表单范例 |
| `packages/dfm/views/dfm/designer/` | [README](packages/dfm/views/dfm/designer/README.md) | 动态表单设计器入口 |
| `packages/vmap/` | [README](packages/vmap/README.md) | MapLibre 地图组件：useMap 注入约束、useMapLayer 图层生命周期 |

## 4. 文档同步规则

> 对应 CODE_WIKI.md 的维护要求：**业务变化时更新对应文档**。

| 业务变化 | 需更新文档 |
|----------|-----------|
| 新增/删除/重命名包或模块 | `CODE_WIKI.md` §1.2、§3 包图 |
| 新增业务模块或调整功能 | `CODE_WIKI.md` 对应模块小节（用例图/流程图/顺序图） |
| 新增通用写法（3 次以上） | `RULES.md` 新增条目（R12+） |
| 改动复杂实现（HTTP/路由/Store/布局等） | 对应目录 `README.md` |
| 新增/删除复杂实现目录 | 本文档 §3 索引 + `CODE_WIKI.md` §10 文档导航 |
| 依赖/技术栈变化 | `CODE_WIKI.md` §1、§2 + 根 `package.json` |

**规则**：任何涉及架构、模块、通用模式的代码变更，必须在同一次任务中同步更新上述文档，避免文档漂移。

## 5. 常用命令

| 命令 | 用途 |
|------|------|
| `cd web && pnpm dev` | 启动开发服务器 |
| `cd web && pnpm build` | 生产构建 |
| `cd web && pnpm type:check` | 类型检查 |
| `pnpm lint` | oxlint + ESLint |
| `pnpm format` | Prettier 格式化 |
