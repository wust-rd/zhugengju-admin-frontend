# HTTP 封装（defHttp）README

> 路径：`packages/core/utils/http/axios/`。全项目唯一的 HTTP 请求入口，所有业务 API（`api/*`）均通过 `defHttp` 发起请求。

## 文件职责

| 文件 | 职责 |
|------|------|
| `index.ts` | 导出 `defHttp` 实例（默认配置 + 拦截器组装） |
| `Axios.ts` | `DefHttp` 类：封装 axios 实例、请求/响应拦截器、统一入参 |
| `axiosTransform.ts` | 响应转换策略：`transformRequestHook` / `transformResponseHook` / `requestCatchHook` 等钩子 |
| `checkStatus.ts` | HTTP 状态码错误提示（400/401/403/404/500…），401 时登出或触发会话超时 |
| `axiosCancel.ts` | 重复请求取消（`Repeat`）与全量取消（`cancelAllRequest`） |
| `helper.ts` | `joinTimestamp`（时间戳防缓存）、`formatRequestDate` 等工具 |

## 统一响应协议

后端固定返回 `{ sessionid, result, message, ...data }`，前端按 `result` 分发：

| result | 含义 | 处理 |
|--------|------|------|
| `"true"` | 成功 | 返回 `data`，正常渲染 |
| `"false"` | 业务失败 | 按 `errorMessageMode` 提示（`none` / `message` / `modal`） |
| `"login"` | 登录失效 | 自动跳转登录页（携带 redirect） |

## 请求头约定

- `x-requested-with: XMLHttpRequest`（识别 Ajax 请求）
- `x-ajax: json`（后端返回 JSON）
- `x-token: <token>`（认证令牌，从 `userStore` 读取）

## 使用示例

```ts
import { defHttp } from '@jeesite/core/utils/http/axios';

// GET
export const siteForm = (params?: any) =>
  defHttp.get({ url: adminPath + '/cms/site/form', params });

// POST（表单参数）
export const siteListData = (params?: any) =>
  defHttp.post({ url: adminPath + '/cms/site/listData', params });

// POST（JSON body）
export const siteSave = (params?: any, data?: any) =>
  defHttp.postJson({ url: adminPath + '/cms/site/save', params, data });

// 指定错误提示模式
export const userDelete = (params?: any) =>
  defHttp.get({ url: adminPath + '/sys/user/delete', params }, { errorMessageMode: 'modal' });
```

## 设计要点

1. **错误模式分级**：页面级可用 `errorMessageMode` 覆盖默认模式，静默请求用 `'none'`。
2. **会话超时处理**：`projectSetting.sessionTimeoutProcessing` 可切换 `PAGE_COVERAGE`（弹层覆盖）或登出。
3. **重复请求取消**：短时间重复相同请求自动 cancel 上一次。
4. **防缓存**：`helper.joinTimestamp` 为 GET 追加时间戳参数。

## 关联文档

- 交互时序图见根目录 `CODE_WIKI.md` §4.4.2
- API 定义规范见根目录 `RULES.md`
