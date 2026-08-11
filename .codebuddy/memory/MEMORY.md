# JeeSite Vue 项目长期记忆

> 住更局管理后台，基于 JeeSite Vue 5.18.0。以下内容由 docs/ 目录文档提炼。

## 项目文档体系（2026-08-05 建立）

- 根目录 `CODE_WIKI.md`：代码维基（依赖/架构/模块划分包图 + 各模块用例图/流程图/顺序图，mermaid）。
- 根目录 `RULES.md`：通用模式 R1~R12（三文件页面/API 定义/权限码/i18n/CollapseForm/树形页面/组件封装/Store/路由模块/消息提示/Checklist/**R12 UI 结构标签规范**）。
- 根目录 `AGENT.md`：AI 工作指南，含文档同步规则。
- 8 个复杂实现目录各建 `README.md`（http/axios、router/guard、router/helper、store/modules、layouts/default、layouts/views/login、cms/article、dfm/designer）。
- **规则**：业务变化时必须同步更新上述文档（见 AGENT.md §4）。

## 关键业务事实（代码核对）

- `@jeesite/dfm` 是薄包装：仅 re-export 独立库 `@jeesite/dfm-lib`（DDesigner/pluginManager）。
- Store 名：`app-multiple-tab`、`app-error-log`（连字符命名），共 7 个 store。
- app 包：`views/app/appComment`、`views/app/appUpgrade`（三文件 CRUD）。
- 权限白名单 `[LOGIN_PATH, MOD_PWD_PAGE]`；sessionTimeoutProcessing 默认 ROUTE_JUMP。
- BasicTable 使用面广（57 文件 import `@jeesite/core/components/Table`）。
- 新增 `@jeesite/display` 演示应用包（2026-08-06）：`/display` 前缀、独立 layout、免登录（meta.ignoreAuth）；
- **display 包 TSX 组件惯例（2026-08-06）**：组件文件 kebab-case 命名（`logo.tsx`/`nav-links.tsx`/`extra-area.tsx`），但必须**具名导出 PascalCase 变量**（`export const ExtraArea = defineComponent(...)` + 可选 `export default`），否则编辑器自动导入会按文件名推导出小写变量名，JSX 中小写标签被当 HTML 原生元素、组件不渲染。VSCode 无设置可改自动导入命名规则。
- **UI 结构标签规范（2026-08-08，RULES.md R12）**：全项目结构容器**一律用 `<div>`，禁用 HTML5 语义标签**（header/aside/main/footer/nav/section/article 等，h1~h6 同样禁用，字号用 class 控制）；组件引用必须 PascalCase。起因：display 包 `<sidebar>` 小写非标准标签触发 Vue "Failed to resolve component" 警告。display 包全部布局组件（header/sidebar/layouts）已把 `<header>`/`<aside>`/`<main>` 改为 `<div>`。
- **display 地图技术栈（2026-08-08，最终版）**：地图引擎为**超图定制版 `maplibre-gl-enhance.js`**（基于官方 v4.3.0 fork，20250425 构建，含 CRS 自定义坐标系 + proj4 + MGRS + mapbox 兼容，worker 内联）。**非 npm 依赖**：由 `web/index.html` 全局加载 `<script src="/maplibregl/maplibre-gl-enhance.js">`（UMD 挂 `window.maplibregl`）+ `<link href="/maplibregl/maplibre-gl-enhance.css">`；文件在 `web/public/maplibregl/`（另有 `iclient-maplibregl.min.css` 供超图 iclient 库用，当前未引）。**类型（已迁移到 types 包）**：`packages/types/maplibre-gl-enhance.d.ts` 全局 `declare namespace maplibregl`（借鉴官方 v4.3.0 d.ts 精炼公共 API + 超图增强 CRS/customprj/toMGRS），由**根 tsconfig 的 `compilerOptions.types` 数组**引用 `"@jeesite/types/maplibre-gl-enhance"` 全局加载（与 `@jeesite/types/global` 同机制，经 workspace 链接解析），全 monorepo（web/core/cms/dbm/display）生效；页面直接 `maplibregl.Map` 无需 import；官方 npm 包已删除（lockfile 无 maplibre）。**要点**：全局脚本声明（无 import/export）不能走 `index.d.ts` 的 `export *` 模块导出（会破坏全局性），必须靠 tsconfig `types` 数组加载。**坑（v4/v6 通用）**：style 对象内内联 geojson source 的 data 不渲染，需 `map.once('load')` 后动态 `addSource`/`addLayer`。TSX 中 `GeoJSON.FeatureCollection` 全局命名空间不可用，用自定义轻量类型 `PolygonFeature` 标注。天地图底图用 DataServer REST 接口 + t0~t7 子域名，token 取 `import.meta.env.VITE_TIANDITU_TOKEN`。调试用 `window.map1` 需类型断言。
- **useMap 使用约束（2026-08-11，重要）**：`@jeesite/vmap` 的 `useMap()` 走 inject，只能在 `<VMap>` **插槽子组件**内调用；页面根组件（`VMap` 的祖先）setup 里直接调用必报 `useMap must be used within a Map component`。标准模式 = 根组件管 UI + 提取纯逻辑子组件（`defineComponent` + `return () => null`）塞进 `<VMap>` 插槽，父组件状态通过 emits/事件通信（如 scheme 页 `emit('update:drawer')`）。地图交互优先用 `useMapLayer(map, isLoaded, (m) => { ... return cleanup })` 统一管理图层/监听器生命周期。

## 技术栈

Vue 3.5 (Composition API) + Vite 8 + TypeScript 6 + Pinia 2.3 + Ant Design Vue Next 1.3 + Vue Router 5 + Axios + Less + UnoCSS (Wind3) + ECharts 6 + vue-i18n + pnpm workspace + Turbo

## 项目架构

Monorepo 组织：`web/`（入口）→ `packages/core|cms|dbm|dfm`（应用层）→ `packages/vite|types`（基础层）。所有包 scope 为 `@jeesite/`，版本号 5.18.0。

### 启动流程（严格顺序）
1. createApp → 2. setupStore(Pinia) → 3. initAppConfigStore → 4. registerGlobComp(Input/Button) → 5. setupI18n(await) → 6. setupRouter → 7. setupRouterGuard(6个守卫) → 8. setupGlobDirectives → 9. setupErrorHandle → 10. app.mount → 11. setupDForm(延迟)

### 应用组件树
App.vue → AppProvider → RouterView → DefaultLayout(layouts/default/index.vue) → LayoutFeatures + LayoutHeader + LayoutSideBar + LayoutMultipleHeader + LayoutContent(RouterView+iframe) + LayoutFooter

### 核心包目录
`packages/core/`：api/ components/ design/ directives/ enums/ hooks/ layouts/ locales/ logics/ router/ settings/ store/ utils/ views/

## Hooks 体系 (packages/core/hooks/)

| 分类 | 路径 | 数量 | 典型 |
|------|------|------|------|
| core/ | hooks/core/ | 6 | useLockFn, useTimeout, onMountedOrActivated |
| event/ | hooks/event/ | 6 | useEventListener, useBreakpoint, useIntersectionObserver |
| web/ | hooks/web/ | 16 | usePage, usePermission, useMessage, useI18n, useTabs, useECharts |
| setting/ | hooks/setting/ | 5 | useGlobSetting, useMenuSetting, useHeaderSetting, useRootSetting |
| component/ | hooks/component/ | 2 | useFormItem, usePageContext |

## 组件体系 (packages/core/components/，35+个)

目录规范：`ComponentName/index.ts`(withInstall) + `src/index.vue` + `src/props.ts`

核心组件：BasicTable(分页/排序/筛选/行内编辑)、BasicForm(JSON Schema 驱动)、BasicTree(搜索/异步/拖拽)、PageWrapper、BasicUpload、CodeEditor(Monaco/CodeMirror)、WangEditor(富文本)、Icon(Iconify+ant-design)、Dict(数据字典)、BasicModal/Drawer、Cropper、Qrcode、Verify

全局注册仅 Input 和 Button。

## 路由系统

路由位于 `packages/core/router/`：
- 基础路由(basicRoutes)：Login、ModPwd、Root、mainOut、Redirect、404
- 异步路由(asyncRoutes)：通过 `import.meta.glob('./modules/**/*.ts')` 自动收集
- 6个路由守卫(按序)：pageGuard → pageLoadingGuard → httpGuard → scrollGuard → messageGuard → permissionGuard → stateGuard

### 权限模式 (projectSetting.ts)
- **BACK**(默认)：后端返回菜单路由，动态注册组件
- **ROUTE_MAPPING**：前端路由 + 角色过滤
- **ROLE**：前端路由 + 角色过滤

权限码冒号分隔（如 `sys:menu:edit`），通过 `usePermission().hasPermission()` 判断。

### 页面三文件模式
index.vue(入口) + list.vue(BasicTable) + form.vue(Form Schema)。树形页面用 BasicTree + PageWrapper sidebar 插槽。

## 状态管理与 API

### Pinia Stores
user(app-user)：用户信息/Token/角色/登录登出
permission(app-permission)：权限码/菜单/动态路由
app(app)：项目配置/主题/PageLoading
multipleTab(app-multipleTab)：多标签页状态
errorLog(app-errorLog)：错误日志
locale(app-locale)：国际化
lock(app-lock)：锁屏

### HTTP 封装 (packages/core/utils/http/axios/)
- 请求头：`x-requested-with: XMLHttpRequest`, `x-ajax: json`
- Token：`x-token` 头
- 后端返回：`{ sessionid, result, message }`，result 为 "true"|"false"|"login"
- result==='login' 自动跳转登录，result==='false' 按 errorMessageMode 显示错误
- errorMessageMode：'none'(不提示) | 'message'(顶部消息) | 'modal'(弹窗)

### API 目录 (packages/core/api/)
sys/ 下含 login, menu, role, user, office, company, post, area, dictType, dictData, config, module, log, online, upload, empUser, corpAdmin, secAdmin, account
基础模型：Page<T>, BasicModel<T>, TreeModel<T>

## 布局系统

### DefaultLayout
LayoutFeatures(异步) + LayoutHeader(fixed) + LayoutSideBar(侧边栏) + LayoutMultipleHeader(多标签头部) + LayoutContent(RouterView) + LayoutFooter(异步)

### 配置控制
- Header：fixed/show/bgColor/theme/锁屏/全屏/通知/搜索（useHeaderSetting）
- Sider：collapsed/menuWidth/mode/type/theme/split/accordion（useMenuSetting）
- Tabs：show/cache/style/canDrag/showQuick/showRedo（useMultipleTabSetting）
- 全局：themeColor/grayMode/colorWeak（useRootSetting）

### iframe 系统
`window.tabPage`：addTabPage/getCurrentTabPage/getPrevTabPage/closeCurrentTabPage
`window.toastr`：showMessage/success/error/warning/info（兼容旧版 JeeSite）

## 构建系统

Vite 配置从 `@jeesite/vite` 导入，导出 plugins/ options/ config/ theme/ 四大模块。
环境变量在 `web/.env*`，通过 `wrapperEnv(loadEnv(mode, root))` 加载。

## 关键路径

| 用途 | 路径 |
|------|------|
| 应用入口 | web/src/main.ts |
| 全局设置 | packages/core/settings/projectSetting.ts |
| HTTP 封装 | packages/core/utils/http/axios/ |
| 路由入口 | packages/core/router/index.ts |
| Store 入口 | packages/core/store/index.ts |
| 布局入口 | packages/core/layouts/default/index.vue |
| 环境变量 | web/.env* |
