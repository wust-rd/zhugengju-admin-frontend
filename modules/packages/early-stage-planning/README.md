# @jeesite/early-stage-planning 前期规划

市住更局 —— 前期规划业务包（结构对齐 `@jeesite/ifco` / `@jeesite/urban-health-check`）。

## 目录结构

```
modules/packages/early-stage-planning/
├── package.json          # 包定义（workspace 成员，pnpm-workspace.yaml 已含 modules/**）
├── tsconfig.json         # extends 根 tsconfig，paths: @jeesite/early-stage-planning/* → ./*
├── api/                  # 接口层（kd_server 政策库接口，dev 经 /policy_api 代理）
│   └── early-stage-planning/
│       └── policy-management/
│           └── policy.ts         # defHttp 接口层（字典/政策 CRUD/文件上传/片段检索 + snake→camel 映射）
└── views/
    ├── overview/         # 大屏展示页（display 应用，TSX，自 packages/display/views/early-stage-planning 迁入）
    │   ├── index.tsx             # 数据看板主页面（DisplayPageLayout 左右布局；点片区概况面板「查看详情」整页切到详情页）
    │   ├── area-detail/          # 片区详情路由页（大屏）：index.tsx 页面（左展示面板 + 右 RightDrawer）/ display-panel.tsx 左侧面板 / route.ts 路径工具
    │   ├── right-drawer/         # 片区详情右侧抽屉（6 区块 + scrollspy 联动；v-model:activeTab 供左右联动）
    │   ├── area-format.ts        # 片区行数据展示格式化（概况面板与详情页共用，避免口径漂移）
    │   ├── area-overview-modal.tsx # 地图点选片区的概况悬浮面板
    │   ├── district-chart.tsx    # 片区行政区划分布柱状图（echarts）
    │   └── invest-total-card.tsx # 片区投资总额卡片（Subway 数字 + 环形图）
    └── policy-management/        # 政策管理（三个菜单页，对齐 kd_server 政策库原型 static/*.html）
        ├── classified-navigation/        # 政策分类导航（政策库管理）
        │   ├── list.vue                 # 左树右表(对齐 sys/menu):BasicTree 分类导航 + 统计卡片 + 表格
        │   └── form.vue                 # 新增/编辑/查看抽屉（含上传文件与版本变更记录）
        ├── qa-helper/
        │   ├── list.vue                 # 政策问答助手（ai-elements-vue 组件组合,左侧对话历史侧栏）
        │   └── components/              # ai-elements-vue 源码级移植(UnoCSS + antd 底座,无新增依赖)
        │       ├── cn.ts                # 类名拼接(shadcn cn 的零依赖版)
        │       ├── conversation/        # 粘底滚动容器/内容列/空态/回到底部按钮
        │       ├── message/             # 消息行/气泡(用户蓝实底、AI 蓝浅底,无头像)
        │       ├── prompt-input/        # 表单化输入区(context 注入:自增高文本域/圆形发送按钮)
        │       ├── suggestion/          # 建议问题胶囊
        │       └── loader/              # 加载指示
        ├── semantic-matching/
        │   └── index.vue                # 语义关联度匹配（薄壳，mode="semantic"）
        ├── keyword-search.vue           # 关键字查询（薄壳单文件，mode="keyword"；路由无 /index 后缀）
        └── shared/
            ├── policy-search.vue        # 检索页完整实现（两页共用：侧栏历史/收藏/订阅 + 检索卡 + BasicTable）
            ├── detail-drawer.vue        # 政策详情抽屉（Description 元数据 + 版本记录 + 关联政策，两页共用）
            └── highlight.ts             # 命中词高亮切分工具（标题/摘要/命中片段共用）
```

## 大屏页：数据看板 → 片区详情

`views/overview/index.tsx`（数据看板，`DisplayPageLayout` 左数据面板 + 右地图）里，
地图点选片区弹出 `area-overview-modal`（概况悬浮面板），面板底部「查看详情」跳到
**片区详情路由页** `/early-stage-planning/overview/area-detail/:auid`（`:auid` = 片区 `A_UID`；
参数名刻意不用 `:id` —— `paramMenuGuard` 会拿当前路由 params 替换后台菜单里同名的 `:xxx` 占位，
而本模块下钻页菜单正是 `:id`/`:code` 形式，同名会互相干扰）：

- 路由注册：`packages/core/router/routes/modules/early-stage-planning.ts`。**前端声明路由放在这里
  能被真实挂载** —— BACK 菜单模式下 `permissionStore.buildRoutesAction` 同样会合并前端路由
  （`routes = [...asyncRoutes, ...routeList]`）；且它随登录重建，不会被 `resetRouter` 清掉后
  不再回来（直接 `router.addRoute` 的会）。路径落在 `/early-stage-planning/overview/` 前缀下，
  布局按 `nav-links.tsx` 的 `isDisplayRoute` 自动判定为沉浸式全屏，无需开关。
  若后端菜单后续也注册了同路径，删掉该文件即可（避免重复注册）。
- 页面：`views/overview/area-detail/` —— `index.tsx` 路由页（按 `:id` 走 `loadAreas('全部')`
  自行取数，刷新 / 直接打开链接都可用；从看板点进来命中同一份批次缓存，不重复请求）、
  `display-panel.tsx` 左侧展示面板、`route.ts` 路径工具（跳转方引用，避免静态引入详情页组件）；
- 布局：左侧展示面板 + 右侧 `right-drawer`（420px，组件自带 `absolute right-0 top-0 h-full w-420px`，
  故页面根节点为 `relative h-[calc(100vh-88px)]`）；
- 左右联动：`activeTab`（抽屉当前区块）由页面持有并 `v-model:activeTab` 给抽屉，
  左侧面板既接收它（抽屉 → 面板，据此切换展示内容）也能 `tabChange` 反向驱动抽屉（面板 → 抽屉）；
- 返回：优先 `router.back()`（回到看板，看板被 keep-alive 缓存时状态原样保留），
  直接打开链接无历史时兜底跳看板路径；
- 待补充：左侧展示区的真实内容（图片轮播 / 地图 / 视频等）与抽屉各区块的业务数据
  （抽屉内 6 个区块目前仍是静态占位内容）。

## 政策管理三页

- **政策分类导航** `/early-stage-planning/policy-management/classified-navigation/list`：
  布局对齐 `sys/menu`（`PageWrapper` #sidebar 左树右表）——左侧 `BasicTree`（政策层级/政策类型/业务领域三组，
  叶子带计数，选中即过滤，带搜索/工具栏）；右侧统计卡片（收录总数/现行有效/即将到期/已废止）+
  标准 `BasicTable`（标题/文号/发布单位/提交状态搜索表单，本地 api 函数走标准搜索/分页流程）；
  操作含查看/编辑（抽屉）、预览、废止、提交、删除；
  支持 `?code=xxx` 直接打开对应政策的查看抽屉（供检索页「关联政策」跳转）。
- **语义关联度匹配** `/early-stage-planning/policy-management/semantic-matching/index`：
  项目情况多行文本 + 匹配；表格多一列相似度（Progress + 百分比）。
- **关键字查询** `/early-stage-planning/policy-management/keyword-search`：
  关键词单行输入 + 搜索；留空搜索 = 查看全部已入库政策（初始空态，点搜索后才出结果）。
- **政策问答助手** `/early-stage-planning/policy-management/qa-helper/list`：对话区按
  ai-elements-vue（shadcn-vue 体系的 AI 组件库，github.com/vuepont/ai-elements-vue）的组件分解
  与写法实现——因该库依赖 Tailwind CSS Variables/reka-ui/lucide，与本项目 UnoCSS+antdv-next 栈不兼容，
  故**源码级移植**到 `qa-helper/components/`（组件名/结构/写法保持一致，底座以 antd 替代 shadcn，
  原子类 UnoCSS 兼容）。能力：左侧对话历史侧栏（新对话/重命名/删除，localStorage 持久化）、
  粘底滚动 + 回到底部按钮、流式打字机（强制 SSE）、建议问题空态（居中）、
  引用卡片（编号 + 政策标题/单位/文号/层级等元信息 + 片段摘要两行 + 打开文件）；
  接口层 `api/.../qa.ts`。
- 检索两页共用 `shared/policy-search.vue`（项目范式：PageWrapper #sidebar 三张侧栏卡片[历史/收藏/订阅]
  + 检索区 Card + 标准 BasicTable[formConfig：层级/类型/领域/区域/发布日期区间/排序]；标题列下方展示
  命中片段并按查询词高亮；查看走 `shared/detail-drawer.vue` 详情抽屉[Description 元数据/命中片段/版本
  变更记录/关联政策]）。按「区级/市级共用抽象」约定：shared 持完整实现，薄壳持 keep-alive name 并以
  静态 prop 传 mode；历史/收藏/订阅存 localStorage（key 与原型一致：`kb_policy_match_history`/
  `kb_policy_search_history`/`kb_policy_favs`/`kb_policy_subs`，收藏与订阅两页共享）。

## 后端接口（kd_server）

- 三页数据均来自 kd_server（FastAPI），dev 下经 vite proxy 以 **`/policy_api`** 前缀代理到
  `http://10.13.31.147:8001`（配置见 `web/.env.development` 的 `VITE_PROXY`；本机 `.env.development.local`
  覆盖时以它为准，两者已同步）；
- kd_server 协议与 JeeSite `{result}` 协议不同，接口层逐请求关闭 `/js` 前缀（`joinPrefix:false`）与响应转换
  （`isTransformResponse:false`），直接取 FastAPI JSON；后端 snake_case 字段在
  `api/.../policy.ts` 统一映射为前端 camelCase（`*Label` 为后端字典翻译，展示优先用之）；
- 文件预览 = 新标签页打开 `/policy_api/api/v1/files/{id}/content?inline=true`；文件下载 = file-saver
  （fetch → blob → saveAs，依赖已装入本包）；
- 生产部署需在 nginx 增加 `location /policy_api/` 反代到 kd_server（`10.13.31.147:8001`），机理同 `/js`。

## 使用方式

- 包内路径用别名 `@jeesite/early-stage-planning/...`（tsconfig paths 生效）；
- 大屏（沉浸式全屏）由布局按路由自动判定：路径落在顶栏导航 `to` 的 `/模块/overview/` 目录前缀下即沉浸
  （`packages/core/layouts/default/header/nav-links.tsx` 的 `isDisplayRoute`，内容区 padding 归零），
  页面无需拨开关；本包看板页对应后端菜单路由 `/early-stage-planning/overview/index`
  （`packages/display/router/index.ts` 只注册 `/display` 演示应用路由，不含本包页面）；
- 大屏专用共享组件（RightDrawer / AreaOverviewModal 等）仍在 `packages/display/components/early-stage-planning/`，本包经 `@jeesite/display/...` 引用；
- 管理页菜单为 BACK 模式后端注册，组件位置与链接地址一致（见各页面文件头注释）；
- 不进菜单、只能从页面里跳进去的页面用**前端声明路由**：`packages/core/router/routes/modules/early-stage-planning.ts`
  （BACK 模式同样合并 `asyncRoutes`，见上文「大屏页」小节）；
- 政策管理三页已接 kd_server 接口（见下节）；overview 大屏页的片区/项目图斑已接 esp 接口
  （`api/.../esp-map.ts`），批次投资口径（`overview/index.tsx` 的 `BATCH_INVEST`）等仍为常量占位，后端下发后替换。
