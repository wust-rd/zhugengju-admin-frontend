# 策划方案填报（scheme-fill）后端接口对接说明

> 面向读者：后端开发（或供 AI 辅助生成接口时阅读）。
> 本文档描述「片区策划申报审查 → 策划方案填报」页面的完整数据模型与接口需求，
> 字段清单以前端当前实现为准（`index.vue` 的 `Scheme` 类型 + 各区块组件 schema）。
> 前端当前为**纯前端 mock**（内存数据），接口就绪后按 §4 替换。
> 更新日期：2026-09-15。

---

## 1. 业务概述与页面结构

- 菜单路径：`/early-stage-planning/scheme-declaration-review/scheme-fill/list`
- 列表页：单层 Tab（①已批准片区填报 ②待审查片区填报〔待建设〕）+ 搜索 + 分页表格 + 新增/查看/编辑/删除。
- 填报页（新增/查看/编辑共用，整页表单）按 6 个区块自上而下排列，全部字段一次性保存：

| # | 区块 | 前端组件 | 数据字段组 |
|---|------|----------|-----------|
| 1 | 片区基本信息 | `components/section-basic-info.vue` | name / batch / district / areaHa / startTime / overallOrg / overview / overviewImages / scopeDesc / scopeLine / scopeLineFileName |
| 2 | 片区体检情况 | `components/section-health-check.vue` | problemList / opportunityList / demandList |
| 3 | 片区功能策划 | `components/section-function-plan.vue` | funcTypes / funcPlan / atlas |
| 4 | 片区项目情况 | `components/section-project-info.vue`（tab 多项目） | projects: ProjectItem[] |
| 5 | 片区资金方案 | `components/section-funding-plan.vue` | invest / fundSources |
| 6 | 附件材料 | `components/section-attachment.vue` | schemePlanFiles / chartFiles / healthReportFiles / approvalFiles / otherFiles |

系统字段：`id`（前端 mock 主键，后端应改为业务 code）、`reportTime`（填报时间，保存时后端生成）、`reportOrg`（填报单位，当前由填报人填写，可改由登录会话带出）。

## 2. 实体数据模型（Scheme）

字段名即前后端传输 JSON 键名。类型为建议存储类型；「重要」= 前端标红星（当前**仅表示重要性，不做必填校验**，见 §6）。

### 2.1 片区基本信息

| 字段 | 名称 | 类型 | 重要 | 约束 / 说明 |
|------|------|------|------|-------------|
| `name` | 片区名称 | string | ★ | ≤100 字 |
| `batch` | 片区批次 | string | ★ | 枚举：第一批 / 第二批 |
| `district` | 行政区 | string | ★ | 枚举：见 §3.1 |
| `areaHa` | 片区规模 | number | ★ | 单位公顷，1 位小数，>0 |
| `startTime` | 起始时间 | string | | 格式 `YYYY-MM`（月份） |
| `overallOrg` | 统筹主体 | string | | ≤100 字 |
| `overview` | 片区概况 | string | ★ | ≤150 字 |
| `overviewImages` | 片区概况图片 | string[] | ★ | 文件标识数组，1-3 张，图片格式 |
| `scopeDesc` | 片区范围 | string | ★ | 文字描述（东至…西至…），≤300 字 |
| `scopeLine` | 片区范围线 | string \| null | | GeoJSON 字符串（前端 GeoDataSection：上传 shp/dwg 解析或地图绘制，多边形），选填 |
| `scopeLineFileName` | 范围线源文件名 | string \| null | | 经上传解析时记录源文件名；地图绘制则为空 |

### 2.2 片区体检情况（三个清单均「一行一条」，数组顺序即展示顺序）

| 字段 | 名称 | 类型 | 重要 | 说明 |
|------|------|------|------|------|
| `problemList` | 问题整治清单 | string[] | ★ | 每项一条文本 |
| `opportunityList` | 发展机遇清单 | string[] | ★ | 同上 |
| `demandList` | 更新诉求清单 | string[] | ★ | 同上 |

### 2.3 片区功能策划

| 字段 | 名称 | 类型 | 重要 | 约束 / 说明 |
|------|------|------|------|-------------|
| `funcTypes` | 片区功能定位 | string[] | ★ | 多选，枚举见 §3.2（列表页胶囊展示同此字段） |
| `funcPlan` | 功能策划 | string | ★ | ≤500 字 |
| `atlas` | 策划图册 | string[] | ★ | 文件标识数组，最多 5 张，jpg/png |

### 2.4 片区项目情况（`projects`: ProjectItem[]）

项目为动态多实例（前端 tab 逐个填报，可增删，至少 1 个）。每个项目：

| 字段 | 名称 | 类型 | 重要 | 约束 / 说明 |
|------|------|------|------|-------------|
| `name` | 项目名称 | string | ★ | ≤150 字 |
| `category` | 改造类别 | string | ★ | 枚举见 §3.3 |
| `implOrg` | 实施主体 | string | | ≤100 字 |
| `investEstimate` | 项目总投资估算 | number | | 亿元，2 位小数 |
| `fundSources` | 项目资金来源 | string[] | | 多选，枚举见 §3.4 |
| `yearInvest` | 本年度计划完成投资 | number | | 亿元，2 位小数 |
| `startDate` | 计划开工时间 | string | | `YYYY-MM` |
| `endDate` | 计划竣工时间 | string | | `YYYY-MM`（应 ≥ startDate） |
| `content` | 主要建设内容 | string | ★ | ≤500 字 |
| `planFiles` | 实施方案附件 | string[] | | 文件标识数组 |
| `mapSpot` | 项目矢量图斑 | string \| null | | GeoJSON 字符串（同 scopeLine：上传解析或地图绘制，多边形），选填 |
| `mapSpotFileName` | 矢量图斑源文件名 | string \| null | | 经上传解析时记录源文件名；地图绘制则为空 |

> ⚠️ 命名提示：项目内 `fundSources`（`string[]` 枚举多选）与片区级 `fundSources`（§2.5 的对象）**同名不同构**，后端建模时注意区分层级。

### 2.5 片区资金方案

| 字段 | 名称 | 类型 | 重要 | 说明 |
|------|------|------|------|------|
| `invest` | 总体投资估算 | number | ★ | 亿元，2 位小数（列表页展示列同此字段） |
| `fundSources` | 片区资金来源 | object | | `{ 来源名: 金额|null }`，键为 §3.5 的 14 项枚举；**键存在即选中**，金额空为 null；建议后端存为 `fund_source` 明细表（来源编码 + 金额），见 §4.3 说明 |

### 2.6 附件材料（均为文件标识数组，支持多文件）

| 字段 | 名称 | 重要 | 格式（前端 accept） |
|------|------|------|---------------------|
| `schemePlanFiles` | 片区策划方案 | ★ | pdf / doc / docx |
| `chartFiles` | 规划图表 | ★ | pdf / xls / xlsx / jpg / png |
| `healthReportFiles` | 片区体检报告 | | pdf / doc / docx |
| `approvalFiles` | 审批材料 | | 不限 |
| `otherFiles` | 其他附件 | | 不限 |

### 2.7 列表页展示 / 系统字段

| 字段 | 名称 | 类型 | 说明 |
|------|------|------|------|
| `id` / 业务主键 | — | — | 前端 mock 用自增 id；建议后端返回 `code` 作为主键（列表操作按 code 定位记录） |
| `reportTime` | 填报时间 | string | `YYYY-MM-DD HH:mm`，保存时后端生成/更新 |
| `reportOrg` | 填报单位 | string | 当前表单填写；可改由会话带出 |

## 3. 字典与枚举（当前为前端硬编码，建议后端字典化）

1. **行政区 district**：汉阳区 / 江岸区 / 江汉区 / 硚口区 / 武昌区 / 青山区 / 洪山区
2. **功能定位 funcTypes**（多选）：TOD / EOD / IOD / SOD / COD / HOD / 其他
3. **改造类别 category**（占位字典）：老旧小区改造 / 老旧厂区改造 / 老旧街区改造 / 城中村改造 / 其他
4. **项目资金来源 projects[].fundSources**（多选，占位字典）：财政资金 / 专项债券 / 社会资本 / 银行贷款 / 其他
5. **片区资金来源 fundSources**（14 项，分组展示）：
   - 中央预算资金：中央预算内投资 / 其他中央财政资金 / 国债（增发国债）/ 超长期特别国债
   - 省级预算资金
   - 市级及以下预算资金：市级 / 区级
   - 地方政府一般债券 / 地方政府专项债券
   - 产权单位出资 / 规模化实施运营主体出资 / 金融机构借贷资金 / 居民出资 / 其他资金

## 4. 接口需求清单

统一走项目 `defHttp`，响应协议 `{ sessionid, result, message, data }`，`result ∈ "true" | "false" | "login"`。
以下路径为建议值（RESTful 风格，可按后端规范调整）：

### 4.1 分页查询（列表页）

`GET /early-stage-planning/schemeFill/list`

请求参数（`pageNo`、`pageSize` 分页；其余为搜索条件）：

| 参数 | 类型 | 说明 |
|------|------|------|
| `name` | string | 片区名称，模糊匹配 |
| `district` | string | 行政区，精确 |
| `funcType` | string | 功能定位（命中 `funcTypes` 数组任一项） |
| `batch` | string | 片区批次，精确 |

响应 `data`：`{ list: Scheme[], count: number }`。列表至少返回：name / district / areaHa / funcTypes / batch / invest / reportTime / reportOrg / code。

### 4.2 详情（填报页回显）

`GET /early-stage-planning/schemeFill/{code}`

响应 `data`：完整 `Scheme`（全部区块字段 + projects 数组 + 各附件文件标识数组）。

### 4.3 保存（新增 / 编辑统一）

`POST /early-stage-planning/schemeFill/save`

请求体：完整 `Scheme`（编辑带 `code`，新增不带）。要点：

- 全量提交（前端不做增量 diff）；
- `projects` 子项由后端 diff 保存（建议子表，父外键 + 排序列，前端数组顺序即排序）；
- 片区 `fundSources` 建议落明细表 `fund_source(scheme_code, source_code, amount)`，传输层可保持对象或改为明细数组（若后端要求，前端把对象转 `[{source, amount}]` 数组，改动成本极低）；
- `reportTime` 后端生成；
- 文件字段传文件标识（见 §5）。

响应 `data`：保存后的记录（含 code），前端用于刷新列表。

### 4.4 删除

`POST /early-stage-planning/schemeFill/delete`，参数 `{ code }`（或 RESTful `DELETE .../{code}`）。

### 4.5 文件上传 / 下载

建议复用 jeesite 文件服务（`bizKey` + `bizType` 模式）：

- `bizType` 建议：`scheme_overview_image`（概况图片）/ `scheme_atlas`（图册）/ `scheme_plan_file` …按 §2.6 五个附件位 + §2.1/§2.3 两个图片位区分；
- 上传返回文件标识（url 或 fileCode），保存时随表单提交标识数组；
- 下载/预览按标识换取流或 URL。

### 4.6 地理数据解析（片区范围线 / 项目矢量图斑）

上传 shp/dwg 后前端调用解析接口换取 GeoJSON（2000 坐标系，前端按 GeoJSON 字符串存取渲染）：

- 建议 `POST /early-stage-planning/schemeFill/parseGeoFile`，`multipart/form-data`（file）；
- 响应 `data`：GeoJSON 字符串（FeatureCollection，多边形）；
- 前端当前为本地 mock（`api/early-stage-planning/scheme-declaration-review/scheme-fill.ts` 的 `parseGeoFile`），接口就绪后仅替换该函数。

## 5. JSON 示例（保存请求体）

```json
{
  "name": "汉阳西部片区",
  "batch": "第一批",
  "district": "汉阳区",
  "areaHa": 25.7,
  "startTime": "2026-06",
  "overallOrg": "汉阳区住更局",
  "overview": "片区位于汉阳区核心地段，老旧小区集中，拟通过连片改造完善公共服务配套。",
  "overviewImages": ["FILE_0001", "FILE_0002"],
  "scopeDesc": "东至龙阳大道，西至芳草路，北至汉阳大道，南至墨水湖南路。",
  "scopeLine": null,
  "scopeLineFileName": null,
  "problemList": ["老旧小区供水管网老化，雨污分流不彻底。"],
  "opportunityList": ["轨道 12 号线站点规划落地，带动周边连片开发。"],
  "demandList": ["恳请市级统筹加快片区供排水管网改造立项。"],
  "funcTypes": ["COD", "XOD"],
  "funcPlan": "以 COD 文化导向为主、XOD 混合开发为辅，打造滨水活力街区。",
  "atlas": ["FILE_0003"],
  "projects": [
    {
      "name": "xx片区供水管网改造项目",
      "category": "老旧小区改造",
      "implOrg": "汉阳区水务有限公司",
      "investEstimate": 3.2,
      "fundSources": ["财政资金", "专项债券"],
      "yearInvest": 1.5,
      "startDate": "2026-10",
      "endDate": "2027-12",
      "content": "改造供水管网 8.6 公里，同步实施雨污分流与泵站更新。",
      "planFiles": ["FILE_0004"],
      "mapSpot": null,
      "mapSpotFileName": null
    }
  ],
  "invest": 10,
  "fundSources": {
    "中央预算资金—中央预算内投资": 0.8,
    "地方政府专项债券": 2.5
  },
  "schemePlanFiles": ["FILE_0005"],
  "chartFiles": [],
  "healthReportFiles": [],
  "approvalFiles": [],
  "otherFiles": [],
  "reportOrg": "汉阳区住更局"
}
```

## 6. 校验与业务规则（当前状态）

- 前端所有红星**仅表示字段重要性，暂不做必填校验**（保存不拦截），后端可自行决定入库校验强度；
- 前端 rules 全部保留在区块 schema 中，后端校验策略确定后可在前端一键恢复（`use-section-form.ts` 的 `VALIDATE_ENABLED`）；
- 建议后端至少校验：名称唯一性（同区内）、`projects[].endDate ≥ startDate`、`invest` 与资金来源分项之和的校核提示（业务口径待定）。

## 7. 待建设 / 待定项

| 项 | 状态 |
|----|------|
| 片区范围线 `scopeLine` / 项目矢量图斑 `mapSpot` | 前端已接 GeoDataSection（上传解析 mock + 地图绘制）；解析接口待后端（见 §4.6） |
| 列表 Tab②「待审查片区填报」 | 待建设（本期只做已批准片区） |
| 字典（行政区/批次/功能定位/改造类别/资金来源） | 前端硬编码，待字典接口 |
| 填报单位是否取登录会话 | 待定 |
| 导出 | 前端已用 xlsx 本地导出，后端无需提供 |

## 8. 前端代码索引（对照实现）

```
scheme-fill/
├── index.vue                     列表页（Scheme 类型定义、mock 数据、搜索/分页）
├── form.vue                      填报页骨架（6 区块组装、保存/导出、锚点导航、吸顶）
├── api.md                        本文档
└── components/
    ├── section-basic-info.vue    区块1 字段 schema
    ├── section-health-check.vue  区块2
    ├── section-function-plan.vue 区块3
    ├── section-project-info.vue  区块4（tab 容器）
    ├── section-project-item.vue  区块4 单项目字段 schema
    ├── section-funding-plan.vue  区块5
    ├── section-attachment.vue    区块6
    └── use-section-form.ts       区块公共装配（校验开关 VALIDATE_ENABLED）
```
