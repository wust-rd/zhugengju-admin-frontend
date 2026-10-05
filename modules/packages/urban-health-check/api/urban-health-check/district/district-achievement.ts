/**
 * 市住更局 —— 区级体检成果 接口层（后端 modules/check，/cityCheck/district/achievement*，文档 #39~#58）
 *
 * 模型（与市级成果的差异：市级一年一行按类型分目录；区级一成果目录下挂**五类清单页签**）：
 *  成果目录（表）：{id, setId, setYear, areaCode, areaName, district, fillUnit, responsibleUser,
 *    contactPhone, fillDate, problemCount/opportunityCount/demandCount/baseCount/stockCount
 *    （五类清单计数冗余）, fillStatus, submitStatus, reportFile, archiveFile}
 *    同年同区同片区唯一；提交后只读（可撤回）。
 *  清单明细（三清单共用 item 表）：{id, catalogId, itemType(1问题整治/2发展机遇/3更新诉求),
 *    sortNo, itemDesc(≤1000字), firstDimension(仅问题整治:对应体检维度), resourceType(仅发展机遇:机遇类型)}
 *    删除后同组 sortNo 服务端重排连续。
 *  基础资料（base + baseFile 附件子表）：{id, catalogId, groupName(资料分组), docName(文档名称),
 *    fileCount, inputTime, fileList:[{id, fileName, filePath, fileExt, fileSize}]}
 *  储备项目（stock）：{id, catalogId, projectName(项目名称), reformType(改造类型),
 *    investAmount(投资额), buildContent(建设内容)}——支持模板导入（整单替换）。
 * 注：原型上的程度范围/关联指标项/满意度字段后端表不存在（用户确认按后端现状做）；
 *     自动代入区级无接口（按钮提示开发中）。
 */

import { defHttp } from '@jeesite/core/utils/http/axios';
import { CHECK_API, unwrap, pageGet } from '../common';

/** 清单类型（后端数字枚举） */
export const ITEM_TYPE = {
  /** 问题整治清单（用 firstDimension 对应体检维度） */
  PROBLEM: '1',
  /** 发展机遇清单（用 resourceType 机遇类型） */
  OPPORTUNITY: '2',
  /** 更新诉求清单（两者均不用） */
  DEMAND: '3',
} as const;

/** 页签定义（五类清单；code 对应 info.tabList.tabCode 约定 item:1/2/3、base、stock） */
export const TAB_DEFS = [
  { key: 'item:1', name: '问题整治清单' },
  { key: 'item:2', name: '发展机遇清单' },
  { key: 'item:3', name: '更新诉求清单' },
  { key: 'base', name: '基础资料库' },
  { key: 'stock', name: '储备建议库' },
] as const;

/** 区级体检成果目录实体 */
export type DistrictAchievement = {
  id?: string;
  setId?: string; // 关联区级指标体系
  setYear?: string;
  areaCode?: string;
  areaName?: string;
  district?: string;
  districtCode?: string;
  fillUnit?: string;
  responsibleUser?: string;
  contactPhone?: string;
  fillDate?: string;
  problemCount?: number;
  opportunityCount?: number;
  demandCount?: number;
  baseCount?: number;
  stockCount?: number;
  fillStatus?: number;
  submitStatus?: number;
  reportFile?: string;
  archiveFile?: string;
  updateDate?: string;
};

/** 三类清单明细行 */
export type DistrictAchievementItem = {
  id?: string;
  catalogId?: string;
  itemType?: string;
  sortNo?: number;
  itemDesc?: string; // 清单内容描述(必填 ≤1000 字)
  firstDimension?: string | null; // 对应体检维度(问题整治)
  resourceType?: string | null; // 机遇类型(发展机遇)
  updateDate?: string;
};

/** 基础资料行（含附件子表） */
export type DistrictAchievementBase = {
  id?: string;
  catalogId?: string;
  sortNo?: number;
  groupName?: string; // 资料分组
  docName?: string; // 文档名称
  fileCount?: number;
  inputTime?: string;
  fileList?: DistrictAchievementBaseFile[];
};

export type DistrictAchievementBaseFile = {
  id?: string;
  sortNo?: number;
  fileName?: string;
  filePath?: string; // 下载用
  fileExt?: string;
  fileSize?: number;
};

/** 储备项目行 */
export type DistrictAchievementStock = {
  id?: string;
  catalogId?: string;
  sortNo?: number;
  projectName?: string;
  reformType?: string;
  investAmount?: number | null;
  buildContent?: string;
  updateDate?: string;
};

// ==================== 成果目录 ====================

/** 分页查询成果（BasicTable api 直用；year/districtName/areaName → 后端 setYear/district/areaName） */
export async function districtAchievementPage(params: Recordable) {
  const { year, districtName, area, ...rest } = params ?? {};
  return pageGet<DistrictAchievement>(CHECK_API + '/district/achievement/page', {
    ...rest,
    setYear: year,
    district: districtName,
    areaName: area,
  });
}

/** 成果详情（含 tabList 五页签计数 [{tabCode, tabName, count}]） */
export async function districtAchievementInfo(id: string): Promise<DistrictAchievement & { tabList?: { tabCode: string; tabName: string; count: number }[] }> {
  return unwrap(await defHttp.get({ url: `${CHECK_API}/district/achievement/info/${id}` }));
}

/** 保存成果（新增/修改合一；必填 setYear/areaName/district；同年同区同片区唯一） */
export async function districtAchievementSave(data: Partial<DistrictAchievement>): Promise<{ id: string; fillDate: string }> {
  return unwrap(await defHttp.postJson({ url: CHECK_API + '/district/achievement/save', data }));
}

/** 批量删除成果（级联删五类清单；已提交需先撤回） */
export async function districtAchievementDelete(ids: string[]) {
  return unwrap(await defHttp.postJson({ url: CHECK_API + '/district/achievement/delete', data: { ids } }));
}

/** 提交成果（提交后五清单只读） */
export async function districtAchievementSubmit(id: string) {
  return unwrap(await defHttp.postJson({ url: CHECK_API + '/district/achievement/submit', data: { id } }));
}

/** 撤回提交 */
export async function districtAchievementCancelSubmit(id: string) {
  return unwrap(await defHttp.postJson({ url: CHECK_API + '/district/achievement/cancelSubmit', data: { id } }));
}

// ==================== 三类清单明细（item） ====================

/** 分页查询清单明细（catalogId + itemType 必填） */
export async function districtAchievementItemPage(params: Recordable) {
  return pageGet<DistrictAchievementItem>(CHECK_API + '/district/achievement/item/page', {
    ...params,
    pageSize: 100,
  });
}

/** 拉取某类清单全部行（编辑页本地筛选） */
export async function districtAchievementItemList(catalogId: string, itemType: string) {
  const page = await pageGet<DistrictAchievementItem>(CHECK_API + '/district/achievement/item/page', {
    catalogId,
    itemType,
    pageNum: 1,
    pageSize: 100,
  });
  return page.list ?? [];
}

/** 保存清单项（新增/修改合一；itemDesc 必填） */
export async function districtAchievementItemSave(
  data: Partial<DistrictAchievementItem> & { catalogId: string; itemType: string; itemDesc: string },
): Promise<{ id: string; itemType: string; count: number; fillStatus: number }> {
  return unwrap(await defHttp.postJson({ url: CHECK_API + '/district/achievement/item/save', data }));
}

/** 批量删除清单项（同组 sortNo 服务端重排） */
export async function districtAchievementItemDelete(ids: string[]) {
  return unwrap(await defHttp.postJson({ url: CHECK_API + '/district/achievement/item/delete', data: { ids } }));
}

// ==================== 基础资料库（base + baseFile） ====================

/** 分页查询基础资料（行含 fileList 附件子表） */
export async function districtAchievementBasePage(params: Recordable) {
  return pageGet<DistrictAchievementBase>(CHECK_API + '/district/achievement/base/page', {
    ...params,
    pageSize: 100,
  });
}

export async function districtAchievementBaseList(catalogId: string) {
  const page = await pageGet<DistrictAchievementBase>(CHECK_API + '/district/achievement/base/page', {
    catalogId,
    pageNum: 1,
    pageSize: 100,
  });
  return page.list ?? [];
}

/** 保存基础资料（携带 fileList 整批覆盖附件；filePath 为上传返回路径） */
export async function districtAchievementBaseSave(
  data: Partial<DistrictAchievementBase> & { catalogId: string },
) {
  return unwrap(await defHttp.postJson({ url: CHECK_API + '/district/achievement/base/save', data }));
}

/** 批量删除基础资料（级联删附件记录） */
export async function districtAchievementBaseDelete(ids: string[]) {
  return unwrap(await defHttp.postJson({ url: CHECK_API + '/district/achievement/base/delete', data: { ids } }));
}

/** 下载基础资料附件（文件流 → blob 落盘） */
export async function districtAchievementBaseFileDownload(filePath: string, fallbackName: string): Promise<void> {
  const base = (import.meta.env.VITE_GLOB_API_URL as string) || '';
  const url = `${base}/js${CHECK_API}/district/achievement/base/file/download?filePath=${encodeURIComponent(filePath)}`;
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

// ==================== 储备建议库（stock） ====================

/** 分页查询储备项目 */
export async function districtAchievementStockPage(params: Recordable) {
  return pageGet<DistrictAchievementStock>(CHECK_API + '/district/achievement/stock/page', {
    ...params,
    pageSize: 100,
  });
}

export async function districtAchievementStockList(catalogId: string) {
  const page = await pageGet<DistrictAchievementStock>(CHECK_API + '/district/achievement/stock/page', {
    catalogId,
    pageNum: 1,
    pageSize: 100,
  });
  return page.list ?? [];
}

/** 保存储备项目（新增/修改合一） */
export async function districtAchievementStockSave(
  data: Partial<DistrictAchievementStock> & { catalogId: string },
) {
  return unwrap(await defHttp.postJson({ url: CHECK_API + '/district/achievement/stock/save', data }));
}

/** 批量删储备项目 */
export async function districtAchievementStockDelete(ids: string[]) {
  return unwrap(await defHttp.postJson({ url: CHECK_API + '/district/achievement/stock/delete', data: { ids } }));
}

/** 下载储备库导入模板 */
export async function districtAchievementStockTemplate(): Promise<void> {
  const base = (import.meta.env.VITE_GLOB_API_URL as string) || '';
  const url = `${base}/js${CHECK_API}/district/achievement/stock/template`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(String(res.status));
    const dispo = res.headers.get('content-disposition') || '';
    const m = /filename\*=utf-8''([^;]+)/i.exec(dispo);
    const name = m ? decodeURIComponent(m[1]) : '储备项目导入模板.xlsx';
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

/** 一键导入储备项目（multipart，整单替换） */
export async function districtAchievementStockImport(catalogId: string, file: File) {
  const res = await defHttp.uploadFile(
    { url: CHECK_API + '/district/achievement/stock/import' },
    { file, name: 'file', data: { catalogId } },
  );
  return unwrap((res as Recordable)?.data ?? res);
}
