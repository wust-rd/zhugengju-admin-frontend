# 06 — 布局系统

## 一、布局类型

```
layouts/
├── default/               # ⭐ 主后台布局（Header + Sider + Content + Tabs + Footer）
│   ├── index.vue          # 布局组装入口
│   ├── header/            # 顶部栏 + 多标签头部
│   ├── sider/             # 侧边菜单栏
│   ├── menu/              # 菜单组件
│   ├── content/           # 内容区
│   ├── tabs/              # 多标签页
│   ├── trigger/           # 折叠/展开触发器
│   ├── feature/           # 功能开关（异步加载）
│   ├── footer/            # 页脚（异步加载）
│   └── setting/           # 布局设置抽屉
├── iframe/                # iframe 页面加载
│   ├── index.vue          # iframe 容器
│   ├── FramePage.vue      # 嵌入页面
│   ├── FrameSimple.vue    # 简易嵌入
│   ├── FrameBlank.vue     # 空白页
│   └── useFrameKeepAlive.ts  # iframe KeepAlive 状态管理
├── page/                  # 页面过渡动画
│   ├── index.vue
│   └── transition.ts      # 过渡效果配置
└── views/                 # 布局级视图（登录、锁屏、桌面、异常页等）
```

---

## 二、DefaultLayout 组合结构

```
DefaultLayout
├── LayoutFeatures           # 功能面板（异步加载）
├── LayoutHeader (fixed)     # 固定顶部栏（条件显示）
└── Layout (has-sider)       # 侧边栏容器（条件显示）
    ├── LayoutSideBar        # 侧边栏
    └── Layout (main)        # 主内容区
        ├── LayoutMultipleHeader   # 多标签头部
        ├── LayoutContent          # 内容区（RouterView）
        └── LayoutFooter           # 页脚（异步加载）
```

**条件渲染逻辑**（通过 settings hooks 控制）：
```ts
const { getShowFullHeaderRef } = useHeaderSetting()   // 是否显示顶部
const { getShowSidebar, getShowMenu } = useMenuSetting()  // 是否显示侧边栏
const { getIsMobile } = useAppInject()                 // 移动端判断
```

---

## 三、Header（顶部栏）

```
header/
├── index.vue                  # 顶部栏主体
├── index.less                 # 样式
├── MultipleHeader.vue         # 多标签模式下额外显示的头部
└── components/
    ├── index.ts               # 导出所有组件
    ├── Breadcrumb.vue         # 面包屑
    ├── ErrorAction.vue        # 错误日志入口
    ├── FullScreen.vue         # 全屏按钮
    ├── OnlineCount.vue        # 在线人数
    ├── lock/LockModal.vue     # 锁屏弹窗
    ├── notify/index.vue       # 通知中心
    ├── notify/NoticeList.vue  # 通知列表
    ├── notify/data.ts         # 通知数据/API
    └── user-dropdown/
        ├── index.vue          # 用户下拉菜单
        └── DropMenuItem.vue   # 下拉菜单项
```

**可配置项**（`projectSetting.headerSetting`）：
- `fixed` — 固定顶部
- `show` — 显示/隐藏
- `bgColor` — 背景色
- `theme` — 主题
- `useLockPage` — 启用锁屏
- `showFullScreen` — 全屏按钮
- `showDoc` — 文档按钮
- `showNotice` — 通知中心
- `showSearch` — 菜单搜索

---

## 四、Sider（侧边栏）

```
sider/
├── index.vue              # 侧边栏入口
├── LayoutSider.vue        # 展开式侧边栏
├── MixSider.vue           # 混合模式侧边栏（折叠时显示图标）
├── DragBar.vue            # 拖拽调整宽度条
└── useLayoutSider.ts      # 侧边栏逻辑 Hook
```

**可配置项**（`projectSetting.menuSetting`）：
- `collapsed` — 折叠/展开
- `menuWidth` — 宽度
- `mode` — 模式（INLINE/VERTICAL/HORIZONTAL）
- `type` — 类型（MIX/SIDEBAR/TOP_MENU）
- `theme` — 主题
- `split` — 分割菜单
- `accordion` — 手风琴模式（只展开一个子菜单）
- `trigger` — 折叠触发位置

---

## 五、Tabs（多标签页）

```
tabs/
├── index.vue              # 标签栏主体
├── index3.less            # 样式
├── types.ts               # 类型
├── useMultipleTabs.ts     # 标签逻辑：新增、关闭、缓存、右键菜单
├── useTabDropdown.ts      # 下拉菜单逻辑
└── components/
    ├── TabContent.vue     # 标签内容
    ├── TabRedo.vue        # 刷新按钮
    └── FoldButton.vue     # 折叠按钮
```

**可配置项**（`projectSetting.multiTabsSetting`）：
- `show` — 显示/隐藏
- `cache` — 标签页缓存
- `style` — 样式（1-5 种）
- `canDrag` — 可拖拽排序
- `showQuick` — 快捷操作
- `showRedo` — 刷新按钮

---

## 六、Setting（布局设置抽屉）

```
setting/
├── index.vue               # 设置抽屉（右侧滑出）
├── SettingDrawer.tsx        # 抽屉组件（TSX 编写）
├── enum.ts                  # 枚举
├── handler.ts               # 设置变更处理
└── components/
    ├── index.ts
    ├── SwitchItem.vue       # 开关项
    ├── SelectItem.vue       # 选择项
    ├── InputNumberItem.vue  # 数字输入项
    ├── ThemeColorPicker.vue # 主题色选择器
    ├── TypePicker.vue       # 类型选择器
    └── SettingFooter.vue    # 底部操作（重置/复制）
```

设置项涵盖：主题色、暗黑模式、导航模式、菜单模式、内容区域、页眉/侧边栏主题、多标签样式、面包屑、动画等。

---

## 七、iframe 系统

`layouts/iframe/useFrameKeepAlive.ts` 管理 iframe 页面的 KeepAlive 状态。

**全局函数**（`window.tabPage`，在 `router/index.ts` 中初始化）：
```js
window.tabPage.addTabPage(this, title, url)      // 打开新标签页（支持 iframe）
window.tabPage.getCurrentTabPage(callback)        // 获取当前标签 iframe 的 window
window.tabPage.getPrevTabPage(callback, close)    // 获取前一标签 iframe
window.tabPage.closeCurrentTabPage(callback)      // 关闭当前标签
```

**全局 Toastr**（兼容旧版 JeeSite）：
```js
window.toastr.showMessage(msg, type, duration)    // 显示消息
window.toastr.success/error/warning/info(msg)     // 快捷方法
```

---

## 八、布局级视图关键页面

| 文件 | 功能 |
|------|------|
| `login/Login.vue` | 登录主页（含 LoginForm, QrCodeForm, MobileForm, RegisterForm, ForgetPasswordForm） |
| `login/useLogin.ts` | 登录逻辑 Hook |
| `lock/LockPage.vue` | 锁屏页面 |
| `redirect/index.vue` | 重定向转发 |
| `exception/` | 403/404/500 异常页 |
| `desktop/analysis/` | 数据分析看板（ECharts） |
| `desktop/workbench/` | 工作台首页 |
| `account/center.vue` | 个人中心 |
| `account/modPwd.vue` | 修改密码 |
| `errorLog/` | 前端错误日志列表 |
