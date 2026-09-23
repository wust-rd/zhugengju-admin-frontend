/**
 * 市住更局 —— 名城保护 · 统计报表接口层
 *
 * 对接后端 /a/urban-protection/stats/...（责任书上传统计 / 巡查报表统计）。
 */

import { defHttp } from '@jeesite/core/utils/http/axios';
import { useGlobSetting } from '@jeesite/core/hooks/setting';

const { adminPath } = useGlobSetting();
const BASE = adminPath + '/urban-protection/stats';

/** 统一响应体 {code, msg, data}；code=200 成功 */
type Body<T> = { code: number; msg: string; data: T };

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

/** 责任书上传统计行 */
export type CommitmentRow = {
  qu: string;
  total: number;
  uploaded: number;
  missing: number;
};

/** 各区责任书上传统计：{rows, summary} */
export function fetchCommitmentStats() {
  return unwrap<{ rows: CommitmentRow[]; summary: CommitmentRow }>(defHttp.get({ url: BASE + '/commitment-letter' }));
}

/** 巡查报表统计行（单值列）：应巡查量=全部未删除建筑数×2（年度指标），已巡查量按报表口径×查询期统计 */
export type InspectionReportRow = {
  qu: string;
  /** 该区现有建筑数量（全部未删除，在册+拟优保） */
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

/** 巡查报表查询参数：mode=month 按 year+month；mode=range 按 begin~end（yyyy-MM-dd 含端点） */
export type InspectionReportQuery = {
  scope?: 'excellent' | 'proposed';
  mode: 'month' | 'range';
  year?: number;
  month?: number;
  begin?: string;
  end?: string;
};

/** 巡查报表统计：{rows, summary}（summary 为全市合计行） */
export function fetchInspectionReport(params: InspectionReportQuery) {
  return unwrap<{ rows: InspectionReportRow[]; summary: InspectionReportRow }>(
    defHttp.get({ url: BASE + '/inspection-report', params }),
  );
}

/** 巡查年份下拉（升序） */
export function fetchInspectionYears() {
  return unwrap<number[]>(defHttp.get({ url: BASE + '/years' }));
}
