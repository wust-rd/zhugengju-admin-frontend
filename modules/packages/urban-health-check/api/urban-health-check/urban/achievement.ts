/**
 * 市住更局 —— 体检成果 接口层（后端 modules/check，/cityCheck/achievement，表10~14）
 *
 * 模型（字段与后端驼峰同名直用）：
 *  目录行（表10）：{id, sortNo, setYear, achievementType, indicatorSetId, surveyId,
 *    fillUnit, fillDate, submitStatus, itemCount, remarks}
 *    fillDate 后端自动=最新保存时间；itemCount 随明细自动同步；提交后整单只读。
 *  明细行（问题/资源/意愿=表11）：{id, sortNo, catalogId, analysisDesc,
 *    firstDimensionName(可空，原表未填不推算), scopeLevel(程度范围), remarks, indicatorList}
 *  关联指标项（表12）：{id, detailId, itemName, itemValue, itemValueText,
 *    indicatorItemId, itemEvaluate, sortNo, remarks}——明细保存携带 indicatorList
 *    时整批覆盖，指标值/评估由后端按关联体系结果自动带出快照。
 *  需求明细（表13）/储备库明细（表14）本期前端不开放新建（用户 2026-10-04 决策：
 *  新增类型先只做问题清单+资源清单，其余三种类型数据仅查看兼容）。
 *
 * 成果类型枚举为后端中文常量（CityCheckAchievementCatalog.TYPE_*）。
 */

import { defHttp } from '@jeesite/core/utils/http/axios';
import { CHECK_API, unwrap, pageGet } from '../common';

/** 成果类型（后端中文常量；前端新增仅开放前两种，其余三种仅查看兼容） */
export const ACHIEVEMENT_TYPES = {
  PROBLEM: '问题清单',
  RESOURCE: '资源清单',
  WILLING: '意愿清单',
  DEMAND: '需求清单',
  STOCK: '更新项目储备建议库',
} as const;

/** 新增时开放的成果类型（用户决策：先按 2025 现有两类做） */
export const ACHIEVEMENT_TYPE_OPTIONS = [
  { label: ACHIEVEMENT_TYPES.PROBLEM, value: ACHIEVEMENT_TYPES.PROBLEM },
  { label: ACHIEVEMENT_TYPES.RESOURCE, value: ACHIEVEMENT_TYPES.RESOURCE },
];

/** 程度范围（三选一：合并原型「严重/一般严重」与现有数据「限时解决」） */
export const SCOPE_LEVEL_OPTIONS = [
  { label: '严重', value: '严重' },
  { label: '一般严重', value: '一般严重' },
  { label: '限时解决', value: '限时解决' },
];

/** 问题/资源/意愿清单类型（共用表11 明细 + 可关联指标项 + 支持自动代入） */
export function isItemType(type?: string) {
  return (
    type === ACHIEVEMENT_TYPES.PROBLEM ||
    type === ACHIEVEMENT_TYPES.RESOURCE ||
    type === ACHIEVEMENT_TYPES.WILLING
  );
}

/** 体检成果目录实体 —— 后端驼峰同名直用 */
export type Achievement = {
  id?: string;
  sortNo?: number;
  setYear?: string; // 体检年份
  achievementType?: string; // 成果类型（问题清单/资源清单/…）
  indicatorSetId?: string; // 关联指标体系（问题/资源/意愿必填，用于自动代入与关联校验）
  surveyId?: string; // 关联满意度调查（需求清单用）
  fillUnit?: string; // 填报单位
  fillDate?: string; // 填报时间(后端自动)
  submitStatus?: number; // 0 待提交 / 1 已提交
  itemCount?: number; // 清单明细数量
  remarks?: string;
};

/** 明细-关联指标项（表12） */
export type AchievementIndicator = {
  id?: string;
  detailId?: string;
  itemName?: string; // 指标项名称
  itemValue?: number | null; // 指标值快照(数字轨)
  itemValueText?: string | null; // 指标值快照(文字轨)
  indicatorItemId?: string | null; // 指标项稳定主键(历史数据可能为空)
  itemEvaluate?: string | null; // 评估结果快照
  sortNo?: number;
  remarks?: string;
};

/** 问题/资源/意愿清单明细行（表11，前端开放的两种类型） */
export type AchievementDetail = {
  id?: string;
  sortNo?: number;
  catalogId?: string;
  analysisDesc?: string; // 分析描述(必填)
  firstDimensionName?: string | null; // 对应一级维度(可空)
  scopeLevel?: string | null; // 程度范围(严重/一般严重/限时解决)
  remarks?: string;
  indicatorList?: AchievementIndicator[];
};

/** 需求清单明细行（表13，仅查看兼容） */
export type AchievementDemand = {
  id?: string;
  sortNo?: number;
  catalogId?: string;
  questionText?: string;
  satisfactionRate?: number | null;
  firstDimensionName?: string | null;
  secondDimensionName?: string | null;
  indicatorItemName?: string | null;
  remarks?: string;
};

/** 储备库明细行（表14，仅查看兼容） */
export type AchievementStock = {
  id?: string;
  sortNo?: number;
  catalogId?: string;
  projectName?: string;
  projectDimension?: string;
  measure?: string;
  updateDirection?: string;
  implementTiming?: string;
  projectType?: string;
  responsibilityDept?: string;
  remarks?: string;
};

/** 分页查询成果目录（BasicTable api 直用；year/catalog → 后端 setYear/achievementType） */
export async function achievementPage(params: Recordable) {
  const { year, catalog, ...rest } = params ?? {};
  return pageGet<Achievement>(CHECK_API + '/achievement/page', {
    ...rest,
    setYear: year,
    achievementType: catalog,
  });
}

/** 成果详情（含 detailList 明细，按类型结构不同） */
export async function achievementInfo(id: string): Promise<Achievement & { detailList?: Recordable[] }> {
  return unwrap(await defHttp.get({ url: `${CHECK_API}/achievement/${id}` }));
}

/** 保存成果目录（新增/修改合一；问题/资源/意愿必须关联同年份指标体系） */
export async function achievementSave(data: Partial<Achievement>): Promise<{ id: string }> {
  return unwrap(await defHttp.postJson({ url: CHECK_API + '/achievement/save', data }));
}

/** 批量删除成果（级联删明细与关联指标项；已提交不可删） */
export async function achievementDelete(ids: string[]) {
  return unwrap(await defHttp.postJson({ url: CHECK_API + '/achievement/delete', data: { ids } }));
}

/** 提交成果（要求明细数>0，提交后只读） */
export async function achievementSubmit(id: string) {
  return unwrap(await defHttp.postJson({ url: CHECK_API + '/achievement/submit', data: { id } }));
}

/**
 * 成果自动代入（先清后插；问题/资源/意愿=指标结果中评估不足/一般的指标项，
 * 需求=满意度调查中满意度<80% 问题行；源数据为空时报错并保留原明细）
 */
export async function achievementGenerate(catalogId: string): Promise<{ generateCount: number }> {
  return unwrap(await defHttp.postJson({ url: CHECK_API + '/achievement/generate', data: { catalogId } }));
}

/** 拉取目录下全部清单明细（编辑页表格 dataSource 用，pageSize 1000 全量） */
export async function achievementDetailList(catalogId: string) {
  const page = await pageGet<Recordable>(CHECK_API + '/achievement/detail/page', {
    catalogId,
    pageNo: 1,
    pageSize: 1000,
  });
  return page.list ?? [];
}

/** 保存清单明细（新增/修改合一；携带 indicatorList 时整批覆盖表12） */
export async function achievementDetailSave(
  data: Partial<AchievementDetail> & { catalogId: string },
): Promise<{ id: string }> {
  return unwrap(await defHttp.postJson({ url: CHECK_API + '/achievement/detail/save', data }));
}

/** 批量删除清单明细（级联删关联指标项；已提交目录不可删） */
export async function achievementDetailDelete(ids: string[]) {
  return unwrap(await defHttp.postJson({ url: CHECK_API + '/achievement/detail/delete', data: { ids } }));
}

/** 下载文件流 → blob 落盘（导出共用） */
export async function achievementFileDownload(path: string, fallbackName: string): Promise<void> {
  const base = (import.meta.env.VITE_GLOB_API_URL as string) || '';
  const url = `${base}/js${path}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(String(res.status));
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

/** 按成果导出清单明细 Excel */
export function achievementExport(catalogId: string): Promise<void> {
  return achievementFileDownload(
    `${CHECK_API}/achievement/export?catalogId=${encodeURIComponent(catalogId)}`,
    `体检成果导出.xlsx`,
  );
}
