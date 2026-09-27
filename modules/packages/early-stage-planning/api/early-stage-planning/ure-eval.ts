/**
 * 市住更局 —— 城市更新专家管理 · 专家评价 接口层（后端 modules/esp，jeesite-module-esp）
 *
 * 后端代码：api/web/ueval/UreEvalController（/a/ure/eval/*）。
 * 响应协议：{code, msg, data}，unwrap() 统一解包（同 ure-expert.ts）。
 * 打分口径：三星 0~5 半星步进，一颗星 2 分；落库 0~10 得分，接口同时返回星数与得分。
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

/** 专家评价页清单行（list 接口：专家行 + 三维度均分 + 次数 + isLeader） */
export type UreEvalExpertRow = UreExpert & {
  isLeader: boolean;
  avgActivity: number;
  avgCoverage: number;
  avgEfficiency: number;
  evalCount: number;
};

/** 评价记录行（page 接口，历史记录） */
export type UreEvalRecordRow = {
  id: string;
  expertId: string;
  projectId: string;
  activityStars: number;
  coverageStars: number;
  efficiencyStars: number;
  activityScore: number;
  coverageScore: number;
  efficiencyScore: number;
  /** yyyy-MM-dd */
  time: string;
  evaluator: string;
  org: string;
  comment: string;
};

/** 排名卡条目（rank 接口，三维度各 Top5） */
export type UreRankItem = { expertId: string; name: string; org: string; avgScore: number; count?: number };

/** 1.1 三维度 Top5 排名（活跃度/专业度/效率） */
export async function ureEvalRank(): Promise<{ activity: UreRankItem[]; coverage: UreRankItem[]; efficiency: UreRankItem[] }> {
  return unwrap(await defHttp.get({ url: adminPath + '/ure/eval/rank' }));
}

/** 1.2 专家清单（projectCode 非空=项目参与专家带 isLeader；否则全部已入选专家） */
export async function ureEvalList(params: { name?: string; projectCode?: string }): Promise<UreEvalExpertRow[]> {
  return unwrap(await defHttp.get({ url: adminPath + '/ure/eval/list', params }));
}

/** 1.3 评价记录分页（expertId/projectCode 均可选）——BasicTable api 直用 */
export async function ureEvalPage(params: Recordable): Promise<TablePage<UreEvalRecordRow>> {
  const { pageNo, pageSize, ...rest } = params ?? {};
  const data = unwrap<UrePage<UreEvalRecordRow>>(
    await defHttp.get({
      url: adminPath + '/ure/eval/page',
      params: { ...rest, pageNum: pageNo, pageSize },
    }),
  );
  return { count: data.total, list: data.list };
}

/** 1.4 提交评价（三维度星数；评价人取当前登录用户；projectCode 非空=项目化评价） */
export async function ureEvalSave(data: {
  expertId: string;
  activityStars: number;
  coverageStars: number;
  efficiencyStars: number;
  comment?: string;
  projectCode?: string;
  time?: string;
}): Promise<{ id: string; expertId: string; expertName: string; projectId: string }> {
  return unwrap(await defHttp.postJson({ url: adminPath + '/ure/eval/save', data }));
}

/** 1.5 删除评价记录（逻辑删除） */
export async function ureEvalDelete(id: string): Promise<{ id: string }> {
  return unwrap(await defHttp.post({ url: adminPath + '/ure/eval/delete', params: { id } }));
}
