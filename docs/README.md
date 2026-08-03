# JeeSite Vue 项目知识库

> 住更局管理后台基于 JeeSite Vue 5.18.0，用于 Agent 快速理解项目、回答问题和编写代码的参考文档。

## 文档索引

| 文档 | 内容 | 适用场景 |
|------|------|---------|
| [01-architecture.md](./01-architecture.md) | 项目架构、Monorepo 组织、技术栈、启动流程 | 理解整体结构 |
| [02-hooks.md](./02-hooks.md) | 全部 30+ Hooks 分类、用法与模式 | 复用已有 Hook、新增 Hook |
| [03-components.md](./03-components.md) | 全部 35+ 业务组件分类与用法 | 复用组件、新增组件 |
| [04-pages-routing.md](./04-pages-routing.md) | 页面组织、路由配置、权限守卫、菜单系统 | 新增页面、修改路由 |
| [05-state-api.md](./05-state-api.md) | Pinia Store、API 层、HTTP 请求封装 | 对接接口、状态管理 |
| [06-layouts.md](./06-layouts.md) | 布局系统、Header/Sider/Tabs/Content | 修改布局、新增布局 |

## 快速查找

### 我要新增一个页面
→ [04-pages-routing.md](./04-pages-routing.md) + [05-state-api.md](./05-state-api.md)

### 我要新增一个 Hook
→ [02-hooks.md](./02-hooks.md)

### 我要新增/使用一个组件
→ [03-components.md](./03-components.md)

### 我要对接后端接口
→ [05-state-api.md](./05-state-api.md)

### 我要修改路由权限
→ [04-pages-routing.md](./04-pages-routing.md)

### 我要修改布局/菜单/多标签
→ [06-layouts.md](./06-layouts.md)

## 技术栈速览

```
Vue 3.5 + Vite 8 + TypeScript 6 + Pinia 2.3
Ant Design Vue Next 1.3 + Vue Router 5 + Axios
Less + UnoCSS + ECharts 6 + vue-i18n
pnpm workspace + Turbo
```

## 关键路径

| 用途 | 路径 |
|------|------|
| 应用入口 | `web/src/main.ts` |
| 根组件 | `web/src/App.vue` |
| 核心包入口 | `packages/core/index.ts` |
| 全局设置 | `packages/core/settings/projectSetting.ts` |
| 环境变量 | `web/.env*` |
| HTTP 封装 | `packages/core/utils/http/axios/` |
| 路由入口 | `packages/core/router/index.ts` |
| Store 入口 | `packages/core/store/index.ts` |
| 布局入口 | `packages/core/layouts/default/index.vue` |
