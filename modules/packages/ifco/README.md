# @jeesite/ifco 投融建运

市住更局 —— 投融建运业务包（结构对齐 `@jeesite/urban-protection` / `@jeesite/urban-health-check`）。
当前为空骨架，页面与接口待后续填充。

## 目录结构

```
modules/packages/ifco/
├── package.json          # 包定义（workspace 成员，pnpm-workspace.yaml 已含 modules/**）
├── tsconfig.json         # extends 根 tsconfig，paths: @jeesite/ifco/* → ./*
├── api/ifco/             # 接口层（defHttp + adminPath，adminPath=/a）
└── views/ifco/           # 页面层（待建）
    ├── overview/         # （可选）大屏展示页（display 应用，TSX）
    └── urban/            # （可选）后台管理页（Vue SFC，后端菜单驱动，dynamicImport 按路径匹配）
```

## 使用方式

- 包内路径用别名 `@jeesite/ifco/...`（tsconfig paths 生效）；
- 页面组件路径需与后端菜单「组件路径」一致（`views/` 之后的相对路径，如 `ifco/urban/xxx/list`）；
- 大屏页在 `packages/display/router/index.ts` 注册路由（组件指向本包 `views/...`）。
