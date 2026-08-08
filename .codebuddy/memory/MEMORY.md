# JeeSite Vue 项目长期记忆

> 住更局管理后台，基于 JeeSite Vue 5.18.0。以下内容由 docs/ 目录文档提炼。

## 项目文档体系（2026-08-05 建立）

- 根目录 `CODE_WIKI.md`：代码维基（依赖/架构/模块划分包图 + 各模块用例图/流程图/顺序图，mermaid）。
- 根目录 `RULES.md`：通用模式 R1~R11（三文件页面/API 定义/权限码/i18n/CollapseForm/树形页面/组件封装/Store/路由模块/消息提示/Checklist）。
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
- **display 地图技术栈（2026-08-08）**：`packages/display` 依赖 `maplibre-gl@^6.1.0`（不是 mapboxgl）。**坑 1**：v6 下 style 对象内**内联 geojson source 的 data 不渲染**，必须 `map.once('load')` 后 `map.addSource(id, {type:'geojson', data})` + `map.addLayer({type:'fill', ...})` 动态添加。**坑 2（更隐蔽）**：v6 的 GeoJSON/矢量解析依赖独立 worker，**必须配置 worker URL，否则 geojson 图层不渲染而 raster 底图正常**（maplibre-gl-js #8109）。已建共享模块 `packages/display/utils/maplibre.ts`：`setWorkerUrl(import('maplibre-gl/dist/maplibre-gl-worker.mjs?url'))`，scheme/project 两个地图页面 import 它（须先于 new Map()）。TSX 中 `GeoJSON.FeatureCollection` 全局命名空间不可用（tsconfig 限制），用自定义轻量类型 `type PolygonFeature = { type:'Feature'; properties: Record<string, never>; geometry: { type:'Polygon'; coordinates: number[][][] } }` 标注。天地图底图用 DataServer REST 接口 + t0~t7 子域名，token 取 `import.meta.env.VITE_TIANDITU_TOKEN`。调试用 `window.map1` 需类型断言 `(window as unknown as { map1: MapLibreMap }).map1 = map`（项目无全局声明先例）。

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
