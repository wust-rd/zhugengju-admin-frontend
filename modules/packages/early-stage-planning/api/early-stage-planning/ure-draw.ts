/**
 * 市住更局 —— 城市更新专家管理 · 在线抽取 接口层（后端 modules/esp，jeesite-module-esp）
 *
 * 后端代码：api/web/udraw/UreDrawController（/a/ure/draw/*）。
 * 响应协议：后端统一返回 {code, msg, data}（code=200 成功），unwrap() 统一解包（同 ure-expert.ts）。
 * 随机逻辑在后端（同批不重复）；单卡「随机更换」= excludeIds 传当前批次 + count=1 复用 draw。
 */

import { defHttp } from '@jeesite/core/utils/http/axios';
import { useGlobSetting } from '@jeesite/core/hooks/setting';
import type { UreExpert } from './ure-expert';

const { adminPath } = useGlobSetting();

/** 统一解包 {code, msg, data}（兼容 jeesite result 协议透传） */
function unwrap<T = any>(body: any): T {
  if (body && typeof body === 'object' && Reflect.has(body, 'code')) {
    if (body.code === 200) return body.data as T;
    throw new Error(body.msg || '接口请求失败');
  }
  return body as T;
}

/** 后端分页结构 */
type UrePage<T> = { total: number; pageNum: number; pageSize: number; list: T[] };
/** BasicTable fetchSetting 分页结构（totalField=count） */
type TablePage<T> = { count: number; list: T[] };

/** 抽取记录行（记录表格/详情共用，对应后端 UreDrawService.recordRow） */
export type UreDrawRecord = {
  id: string;
  projectName: string;
  implementOrg: string;
  coordinator: string;
  /** 抽取领域（逗号分隔字符串） */
  drawFields: string;
  drawCount: number;
  expertNames: string[];
  /** 抽取日期 yyyy-MM-dd */
  drawDate: string;
  assignFlag: boolean;
  createByName: string;
  createDate: string;
  /** 记录详情接口返回的专家行（列表接口不含） */
  experts?: UreExpert[];
};

/** 1.1 随机抽取（fields 空=不限领域；excludeIds 排除当前批次，用于整批/单卡更换） */
export async function ureDrawDraw(params: {
  fields: string[];
  count: number;
  excludeIds?: string[];
  projectName?: string;
  implementOrg?: string;
  coordinator?: string;
}): Promise<{ list: UreExpert[]; poolSize: number }> {
  return unwrap(await defHttp.postJson({ url: adminPath + '/ure/draw/draw', data: params }));
}

/** 1.2 确认选用（置「已入选」+ 落抽取记录；assignFlag=本次含指定人员） */
export async function ureDrawConfirm(params: {
  expertIds: string[];
  fields: string[];
  projectName?: string;
  implementOrg?: string;
  coordinator?: string;
  assignFlag?: boolean;
}): Promise<{ recordId: string; count: number; expertIds: string[] }> {
  return unwrap(await defHttp.postJson({ url: adminPath + '/ure/draw/confirm', data: params }));
}

/** 1.3 抽取记录分页（按时间倒序）——BasicTable api 直用 */
export async function ureDrawRecords(params: Recordable): Promise<TablePage<UreDrawRecord>> {
  const { pageNo, pageSize, ...rest } = params ?? {};
  const data = unwrap<UrePage<UreDrawRecord>>(
    await defHttp.get({
      url: adminPath + '/ure/draw/records',
      params: { ...rest, pageNum: pageNo, pageSize },
    }),
  );
  return { count: data.total, list: data.list };
}

/** 1.4 抽取记录详情（含 experts 专家行） */
export async function ureDrawRecord(id: string): Promise<UreDrawRecord> {
  return unwrap(await defHttp.get({ url: adminPath + '/ure/draw/record', params: { id } }));
}
