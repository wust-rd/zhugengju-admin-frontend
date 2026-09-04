# @jeesite/expropriation-management 征收管理

市住更局 —— 征收管理业务包（结构对齐 `@jeesite/early-stage-planning` / `@jeesite/urban-health-check`）。

## 目录结构

```
modules/packages/expropriation-management/
├── package.json          # 包定义（workspace 成员，pnpm-workspace.yaml 已含 modules/**）
├── tsconfig.json         # extends 根 tsconfig，paths: @jeesite/expropriation-management/* → ./*
├── api/                  # 接口层（defHttp + adminPath，待建）
└── views/                # 页面层
    └── expropriation-management/
        └── overview/     # 大屏展示页（display 应用，TSX，自 packages/display/views/expropriation-management 迁入）
            └── index.tsx # 征收管理大屏页（项目底图 + 项目基本信息/项目改造情况 Tab + 图片预览 Modal）
```

## 使用方式

- 包内路径用别名 `@jeesite/expropriation-management/...`（tsconfig paths 生效）；
- 大屏页在 `packages/display/router/index.ts` 注册路由（`/display/expropriation-management`，组件指向本包 `views/expropriation-management/overview/index`）；
- 大屏共享组件（ScrollArea / LayerControls 等）仍在 `packages/display/components/`，本包经 `@jeesite/display/...` 引用；
- 页面内容目前为 OSS 图片直出（静态），接入接口后替换。
