# 02 — Hooks 体系

> 全部组合式函数（Composables）位于 `packages/core/hooks/`，按功能分 5 类。

## 目录分类

| 分类 | 路径 | 数量 | 用途 |
|------|------|------|------|
| `core/` | `hooks/core/` | 6 | 底层通用逻辑 |
| `event/` | `hooks/event/` | 6 | 浏览器事件/DOM |
| `web/` | `hooks/web/` | 16 | 业务/Web 功能 |
| `setting/` | `hooks/setting/` | 5 | 全局配置读取 |
| `component/` | `hooks/component/` | 2 | 组件级逻辑 |

---

## 一、core/ — 底层通用

### `onMountedOrActivated`
```ts
// 在 mounted 和 activated 时都执行（兼容 keep-alive）
import { onMountedOrActivated } from '@jeesite/core/hooks/core/onMountedOrActivated'
onMountedOrActivated(() => { /* 数据刷新 */ })
```

### `useAttrs`
```ts
// 获取组件 attrs（排除 inheritAttrs 的透传属性）
import { useAttrs } from '@jeesite/core/hooks/core/useAttrs'
```

### `useContext`
```ts
// 提供/注入上下文
import { useContext } from '@jeesite/core/hooks/core/useContext'
```

### `useLockFn`
```ts
// 锁定异步函数，防止重复执行（如防重复提交）
import { useLockFn } from '@jeesite/core/hooks/core/useLockFn'
const submit = useLockFn(async () => { /* 提交逻辑 */ })
```

### `useRefs`
```ts
// 批量 ref 管理
import { useRefs } from '@jeesite/core/hooks/core/useRefs'
```

### `useTimeout`
```ts
// 安全的 setTimeout（组件销毁时自动清除）
import { useTimeout } from '@jeesite/core/hooks/core/useTimeout'
```

---

## 二、event/ — 浏览器事件/DOM

### `useEventListener`
```ts
// 事件监听（自动清理）
import { useEventListener } from '@jeesite/core/hooks/event/useEventListener'
```

### `useBreakpoint`
```ts
// 响应式断点判断
import { useBreakpoint } from '@jeesite/core/hooks/event/useBreakpoint'
```

### `useIntersectionObserver`
```ts
// 元素可见性检测（懒加载等）
import { useIntersectionObserver } from '@jeesite/core/hooks/event/useIntersectionObserver'
```

### `useScroll`
```ts
// 滚动位置监听
import { useScroll } from '@jeesite/core/hooks/event/useScroll'
```

### `useScrollTo`
```ts
// 平滑滚动到指定位置
import { useScrollTo } from '@jeesite/core/hooks/event/useScrollTo'
```

### `useWindowSizeFn`
```ts
// 窗口大小变化回调
import { useWindowSizeFn } from '@jeesite/core/hooks/event/useWindowSizeFn'
```

---

## 三、web/ — 业务/Web 功能（⭐ 最重要）

### `usePage` — 页面跳转
```ts
import { useGo, useRedo, useQuery } from '@jeesite/core/hooks/web/usePage'

const go = useGo(router)           // 跳转：go('/path') 或 go({ name: 'route' })
const redo = useRedo(router)       // 刷新当前页：await redo()
const query = useQuery(router)     // 响应式路由 query 参数
```

### `usePermission` — 权限判断 ⭐
```ts
import { usePermission } from '@jeesite/core/hooks/web/usePermission'
const { hasPermission } = usePermission()

// 支持权限码匹配（冒号分隔，如 user:sys:menu:edit）
hasPermission('sys:menu:edit')     // true/false
hasPermission(['sys:menu:edit', 'sys:menu:view'])
```

### `useMessage` — 消息提示
```ts
import { useMessage } from '@jeesite/core/hooks/web/useMessage'
const { showMessage, showMessageModal, createConfirm, notification } = useMessage()

showMessage('操作成功', 'success')
showMessage('posfull:大量文字内容...')  // posfull: 前缀自动弹出大模态框
showMessageModal({ content: '提示内容' })
createConfirm({ iconType: 'warning', content: '确认删除？', onOk: async () => {} })
```

### `useI18n` — 国际化
```ts
import { useI18n } from '@jeesite/core/hooks/web/useI18n'
const { t } = useI18n('sys.menu')  // 加载指定模块语言包
t('确定')  // 翻译
```

### `useTabs` — 多标签操作
```ts
import { useTabs } from '@jeesite/core/hooks/web/useTabs'
const { closeCurrent, closeAll, tabStore } = useTabs(router)
```

### `useECharts` — 图表
```ts
import { useECharts } from '@jeesite/core/hooks/web/useECharts'
const { setOptions, echarts } = useECharts(chartRef)
```

### `usePagination` — 分页
```ts
import { usePagination } from '@jeesite/core/hooks/web/usePagination'
const { getPaginationInfo, setPagination } = usePagination()
```

### `useAppInject` — 响应式判断
```ts
import { useAppInject } from '@jeesite/core/hooks/web/useAppInject'
const { getIsMobile } = useAppInject()  // 是否移动端
```

### 其他 web hooks
| Hook | 用途 |
|------|------|
| `useContentHeight` | 内容区高度计算 |
| `useContextMenu` | 右键菜单 |
| `useCopyToClipboard` | 复制到剪贴板 |
| `useFullContent` | 全屏内容模式 |
| `useLockPage` | 锁屏功能 |
| `useScript` | 动态加载 JS 脚本 |
| `useSortable` | 拖拽排序 |
| `useTitle` | 页面标题设置 |
| `useWatermark` | 页面水印 |

---

## 四、setting/ — 全局配置读取

| Hook | 返回 | 用途 |
|------|------|------|
| `useGlobSetting` | 环境变量（apiUrl, ctxPath, adminPath 等） | 获取后端地址、上下文路径 |
| `useMenuSetting` | 菜单配置（collapsed, show, mode, theme 等） | 侧边栏菜单控制 |
| `useHeaderSetting` | 头部配置（fixed, show, bgColor 等） | 顶部栏控制 |
| `useRootSetting` | 根配置（themeColor, grayMode, colorWeak 等） | 全局主题/模式 |
| `useTransitionSetting` | 过渡动画配置（enable, basicTransition 等） | 页面切换动画 |
| `useMultipleTabSetting` | 多标签配置（show, cache, style 等） | 多标签页控制 |

```ts
// 典型用法：任何地方获取配置
import { useGlobSetting } from '@jeesite/core/hooks/setting'
const { ctxAdminPath, apiUrl, title } = useGlobSetting()
```

---

## 五、component/ — 组件级

| Hook | 用途 |
|------|------|
| `useFormItem` | 表单项上下文（配合 Form 组件使用） |
| `usePageContext` | 页面上下文（配合 Page 组件使用） |

---

## 典型模式：如何在页面中使用

```vue
<script lang="ts" setup name="ViewsSysMenuIndex">
  import { ref, onMounted } from 'vue'
  import { useI18n } from '@jeesite/core/hooks/web/useI18n'
  import { useMessage } from '@jeesite/core/hooks/web/useMessage'
  import { useGo } from '@jeesite/core/hooks/web/usePage'
  import { usePermission } from '@jeesite/core/hooks/web/usePermission'
  import { PageWrapper } from '@jeesite/core/components/Page'

  const { t } = useI18n('sys.menu')
  const { showMessage } = useMessage()
  const go = useGo()
  const { hasPermission } = usePermission()

  async function handleSave() {
    await someApi()
    showMessage(t('保存成功'), 'success')
    go('/sys/menu')
  }
</script>
```
