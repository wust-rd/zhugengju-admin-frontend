# 城市更新专家管理（urban-renewal-expert-management）后端接口设计文档

> ⚠️ **本文档已过时（2026-09-27）**：仅作历史业务规格参考。
> 后端实际接口以 `zhugengju-admin-backend/modules/esp/docs/接口文档-城市更新专家管理.md`（v2）为准，
> 前端接口层见 `api/early-stage-planning/ure-{expert,draw,project,eval}.ts`。
> 评估流程已升级：个人评估（每人一条）+ 组长综合评估，详见后端 v2 文档与 `db/dm/ure_project_eval_upgrade.sql`。

> 面向对象：后端开发（含 AI 辅助编码）。
> 前端已完成全模块 UI（当前为本地假数据），本文档描述后端需要提供的接口、数据结构与业务规则。
> 前端代码位置：`modules/packages/early-stage-planning/views/early-stage-planning/urban-renewal-expert-management/`，
> 本地数据与状态逻辑集中在 `expert-store.ts`（前端 Pinia store，接口就绪后逐 action 替换为接口调用）。

---

## 1. 模块概述

城市更新专家管理包含 4 个子模块：

| 子模块 | 页面 | 功能 |
|---|---|---|
| 个人档案 personal-profile | 列表 + 新增/编辑 Modal + 详情页 | 专家基础信息 CRUD、统计卡（入库总数/正高级/已入选） |
| 在线抽取 online-draw | 抽取器 + 结果卡片 + 抽取记录 | 按条件从专家库随机抽取专家，确认选用后标记"已入选"；生成抽取记录 |
| 专家评价 expert-evaluation | 排名卡 + 专家列表 + 打分 Modal + 历史记录 | 对专家三维度星级打分（活跃度/专业度/效率），生成评价记录与排名 |
| 项目评估 project-evaluation | 项目列表 + 新增/编辑表单 + 项目评估页 + 项目详情页 | 评估项目全生命周期：待提交 → 评估中 → 待评价 → 已完成 |

## 2. 通用约定

### 2.1 响应协议（JeeSite 标准包装）

```json
{
  "sessionid": "xxx",
  "result": "true",       // "true" | "false" | "login"
  "message": "",
  "data": { ... }          // 业务数据
}
```

- 所有接口统一走 JeeSite 后台路径前缀 `/a`（前端 `defHttp` 的 `adminPath`）；
- 分页请求参数：`pageNo`（默认 1）、`pageSize`（默认 10）；分页响应 `data: { list: T[], count: number }`；
- 时间格式：日期 `YYYY-MM-DD`，日期时间 `YYYY-MM-DD HH:mm`；
- 主键：每个实体有 `id`（数值主键）与 `code`（业务编码，字符串，下钻路由参数）。前端跳转统一用 `code`。

### 2.2 角色与权限

三类账号角色（角色代码按此配置）：

| 角色代码 | 名称 | 数据权限 |
|---|---|---|
| `urban_coordinator` | 统筹主体 | 可新增/编辑/提交项目 |
| `urban_supervisor` | 市主管单位 | 全量只读 + 生成评估报告 |
| `urban_expet` | 专家 | 只能评估自己被抽中参与的项目；组长（项目 leader 字段）可见组员评估 |

> 前端当前以"登录用户名与专家姓名同名"做演示映射，后端应提供"当前登录账号 → 专家记录"的权威映射（见 3.1.4）。

## 3. 数据字典

### 3.1 专家 UrbanExpert（个人档案/在线抽取/专家评价共用）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | number | 是 | 主键 |
| code | string | 是 | 业务编码（下钻路由参数） |
| name | string | 是 | 专家姓名 |
| gender | string | 是 | 性别：`男` / `女` |
| age | number | 是 | 年龄 |
| phone | string | 是 | 联系电话 |
| field | string | 是 | 专业领域（枚举见 3.5） |
| title | string | 是 | 职称：`高级工程师` / `正高级工程师` |
| org | string | 是 | 单位名称 |
| orgType | string | 是 | 单位性质：`民营企业`/`国有企业`/`政府机构`/`事业单位` |
| joinDate | string(日期) | 是 | 入库时间 |
| selected | boolean | 是 | 是否已入选（被某次抽取确认选用后置 true） |
| career | string | 否 | 主要经历（长文本） |
| reviewExperience | string | 否 | 过往评审经历（长文本） |

### 3.2 专家评价记录 EvalRecord

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | number | 是 | 主键 |
| expertId | number | 是 | 关联专家 id |
| expertName | string | — | 冗余姓名（列表展示用，后端返回即可） |
| activityStars | number | 是 | 活跃度星数，0.5 步进（1~5）；换算得分 = 星数 × 2，满分 10 |
| coverageStars | number | 是 | 专业度星数（同上） |
| efficiencyStars | number | 是 | 效率星数（同上） |
| activityScore | number | — | 后端计算的得分（星数×2，保留 1 位小数） |
| coverageScore | number | — | 同上 |
| efficiencyScore | number | — | 同上 |
| time | string(日期时间) | 是 | 评价时间 |
| evaluator | string | 是 | 评价人（登录账号名） |
| comment | string | 否 | 评价说明（长文本） |
| projectCode | string | 否 | 关联项目编码（从项目评估"评价专家"进入时携带；独立评价时为空） |

### 3.3 评估项目 UrbanProject

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | number | 是 | 主键 |
| code | string | 是 | 业务编码，格式建议 `URBANPROJ-0001` |
| name | string | 是 | 项目名称 |
| adminDistrict | string | 是 | 行政区（枚举见 3.5） |
| district | string | 是 | 片区名称 |
| coordinator | string | 是 | 统筹主体 |
| implementOrg | string | 是 | 实施主体 |
| reviewMode | string | 是 | 评审模式：`线上`/`线下`/`线上+线下` |
| dept | string | 是 | 责任部门 |
| fundSource | string | 否 | 资金来源 |
| investment | string | 否 | 项目投资估算（亿元） |
| content | string | 否 | 主要项目内容（≤500 字） |
| materials | string[] | 否 | 评估材料文件名列表（上传后回填） |
| experts | string[] | 是 | 参与专家姓名列表（至少 3 名，后端校验） |
| leader | string | 是 | 组长（必须是参与专家之一） |
| startDate | string(日期) | 是 | 开始时间 |
| status | string | 是 | 状态（四态流转，见 3.4） |
| expertsEvaluated | boolean | — | 是否已完成对本项目专家的评价 |
| evalResult | string | 否 | 评估结果：`通过`/`不通过` |
| evalOpinion | string | 否 | 评估意见 |
| evalAttachments | string[] | 否 | 评估附件文件名列表 |

### 3.4 项目状态机（核心业务规则）

```
待提交 ──提交──▶ 评估中 ──专家提交评估──▶ 待评价 ──完成专家评价──▶ 已完成
  ▲                 │
  └──评估不通过回退──┘
```

| 当前状态 | 触发动作 | 目标状态 | 规则 |
|---|---|---|---|
| 待提交 | 提交 | 评估中 | 校验：至少 3 名参与专家、组长已选、必填字段齐全 |
| 评估中 | 专家提交评估（通过） | 待评价 | 写入 evalResult/evalOpinion/evalAttachments |
| 评估中 | 专家提交评估（不通过） | 待提交 | 同上；项目可修改后重新提交 |
| 待评价 | 完成专家评价 | 已完成 | 前置：本项目所有参与专家均有评价记录（projectCode 关联） |

### 3.5 枚举值

- **专业领域 field**：城市规划、建筑设计、市政工程、交通工程、生态环境、风景园林、经济学、法学
- **行政区 adminDistrict**：江岸区、汉阳区、武昌区、青山区、洪山区、硚口区
- **单位性质 orgType**：民营企业、国有企业、政府机构、事业单位
- **职称 title**：高级工程师、正高级工程师
- **评审模式 reviewMode**：线上、线下、线上+线下
- **项目状态 status**：待提交、评估中、待评价、已完成

## 4. 接口清单

### 4.1 个人档案（专家 CRUD）

| # | 接口 | Method | Path | 说明 |
|---|---|---|---|---|
| 1.1 | 专家分页列表 | GET | `/urbanExpert/list` | 参数：`name`（模糊）、`org`（模糊）、`selected`（精确，true/false）、分页。响应附带统计：`{ total, senior, selected }` |
| 1.2 | 专家详情 | GET | `/urbanExpert/detail/{code}` | 按 code 查询 |
| 1.3 | 新增/修改专家 | POST | `/urbanExpert/save` | body 为 UrbanExpert；修改带 id |
| 1.4 | 当前登录专家映射 | GET | `/urbanExpert/me` | 返回当前登录账号对应的专家记录（按账号-专家绑定关系）；非专家账号返回空 |
| 1.5 | 删除专家 | DELETE | `/urbanExpert/delete/{id}` | |

> 1.1 统计卡数据也可单独出 `GET /urbanExpert/stats`，或合并进 list 响应，前端都好接。

### 4.2 在线抽取

| # | 接口 | Method | Path | 说明 |
|---|---|---|---|---|
| 2.1 | 随机抽取 | POST | `/urbanExpert/draw` | body：`{ fields: string[]（专业领域多选）, count: number（人数，默认 3）, excludeIds: number[]（排除已展示，可选）, projectName/implementOrg/coordinator（记录用，可选） }`。**随机逻辑在后端**，返回 `UrbanExpert[]` |
| 2.2 | 确认选用 | POST | `/urbanExpert/select` | body：`{ expertIds: number[], drawRecord 参数 }`；把专家 `selected` 置 true 并生成抽取记录 |
| 2.3 | 抽取记录分页 | GET | `/urbanExpert/drawRecords` | 按时间倒序 |
| 2.4 | 抽取记录详情 | GET | `/urbanExpert/drawRecord/{id}` | 含抽取到的专家列表 |

抽取记录结构：`{ id, time, name(项目名), implementOrg, coordinator, fields: string[], count, experts: UrbanExpert[] }`

### 4.3 专家评价

| # | 接口 | Method | Path | 说明 |
|---|---|---|---|---|
| 3.1 | 提交评价 | POST | `/urbanExpert/eval/save` | body：`{ expertId, activityStars, coverageStars, efficiencyStars, comment, projectCode? }`；得分后端换算（星×2） |
| 3.2 | 某专家评价记录分页 | GET | `/urbanExpert/eval/list/{expertId}` | 按时间倒序 |
| 3.3 | 删除评价记录 | DELETE | `/urbanExpert/eval/delete/{id}` | |
| 3.4 | 平均分统计 | GET | `/urbanExpert/eval/stats` | 返回各专家 `{ expertId, activity, coverage, efficiency, count }`（排名卡用；前端也可从 3.2 自算，出接口更稳） |

### 4.4 项目评估

| # | 接口 | Method | Path | 说明 |
|---|---|---|---|---|
| 4.1 | 项目分页列表 | GET | `/urbanProject/list` | 参数：`name`（模糊）、`adminDistrict`、`reviewMode`、`status`、分页 |
| 4.2 | 项目详情 | GET | `/urbanProject/detail/{code}` | 按 code |
| 4.3 | 新增/修改项目（暂存） | POST | `/urbanProject/save` | 状态置/保持 `待提交` |
| 4.4 | 提交项目 | POST | `/urbanProject/{id}/submit` | 待提交 → 评估中；后端校验（≥3 专家、组长、必填项） |
| 4.5 | 提交评估 | POST | `/urbanProject/{id}/evaluate` | body：`{ evalResult: 通过/不通过, evalOpinion, evalAttachments }`；通过 → 待评价，不通过 → 待提交 |
| 4.6 | 完成专家评价 | POST | `/urbanProject/{id}/finishExpertEval` | 待评价 → 已完成；后端校验该项目所有参与专家已有评价记录 |
| 4.7 | 删除项目 | DELETE | `/urbanProject/delete/{id}` | 仅 待提交 状态可删 |
| 4.8 | 生成评估报告 | GET | `/urbanProject/{id}/report` | 返回文件流（pdf/docx），前端 file-saver 落盘 |

### 4.5 文件上传

| # | 接口 | Method | Path | 说明 |
|---|---|---|---|---|
| 5.1 | 上传 | POST | `/file/upload` | multipart；接受 `.pdf/.doc/.docx`，可多文件；返回文件名列表（回填 materials / evalAttachments） |

## 5. 权限矩阵

| 操作 | 统筹主体 | 市主管单位 | 专家 |
|---|---|---|---|
| 专家 CRUD / 抽取 / 确认选用 | ✅ | 只读 | ❌ |
| 新增/编辑/提交项目 | ✅ | ❌ | ❌ |
| 提交评估（4.5） | ❌ | ❌ | ✅（仅自己参与的项目） |
| 完成专家评价（4.6） | ✅ | ✅ | ❌ |
| 提交专家评价（3.1） | ✅ | ✅ | ❌（避嫌：不能评自己） |
| 生成评估报告 | ✅ | ✅ | ❌ |

## 6. 前端对接点（供前端替换时参考，后端可忽略）

前端所有本地逻辑集中在 `expert-store.ts` 的 actions，与接口对应关系：

| store action | 对应接口 |
|---|---|
| addExpert / updateExpert / removeExpert | 1.3 / 1.5 |
| queryExperts | 1.1 |
| drawExperts | 2.1 |
| markSelected + addDrawRecord | 2.2 |
| addEvaluation / removeEvaluation / recordsOf / avgScoreOf | 3.1 / 3.3 / 3.2 / 3.4 |
| addProject / updateProject / removeProject | 4.3 / 4.7 |
| （列表提交按钮）handleSubmit | 4.4 |
| （评估页）submitEvaluation | 4.5 |
| finishExpertEval | 4.6 |

## 7. 其它说明

- 所有"删除"操作前端均有二次确认，后端照常做幂等与权限校验；
- 星级换算规则（**一颗星 2 分、半颗星 1 分**，各维度满分 10 分）以后端存储的 score 为准，前端展示直接用返回值；
- 抽取的随机性由后端保证（排除已入选/已展示专家的规则在 2.1 的 excludeIds 传入）；
- 菜单注册（JeeSite 后台菜单管理，前端路由按组件路径 dynamicImport 匹配）：
  - 个人档案：`early-stage-planning/urban-renewal-expert-management/personal-profile/index`（+ 隐藏详情页 `.../personal-profile/{id}`）
  - 在线抽取：`.../online-draw/index`
  - 专家评价：`.../expert-evaluation/index`
  - 项目评估：`.../project-evaluation/index`（+ 隐藏页 `.../project-evaluation/{id}`、`.../project-evaluation/evaluate`、`.../project-evaluation/form`）
