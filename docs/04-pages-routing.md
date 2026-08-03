# 04 — 页面与路由

## 一、路由架构

### 文件结构
```
packages/core/router/
├── index.ts                # 路由创建、setupRouter、tabPage/toastr 全局函数注册
├── constant.ts             # 常量（REDIRECT_NAME 等）
├── types.ts                # 路由类型定义
├── guard/                  # 路由守卫
│   ├── index.ts            # 守卫注册（6个守卫按序执行）
│   ├── permissionGuard.ts  # 权限守卫
│   ├── stateGuard.ts       # 状态守卫
│   └── paramMenuGuard.ts   # 参数菜单守卫（未启用）
├── helper/
│   ├── menuHelper.ts       # 路由→菜单转换
│   └── routeHelper.ts      # 路由辅助：扁平化、动态组件注册
├── menus/
│   └── index.ts            # 菜单数据
└── routes/
    ├── index.ts            # 基础路由 + 异步路由汇总
    ├── basic.ts            # 静态基础路由（404、Redirect）
    ├── mainOut.ts           # 外部页面路由（登录等）
    └── modules/            # 异步路由模块
        ├── account.ts      # 账户相关
        └── desktop.ts      # 桌面/首页
```

### 路由分类

**基础路由**（`basicRoutes`，始终存在）：
```ts
[LoginRoute, ModPwdRoute, RootRoute, ...mainOutRoutes, REDIRECT_ROUTE, PAGE_NOT_FOUND_ROUTE]
```

**异步路由**（`asyncRoutes`，根据权限动态注册）：
```ts
[PAGE_NOT_FOUND_ROUTE, ...routeModuleList]
```
`routeModuleList` 通过 `import.meta.glob('./modules/**/*.ts', { eager: true })` 自动收集 `routes/modules/` 下的所有路由模块。

### 权限模式与路由构建

在 `permission.ts` store 的 `buildRoutesAction()` 中：

| 模式 | 逻辑 |
|------|------|
| **BACK**（默认） | 调用后端 `menuRouteApi()` 获取菜单路由 → `transformObjToRoute` 动态注册组件 |
| **ROUTE_MAPPING** | 前端定义路由 + 角色过滤 → `transformRouteToMenu` 生成菜单 |
| **ROLE** | 前端定义路由 + 角色过滤 |

---

## 二、路由守卫（按执行顺序）

在 `router/guard/index.ts` 中 `setupRouterGuard()` 注册：

| 守卫 | 类型 | 作用 |
|------|------|------|
| `createPageGuard` | beforeEach + afterEach | 标记已加载页面（避免重复 loading） |
| `createPageLoadingGuard` | beforeEach + afterEach | 页面加载动画控制 |
| `createHttpGuard` | beforeEach | 路由切换时取消未完成的 HTTP 请求 |
| `createScrollGuard` | afterEach | hash 路由滚回顶部 |
| `createMessageGuard` | beforeEach | 路由切换时关闭弹窗/通知 |
| `createPermissionGuard` | beforeEach | 权限校验（核心守卫） |
| `createStateGuard` | afterEach | 页面状态处理 |

---

## 三、页面组织规范

### 页面目录结构
```
views/
├── sys/                     # 系统管理
│   ├── menu/                # 菜单管理
│   │   ├── index.vue        # 入口页（树+列表组合）
│   │   ├── list.vue         # 列表页
│   │   └── form.vue         # 表单页
│   ├── role/
│   │   ├── index.vue        # 列表页 + 操作
│   │   ├── form.vue         # 表单页
│   │   └── components/      # 页面级子组件（如数据权限分配）
│   ├── user/                # 用户管理
│   ├── office/              # 组织机构
│   ├── company/             # 公司管理
│   ├── post/                # 岗位管理
│   ├── area/                # 区域管理
│   ├── dictType/            # 字典类型
│   ├── dictData/            # 字典数据
│   ├── config/              # 参数配置
│   ├── module/              # 模块管理
│   ├── log/                 # 日志管理
│   ├── online/              # 在线用户
│   ├── empUser/             # 员工用户
│   └── secAdmin/            # 安全管理员
├── msg/
│   └── msgInner/            # 内部消息
└── state/
    └── cache/               # 缓存管理

# 模块包中的视图
packages/cms/views/          # CMS：文章、栏目、站点、聊天
packages/dbm/views/          # DBM：表管理、数据操作、数据源、实体
packages/dfm/views/          # DFM：动态表单设计器
```

### 页面典型三文件模式

**index.vue** — 入口页，组合布局：
```vue
<PageWrapper :sidebarWidth="200">
  <template #sidebar><BasicTree ... /></template>
  <ListView ... />
</PageWrapper>
```

**list.vue** — 列表页，使用 BasicTable：
```vue
<BasicTable @register="registerTable">
  <template #toolbar><Button>新增</Button></template>
  <template #action="{ record }"><Dropdown /></template>
</BasicTable>
```

**form.vue** — 表单页，使用 Form Schema：
```ts
const schemas = [
  { field: 'name', component: 'Input', label: '名称', rules: [{ required: true }] },
  { field: 'status', component: 'Select', label: '状态' },
]
```

---

## 四、布局级页面

位于 `layouts/views/`，不走业务路由：

| 路径 | 文件 | 用途 |
|------|------|------|
| `/login` | `login/Login.vue` | 登录页（含多种登录方式） |
| `/modPwd` | `account/modPwd.vue` | 修改密码 |
| `/account/*` | `account/` | 个人中心、安全设置、OAuth2 绑定 |
| `/desktop/*` | `desktop/` | 首页工作台、数据分析看板 |
| `/errorLog/*` | `errorLog/` | 错误日志 |
| `/exception` | `exception/` | 异常页面（403/404/500） |
| `/lock` | `lock/` | 锁屏页面 |
| `/redirect` | `redirect/` | 重定向中转 |

---

## 五、新增页面步骤

1. **创建页面文件**：在 `views/模块/目录/` 下创建 `index.vue` + `list.vue` + `form.vue`
2. **添加 API**：在 `api/模块/` 下创建接口文件
3. **添加路由**：在 `router/routes/modules/` 下创建路由模块文件（如果是新模块）
4. **添加菜单**：如果是 BACK 模式，菜单由后端返回；ROUTE_MAPPING 模式需配置菜单数据
5. **国际化**：在 `locales/` 下添加对应的语言 key
