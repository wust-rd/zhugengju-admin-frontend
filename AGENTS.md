# 住更局管理后台 — 项目说明

> Monorepo（pnpm workspace + Turbo）：`web/` 应用入口 + `packages/*`（core / display / assets / vite 等）。
> 完整项目知识见 `docs/` 目录（入口 [docs/README.md](./docs/README.md)：架构、Hooks、组件、路由、API、布局）。
> 本文件面向 AI 编码助手与新加入的开发者；原根目录 `AGENT.md` 已并入（AI 工具行业事实标准文件名为 **AGENTS.md** 复数）。
> **冲突时以文末各「硬性规则」小节为准**（适用范围见各条标注）。

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
3. **启动**：`cd web && pnpm dev`（后端代理地址以 `web/.env*` 的 `VITE_PROXY` 为准）。
4. **HTTP 统一入口**：所有 API 必须走 `defHttp`（见 CODE_WIKI §4.4.2 与 `packages/core/utils/http/axios/README.md`）。
5. **响应协议**：后端返回 `{ sessionid, result, message, data }`，`result` 为 `"true"|"false"|"login"`。
6. **权限模式**：默认 BACK（后端返回菜单路由），权限码 `模块:实体:操作`，用 `v-auth` 指令或 `hasPermission()`。
7. **i18n**：展示文案走 `useI18n`——**适用于框架/通用包（packages/*）**；业务模块（urban-health-check、urban-protection 等）现阶段为纯中文 UI 假数据，文案直接中文，后端接入后再统一 i18n 化。
8. **代码检查**：**适用于框架/通用包**；业务模块按文末「验证方式（硬性规则）」执行（模块级 type:check）。

## 2. 任务处理流程（SOP）

### 2.1 新增一个 CRUD 功能
1. 读 `RULES.md` R11（Checklist）+ 参考一个相似已有页面（如 `cms/site`）。
2. 按 R2 建 API → R1 建三文件页面 → R3 加权限 → R4 加 i18n → R9 注册路由。
3. 树形页面用 R6，复杂表单用 R5（CollapseForm 分区）。
4. 检查 `pnpm lint` 与 `vue-tsc` 无错误（业务模块见文末验证方式）。

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
| `pnpm lint` | oxlint + ESLint（框架/通用包用） |
| `pnpm format` | Prettier 格式化 |

---

# 硬性规则（冲突时以此为准）

## 时间处理约定（硬性规则）

- 项目统一使用 **dayjs**（antdv-next 内部亦为 dayjs）：所有时间相关的取值、计算、格式化、比较，一律经 dayjs 得出；
- **禁止**使用原生 `new Date()` / `Date.now()` / `getFullYear()` 等，或手写字符串拼接/截取来处理时间；
- 统一从 `@jeesite/core/utils/dateUtil` 引入：`dateUtil` 即 dayjs 本体，另有 `formatToDateTime` / `formatToDate`；
  - 示例：当前年 `dateUtil().year()`；格式化 `dateUtil('2026-01-01').format('YYYY-MM-DD')`；
- 生成「最近 N 年」选项时可参考 `packages/core/libs/year.ts` 的 `buildYearItems(count)`（注意其返回 `{key,label}` 菜单项结构，用于 Select 时需映射为 `{label,value}`）。

## 文件命名约定（硬性规则）

- `.vue` / `.ts` 文件名与**目录名**一律**小写中划线（kebab-case）**，如 `list.vue`、`id-list.vue`、`dim-table.vue`、`indicator-system/`，包括 shared 共享组件在内，不用大驼峰；
- 下钻 show 页目录沿用既定的 `_id/` 约定(菜单组件位置已按此注册)；
- 组件 `name`（keep-alive 用）仍按 `Views` + 路由 PascalCase 规则，与文件命名无关。

## 下钻路由约定（硬性规则）

- 列表页 `handleDetail` 一律用 **`record.code`** 跳 RESTful show 路由：`go(\`/模块/资源/${record.code}\`)`；`{id}` 路由的 id 永远是记录的 **code 字段**，不用名称/年份/目录等业务字段充当 id；
- show 页（`_id/list.vue`）按 `MOCK_LIST.find((item) => item.code === params.id)` 反查（兼容 `params.id ?? params.code` 占位符写法）；名称等仅用于卡片标题/页签 `setTitle`。

## 文件下载约定（硬性规则）

- **所有文件下载统一使用 `file-saver`**：`import { saveAs } from 'file-saver';` → `saveAs(blob, 文件名)`；
- 远程文件先 `fetch(url)` 取 `blob` 再 `saveAs`；后端返回文件流（blob/ArrayBuffer）时同样经 `saveAs` 保存，文件名带扩展名（如 `${record.reportName}.pdf`）；
- `window.open(url, '_blank')` 仅用于**预览**（新标签页），下载动作不得用它或裸 `<a download>` 替代；
- 依赖装在使用它的业务模块内（如 `@jeesite/urban-health-check`），类型用 `@types/file-saver`；
- **Excel 导出复用仓库既有 `xlsx`（SheetJS 0.18.5，`packages/core/components/Excel` 同源）**：业务模块按同版本声明 `xlsx` 依赖即可（零新增外部包），**勿新装 exceljs 等表格库**；简单平铺导出可用 `@jeesite/core` 的 `aoaToSheetXlsx`/`jsonToSheetXlsx`，多级合并表头直接 `utils.aoa_to_sheet` + `!merges`/`!cols`，落盘仍经 `write(..., { type: 'array' })` → `saveAs`（社区版不支持字体/填充样式与冻结窗格，属预期取舍）；业务模块新增依赖后需重启 dev server 才能被 Vite 解析；
- 参照实现：`modules/packages/urban-health-check/views/urban-health-check/report-generation/list.vue` 的 `handleDownload`；Excel 多级表头导出参照 `modules/packages/ifco/views/ifco/progress-fill/export-excel.ts`。

## 抽屉查看模式约定（硬性规则）

生成带「查看模式」的表单抽屉（form.vue，BasicDrawer + useDrawerInner + isView）时，必须遵守：

- **form.vue**：`BasicDrawer` 必须加 **`force-render`**（页面加载即挂载抽屉内容，消除首次打开的懒挂载）；**不要**绑定响应式的 `:show-footer`；
- **打开方（list.vue）**：在 `openDrawer` **之前**预设底部按钮显隐：`setDrawerProps({ showFooter: !record.isView })`；
- **form.vue 回调内**：只设表单级禁用 `await setProps({ disabled: isView })`（抽屉体内，安全）。

**原因**：打开动画/首次懒挂载进行中翻转抽屉级 prop（show-footer true→false）会打断 antdv-next Drawer 的首次渲染——表现为**首次点击不弹抽屉、无任何报错、第二次点击才弹**（内容挂载完成后翻转即无害，故仅首击失败）。

参照实现：`modules/packages/urban-protection/views/urban-protection/urban/relic/` 与 `urban-health-check` 各 form.vue 及其头注释。

## 原型页移植风格（硬性规则）

- 移植外部原型（kd_server static 等 HTML 原型）时，**优先复用本项目框架组件与既定布局范式**，不照搬原型手写的 HTML/CSS 布局；原型只决定**信息结构与业务内容**（字段、统计、操作、交互语义）；
- 「左侧分类 + 右侧列表」一律用 **`PageWrapper` #sidebar + `BasicTree`**（`:search/:toolbar`，嵌套树记得 `:treeDataSimpleMode="false"`，参照 `packages/core/views/sys/menu/index.vue`、`sys/area/index.vue`），不用手写左侧导航卡片；
- 列表筛选一律用 **BasicTable `formConfig` 标准搜索表单**（`useSearchForm: true`），不用页面内手写筛选行；纯假数据阶段可用**本地 api 函数**（过滤 + 内存分页，返回 `{ list, count }` 对齐 fetchSetting）走标准搜索/分页流程，后端接入后替换为 defHttp 接口；
- 展示类小卡片（统计等）用 antdv `Card` + UnoCSS 原子类，颜色语义与既有页面保持一致。

## 验证方式（硬性规则）

- 改动后的验证只做：**模块级 `pnpm run type:check`**（根目录全量 type:check 存在既有环境错误，勿以它判败）与 **Vite 转译可达性检查**（dev server 请求模块返回 200）；
- **不要打开浏览器进行验证或截图** —— 用户会自己打开浏览器调试；
- 除非用户当次明确要求，否则不使用任何 Browser 工具；
- 交付时列出「建议自查点」，由用户在浏览器确认视觉效果。

## modules 目录类型声明约定（硬性规则）

- `modules/packages` 目录下的代码，类型声明**一律使用 `type` 别名，不使用 `interface`**；
- 继承语义用交叉类型表达：`type B = A & { ... }`；
- 其他目录（`packages/*`、`web/` 等）用 `type` 还是 `interface` 不受本条约束。
