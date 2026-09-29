/**
 * 市住更局 —— 指标(指标体系子项) 接口层（后端 modules/check，/cityCheck/indicatorItem）
 *
 * 后端行字段（接口文档口径）与前端页面字段不同名，本层做双向映射
 * （toFrontItem/toBackItem），视图层统一使用前端字段：
 *  前端 code/dim1/dim2/dim3/indicatorName/unit/indicatorSource/responsibleDept
 *   ↔ 后端 itemNo/firstDimensionName/secondDimensionName/thirdDimensionName/
 *      itemName/itemUnit/itemSource/responsibilityDept
 *  所属体系：后端只认主键 setId（CITY_CHECK_INDICATOR_ITEM.set_id），
 *  下钻路由 {id} 传的即体系主键 id（list.vue handleDetail）。
 */

import { defHttp } from '@jeesite/core/utils/http/axios';
import { CHECK_API, unwrap } from '../common';

/** 评估结果 */
export const EVAL_RESULT = {
  POOR: '较差',
  FAIR: '一般',
  GOOD: '较好',
  GREAT: '很好',
  NO_STANDARD: '无标准',
} as const;

/** 预警状态（保存时按评估结果自动计算，前端不可手改） */
export const WARNING_STATUS = {
  RED: '红色预警',
  YELLOW: '黄色预警',
  NORMAL: '正常',
  NONE: '无',
} as const;

/** 指标 实体(指标体系的子孙元素,按一/二/三级维度归属) */
export type Indicator = {
  id?: string;
  setId?: string; // 所属体系主键（保存入参，后端按此归属体系）
  code?: string | number; // 序号(item_no)
  dim1?: string; // 一级维度(如 生态宜居)
  dim2?: string; // 二级维度(如 住房安全)
  dim3?: string; // 三级维度(可空:指标直接挂二级维度时留空)
  indicatorName?: string; // 指标项名称
  unit?: string; // 指标单位(项 / % / 平方米 / 万元 …)
  indicatorValue?: number; // 指标值(填报结果,数字；仅结果表有)
  standardValue?: number; // 标准值/目标值(数字;无标准的指标为空)
  evalResult?: string; // 评估结果(较差 / 一般 / 较好 / 很好 / 无标准)
  warningStatus?: string; // 预警状态(红色预警 / 黄色预警 / 正常 / 无；自动计算)
  indicatorSource?: string; // 指标来源((住建部)国家指标 / (省政府)省级指标 / (市政府)市级指标)
  dataSource?: string; // 数据来源((市XX局)部门报送 / 统计年鉴 / 城市体检信息平台)
  responsibleDept?: string; // 责任部门(无责任部门时填 /)
  itemExplain?: string; // 指标解释(非必填长文本)
  materialList?: IndicatorMaterial[]; // 资料清单(随指标项整单提交,≤20 条;详情接口返回)
  remarks?: string;
};

/** 资料清单条目(表3 CITY_CHECK_INDICATOR_MATERIAL) */
export type IndicatorMaterial = {
  id?: string;
  materialName?: string; // 资料名称
  isRequired?: number; // 是否必交(1必交 0选交;前端不录入,默认0)
  sortNo?: number; // 排序号(后端自动)
};

/** 后端行（接口文档口径，驼峰） */
type BackItem = Recordable & {
  id?: string;
  setId?: string;
  itemNo?: number;
  firstDimensionName?: string;
  secondDimensionName?: string;
  thirdDimensionName?: string;
  itemName?: string;
  itemUnit?: string;
  itemSource?: string;
  dataSource?: string;
  responsibilityDept?: string;
  itemExplain?: string;
  remarks?: string;
};

/** 后端行 → 前端实体（列表/详情共用） */
function toFrontItem(row: BackItem): Indicator {
  return {
    ...row,
    code: row.itemNo,
    dim1: row.firstDimensionName,
    dim2: row.secondDimensionName,
    dim3: row.thirdDimensionName,
    indicatorName: row.itemName,
    unit: row.itemUnit,
    indicatorSource: row.itemSource,
    responsibleDept: row.responsibilityDept,
  } as Indicator;
}

/** 前端表单值 → 后端保存入参（丢弃映射出的冗余键） */
function toBackItem(data: Partial<Indicator>): Recordable {
  const { code, dim1, dim2, dim3, indicatorName, unit, indicatorSource, responsibleDept, ...rest } = data ?? {};
  return {
    ...rest,
    firstDimensionName: dim1,
    secondDimensionName: dim2,
    thirdDimensionName: dim3,
    itemName: indicatorName,
    itemUnit: unit,
    itemSource: indicatorSource,
    responsibilityDept: responsibleDept,
  };
}

/**
 * 拉取体系下全部指标项（show 页表格 dataSource 用：
 * 全量取回后前端本地分页 + 维度合并单元格计算，pageSize 取大值一次取全）
 * @param setId 所属体系主键（后端按 set_id 过滤，非业务编码 sys_no）
 */
export async function indicatorListBySet(setId: string): Promise<Indicator[]> {
  const data = unwrap<{ total: number; list: BackItem[] }>(
    await defHttp.get({
      url: CHECK_API + '/indicatorItem/page',
      params: { setId, pageNum: 1, pageSize: 1000 },
    }),
  );
  return (data.list ?? []).map(toFrontItem);
}

/** 保存指标项（新增/修改合一；所属体系已提交后只读；setId 归属体系主键） */
export async function indicatorSave(data: Partial<Indicator>): Promise<{ id: string }> {
  return unwrap(await defHttp.postJson({ url: CHECK_API + '/indicatorItem/save', data: toBackItem(data) }));
}

/** 批量删除指标项（级联删除资料清单） */
export async function indicatorDelete(ids: string[]) {
  return unwrap(await defHttp.postJson({ url: CHECK_API + '/indicatorItem/delete', data: { ids } }));
}
