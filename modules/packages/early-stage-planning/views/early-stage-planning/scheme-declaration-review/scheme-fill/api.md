# 策划方案填报（scheme-fill）接口对接说明

> **状态：已对接后端**（2026-09-16 起；矢量口径随后端 2026-09-15 变更为 WKT）。
> 后端模块 `zhugengju-admin-backend/modules/esp`，
> **权威契约以后端文档 `modules/esp/docs/接口文档-方案填报.md` 为准**（另见同目录《数据库设计说明-方案填报》），
> 本文只保留前端侧的实现要点与消费约定，不再重复字段清单。
>
> **2026-09-16 二期变更**（起止时间/总体目标/片区城市设计/片区规划调整/五改类别）：
> 前端已实现、待后端跟进，字段契约见 [前端变更说明-2026-09-16.md](./前端变更说明-2026-09-16.md)。

## 前端接口层

`api/early-stage-planning/scheme-declaration-review/scheme-fill.ts`（同 expert-pool.ts 的 `{code,msg,data}` unwrap 约定）：

| 函数 | 后端 | 用途 |
|------|------|------|
| `schemeFillPage(params)` | `GET /a/esp/schemeFill/page` | 列表分页（pageNo→pageNum 映射，isApprove=1/2 按 Tab） |
| `schemeFillForm(id)` | `GET /a/esp/schemeFill/form` | 填报页回显（id 空=新增空骨架） |
| `schemeFillSave(data)` | `POST /a/esp/schemeFill/save` | 保存（全量提交；projects 行剥离回显 id） |
| `schemeFillDelete(id)` | `POST /a/esp/schemeFill/delete` | 删除（仅待审查片区） |
| `espFileUpload(file)` | `POST /a/esp/file/upload` | 单文件上传 MinIO（响应 fileName 归一为 name） |
| `schemeFillParseVector(file, type)` | `POST /a/esp/schemeFill/parseVector` | 矢量解析（仅 .dwg；type=源坐标系 CGCS_WH_2000【默认，武汉2000】/ WGS84 → WKT） |
| `wktToGeoJson` / `geoJsonToWkt` | — | WKT ↔ GeoJSON 互转（手写解析，无第三方依赖；与 geometry 列存量格式一致） |

## 前端消费约定（与后端契约的差异点）

1. **文件字段全部为对象数组** `[{name, url, objectKey, size}]`：概况图片/图册/实施方案/五个附件位
   均真实上传（`use-esp-file-list.ts` 状态机），已上传文件名带 MinIO 直链（新窗打开）。
2. **片区范围线 `scopeLine` / 项目矢量图斑 `mapSpot` 为 WKT 字符串（MULTIPOLYGON 文本）**：
   表单内经 `components/geo-field.vue` 包装 GeoDataSection 做双向换算（回显 WKT→GeoJSON 渲染；
   上传解析/地图绘制结果序列化回 WKT）。**没有源文件名字段**（后端不存储），源文件名仅会话内展示。
3. **Tab 语义**：Tab①「已批准片区填报」= isApprove=1 存量片区（可编辑、不可删，无新增按钮）；
   Tab②「待审查片区填报」= isApprove=2 新增填报片区（新增按钮在此，保存后落此列表，可删）。
4. **校验**：前端 `VALIDATE_ENABLED=false` 不拦截（红星仅表示重要性），后端轻校验兜底
   （同名片区/字数上限/竣工≥开工等），失败 msg 经表单 toast 展示并停留在表单。
5. **reportOrg/reportTime**：后端生成（首次填报单位快照 / 每次保存刷新），表单不填。

## 页面结构（未变）

列表（list.vue，两 Tab 共用 BasicTable）+ 整页表单（form.vue 六区块 section-*.vue，按 id 拉详情回显）。
导出仍为前端 xlsx 本地平铺（文件对象取 name，范围线/图斑以「已绘制」标识）。
