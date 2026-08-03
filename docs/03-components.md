# 03 — 组件体系

> 全部业务组件位于 `packages/core/components/`，共 35+ 个。

## 组件目录规范

每个组件遵循统一目录结构：
```
ComponentName/
├── index.ts              # 入口：withInstall 包装，支持 app.use()
├── src/
│   ├── index.vue         # 主组件
│   ├── props.ts          # Props 类型定义
│   ├── hooks/            # （可选）组件级 hooks
│   ├── types/            # （可选）组件级类型
│   └── components/       # （可选）子组件
```

**全局注册**（`registerGlobComp.ts`）：仅注册 Input（antdv-next 的）和 Button（本项目的），两者体积小。

---

## 一、布局组件

### `Application` — 应用根容器
```
components/Application/src/
├── index.vue          # AppProvider：全局配置注入 + 主题应用
└── search/            # 菜单搜索
```
```vue
<!-- App.vue 中使用 -->
<AppProvider><RouterView /></AppProvider>
```

### `Page` — 页面容器（PageWrapper）⭐
包裹所有页面，提供标题、描述、侧边栏等插槽。
```vue
<PageWrapper :sidebarWidth="200">
  <template #sidebar>...</template>
  <!-- 主内容 -->
</PageWrapper>
```

### `Container` — 内容容器
```
Container/src/
├── index.vue          # 支持折叠展开的容器
└── collapse/          # 折叠相关
```

### `Scrollbar` — 自定义滚动条

---

## 二、数据展示组件

### `Table`（高级表格）⭐
```
Table/src/
├── index.vue            # 主表格（分页、排序、筛选、选择）
├── props.ts             # 丰富的 Props 配置
├── hooks/               # useTable, useTableForm, useTableHeader 等
├── types/               # 表格列、操作、参数类型
└── components/
    ├── editable/        # 行内编辑功能
    └── settings/        # 列设置（显示/隐藏/排序）
```
```vue
<BasicTable @register="registerTable" />
```

### `Description` — 描述列表
```vue
<Description :data="detail" :schema="descSchema" />
```

### `CardList` — 卡片列表
```vue
<CardList :data="list" />
```

### `VirtualScroll` — 虚拟滚动

### `Tree` — 树形组件（BasicTree）⭐
```
Tree/src/   # 支持搜索、工具栏、异步加载、节点拖拽
```
```vue
<BasicTree :api="treeApi" :search="true" :toolbar="true" @select="onSelect" />
```

### `Time` — 时间显示

---

## 三、表单组件

### `Form`（高级表单）⭐
```
Form/src/
├── index.vue            # 基于 JSON Schema 的动态表单
├── hooks/               # useForm, useFormEvents
├── types/               # FormSchema, FormProps, FormActionType
└── components/          # 各类表单项组件
```
```ts
// 典型的表单 Schema 驱动
const schemas: FormSchema[] = [
  { field: 'name', component: 'Input', label: '名称' },
  { field: 'status', component: 'Select', label: '状态' },
]
```

### `CollapseForm` — 可折叠的搜索表单

### `Upload` — 文件上传
```vue
<BasicUpload :api="uploadApi" />
```

### `Excel` — Excel 导入导出
```vue
<ExcelUpload @success="onImportSuccess" />
```

---

## 四、导航组件

### `Menu` — 菜单
```
Menu/src/
├── index.vue            # Ant Design Menu 封装
└── components/          # 子菜单、图标等
```

### `SimpleMenu` — 简易菜单（顶栏用）
```
SimpleMenu/src/
├── index.vue
└── components/
```

---

## 五、反馈组件

### `Modal` — 模态框
```
Modal/src/
├── index.vue            # 基础模态框封装
├── hooks/               # useModal
└── components/
```

### `Dialog` — 对话框（无遮罩层）

### `Drawer` — 抽屉
```
Drawer/src/
├── index.vue
├── hooks/
└── components/
```

### `Popover` — 气泡卡片

### `Loading` — 加载中
```vue
<Loading :loading="isLoading" />
```

### `ContextMenu` — 右键菜单

---

## 六、编辑器组件

### `CodeEditor` — 代码编辑器
```
CodeEditor/src/
├── index.vue               # 统一入口
├── MonacoEditor/           # Monaco 编辑器（VS Code 内核）
├── codemirror/             # CodeMirror 5 编辑器
└── json-preview/           # JSON 预览组件
```

### `WangEditor` — 富文本编辑器
```
WangEditor/src/
├── index.vue
└── plugin-upload-attachment/  # 自定义附件上传插件
    ├── module/menu/           # 菜单按钮
    ├── constants/
    └── utils/
```

### `Markdown` — Markdown 渲染/编辑（基于 Vditor）

---

## 七、工具组件

### `Icon` — 图标
```vue
<Icon icon="i-ant-design:close-outlined" color="#555" />
```
支持 Iconify 图标（`i-` 前缀）和 ant-design 图标。

### `Button` — 按钮（全局注册）
```vue
<Button type="primary">提交</Button>
```

### `Dict` — 数据字典
```ts
// 获取字典数据
import { useDict } from '@jeesite/core/components/Dict'
const { initGetDictList } = useDict()
const list = await initGetDictList('sys_menu_sys_code')
// [{ name: '默认', value: 'default' }, ...]
```

### `Dropdown` — 下拉菜单
```vue
<Dropdown :dropMenuList="menuList">
  <span>点击</span>
</Dropdown>
```

### `ClickOutSide` — 点击外部区域

### `CountDown` — 倒计时

### `CountTo` — 数字滚动

### `ValidCode` — 图形验证码

---

## 八、业务组件

### `Cropper` — 图片裁剪（基于 cropperjs）

### `Qrcode` — 二维码生成

### `Verify` — 滑块/拼图验证

### `StrengthMeter` — 密码强度检测（基于 zxcvbn）

### `Preview` — 图片预览

### `ListSelect` — 列表选择器
```
ListSelect/src/selectType/   # 不同类型：单选、多选
```

### `Transition` — 动画过渡

### `Resizer` — 拖拽调整大小

---

## 典型用法：页面中的组件组合

```vue
<template>
  <PageWrapper>
    <BasicTable @register="registerTable">
      <template #toolbar>
        <Button type="primary" @click="handleAdd">新增</Button>
      </template>
      <template #action="{ record }">
        <Dropdown :dropMenuList="actionMenu(record)" />
      </template>
    </BasicTable>
    <EditModal @register="registerModal" @success="reload" />
  </PageWrapper>
</template>
```
