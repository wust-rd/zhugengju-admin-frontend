/**
 * 市住更局 —— 评审管理 接口层（后端模块 modules/esp，评审项目）
 *
 * 响应协议：{code, msg, data}（code=200 成功 / 400 业务错误 / 500 系统异常），
 * 与三师库 expert-pool.ts 同一套 unwrap。
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

/** 评审项目状态：draft 待提交 / reviewing 评审中 / completed 已完成 */
export type EspReviewStatus = 'draft' | 'reviewing' | 'completed';

/** 片区三师快照（姓名 / 职称 / 单位） */
export type EspReviewExpertSnap = {
  id: string;
  name: string;
  title: string;
  org: string;
};

/** 列表/表单行 */
export type EspReviewProject = {
  id: string;
  projectName: string;
  aUid: string;
  areaName: string;
  dist: string;
  coordOrg: string;
  respDept: string;
  expertsText?: string;
  plannerId?: string;
  plannerName?: string;
  plannerTitle?: string;
  plannerOrg?: string;
  architectId?: string;
  architectName?: string;
  architectTitle?: string;
  architectOrg?: string;
  assessorId?: string;
  assessorName?: string;
  assessorTitle?: string;
  assessorOrg?: string;
  leaderId?: string;
  leaderName?: string;
  files?: EspSchemeFile[];
  status: EspReviewStatus;
  statusLabel?: string;
  startDate?: string | null;
};

/** 选择片区后回填 */
export type EspReviewAreaFill = {
  aUid: string;
  areaName: string;
  dist: string;
  hasDraw: boolean;
  planner: EspReviewExpertSnap | null;
  architect: EspReviewExpertSnap | null;
  assessor: EspReviewExpertSnap | null;
};

/** 保存入参 */
export type EspReviewProjectSave = {
  id?: string;
  projectName: string;
  aUid?: string;
  dist?: string;
  coordOrg?: string;
  respDept?: string;
  plannerId?: string;
  plannerName?: string;
  plannerTitle?: string;
  plannerOrg?: string;
  architectId?: string;
  architectName?: string;
  architectTitle?: string;
  architectOrg?: string;
  assessorId?: string;
  assessorName?: string;
  assessorTitle?: string;
  assessorOrg?: string;
  leaderId?: string;
  files?: EspSchemeFile[];
  submitType: 'draft' | 'submit';
};

/** 分页查询 —— BasicTable api 直用 */
export async function reviewProjectPage(params: Recordable): Promise<TablePage<EspReviewProject>> {
  const { pageNo, pageSize, ...rest } = params ?? {};
  const data = unwrap<EspPage<EspReviewProject>>(
    await defHttp.get({
      url: adminPath + '/esp/reviewProject/page',
      params: { ...rest, pageNum: pageNo, pageSize },
    }),
  );
  return { count: data.total, list: data.list };
}

/** 表单回显（id 空返回新增骨架） */
export async function reviewProjectForm(id?: string): Promise<EspReviewProject> {
  return unwrap(await defHttp.get({ url: adminPath + '/esp/reviewProject/form', params: { id: id || '' } }));
}

/** 选择片区后回填行政区 + 抽取记录三师 */
export async function reviewProjectAreaFill(aUid: string): Promise<EspReviewAreaFill> {
  return unwrap(await defHttp.get({ url: adminPath + '/esp/reviewProject/areaFill', params: { aUid } }));
}

/** 保存（暂存/提交） */
export async function reviewProjectSave(data: EspReviewProjectSave): Promise<{
  id: string;
  projectName: string;
  status: EspReviewStatus;
}> {
  return unwrap(await defHttp.postJson({ url: adminPath + '/esp/reviewProject/save', data }));
}

/** 列表提交 */
export async function reviewProjectSubmit(id: string): Promise<{
  id: string;
  projectName: string;
  status: EspReviewStatus;
}> {
  return unwrap(await defHttp.post({ url: adminPath + '/esp/reviewProject/submit', params: { id } }));
}

/** 删除（仅待提交） */
export async function reviewProjectDelete(id: string): Promise<{ id: string; projectName: string }> {
  return unwrap(await defHttp.post({ url: adminPath + '/esp/reviewProject/delete', params: { id } }));
}
