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
    │   ├── index.tsx             # 数据看板主页面（DisplayPageLayout 左右布局）
    │   ├── district-chart.tsx    # 片区行政区划分布柱状图（echarts）
    │   └── invest-total-card.tsx # 片区投资总额卡片（Subway 数字 + 环形图）
    └── policy-management/        # 政策管理（三个菜单页，对齐 kd_server 政策库原型 static/*.html）
        ├── classified-navigation/        # 政策分类导航（政策库管理）
        │   ├── list.vue                 # 左树右表(对齐 sys/menu):BasicTree 分类导航 + 统计卡片 + 表格
        │   └── form.vue                 # 新增/编辑/查看抽屉（含上传文件与版本变更记录）
        ├── semantic-matching/
        │   └── index.vue                # 语义关联度匹配（薄壳，mode="semantic"）
        ├── keyword-search.vue           # 关键字查询（薄壳单文件，mode="keyword"；路由无 /index 后缀）
        └── shared/
            ├── policy-search.vue        # 检索页完整实现（两页共用：侧栏历史/收藏/订阅 + 检索卡 + BasicTable）
            ├── detail-drawer.vue        # 政策详情抽屉（Description 元数据 + 版本记录 + 关联政策，两页共用）
            └── highlight.ts             # 命中词高亮切分工具（标题/摘要/命中片段共用）
```

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
  关键词单行输入 + 搜索；空关键词 = 查看全部已入库政策。
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
- 大屏页在 `packages/display/router/index.ts` 注册路由（`/display/early-stage-planning`，组件指向本包 `views/overview/index`）；
- 大屏专用共享组件（RightDrawer / AreaOverviewModal 等）仍在 `packages/display/components/early-stage-planning/`，本包经 `@jeesite/display/...` 引用；
- 管理页菜单为 BACK 模式后端注册，组件位置与链接地址一致（见各页面文件头注释）；
- 政策管理三页已接 kd_server 接口（见下节）；overview 大屏页数据仍为静态占位，接入后端后替换。
