/**
 * 市住更局 —— 片区更新后评估 接口层（后端模块 modules/esp，/a/esp/postEval）
 *
 * 响应协议：{code, msg, data}（code=200 成功 / 400 业务错误 / 500 系统异常），
 * 与三师库 expert-pool.ts、评审管理 review-management.ts 同一套 unwrap。
 *
 * 后端表：ESP_POST_EVAL（主表）+ ESP_POST_EVAL_INDICATOR（成效指标）+ ESP_POST_EVAL_SATISFACTION（满意度）；
 * 清单（成效指标 28 条 / 满意度 13 条）来自 ESP_DICT（dict_type=postEvalIndicator / postEvalSatisfaction）。
 */

import { defHttp } from '@jeesite/core/utils/http/axios';
import { useGlobSetting } from '@jeesite/core/hooks/setting';
import type { EspSchemeFile } from './scheme-declaration-review/scheme-fill';

const { adminPath } = useGlobSetting();

function unwrap<T = any>(body: any): T {
  if (body && typeof body === 'object' && Reflect.has(body, 'code')) {
    if (body.code === 200) return body.data as T;
    throw new Error(body.msg || '接口请求失败');
  }
  return body as T;
}

type EspPage<T> = { total: number; pageNum: number; pageSize: number; list: T[] };
type TablePage<T> = { count: number; list: T[] };

/** 评估列表行 */
export type EspPostEvalRow = {
  id: string;
  /** 记录编码（下钻/详情定位，等于 id） */
  code?: string;
  /** 片区唯一号 */
  aUid: string;
  /** 片区名称（保存时刻快照） */
  areaName: string;
  /** 行政区 */
  dist: string;
  /** 片区批次 */
  batch: string;
  /** 片区规模（公顷） */
  areaHa: number | null;
  /** 功能定位 */
  funcTypeName: string;
  /** 填报单位 */
  reportOrg: string;
  /** 评估年份（yyyy） */
  evalYear: string;
};

/** 新增评估第一步：已批准片区行（evaluated=true 表示该年份已评估，不可再选） */
export type EspPostEvalAreaRow = {
  aUid: string;
  areaName: string;
  dist: string;
  batch: string;
  areaHa: number | null;
  funcTypeName: string;
  reportOrg: string;
  evaluated: boolean;
  evalId: string | null;
};

/** 成效指标清单项（一级/二级维度、序号、指标项、单位） */
export type EspPostEvalIndicatorDef = {
  code: string;
  lv1: string;
  lv2: string;
  seqNo: number;
  name: string;
  unit: string;
};

/** 满意度清单项（一级维度 = 好房子/好小区/好社区/好城区） */
export type EspPostEvalSatisfactionDef = {
  code: string;
  lv1: string;
  lv2: string;
  seqNo: number;
  name: string;
};

/** 成效指标行（含更新前/更新后填写值） */
export type EspPostEvalIndicatorValue = EspPostEvalIndicatorDef & {
  beforeValue: number | null;
  afterValue: number | null;
};

/** 满意度行（含更新前/更新后满意度填写值，单位 %） */
export type EspPostEvalSatisfactionValue = EspPostEvalSatisfactionDef & {
  beforeScore: number | null;
  afterScore: number | null;
};

/** 评估明细（编辑/查看页数据） */
export type EspPostEvalDetail = EspPostEvalRow & {
  /** 片区更新后评估结论（≤500 字） */
  conclusion: string | null;
  /** 片区更新后效果图 */
  effectFiles: EspSchemeFile[];
  indicators: EspPostEvalIndicatorValue[];
  satisfactions: EspPostEvalSatisfactionValue[];
};

/** 清单接口返回 */
export type EspPostEvalCatalog = {
  indicators: EspPostEvalIndicatorDef[];
  satisfactions: EspPostEvalSatisfactionDef[];
};

/** 保存入参（暂存与保存提交内容一致） */
export type EspPostEvalSave = {
  id?: string;
  aUid: string;
  evalYear: string;
  conclusion?: string | null;
  effectFiles?: EspSchemeFile[];
  indicators: { code: string; beforeValue: number | null; afterValue: number | null }[];
  satisfactions: { code: string; beforeScore: number | null; afterScore: number | null }[];
};

/** 评估列表分页 —— BasicTable api 直用 */
export async function postEvalPage(params: Recordable): Promise<TablePage<EspPostEvalRow>> {
  const { pageNo, pageSize, ...rest } = params ?? {};
  const data = unwrap<EspPage<EspPostEvalRow>>(
    await defHttp.get({
      url: adminPath + '/esp/postEval/page',
      params: { ...rest, pageNum: pageNo, pageSize },
    }),
  );
  return { count: data.total, list: data.list };
}

/** 新增评估第一步：已批准片区分页（evalYear 必填，用于标记该年度是否已评估） */
export async function postEvalAreaPage(params: Recordable): Promise<TablePage<EspPostEvalAreaRow>> {
  const { pageNo, pageSize, ...rest } = params ?? {};
  const data = unwrap<EspPage<EspPostEvalAreaRow>>(
    await defHttp.get({
      url: adminPath + '/esp/postEval/areaPage',
      params: { ...rest, pageNum: pageNo, pageSize },
    }),
  );
  return { count: data.total, list: data.list };
}

/** 评估清单（新增时构造空白表格用；明细接口已含清单） */
export async function postEvalCatalog(): Promise<EspPostEvalCatalog> {
  return unwrap(await defHttp.get({ url: adminPath + '/esp/postEval/catalog' }));
}

/** 评估明细 */
export async function postEvalDetail(id: string): Promise<EspPostEvalDetail> {
  return unwrap(await defHttp.get({ url: adminPath + '/esp/postEval/detail', params: { id } }));
}

/** 保存（暂存 / 保存同一接口，新增/修改合一） */
export async function postEvalSave(data: EspPostEvalSave): Promise<{
  id: string;
  aUid: string;
  areaName: string;
  evalYear: string;
}> {
  return unwrap(await defHttp.postJson({ url: adminPath + '/esp/postEval/save', data }));
}

/** 删除 */
export async function postEvalDelete(id: string): Promise<{ id: string; areaName: string; evalYear: string }> {
  return unwrap(await defHttp.post({ url: adminPath + '/esp/postEval/delete', params: { id } }));
}
