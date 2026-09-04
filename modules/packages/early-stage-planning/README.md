# @jeesite/early-stage-planning 前期规划

市住更局 —— 前期规划业务包（结构对齐 `@jeesite/ifco` / `@jeesite/urban-health-check`）。

## 目录结构

```
modules/packages/early-stage-planning/
├── package.json          # 包定义（workspace 成员，pnpm-workspace.yaml 已含 modules/**）
├── tsconfig.json         # extends 根 tsconfig，paths: @jeesite/early-stage-planning/* → ./*
├── api/                  # 接口层（defHttp + adminPath，待建）
└── views/                # 页面层
    └── overview/         # 大屏展示页（display 应用，TSX，自 packages/display/views/early-stage-planning 迁入）
        ├── index.tsx             # 数据看板主页面（DisplayPageLayout 左右布局）
        ├── district-chart.tsx    # 片区行政区划分布柱状图（echarts）
        └── invest-total-card.tsx # 片区投资总额卡片（Subway 数字 + 环形图）
```

## 使用方式

- 包内路径用别名 `@jeesite/early-stage-planning/...`（tsconfig paths 生效）；
- 大屏页在 `packages/display/router/index.ts` 注册路由（`/display/early-stage-planning`，组件指向本包 `views/overview/index`）；
- 大屏专用共享组件（RightDrawer / AreaOverviewModal 等）仍在 `packages/display/components/early-stage-planning/`，本包经 `@jeesite/display/...` 引用；
- 页面数据目前为静态占位，接入接口后替换。
