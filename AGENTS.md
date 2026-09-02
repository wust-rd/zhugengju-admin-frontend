# 住更局管理后台 — 项目说明

> Monorepo（pnpm workspace + Turbo）：`web/` 应用入口 + `packages/*`（core / display / assets / vite 等）。
> 完整项目知识见 `docs/` 目录（入口 [docs/README.md](./docs/README.md)：架构、Hooks、组件、路由、API、布局）。

## 时间处理约定（硬性规则）

- 项目统一使用 **dayjs**（antdv-next 内部亦为 dayjs）：所有时间相关的取值、计算、格式化、比较，一律经 dayjs 得出；
- **禁止**使用原生 `new Date()` / `Date.now()` / `getFullYear()` 等，或手写字符串拼接/截取来处理时间；
- 统一从 `@jeesite/core/utils/dateUtil` 引入：`dateUtil` 即 dayjs 本体，另有 `formatToDateTime` / `formatToDate`；
  - 示例：当前年 `dateUtil().year()`；格式化 `dateUtil('2026-01-01').format('YYYY-MM-DD')`；
- 生成「最近 N 年」选项时可参考 `packages/core/libs/year.ts` 的 `buildYearItems(count)`（注意其返回 `{key,label}` 菜单项结构，用于 Select 时需映射为 `{label,value}`）。

## 抽屉查看模式约定（硬性规则）

生成带「查看模式」的表单抽屉（form.vue，BasicDrawer + useDrawerInner + isView）时，必须遵守：

- **form.vue**：`BasicDrawer` 必须加 **`force-render`**（页面加载即挂载抽屉内容，消除首次打开的懒挂载）；**不要**绑定响应式的 `:show-footer`；
- **打开方（list.vue）**：在 `openDrawer` **之前**预设底部按钮显隐：`setDrawerProps({ showFooter: !record.isView })`；
- **form.vue 回调内**：只设表单级禁用 `await setProps({ disabled: isView })`（抽屉体内，安全）。

**原因**：打开动画/首次懒挂载进行中翻转抽屉级 prop（show-footer true→false）会打断 antdv-next Drawer 的首次渲染——表现为**首次点击不弹抽屉、无任何报错、第二次点击才弹**（内容挂载完成后翻转即无害，故仅首击失败）。

参照实现：`modules/packages/urban-protection/views/urban-protection/urban/relic/` 与 `urban-health-check` 各 form.vue 及其头注释。

## 验证方式（硬性规则）

- 改动后的验证只做：**`pnpm type:check`** 与 **Vite 转译可达性检查**（dev server 请求模块返回 200）；
- **不要打开浏览器进行验证或截图** —— 用户会自己打开浏览器调试；
- 除非用户当次明确要求，否则不使用任何 Browser 工具；
- 交付时列出「建议自查点」，由用户在浏览器确认视觉效果。
