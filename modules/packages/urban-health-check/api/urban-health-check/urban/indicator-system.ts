/**
 * 市住更局 —— 体检指标体系 接口层（后端 modules/check，/cityCheck/indicatorSet）
 *
 * 响应协议与分页映射见 ../common.ts。后端行字段（接口文档口径）与前端页面字段不同名，
 * 本层做双向映射（toFrontSet/toBackSet），视图层统一使用前端字段：
 *  前端 code/year/indicatorName/reportUnit/reportDate/enabled('0'/'1')
 *   ↔ 后端 sysNo/setYear/setName/fillUnit/fillDate('yyyy-MM-dd HH:mm:ss' 取日期)/enableStatus(0/1)
 *  提交状态 submitStatus 前后端同名，但前端 '0'/'1' 字符串 ↔ 后端 0/1 数字。
 * 保存/启停/提交/删除传主键 id（列表行携带）。
 */

import { defHttp } from '@jeesite/core/utils/http/axios';
import { dateUtil } from '@jeesite/core/utils/dateUtil';
import { CHECK_API, unwrap, pageGet } from '../common';

/** 提交状态：0 待提交，1 已提交 */
export const SUBMIT_STATUS = {
  PENDING: '0',
  SUBMITTED: '1',
} as const;

/** 启用状态：0 停用，1 启用 */
export const ENABLED_STATUS = {
  DISABLED: '0',
  ENABLED: '1',
} as const;

/** 体检年份下拉选项（近 5 年，按当前年份动态生成，倒序） */
export const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => {
  const year = String(dateUtil().year() - i);
  return { label: `${year} 年`, value: year };
});

/** 体检指标体系 实体（前端字段口径） */
export type IndicatorSystem = {
  // 业务字段
  code?: string; // 业务编码 sys_no（如 202601）
  year?: string; // 体检年份
  surveyArea?: string; // 体检片区(区级,武汉街道名)
  adminDivision?: string; // 行政区划(区级,武汉行政区名)
  functionPosition?: string[]; // 功能定位(区级,可多选:TOD/COD/HOD/IOD/EOD,展示时拼接)
  indicatorName?: string; // 指标体系名称
  indicatorCount?: number; // 指标数量（项，用户声明的"系统指标项"）
  reportUnit?: string; // 填报单位
  reportDate?: string; // 填报时间（yyyy-MM-dd）
  enabled?: string; // 启用状态（0 停用，1 启用）
  submitStatus?: string; // 提交状态（0 待提交，1 已提交）
  // JeeSite 通用字段
  id?: string;
  status?: string;
  remarks?: string;
  createBy?: string;
  createDate?: string;
  updateBy?: string;
  updateDate?: string;
};

/** 后端行（接口文档口径，驼峰） */
type BackSet = Recordable & {
  id?: string;
  sysNo?: string;
  setYear?: string;
  setName?: string;
  setCategory?: string;
  indicatorCount?: number;
  fillUnit?: string;
  fillDate?: string;
  enableStatus?: number;
  submitStatus?: number;
  remarks?: string;
};

/** 后端行 → 前端实体（列表/详情共用；fillDate 仅取日期部分供 DatePicker 回显） */
function toFrontSet(row: BackSet): IndicatorSystem {
  return {
    ...row,
    code: row.sysNo,
    year: row.setYear,
    indicatorName: row.setName,
    reportUnit: row.fillUnit,
    reportDate: row.fillDate ? String(row.fillDate).slice(0, 10) : undefined,
    enabled: row.enableStatus == null ? undefined : String(row.enableStatus),
    submitStatus: row.submitStatus == null ? undefined : String(row.submitStatus),
  } as IndicatorSystem;
}

/** 前端表单值 → 后端保存入参（enableStatus/submitStatus 转数字，丢弃映射出的冗余键） */
function toBackSet(data: Partial<IndicatorSystem>): Recordable {
  const { code, year, indicatorName, reportUnit, reportDate, enabled, submitStatus, ...rest } = data ?? {};
  return {
    ...rest,
    setYear: year,
    setName: indicatorName,
    fillUnit: reportUnit,
    fillDate: reportDate,
    enableStatus: enabled == null ? undefined : Number(enabled),
    submitStatus: submitStatus == null ? undefined : Number(submitStatus),
  };
}

/** 列表查询参数 */
export type IndicatorSystemQuery = {
  pageNo?: number;
  pageSize?: number;
  year?: string; // 体检年份
  indicatorName?: string; // 指标体系名称
};

/** 分页查询（BasicTable api 直用；搜索字段 year/indicatorName → 后端 setYear/setName，行做后端→前端映射） */
export async function indicatorSystemPage(params: Recordable) {
  const { year, indicatorName, ...rest } = params ?? {};
  const page = await pageGet<BackSet>(CHECK_API + '/indicatorSet/page', {
    ...rest,
    setYear: year,
    setName: indicatorName,
  });
  return { count: page.count, list: page.list.map(toFrontSet) };
}

/** 体系详情（id：主键；含 itemList 指标项列表，行字段映射同 indicator.ts） */
export async function indicatorSystemInfo(id: string): Promise<IndicatorSystem & { itemList?: any[] }> {
  const data = unwrap<BackSet & { itemList?: any[] }>(await defHttp.get({ url: `${CHECK_API}/indicatorSet/${id}` }));
  const { itemList, ...set } = data;
  return { ...toFrontSet(set), itemList };
}

/** 保存体系（新增/修改合一：id 空新增，后端自动生成 code；前端表单字段映射为后端入参） */
export async function indicatorSystemSave(data: Partial<IndicatorSystem>): Promise<{ id: string }> {
  return unwrap(await defHttp.postJson({ url: CHECK_API + '/indicatorSet/save', data: toBackSet(data) }));
}

/** 批量删除体系（级联删除指标项/资料清单；仅待提交可删） */
export async function indicatorSystemDelete(ids: string[]) {
  return unwrap(await defHttp.postJson({ url: CHECK_API + '/indicatorSet/delete', data: { ids } }));
}

/** 提交体系（提交后体系与指标项只读） */
export async function indicatorSystemSubmit(id: string) {
  return unwrap(await defHttp.postJson({ url: CHECK_API + '/indicatorSet/submit', data: { id } }));
}

/** 启停用体系（enabled '1'=启用并自动停用其它体系，'0'=仅停用自身） */
export async function indicatorSystemEnable(id: string, enabled: string) {
  return unwrap(
    await defHttp.put({ url: CHECK_API + '/indicatorSet/enable', data: { id, enableStatus: Number(enabled) } }),
  );
}
