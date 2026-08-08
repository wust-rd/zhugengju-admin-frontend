# RULES — 业务通用模式与开发规范

> 本文档抽象自代码库中重复出现（三次以上）的实现模式。新增功能时**优先遵循**本文档的模式，保证全库风格一致、可维护。
>
> 说明：凡标注【示例】的代码取自真实业务文件，仅作模式展示。

---

## R1. 页面"三文件模式"（index.vue + list.vue + form.vue）

> 适用：所有标准 CRUD 业务页。使用频率：40+ 页面。

### 模式结构

```
views/<module>/<biz>/
├── index.vue   # 入口：组合列表 + 表单，管理弹出/跳转
├── list.vue    # 列表：BasicTable + 搜索表单 + 操作列
└── form.vue    # 表单：新增/编辑，BasicForm 或表单 schema
```

### 规则

1. `index.vue` 持有 `show` / `record` 状态，控制 `form.vue` 弹出（Modal/Drawer）或路由跳转。
2. `list.vue` 用 `useTable` 声明式配置列与请求；操作按钮通过 `TableAction` 组件渲染。
3. `form.vue` 通过 `record.isNewRecord` 区分新增/编辑，回填用 `xxxForm` API，保存用 `xxxSave` API。
4. 复杂表单（多分区）改用 `CollapseForm` 分区模式（见 R5）。
5. 树形数据页面用 `BasicTree + PageWrapper sidebar` 组合（见 R6）。

### 关键代码片段

```ts
// list.vue — BasicTable 声明式配置
import { useTable } from '@jeesite/core/components/Table';
const [register, { reload }] = useTable({
  api: siteListData,
  columns: [
    { title: t('站点名称'), dataIndex: 'siteName' },
    // ...
  ],
});
```

```ts
// form.vue — 保存
async function handleSubmit() {
  const data = await validate();
  const res = await siteSave({ ...data, ...record.value });
  showMessage(res.message, res.result == 'true' ? 'success' : 'error');
  close();
  emitter.emit('reload', {});
}
```

---

## R2. API 定义模式（defHttp + 响应协议）

> 适用：所有业务 API 文件（`packages/*/api/**`）。使用频率：24+ 文件。

### 模式结构

```ts
import { defHttp } from '@jeesite/core/utils/http/axios';
import { BasicModel, Page } from '@jeesite/core/api/model/baseModel';

export interface Site extends BasicModel<Site> { /* 业务字段 */ }

// 单条查询（编辑回填）
export const siteForm = (params?: any) =>
  defHttp.get({ url: adminPath + '/cms/site/form', params });

// 列表查询（分页）
export const siteListData = (params?: any) =>
  defHttp.post({ url: adminPath + '/cms/site/listData', params });

// 保存（JSON body）
export const siteSave = (params?: any, data?: any) =>
  defHttp.postJson({ url: adminPath + '/cms/site/save', params, data });

// 删除
export const siteDelete = (params?: any) =>
  defHttp.get({ url: adminPath + '/cms/site/delete', params }, { errorMessageMode: 'modal' });
```

### 规则

1. **接口命名**：`xxxForm`（表单回填）、`xxxListData`（分页列表）、`xxxSave`（保存）、`xxxDelete`（删除）、`xxxEnable/xxxDisable`（启停）、`xxxRebuildIndex`（重建索引）。
2. **URL 前缀**：模块内统一 `adminPath`（后端上下文），通过 `useGlobSetting` 获取。
3. **HTTP 方法**：查询用 `get` 或 `post`，提交用 `postJson`（body 传 JSON）。
4. **响应协议**：统一 `{ sessionid, result, message, data }`，`result === 'true'` 为成功。
5. **错误提示**：默认走 `errorMessageMode` 配置；删除等危险操作显式传 `'modal'`；静默轮询传 `'none'`。
6. **类型继承**：实体继承 `BasicModel<T>`（含 `id`、`status`、`createBy` 等基础字段），分页返回用 `Page<T>`。

---

## R3. 权限控制模式（权限码 + v-auth 指令 + hasPermission）

> 适用：所有按钮/操作级权限。使用频率：v-auth 指令 19+ 处，hasPermission 多处。

### 模式结构

```html
<!-- 模板：指令式（推荐） -->
<a-button v-auth="'cms:article:edit'" @click="handleEdit">编辑</a-button>

<!-- 模板：函数式（条件复杂时） -->
<a-button v-if="hasPermission('cms:article:delete')" @click="handleDelete">删除</a-button>
```

```ts
// 组合式 API
import { usePermission } from '@jeesite/core/hooks/web/usePermission';
const { hasPermission } = usePermission();
```

### 规则

1. **权限码格式**：`模块:实体:操作`，冒号分隔（如 `sys:menu:edit`、`cms:article:edit`）。
2. **后端菜单驱动**：权限码由后端菜单/按钮配置返回，前端仅做判断（BACK 权限模式）。
3. **表单提交权限**：`CollapseForm` 用 `okAuth` prop 控制保存按钮（如 `okAuth="cms:article:edit"`）。
4. **路由权限**：菜单本身由后端动态返回，无需前端重复声明（例外：ROUTE_MAPPING / ROLE 模式）。

---

## R4. 国际化模式（useI18n + locales 语言包）

> 适用：所有展示文案。使用频率：所有业务页面。

### 模式结构

```ts
import { useI18n } from '@jeesite/core/hooks/web/useI18n';
const { t } = useI18n('cms.article'); // 指定命名空间
const { t } = useI18n();              // 默认命名空间
```

```html
<template>
  <span>{{ t('新增文章') }}</span>
</template>
```

### 规则

1. **命名空间**：业务模块用自身命名空间（`cms.article`、`cms.site`），通用文案用默认命名空间。
2. **语言包**：文案在 `packages/*/locales/` 下的 `zh_CN` / `en` 文件中维护，模板中禁止硬编码中文。
3. **动态文案**：需要动态拼接时用 `t('key', { param: value })` 插值。

---

## R5. 复杂表单分区模式（CollapseForm + 多表单子组件）

> 适用：字段超过一屏的复杂实体（如文章管理）。使用频率：cms/article 全量采用。

### 模式结构

```html
<CollapseForm :config="formConfig" :okAuth="'cms:article:edit'" @ok="handleSubmit">
  <template #main><FormBasic ref="formBasicRef" /></template>
  <template #detail><FormDetail ref="formDetailRef" /></template>
  <template #other><FormOther ref="formOtherRef" /></template>
  <template #actions> <!-- 自定义操作按钮 --> </template>
</CollapseForm>
```

```ts
const formConfig = ref([
  { label: t('基本信息'), value: 'main', open: true },
  { label: t('内容正文'), value: 'detail', open: true },
  { label: t('扩展字段'), value: 'extend', open: false },
]);
```

### 规则

1. **分区声明**：`formConfig` 声明分区（label/value/open），slot 名称与 `value` 对应。
2. **子组件通信**：父组件用 `shallowRef<InstanceType<typeof Xxx>>()` 持有各分区，统一调用 `setFieldsValue` / `validate` / `resetFields`。
3. **数据合并**：提交时 `Object.assign(...分区 validate 结果)` 汇总。
4. **按钮定制**：通过 `#actions` 插槽自定义（如文章：草稿 / 发布 / 更新随状态切换）。

---

## R6. 树形页面模式（BasicTree + PageWrapper sidebar）

> 适用：有层级结构的页面（区域、栏目、机构、字典类型等）。

### 模式结构

```html
<PageWrapper>
  <template #sidebar>
    <BasicTree :treeData="treeData" @select="handleSelect" />
  </template>
  <template #default>
    <!-- 列表内容，按选中节点过滤 -->
  </template>
</PageWrapper>
```

### 规则

1. **布局**：左侧 `BasicTree` 展示树，右侧内容区随选中节点刷新。
2. **数据模型**：树节点使用 `TreeModel<T>`（`id` / `pId` / `name` / `children`）。
3. **联动**：`treeSelect` 时更新列表查询参数并 `reload()`。
4. **异步加载**：大数据树可开启懒加载（`onLoad` 回调拉取子级）。

---

## R7. 组件封装模式（withInstall + 目录规范）

> 适用：`packages/core/components/` 下所有可复用组件。使用频率：35+ 组件。

### 模式结构

```
ComponentName/
├── index.ts      # withInstall 入口（全局注册）
└── src/
    ├── index.vue # 主组件
    ├── props.ts  # Props 定义
    └── hooks/    # 内部逻辑（可选）
```

```ts
// index.ts
import { withInstall } from '@jeesite/core/utils';
import Component from './src/index.vue';
export const BasicTable = withInstall(Component);
export default BasicTable;
```

### 规则

1. **安装方式**：组件通过 `withInstall` 包装，支持按需 import 与全局注册。
2. **Props 独立**：Props 集中在 `src/props.ts`，用 `defineOptions({ name })` 声明组件名。
3. **命名空间**：业务层组件优先引用 core 组件，禁止重复造轮子。

---

## R8. Store 状态管理模式（defineStore + WithOut 双入口）

> 适用：全局共享状态。使用频率：7 个 store。

### 模式结构

```ts
export const useUserStore = defineStore('app-user', { state, getters, actions });
// 非组件环境使用（API/守卫/工具函数）：
export function useUserStoreWithOut() {
  return useUserStore(store);
}
```

### 规则

1. **命名**：store 名 `app-xxx`（如 `app-user`、`app-permission`）。
2. **双入口**：组件内 `useXxxStore()`；守卫/API/工具函数 `useXxxStoreWithOut()`（避免在 setup 外误用导致 warning）。
3. **缓存双写**：登录态/用户信息同时写浏览器缓存（`setAuthCache`），getter 做兜底读取。
4. **页面缓存**：刷新后需恢复的状态通过 `userStore.pageCache` + mitt 事件驱动。

---

## R9. 路由模块注册模式（routes/modules/*.ts）

> 适用：新增业务路由模块。

### 模式结构

```ts
export default [
  {
    path: '/cms',
    name: 'Cms',
    component: 'LAYOUT',
    redirect: '/cms/site',
    meta: { title: '内容管理', icon: 'i-ant-design:file-text-outlined', orderNo: 10 },
    children: [
      { path: 'site', name: 'CmsSite', component: 'cms/site/list', meta: { title: '站点管理' } },
    ],
  },
];
```

### 规则

1. **自动收集**：`import.meta.glob('./modules/**/*.ts')` 自动注册，新增文件即生效。
2. **component 为字符串**：`LAYOUT` 或用 `/views` 相对路径（如 `cms/site/list`），前端动态导入。
3. **菜单联动**：路由同时作为后端菜单的数据来源（BACK 模式下由后端菜单接口返回）。
4. **页面路径**：`component` 字符串必须与 `views/` 目录结构一致，且文件唯一（同名 vue/tsx 会导入失败）。

---

## R10. 错误处理与消息提示模式（useMessage + errorMessageMode）

> 适用：所有用户交互反馈。

### 模式结构

```ts
import { useMessage } from '@jeesite/core/hooks/web/useMessage';
const { showMessage, showMessageModal, createConfirm, createModal, createDrawer } = useMessage();

// 轻提示
showMessage('保存成功', 'success');

// 确认框（删除前）
createConfirm({
  iconType: 'warning',
  title: t('sys.common.tip'),
  content: t('确认删除该记录吗？'),
  onOk: async () => { await xxxDelete(params); reload(); },
});
```

### 规则

1. **统一入口**：一律通过 `useMessage()` 获取，禁止直接用 antd 的 `message` 全局 API。
2. **错误展示分级**：API 层默认 `errorMessageMode='message'`；重要错误用 `'modal'`；后台静默用 `'none'`。
3. **删除确认**：所有删除操作必须 `createConfirm` 二次确认。
4. **HTTP 状态错误**：由 `checkStatus` 统一处理（401 登出/会话超时等）。

---

## R11. 新增页面/功能 Checklist

按以下顺序完成一个标准 CRUD 功能：

1. **API**：`api/<module>/<biz>.ts` 定义实体 + `xxxForm/xxxListData/xxxSave/xxxDelete`（R2）。
2. **页面**：`views/<module>/<biz>/` 三文件（R1）；树形结构用 R6；复杂表单用 R5。
3. **权限**：按钮加 `v-auth` 权限码（R3）。
4. **国际化**：文案进语言包，页面用 `useI18n` 读取（R4）。
5. **路由**：`router/routes/modules/` 新增模块文件（R9）。
6. **菜单**：后端配置菜单（BACK 模式）或前端路由 meta 配置（前端模式）。
7. **消息**：保存/删除反馈用 `useMessage`（R10）。

---

## R12. UI 结构标签规范（统一 div，禁用 HTML5 语义标签）

> 适用：所有页面/组件模板（display 包强制，全项目通用）。使用频率：display 包全部布局组件。
>
> **背景**：display 包曾用小写 `<sidebar>` 作为根标签（非标准 HTML 元素），Vue 报警 `Failed to resolve component: sidebar`；随后统一改为语义标签又出现 `header`/`aside`/`main` 混用。为消除歧义、统一视觉基准，规定结构容器一律用 `div`。

### 规则

1. **结构容器一律用 `<div>`**：禁止使用 HTML5 语义标签（`header` / `aside` / `main` / `footer` / `nav` / `section` / `article` / `figure` / `figcaption` 等）作为布局/结构元素；标题类标签（`h1~h6`）同样禁用，字号/加粗用 class 控制。
2. **组件引用必须 PascalCase**（`<Header />`、`<NavItem />`）；小写标签一律被视为原生元素——非标准标签（如 `sidebar`）会触发 Vue 组件解析警告且不渲染。
3. **语义通过组件命名表达**：如 `Header` 组件内部根节点是 `<div>`，业务语义由组件名承载，不依赖 HTML 标签语义。
4. **理由**：项目为纯展示层，样式全部由 UnoCSS/内联 style 控制；语义标签引入浏览器默认样式差异（`h1~h6` 字号加粗、`button` 边框等），并造成标签风格不统一。

### 示例

```tsx
// ✅ 正确：div + class 表达布局，组件 PascalCase
<div class="sticky z-50 relative flex w-80px h-full flex-col items-center shrink-0">
  <NavItem />
</div>

// ❌ 错误：非标准小写标签（Vue 报警） / 语义标签（风格不统一）
<sidebar class="..."> ... </sidebar>
<header> ... </header>
```

---

## 文档索引

| 文档 | 内容 |
|------|------|
| `CODE_WIKI.md` | 架构、模块划分、用例/流程/顺序图 |
| `AGENT.md` | 给 AI/新成员的开发工作指南 |
| `docs/*.md` | 官方专题文档（架构/Hooks/组件/路由/状态/布局） |
| 各 `src` 目录 `README.md` | 复杂实现的详细说明 |

> 新增模式：当某个写法在代码库中出现 3 次以上，应将其提炼进本文档。
