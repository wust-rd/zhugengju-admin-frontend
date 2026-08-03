# 05 — 状态管理与 API

## 一、Pinia Store 体系

所有 Store 位于 `packages/core/store/modules/`：

| Store | ID | 用途 |
|-------|------|------|
| **user** | `app-user` | 用户信息、Token、角色、登录/登出、页面缓存 |
| **permission** | `app-permission` | 权限码、菜单列表、动态路由构建 |
| **app** | `app` | 项目配置、主题模式、PageLoading |
| **multipleTab** | `app-multipleTab` | 多标签页状态（tab 列表、缓存） |
| **errorLog** | `app-errorLog` | 错误日志收集 |
| **locale** | `app-locale` | 国际化语言切换 |
| **lock** | `app-lock` | 锁屏状态 |

### store 外部调用模式

```ts
// Pinia store 实例
import { store } from '@jeesite/core/store'

// 在 setup 外使用（如 API 文件、路由守卫）
export function useUserStoreWithOut() {
  return useUserStore(store)  // 手动传入 store 实例
}
```

---

## 二、User Store（核心）

```ts
// 状态
interface UserState {
  userInfo: Nullable<UserInfo>    // 用户信息
  token?: string                   // 会话 Token
  roleList: RoleEnum[] | string[]  // 角色列表
  sessionTimeout?: boolean         // 是否登录过期
  lastUpdateTime: number           // 最后更新时间
  pageCache: any                   // 页面缓存（刷新保持）
  emitter: Emitter<any>            // 全局事件总线
}

// 关键方法
store.login(params)              // 登录 → 获取用户信息 → 构建路由 → 跳转首页
store.afterLoginAction(res)      // 登录后处理：设置信息、构建路由、检查密码修改提示
store.logout()                   // 注销
store.getUserInfoAction()        // 获取当前用户信息
store.setPageCache(key, value)   // 设置页面缓存（含 demoMode, sysCode, roleCode 等）
```

---

## 三、Permission Store（权限核心）

```ts
// 关键方法
store.buildRoutesAction()    // 根据权限模式构建路由树
store.changePermissionCode() // 从后端获取权限码
```

---

## 四、API 层

### 目录结构
```
packages/core/api/
├── index.ts              # 导出
├── model/
│   └── baseModel.ts      # 基础模型：Page<T>, BasicModel<T>, TreeModel<T>
└── sys/
    ├── login.ts          # 登录/注销/用户信息/权限/菜单路由/皮肤切换
    ├── menu.ts           # 菜单 CRUD
    ├── role.ts           # 角色 CRUD
    ├── user.ts           # 用户 CRUD
    ├── office.ts         # 机构 CRUD
    ├── company.ts        # 公司 CRUD
    ├── post.ts           # 岗位 CRUD
    ├── area.ts           # 区域 CRUD
    ├── dictType.ts       # 字典类型
    ├── dictData.ts       # 字典数据
    ├── config.ts         # 参数配置
    ├── module.ts         # 模块
    ├── log.ts            # 日志
    ├── online.ts         # 在线用户
    ├── upload.ts         # 文件上传
    ├── empUser.ts        # 员工用户
    ├── corpAdmin.ts      # 企业管理
    ├── secAdmin.ts       # 安全审计
    └── account.ts        # 个人账户
```

### 基础模型

```ts
// 分页
interface Page<T> {
  pageNo: number; pageSize: number; orderBy: string; count: number; list: T[]
}

// 基础 CRUD 模型
interface BasicModel<T> {
  id: string; page: Page<T>; isNewRecord: boolean
  createBy? / createDate? / updateBy? / updateDate? / status?
}

// 树形模型（扩展 BasicModel）
interface TreeModel<T> extends BasicModel<T> {
  parentCode?; parentCodes?; treeNames?; treeSort?; treeSorts?
  treeLeaf?; treeLevel?; childList?: T[]; isRoot?; isTreeLeaf?
}
```

### API 写法

```ts
// 典型 POST 请求
export const loginApi = (params, mode = 'none') =>
  defHttp.post({ url: adminPath + '/login', params }, { errorMessageMode: mode })

// 典型 GET 请求
export const userInfoApi = (mode = 'message') =>
  defHttp.get({ url: adminPath + '/index' }, { errorMessageMode: mode })
```

**`errorMessageMode`**:
- `'none'` → 不提示
- `'message'` → 顶部消息提示
- `'modal'` → 弹窗提示

---

## 五、HTTP 请求封装

位于 `packages/core/utils/http/axios/`：

```
http/axios/
├── index.ts              # 创建 defHttp 实例 + 请求/响应拦截器
├── Axios.ts              # VAxios 类（封装 axios）
├── axiosCancel.ts        # 请求取消管理
├── axiosTransform.ts     # 数据转换接口
├── checkStatus.ts        # HTTP 状态码处理
└── helper.ts             # 辅助函数（时间戳、日期格式化）
```

### 核心配置

```ts
// 请求头
headers: {
  'content-type': 'application/x-www-form-urlencoded',
  'x-requested-with': 'XMLHttpRequest',
  'x-ajax': 'json',         // 告知后端这是 AJAX 请求
}

// Token 放在 x-token 头
authenticationHeader: 'x-token'
```

### 响应拦截

后端统一返回格式：
```json
{ "sessionid": "xxx", "result": "true|false|login", "message": "..." }
```

- `result === 'login'` → 自动跳转登录页
- `result === 'false'` → 根据 `errorMessageMode` 显示错误
- 非 object 类型 → 直接返回原始数据

### 请求选项

```ts
requestOptions: {
  joinPrefix: true,        // URL 前加 prefix
  joinTime: true,          // GET 请求加时间戳防缓存
  withToken: true,         // 携带 Token
  ignoreCancelToken: true, // 忽略重复请求取消
  errorMessageMode: 'modal',
  // ...
}
```
