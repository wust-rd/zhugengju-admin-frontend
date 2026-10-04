/**
 * 市住更局 —— 名城保护 · 拟优保建筑接口层
 *
 * 对接后端 /a/urban-protection/proposed/...（WHFW_OLDJZ 三表，独立于优保接口）。
 * 值口径与后端一致：isPatrol 为布尔；表无坐标与是否上报字段；
 * 时间字段为时间戳或字符串，展示前过 fmtDateTime。
 */

import { defHttp } from '@jeesite/core/utils/http/axios';
import { useGlobSetting } from '@jeesite/core/hooks/setting';

const { adminPath } = useGlobSetting();
const BASE = adminPath + '/urban-protection/proposed';

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

/** 拟优保建筑行 */
export type ProposedRow = {
  id: string;
  xzqName: string;
  jzOldName: string;
  /** 建筑坐落（表无坐标列） */
  jzLoccation: string;
  /** 是否纳入巡查（拟优保巡查报表应巡查量只计已纳入建筑） */
  isPatrol: boolean;
  /** 未删除巡查记录总数 */
  xcCount: number;
};

/** 分页查询参数 */
export type ProposedPageQuery = {
  xzqName?: string;
  jzOldName?: string;
  pageNum?: number;
  pageSize?: number;
};

/** 分页查询：返回 {list, count}（count 对齐框架 BasicTable fetchSetting.totalField） */
export async function fetchProposedPage(params: ProposedPageQuery) {
  const data = await unwrap<{ total: number; pageNum: number; pageSize: number; list: ProposedRow[] }>(
    defHttp.get({ url: BASE + '/list', params }),
  );
  return { list: data.list, count: data.total };
}

/** 保存（新增/修改合一；id 空=新增；建筑名称必填） */
export function saveProposed(data: Partial<ProposedRow>) {
  return unwrap<{ id: string }>(defHttp.postJson({ url: BASE + '/save', data }));
}

/** 逻辑删除 */
export function deleteProposed(id: string) {
  return unwrap<null>(defHttp.post({ url: BASE + `/delete?id=${encodeURIComponent(id)}` }));
}

/** 纳入/取消纳入巡查（isPatrol：'1' 纳入 / '0' 取消） */
export function toggleProposedPatrol(id: string, isPatrol: '0' | '1') {
  return unwrap<null>(
    defHttp.post({
      url: `${BASE}/patrol?id=${encodeURIComponent(id)}&isPatrol=${isPatrol}`,
    }),
  );
}

/** 下拉字典：{districts} */
export function fetchProposedDict() {
  return unwrap<{ districts: string[] }>(defHttp.get({ url: BASE + '/dict' }));
}

/** 拟优保巡查记录行（表无 SFSB 列，无 sfSb 字段） */
export type ProposedInspectionRow = {
  id: string;
  parentId: string;
  qu: string;
  jzOldName: string;
  xcUserName: string;
  czTime?: number | string | null;
  xcTime?: number | string | null;
  /** 是否特别关注 */
  sfTbgz: boolean;
  type: string | null;
  /** 录入类型展示（PC / APP） */
  typeView: string;
  houseAddres: string;
  // 以下仅详情接口返回
  xcContent?: string;
  xcWt?: string;
  houseXz?: string;
  lat?: string;
  lng?: string;
  photos?: { fileName: string; url: string }[];
};

/** 拟优保巡查分页查询参数（无 sfSb） */
export type ProposedInspectionPageQuery = {
  jzOldName?: string;
  xcUserName?: string;
  qu?: string;
  sfTbgz?: string;
  parentId?: string;
  begin?: string;
  end?: string;
  pageNum?: number;
  pageSize?: number;
};

/** 拟优保巡查分页查询 */
export async function fetchProposedInspectionPage(params: ProposedInspectionPageQuery) {
  const data = await unwrap<{ total: number; pageNum: number; pageSize: number; list: ProposedInspectionRow[] }>(
    defHttp.get({ url: BASE + '/inspection/list', params }),
  );
  return { list: data.list, count: data.total };
}

/** 拟优保巡查详情（含照片列表，MinIO URL 直出） */
export function fetchProposedInspectionDetail(id: string) {
  return unwrap<ProposedInspectionRow>(defHttp.get({ url: BASE + '/inspection/detail', params: { id } }));
}

/** 修改拟优保巡查特别关注（sfTbgz：'1' 关注 / '0' 取消） */
export function setProposedInspectionAttention(id: string, sfTbgz: '0' | '1') {
  return unwrap<null>(
    defHttp.post({
      url: `${BASE}/inspection/attention?id=${encodeURIComponent(id)}&sfTbgz=${sfTbgz}`,
    }),
  );
}

/** 拟优保巡查报表统计行（单值列）：应巡查量=各区未删除且已纳入巡查建筑数×2（年度指标） */
export type ProposedInspectionReportRow = {
  qu: string;
  /** 该区未删除且已纳入巡查（ISPATROL=1）建筑数量 */
  buildingCount: number;
  /** 应巡查量 = buildingCount × 2 */
  expected: number;
  /** 查询期内已巡查量 */
  done: number;
  /** 未巡查量 = expected - done（可为负，表示超巡查） */
  missing: number;
  /** 巡查率（百分数，1 位小数；应巡查量为 0 时为 null） */
  rate: number | null;
};

/** 拟优保巡查报表查询参数：mode=month 按 year+month；mode=range 按 begin~end（yyyy-MM-dd 含端点） */
export type ProposedInspectionReportQuery = {
  mode: 'month' | 'range';
  year?: number;
  month?: number;
  begin?: string;
  end?: string;
};

/** 拟优保巡查报表统计：{rows, summary}（summary 为全市合计行） */
export function fetchProposedInspectionReport(params: ProposedInspectionReportQuery) {
  return unwrap<{ rows: ProposedInspectionReportRow[]; summary: ProposedInspectionReportRow }>(
    defHttp.get({ url: BASE + '/stats/inspection-report', params }),
  );
}

/** 拟优保巡查年份下拉（升序） */
export function fetchProposedInspectionYears() {
  return unwrap<number[]>(defHttp.get({ url: BASE + '/stats/years' }));
}
