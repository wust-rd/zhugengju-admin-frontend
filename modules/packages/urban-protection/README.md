# @jeesite/urban-protection 名城保护

市住更局 —— 名城保护业务包（结构对齐 `@jeesite/urban-health-check`）。

## 目录结构

```
modules/packages/urban-protection/
├── package.json          # 包定义（workspace 成员，pnpm-workspace.yaml 已含 modules/**）
├── tsconfig.json         # extends 根 tsconfig，paths: @jeesite/urban-protection/* → ./*
├── api/urban-protection/ # 接口层（defHttp + adminPath，adminPath=/a）
└── views/urban-protection/
    ├── overview/         # （可选）大屏展示页（display 应用，TSX）
    └── urban/            # （可选）后台管理页（Vue SFC，BACK 模式后端菜单驱动）
        └── <module>/     # 如 list.vue + form.vue（参照 indicator-system 模板）
```

## 使用方式

- 包内路径用别名 `@jeesite/urban-protection/...`（tsconfig paths 生效）；
- 后台管理页：在 `views/urban-protection/urban/<module>/` 下建 `list.vue + form.vue`，
  并在 `api/urban-protection/...` 建接口，菜单由后端 `/a/menuRoute` 返回后
  `dynamicImport` 按 `urban-protection/urban/<module>/list` 匹配加载；
- 大屏页：在 `views/urban-protection/overview/` 下建 TSX 组件，再注册到
  `packages/display/router/index.ts` 的 `/display/**`。

## 依赖

- 依赖方向：`urban-protection → core / display`（复用 core 组件与 display 大屏组件）；
- 根 `package.json` 已声明 `@jeesite/urban-protection: workspace:*`，新增依赖后需 `pnpm install`。
