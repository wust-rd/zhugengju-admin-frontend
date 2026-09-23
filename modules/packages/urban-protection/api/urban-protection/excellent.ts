/**
 * 市住更局 —— 名城保护 · 优保建筑接口层
 *
 * 对接后端 /a/urban-protection/excellent/...（modules/urban protection 包）。
 * 值口径与后端一致：protectLeve/publishPc/publishTime 已由后端归一化（去 '.0'）；
 * proposed/deleted/sfScZrz 为布尔；时间字段为时间戳或字符串，展示前过 fmtDateTime。
 */

import { defHttp } from '@jeesite/core/utils/http/axios';
import { useGlobSetting } from '@jeesite/core/hooks/setting';

const { adminPath } = useGlobSetting();
const BASE = adminPath + '/urban-protection/excellent';

/** 统一响应体 {code, msg, data}；code=200 成功 */
type Body<T> = { code: number; msg: string; data: T };

/** 解包：非 200 抛 Error(msg) */
async function unwrap<T>(p: Promise<Body<T>>): Promise<T> {
  const res = await p;
  if (!res || typeof res.code !== 'number') {
    throw new Error('接口返回格式异常');
  }
  if (res.code !== 200) {
    throw new Error(res.msg || '请求失败');
  }
  return res.data;
}

/** 优保建筑行（列表/详情共用，详情多长文本字段） */
export type ExcellentRow = {
  id: string;
  xzqName: string;
  jzOldName: string;
  jzNowName: string;
  jzLoccation: string;
  buildYear: string;
  jzArar: string;
  cqr: string;
  protectLeve: string;
  publishPc: string;
  publishTime: string;
  jiedaoName: string;
  szSq: string;
  jgFzr: string;
  zrGzBm: string;
  deleted: boolean;
  proposed: boolean;
  sfScZrz: boolean;
  xcCount: number;
  addTime?: number | string | null;
  // 以下仅详情接口返回
  jiedaoCode?: string;
  zrGzBmFzr?: string;
  zrGzBmTel?: string;
  sqXcFzr?: string;
  sqXcFzrTel?: string;
  zyz?: string;
  zyzTel?: string;
  jbxx?: string;
  js?: string;
  dbm?: string;
  newDbm?: string;
  relicLevel?: string;
  englishIntr?: string;
  buildingDet?: string;
  locationX?: string;
  locationY?: string;
};

/** 列表范围 */
export type ExcellentScope = 'registered' | 'proposed' | 'all';

/** 分页查询参数（字段名与后端一致） */
export type ExcellentPageQuery = {
  scope?: ExcellentScope;
  xzqName?: string;
  jzOldName?: string;
  jzNowName?: string;
  protectLeve?: string;
  publishPc?: string;
  pageNum?: number;
  pageSize?: number;
};

/** 分页查询：返回 {list, count}（count 对齐框架 BasicTable fetchSetting.totalField） */
export async function fetchExcellentPage(params: ExcellentPageQuery) {
  const data = await unwrap<{ total: number; pageNum: number; pageSize: number; list: ExcellentRow[] }>(
    defHttp.get({ url: BASE + '/list', params }),
  );
  return { list: data.list, count: data.total };
}

/** 详情 */
export function fetchExcellentDetail(id: string) {
  return unwrap<ExcellentRow>(defHttp.get({ url: BASE + '/detail', params: { id } }));
}

/** 保存（新增/修改合一；id 空=新增） */
export function saveExcellent(data: Partial<ExcellentRow> & { status?: string }) {
  return unwrap<{ id: string }>(defHttp.postJson({ url: BASE + '/save', data }));
}

/** 逻辑删除 */
export function deleteExcellent(id: string) {
  return unwrap<null>(defHttp.post({ url: BASE + `/delete?id=${encodeURIComponent(id)}` }));
}

/** 还原已删除 */
export function restoreExcellent(id: string) {
  return unwrap<null>(defHttp.post({ url: BASE + `/restore?id=${encodeURIComponent(id)}` }));
}

/** 下拉字典：{districts, batches} */
export function fetchExcellentDict() {
  return unwrap<{ districts: string[]; batches: number[] }>(defHttp.get({ url: BASE + '/dict' }));
}
