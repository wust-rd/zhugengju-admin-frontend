/**
 * 市住更局 —— 总览页 接口层（后端 modules/check）
 *
 * 总览页数据流（年份/体系选定后）：
 *  1. overviewSystemList —— 指标体系全量拉取：年份下拉（setYear 去重倒序）与
 *     指标体系下拉（按年份过滤）共用一次请求；
 *  2. indicatorListBySet（./indicator）—— 指标项全量：一级维度 tab + 二级维度分组骨架；
 *  3. overviewResultRows —— 指标项结果全量：与指标项按 itemNo 前端联表得数值/评估结果，
 *     汇总出「指标评价结果」五档分布（evaluateResult 为空归入 无标准 档）；
 *  4. overviewSurveyByYear —— 满意度调查（按体检年份取调查主行，再取问题明细）：
 *     行 = 关联指标名（兜底问题原文） + 满意率。
 *
 * 注意：indicatorResult/page 的行不含维度列（表6 快照），维度信息一律以
 * indicatorItem/page（表2）为准，两侧按 itemNo 对齐。
 */

import { defHttp } from '@jeesite/core/utils/http/axios';
import { CHECK_API, unwrap } from '../common';

/** 指标体系下拉选项（总览页口径，取自 indicatorSet/page 行映射） */
export type OverviewSystemOption = {
  id?: string; // 体系主键（后续按 setId 拉指标项/结果）
  code?: string; // 业务编码 sysNo（如 202501）
  year?: string; // 体检年份 setYear
  indicatorName?: string; // 体系名称 setName
  indicatorCount?: number; // 指标数量(项)
  enabled?: string; // 启用状态（'0' 停用 / '1' 启用，映射 enableStatus）
};

/** 指标项结果行（indicatorResult/page 行原样，无维度列） */
export type OverviewResultRow = {
  itemNo?: number; // 指标编号（与表2 itemNo 对齐，联表键）
  itemName?: string;
  itemUnit?: string;
  resultValue?: number | null; // 指标值（未填报为 null）
  standardValue?: number | null;
  evaluateResult?: string | null; // 很好 / 较好 / 一般 / 不足 / 无标准；不可评估时为 null
  warningStatus?: string | null;
};

/** 满意度调查问题行（survey/{id} 的 questionList 行原样） */
export type OverviewSurveyQuestion = {
  id?: string;
  sortNo?: number;
  questionText?: string; // 调查问题原文
  firstDimensionName?: string | null;
  secondDimensionName?: string | null;
  indicatorItemId?: string | null;
  indicatorItemName?: string | null; // 关联指标项名称（展示优先用它）
  satisfactionRate?: number | null; // 满意率(%)，如 88.6
};

/** 拉取全部指标体系（pageSize=100 一次取全；总览页两下拉共用） */
export async function overviewSystemList(): Promise<OverviewSystemOption[]> {
  const data = unwrap<{ total: number; list: Recordable[] }>(
    await defHttp.get({ url: CHECK_API + '/indicatorSet/page', params: { pageNum: 1, pageSize: 100 } }),
  );
  return (data.list ?? []).map((row) => ({
    id: row.id,
    code: row.sysNo,
    year: row.setYear,
    indicatorName: row.setName,
    indicatorCount: row.indicatorCount,
    enabled: row.enableStatus == null ? undefined : String(row.enableStatus),
  }));
}

/** 拉取体系下全部指标项结果行（pageSize=1000 一次取全，前端按 itemNo 联表/汇总） */
export async function overviewResultRows(setId: string): Promise<OverviewResultRow[]> {
  const data = unwrap<{ total: number; list: OverviewResultRow[] }>(
    await defHttp.get({
      url: CHECK_API + '/indicatorResult/page',
      params: { setId, pageNum: 1, pageSize: 1000 },
    }),
  );
  return data.list ?? [];
}

/** 按体检年份取满意度调查问题明细（该年无调查返回空数组） */
export async function overviewSurveyByYear(year: string): Promise<OverviewSurveyQuestion[]> {
  const page = unwrap<{ total: number; list: { id?: string }[] }>(
    await defHttp.get({
      url: CHECK_API + '/survey/page',
      params: { surveyYear: year, pageNum: 1, pageSize: 1 },
    }),
  );
  const surveyId = page.list?.[0]?.id;
  if (!surveyId) return [];
  const info = unwrap<{ questionList?: OverviewSurveyQuestion[] }>(
    await defHttp.get({ url: `${CHECK_API}/survey/${surveyId}` }),
  );
  return info.questionList ?? [];
}
