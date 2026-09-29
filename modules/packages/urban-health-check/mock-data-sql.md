# 城市体检（市级）指标体系 —— 模拟数据 SQL

> 交付对象：后端人员审查执行（按全局约定，数据变更不由前端直接执行）。
> 生成日期：2026-09-29。数据库：达梦（DM）。模式：`SYSDBA` 下业务库（与 JeeSite 连接串一致）。

## 一、用途

为「市级体检管理-指标体系管理」列表页（`/urban-health-check/urban/indicator-system/list`）
提供干净的演示/联调数据。当前库里已有 20 条后端 Postman 自测数据（名称如
`Postman错误年份测试01`、年份 `20A6` 等），影响演示观感，本脚本分两部分：

- **Part A（可选）**：逻辑删除全部 Postman 自测数据（不动结构、可逆）；
- **Part B**：插入 4 套模拟体系 + 1 套含 12 个指标项的完整体系（含资料清单）。

两部分相互独立：若保留 Postman 数据只执行 Part B 也不冲突（新数据 sys_no 用 2024xx/2025xx/202630+ 段，避开现有 202601~202624）。

## 二、影响表

| 表 | 说明 | 操作 |
| --- | --- | --- |
| CITY_CHECK_INDICATOR_SET | 表1 指标体系总表 | Part A 逻辑删除 / Part B 插入 4 行 |
| CITY_CHECK_INDICATOR_ITEM | 表2 指标项表 | Part B 插入 12 行（挂 202630 体系） |
| CITY_CHECK_INDICATOR_MATERIAL | 表3 资料清单表 | Part B 插入 6 行 |

## 三、执行前提

1. 表 1/2/3 已按 V2 表结构建好（`城市体检-数据库表设计文档_v1.0`）；
2. `CITY_CHECK_INDICATOR_SET.sys_no` 有物理唯一索引 `UK_INDICATOR_SET_SYS_NO`——
   本脚本 sys_no 使用 `202401 / 202501 / 202630 / 202631`，**不与现有任何数据（含已逻辑删除行）冲突，执行前可再核对一次**：
   `SELECT sys_no FROM CITY_CHECK_INDICATOR_SET WHERE sys_no IN ('202401','202501','202630','202631');` 应返回空；
3. 幂等性：脚本不使用 MERGE，重复执行会因 sys_no 唯一索引报错——重复执行前先按
   `WHERE id LIKE 'MOCK20260929%'` 逻辑删除旧模拟数据（文末附语句）。

## Part A：清理 Postman 自测数据（可选，逻辑删除）

```sql
-- 按名称特征匹配（覆盖现有 20 条自测数据），del_flag 置 1，可逆
UPDATE CITY_CHECK_INDICATOR_SET
   SET del_flag = '1', update_by = 'mock-init', update_date = CURRENT_TIMESTAMP
 WHERE del_flag = '0'
   AND (set_name LIKE 'Postman%'
     OR set_name LIKE '回归测试-%'
     OR set_name IN ('尝试修改已提交体系','指标结果初始化流程测试体系','接口测试指标02的体系')
     OR set_year IN ('20A6','20266','026'));
```

> 注：若 `指标结果初始化流程测试体系` 等行仍被结果表（表5/6/7）引用，逻辑删除本身不级联，
> 与界面删除行为一致，不影响接口运行。

## Part B：插入模拟数据

### B1. 表1 指标体系总表（4 套）

设计：2024/2025 各一套已提交+停用（历史版本），2026 基础指标体系**启用+待提交**（可演示编辑/启停/提交发布全链路），2026 专项体系已提交+停用。
（后端约束：同时仅一套 enable_status=1）

```sql
INSERT INTO CITY_CHECK_INDICATOR_SET
  (id, sys_no, set_year, set_name, set_category, indicator_count,
   fill_unit, fill_date, enable_status, submit_status,
   create_by, create_date, update_by, update_date, remarks, del_flag)
VALUES
  ('MOCK2026092900000000000000000001', '202401', '2024', '2024年武汉市城市体检指标体系', '基础指标', 61,
   '市住房和城市更新局', TIMESTAMP '2024-06-30 18:00:00', 0, 1,
   'mock-init', CURRENT_TIMESTAMP, 'mock-init', CURRENT_TIMESTAMP, '2024 年度历史版本', '0'),
  ('MOCK2026092900000000000000000002', '202501', '2025', '2025年武汉市城市体检指标体系', '基础指标', 61,
   '市住房和城市更新局', TIMESTAMP '2025-06-30 18:00:00', 0, 1,
   'mock-init', CURRENT_TIMESTAMP, 'mock-init', CURRENT_TIMESTAMP, '2025 年度历史版本', '0'),
  ('MOCK2026092900000000000000000003', '202630', '2026', '2026年武汉市城市体检基础指标体系', '基础指标', 12,
   '市住房和城市更新局', TIMESTAMP '2026-09-20 10:00:00', 1, 0,
   'mock-init', CURRENT_TIMESTAMP, 'mock-init', CURRENT_TIMESTAMP, NULL, '0'),
  ('MOCK2026092900000000000000000004', '202631', '2026', '2026年城市更新评估专项指标体系', '城市更新评估指标', 0,
   '市住房和城市更新局', TIMESTAMP '2026-09-25 14:30:00', 0, 1,
   'mock-init', CURRENT_TIMESTAMP, 'mock-init', CURRENT_TIMESTAMP, '专项评估口径，指标项待导入', '0');
```

### B2. 表2 指标项（12 项，挂 202630「2026年基础指标体系」）

覆盖四个一级维度（好房子/好小区/好社区/好城区），三级维度部分留空（演示"指标直接挂二级维度"）。
`set_id`/`sys_no`/`set_year` 与 B1 第 3 行对应；`material_count` 与 B3 中该指标项的资料条数一致。

```sql
INSERT INTO CITY_CHECK_INDICATOR_ITEM
  (id, set_id, set_year, sys_no, first_dimension_name, second_dimension_name, third_dimension_name,
   item_no, item_name, item_unit, item_source, data_source, responsibility_dept, item_explain,
   material_count, create_by, create_date, update_by, update_date, remarks, del_flag)
VALUES
  ('MOCK2026092900000000000000000101', 'MOCK2026092900000000000000000003', '2026', '202630', '好房子', '住房品质', '房屋质量',
   1, '新建住宅建筑质量优良品率', '%', '(住建部)国家指标', '(市住建局)部门报送', '市住房和城市更新局', '反映新建住宅工程质量总体水平',
   2, 'mock-init', CURRENT_TIMESTAMP, 'mock-init', CURRENT_TIMESTAMP, NULL, '0'),
  ('MOCK2026092900000000000000000102', 'MOCK2026092900000000000000000003', '2026', '202630', '好房子', '住房品质', '绿色节能',
   2, '新建绿色建筑占比', '%', '(省政府)省级指标', '(市城建局)部门报送', '市城乡建设局', '城镇新建民用建筑中绿色建筑占比',
   1, 'mock-init', CURRENT_TIMESTAMP, 'mock-init', CURRENT_TIMESTAMP, NULL, '0'),
  ('MOCK2026092900000000000000000103', 'MOCK2026092900000000000000000003', '2026', '202630', '好房子', '住房安全', NULL,
   3, '城镇C级、D级危险住房改造完成率', '%', '(住建部)国家指标', '(市住建局)部门报送', '市住房和城市更新局', '危旧房改造年度计划完成情况',
   0, 'mock-init', CURRENT_TIMESTAMP, 'mock-init', CURRENT_TIMESTAMP, NULL, '0'),
  ('MOCK2026092900000000000000000104', 'MOCK2026092900000000000000000003', '2026', '202630', '好小区', '人居环境', '老旧小区',
   4, '老旧小区改造率', '%', '(住建部)国家指标', '(市住建局)部门报送', '市住房和城市更新局', '2000年底前建成需改造小区的累计改造比例',
   1, 'mock-init', CURRENT_TIMESTAMP, 'mock-init', CURRENT_TIMESTAMP, NULL, '0'),
  ('MOCK2026092900000000000000000105', 'MOCK2026092900000000000000000003', '2026', '202630', '好小区', '人居环境', '物业服务',
   5, '专业化物业服务覆盖率', '%', '(市政府)市级指标', '(市住建局)部门报送', '市住房和城市更新局', '实施专业化物业管理的小区占比',
   0, 'mock-init', CURRENT_TIMESTAMP, 'mock-init', CURRENT_TIMESTAMP, NULL, '0'),
  ('MOCK2026092900000000000000000106', 'MOCK2026092900000000000000000003', '2026', '202630', '好小区', '设施完善', '加装电梯',
   6, '既有住宅加装电梯完工数', '部', '(市政府)市级指标', '(市住建局)部门报送', '市住房和城市更新局', '年度既有住宅加装电梯完工数量',
   0, 'mock-init', CURRENT_TIMESTAMP, 'mock-init', CURRENT_TIMESTAMP, NULL, '0'),
  ('MOCK2026092900000000000000000107', 'MOCK2026092900000000000000000003', '2026', '202630', '好社区', '公共服务', '养老托育',
   7, '社区养老服务设施覆盖率', '%', '(住建部)国家指标', '(市民政局)部门报送', '市民政局', '社区养老服务设施配建达标比例',
   1, 'mock-init', CURRENT_TIMESTAMP, 'mock-init', CURRENT_TIMESTAMP, NULL, '0'),
  ('MOCK2026092900000000000000000108', 'MOCK2026092900000000000000000003', '2026', '202630', '好社区', '公共服务', '普惠托育',
   8, '每千人口拥有3岁以下婴幼儿托位数', '个', '(省政府)省级指标', '(市卫健委)部门报送', '市卫生健康委员会', '普惠托育服务供给水平',
   0, 'mock-init', CURRENT_TIMESTAMP, 'mock-init', CURRENT_TIMESTAMP, NULL, '0'),
  ('MOCK2026092900000000000000000109', 'MOCK2026092900000000000000000003', '2026', '202630', '好社区', '绿色低碳', NULL,
   9, '社区生活污水集中收集率', '%', '(住建部)国家指标', '(市水务局)部门报送', '市水务局', '建成区生活污水集中收集处理水平',
   0, 'mock-init', CURRENT_TIMESTAMP, 'mock-init', CURRENT_TIMESTAMP, NULL, '0'),
  ('MOCK2026092900000000000000000110', 'MOCK2026092900000000000000000003', '2026', '202630', '好城区', '生态宜居', '公园绿地',
   10, '公园绿化活动场地服务半径覆盖率', '%', '(住建部)国家指标', '(市园林局)部门报送', '市园林和林业局', '公园绿化活动场地500米服务半径覆盖的居住用地比例',
   1, 'mock-init', CURRENT_TIMESTAMP, 'mock-init', CURRENT_TIMESTAMP, NULL, '0'),
  ('MOCK2026092900000000000000000111', 'MOCK2026092900000000000000000003', '2026', '202630', '好城区', '交通便捷', NULL,
   11, '城市轨道站点800米范围覆盖通勤比例', '%', '(省政府)省级指标', '(市交通局)部门报送', '市交通运输局', '轨道交通对通勤出行的支撑水平',
   0, 'mock-init', CURRENT_TIMESTAMP, 'mock-init', CURRENT_TIMESTAMP, NULL, '0'),
  ('MOCK2026092900000000000000000112', 'MOCK2026092900000000000000000003', '2026', '202630', '好城区', '安全韧性', '内涝防治',
   12, '城市易涝积水点整治完成率', '%', '(住建部)国家指标', '(市水务局)部门报送', '市水务局', '年度易涝积水点整治计划完成情况',
   0, 'mock-init', CURRENT_TIMESTAMP, 'mock-init', CURRENT_TIMESTAMP, NULL, '0');
```

### B3. 表3 资料清单（6 条，挂在有资料要求的指标项下）

```sql
INSERT INTO CITY_CHECK_INDICATOR_MATERIAL
  (id, item_id, material_name, is_required, sort_no,
   create_by, create_date, update_by, update_date, remarks, del_flag)
VALUES
  ('MOCK2026092900000000000000000201', 'MOCK2026092900000000000000000101', '新建住宅工程质量验收合格证明', 1, 1,
   'mock-init', CURRENT_TIMESTAMP, 'mock-init', CURRENT_TIMESTAMP, NULL, '0'),
  ('MOCK2026092900000000000000000202', 'MOCK2026092900000000000000000101', '建筑工程质量监督报告', 0, 2,
   'mock-init', CURRENT_TIMESTAMP, 'mock-init', CURRENT_TIMESTAMP, NULL, '0'),
  ('MOCK2026092900000000000000000203', 'MOCK2026092900000000000000000102', '绿色建筑评价标识统计表', 1, 1,
   'mock-init', CURRENT_TIMESTAMP, 'mock-init', CURRENT_TIMESTAMP, NULL, '0'),
  ('MOCK2026092900000000000000000204', 'MOCK2026092900000000000000000104', '老旧小区改造年度计划及进度台账', 1, 1,
   'mock-init', CURRENT_TIMESTAMP, 'mock-init', CURRENT_TIMESTAMP, NULL, '0'),
  ('MOCK2026092900000000000000000205', 'MOCK2026092900000000000000000107', '社区养老服务设施配建情况统计表', 1, 1,
   'mock-init', CURRENT_TIMESTAMP, 'mock-init', CURRENT_TIMESTAMP, NULL, '0'),
  ('MOCK2026092900000000000000000206', 'MOCK2026092900000000000000000110', '公园绿地分布及覆盖率测算报告', 0, 1,
   'mock-init', CURRENT_TIMESTAMP, 'mock-init', CURRENT_TIMESTAMP, NULL, '0');
```

## 四、重复执行前清理本脚本数据（备查）

```sql
UPDATE CITY_CHECK_INDICATOR_MATERIAL SET del_flag='1', update_by='mock-init', update_date=CURRENT_TIMESTAMP
 WHERE id LIKE 'MOCK20260929000000000000000002%' AND del_flag='0';
UPDATE CITY_CHECK_INDICATOR_ITEM     SET del_flag='1', update_by='mock-init', update_date=CURRENT_TIMESTAMP
 WHERE id LIKE 'MOCK20260929000000000000000001%' AND del_flag='0';
UPDATE CITY_CHECK_INDICATOR_SET      SET del_flag='1', update_by='mock-init', update_date=CURRENT_TIMESTAMP
 WHERE id LIKE 'MOCK202609290000000000000000000%' AND del_flag='0';
```

> 注意：清理后若需重插，`sys_no` 唯一索引对已逻辑删除行同样生效，须更换新 sys_no（如 202632 起）或物理删除 MOCK 行后再执行。

## 五、验证（执行后后端/前端自查）

- 接口：`GET /js/cityCheck/indicatorSet/page?pageNum=1&pageSize=10` → total ≥ 4，含 202630；
- 前端（本地 3100）：指标体系管理列表出现「2026年武汉市城市体检基础指标体系」（启用、待提交）；
  点名称下钻 → 指标项表格 12 行、四维度合并单元格正常。
