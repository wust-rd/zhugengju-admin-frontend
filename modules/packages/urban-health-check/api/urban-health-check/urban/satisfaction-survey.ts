/**
 * 市住更局 —— 满意度调查 接口层（后端 modules/check，/cityCheck/survey）
 *
 * 模型（单值满意率口径，字段与后端同名直用）：
 *  调查行（表8）：{id, sortNo, surveyYear, fillDate, dataSource, questionCount,
 *    validQuestionnaireCount, overallSatisfaction, submitStatus, remarks}
 *    fillDate 由后端自动记为最新保存时间；questionCount 随问题明细自动同步；
 *    overallSatisfaction 提交时按一级维度加权自动计算（维度内均值 → 维度间等权）。
 *  问题行（表9）：{id, sortNo, questionText, firstDimensionName, secondDimensionName,
 *    indicatorItemId, indicatorItemName, satisfactionRate, remarks}
 *    指标项按调查年份反查指标体系冗余 indicator_item_id，一/二级维度必须与指标项
 *    实际所属一致（后端强校验）；满意度 0~100。
 *  调查年份每年一次唯一；提交后（submitStatus=1）整单只读。
 */

import { defHttp } from '@jeesite/core/utils/http/axios';
import { CHECK_API, unwrap, pageGet } from '../common';

/** 满意度调查(年度记录)实体 —— 后端驼峰同名直用 */
export type SatisfactionSurvey = {
  id?: string;
  sortNo?: number; // 序号
  surveyYear?: string; // 调查年份(4 位数字)
  fillDate?: string; // 填报时间(后端自动=最新保存时间)
  dataSource?: string; // 数据来源
  questionCount?: number; // 调查问题数量(项；随问题明细自动同步)
  validQuestionnaireCount?: number; // 有效调查问卷数(份)
  overallSatisfaction?: number; // 综合满意度(%；提交时自动计算)
  submitStatus?: number; // 提交状态(0 待提交 / 1 已提交)
  remarks?: string;
};

/** 问卷问题行实体(某年调查的下钻明细) */
export type SurveyQuestion = {
  id?: string;
  sortNo?: number; // 序号
  surveyId?: string;
  questionText?: string; // 调查问卷问题
  firstDimensionName?: string; // 对应一级维度(随指标项带出)
  secondDimensionName?: string; // 对应二级维度(随指标项带出)
  indicatorItemId?: string; // 对应指标项主键
  indicatorItemName?: string; // 对应指标项名称
  satisfactionRate?: number; // 满意度(%)，0~100
  remarks?: string;
};

/** 分页查询调查（BasicTable api 直用；搜索字段 year → 后端 surveyYear） */
export async function surveyPage(params: Recordable) {
  const { year, ...rest } = params ?? {};
  return pageGet<SatisfactionSurvey>(CHECK_API + '/survey/page', { ...rest, surveyYear: year });
}

/** 调查详情（id：调查主键；含 questionList 问题明细） */
export async function surveyInfo(id: string): Promise<SatisfactionSurvey & { questionList?: SurveyQuestion[] }> {
  return unwrap(await defHttp.get({ url: `${CHECK_API}/survey/${id}` }));
}

/** 保存调查（新增/修改合一；调查年份每年一次唯一；保存即暂存态） */
export async function surveySave(data: Partial<SatisfactionSurvey>): Promise<{ id: string }> {
  return unwrap(await defHttp.postJson({ url: CHECK_API + '/survey/save', data }));
}

/** 批量删除调查（级联逻辑删除问卷问题；已提交调查后端同样放行删除，前端按状态隐藏入口） */
export async function surveyDelete(ids: string[]) {
  return unwrap(await defHttp.postJson({ url: CHECK_API + '/survey/delete', data: { ids } }));
}

/** 提交调查（校验问题齐全后按一级维度加权计算综合满意度写回，提交后只读） */
export async function surveySubmit(id: string): Promise<{ overallSatisfaction: number }> {
  return unwrap(await defHttp.postJson({ url: CHECK_API + '/survey/submit', data: { id } }));
}

/**
 * 问卷问题整单保存（先删旧再写新：编辑/删除单个问题 = 取当前列表改完后整单提交）
 * 任一行校验失败时旧数据不动（后端先整单校验再清库）。
 */
export async function surveyQuestionSaveList(surveyId: string, items: Partial<SurveyQuestion>[]) {
  return unwrap(
    await defHttp.postJson({ url: CHECK_API + '/survey/question/saveList', data: { surveyId, items } }),
  );
}

/** 问卷问题 Excel 一键导入（整单替换；模板列：序号/问题/一级/二级/指标项/满意度%） */
export async function surveyQuestionImport(surveyId: string, file: File) {
  const res = await defHttp.uploadFile(
    { url: CHECK_API + '/survey/question/import' },
    { file, name: 'file', data: { surveyId } },
  );
  return unwrap((res as Recordable)?.data ?? res);
}

/** 下载问卷问题导入模板 / 按调查导出全部问题（文件流 → blob 落盘） */
export async function surveyFileDownload(path: string, fallbackName: string): Promise<void> {
  const base = (import.meta.env.VITE_GLOB_API_URL as string) || '';
  const url = `${base}/js${path}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(String(res.status));
    // 优先取响应头 filename*=utf-8''，否则用调用方给的兜底名
    const dispo = res.headers.get('content-disposition') || '';
    const m = /filename\*=utf-8''([^;]+)/i.exec(dispo);
    const name = m ? decodeURIComponent(m[1]) : fallbackName;
    const href = URL.createObjectURL(await res.blob());
    const a = Object.assign(document.createElement('a'), { href, download: name });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href));
  } catch {
    window.open(url, '_blank', 'noopener');
  }
}

/** 下载问卷问题导入模板（仅表头） */
export function surveyQuestionTemplate(): Promise<void> {
  return surveyFileDownload(`${CHECK_API}/survey/question/template`, '满意度调查问卷问题导入模板.xlsx');
}

/** 按调查导出全部问卷问题 Excel */
export function surveyQuestionExport(surveyId: string): Promise<void> {
  return surveyFileDownload(
    `${CHECK_API}/survey/question/export?surveyId=${encodeURIComponent(surveyId)}`,
    `满意度调查问卷问题.xlsx`,
  );
}
