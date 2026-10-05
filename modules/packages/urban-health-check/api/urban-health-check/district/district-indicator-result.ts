/**
 * 市住更局 —— 区级体检指标项结果 接口层（后端 modules/check，/cityCheck/district/*，文档 #26~#34）
 *
 * 模型（字段与后端驼峰同名直用）：
 *  结果行（表3）：{id(未填报为 null), itemId, itemNo, itemName, itemUnit, resultQuarter,
 *    resultValue, standardValue, baselineValue, evaluateResult, warningStatus, evaluateDate,
 *    itemSource, dataSource, responsibilityDept, layerShpFile, dataStatFile, resultAnalysis,
 *    fillStatus, submitStatus}
 *    与市级差异：无文字值双轨（纯数字）、无基准文件 benchmarkFile、新增「评估季度」；
 *    数据来源/责任部门随指标项带出，不在结果表单维护。
 *  预警口径（服务端生成，不接受入参）：很好/较好/无标准→正常，一般→黄色预警，不足→红色预警。
 *  资料明细（表5）：{id?, materialId?, materialName, materialType(图斑/统计表/说明文档/影像/其他),
 *    materialFile?, resultValue?, sortNo}——整批覆盖；区级另有资料清单（表4 material/list
 *    按指标项预定义，materialId 可关联清单项）。
 * 保存：save 支持按 itemId 懒初始化（未填报行 id=null）；体系须启用，已提交行 409。
 */

import { defHttp } from '@jeesite/core/utils/http/axios';
import { CHECK_API, unwrap, pageGet } from '../common';
import type { AttFile } from '../urban/indicator-result';
import { checkFileDownload, checkFileUpload } from '../urban/indicator-result';

export { checkFileDownload, checkFileUpload };
export type { AttFile };

/** 评估结果（区级口径同市级） */
export const EVAL_OPTIONS = ['很好', '较好', '一般', '不足', '无标准'].map((v) => ({
  label: v,
  value: v,
}));

/** 评估季度选项（后端列 VARCHAR(10) 按字节计长，"第X季度"12 字节超限，用 3 字格式） */
export const QUARTER_OPTIONS = ['一季度', '二季度', '三季度', '四季度'].map((v) => ({
  label: v,
  value: v,
}));

/** 资料类型（表5 materialType 合法集合） */
export const MATERIAL_TYPE_OPTIONS = ['图斑', '统计表', '说明文档', '影像', '其他'].map((v) => ({
  label: v,
  value: v,
}));

/** 区级指标结果行（page/info 返回） */
export type DistrictResult = {
  id?: string | null; // 结果主键（未填报为 null，保存按 itemId 懒初始化）
  setId?: string;
  itemId?: string;
  itemNo?: number;
  itemName?: string;
  itemUnit?: string;
  resultQuarter?: string | null; // 评估季度
  resultValue?: number | null; // 指标值
  standardValue?: number | null; // 标准值
  baselineValue?: number | null; // 基准值
  evaluateResult?: string | null; // 评估结果
  warningStatus?: string | null; // 预警状态(服务端生成)
  evaluateDate?: string | null;
  itemSource?: string | null;
  dataSource?: string | null;
  responsibilityDept?: string | null;
  layerShpFile?: string | null; // 图层 shp 文件(JSON {name,url})
  dataStatFile?: string | null; // 数据统计表文件(JSON {name,url})
  resultAnalysis?: string | null; // 指标结果分析
  fillStatus?: number;
  submitStatus?: number;
};

/** 区级资料明细行（表5） */
export type DistrictMaterialResult = {
  id?: string;
  materialId?: string | null; // 关联资料清单项(表4)
  materialName?: string; // 资料名称
  materialType?: string; // 图斑/统计表/说明文档/影像/其他
  materialFile?: string | null; // 资料文件(JSON {name,url})
  resultValue?: number | null; // 资料数值
  sortNo?: number;
};

/** 分页查询区级指标结果（BasicTable api 直用；itemName/warningStatus/evaluateResult 筛选） */
export async function districtResultPage(params: Recordable) {
  return pageGet<DistrictResult>(CHECK_API + '/district/result/page', params);
}

/** 拉取体系下全部结果行（编辑页/编辑表单定位用，未填报行 id=null） */
export async function districtResultList(setId: string) {
  const page = await pageGet<DistrictResult>(CHECK_API + '/district/result/page', {
    setId,
    pageNo: 1,
    pageSize: 100,
  });
  return page.list ?? [];
}

/** 结果详情（id=结果主键；含 materialResultList 资料明细） */
export async function districtResultInfo(id: string): Promise<DistrictResult & { materialResultList?: DistrictMaterialResult[] }> {
  return unwrap(await defHttp.get({ url: `${CHECK_API}/district/result/info/${id}` }));
}

/** 保存结果（id 空时按 itemId 懒初始化；预警服务端生成） */
export async function districtResultSave(
  data: Partial<DistrictResult> & { itemId: string },
): Promise<{ id: string; fillStatus: number; warningStatus: string }> {
  return unwrap(await defHttp.postJson({ url: CHECK_API + '/district/result/save', data }));
}

/** 批量提交结果（ids=结果主键集合） */
export async function districtResultSubmit(ids: string[]) {
  return unwrap(
    await defHttp.postJson({ url: CHECK_API + '/district/result/submit', data: { ids } }),
  );
}

/** 批量撤回结果（ids=结果主键集合） */
export async function districtResultCancelSubmit(ids: string[]) {
  return unwrap(
    await defHttp.postJson({ url: CHECK_API + '/district/result/cancelSubmit', data: { ids } }),
  );
}

/** 按指标项查询资料清单（表4，供资料明细关联/参考） */
export async function districtMaterialList(itemId: string): Promise<Recordable[]> {
  return unwrap(await defHttp.get({ url: CHECK_API + '/district/material/list', params: { itemId } }));
}

/** 批量保存资料明细（resultId 必填；整批覆盖） */
export async function districtMaterialResultSaveList(resultId: string, materialResultList: Partial<DistrictMaterialResult>[]) {
  return unwrap(
    await defHttp.postJson({
      url: CHECK_API + '/district/materialResult/saveList',
      data: { resultId, materialResultList },
    }),
  );
}
