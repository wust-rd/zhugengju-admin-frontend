# 住更局管理后台 — 项目说明

> Monorepo（pnpm workspace + Turbo）：`web/` 应用入口 + `packages/*`（core / display / assets / vite 等）。
> 完整项目知识见 `docs/` 目录（入口 [docs/README.md](./docs/README.md)：架构、Hooks、组件、路由、API、布局）。

## 验证方式（硬性规则）

- 改动后的验证只做：**`pnpm type:check`** 与 **Vite 转译可达性检查**（dev server 请求模块返回 200）；
- **不要打开浏览器进行验证或截图** —— 用户会自己打开浏览器调试；
- 除非用户当次明确要求，否则不使用任何 Browser 工具；
- 交付时列出「建议自查点」，由用户在浏览器确认视觉效果。
