/**
 * 片区策划申报审查 接口层（后端模块 modules/esp，审查流转 v2026-09-20+）
 *
 * 后端文档：zhugengju-admin-backend/modules/esp/docs/接口文档-方案填报.md §10；
 * 响应协议与 scheme-fill.ts 相同（{code, msg, data}，unwrap 统一解包）。
 *
 * 状态机（ESP_MAP_AREA.approve_status，接口键 reviewStatus）：unsubmitted 未提交 →
 * reviewing 审核中 → passed 通过（终态）；returned 退回修改 → 重提回 reviewing；
 * jointReviewing 联合审查中（可多轮，主审可随时再出结论）。
 *
 * 数据范围由后端按登录角色决定：主审/无角色=全部已提交片区；联审（部门在联审
 * 单位字典内）=仅被指派过的片区；填报=本部门片区（含草稿）。
 */

import { defHttp } from '@jeesite/core/utils/http/axios';
import { useGlobSetting } from '@jeesite/core/hooks/setting';
import type { EspSchemeFile, EspSchemeFill, EspSchemeListRow } from './scheme-fill';

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
type EspPage<T> = { total: number; pageNum: number; pageSize: number; list: T[] };
/** BasicTable fetchSetting 分页结构（totalField=count） */
type TablePage<T> = { count: number; list: T[] };

// ---------------- 类型 ----------------

/** 审核状态五类（approve_status） */
export type ReviewStatusKey = 'unsubmitted' | 'reviewing' | 'returned' | 'jointReviewing' | 'passed';

/** 审核结论：主审 passed/returned；联审多一个 na-不涉及 */
export type ReviewConclusion = 'passed' | 'returned' | 'na';

/** 一条审查记录（主审或某联审单位的一次提交；role=main 不带轮次） */
export type EspReviewRecord = {
  id: string;
  role: 'main' | 'joint';
  unitCode?: string | null;
  unitName: string;
  round?: number | null;
  conclusion: ReviewConclusion;
  opinion?: string | null;
  files?: EspSchemeFile[];
  /** 审查时间 yyyy-MM-dd HH:mm:ss */
  reviewTime: string;
};

/** 一次联合审查轮次（指派单位 + 推送时间） */
export type EspJointRound = {
  round: number;
  units: { code: string; name: string }[];
  /** 推送时间 yyyy-MM-dd HH:mm:ss */
  pushTime?: string | null;
};

/** 审查页按钮可用性（后端按 角色+状态+指派+已提交 统一计算） */
export type EspReviewActions = {
  canMainReview: boolean;
  canJointPush: boolean;
  canJointReview: boolean;
  canEdit: boolean;
};

/** 审查页详情：填报全字段 + 可见记录 + 轮次 + 按钮可用性 */
export type EspReviewForm = {
  scheme: EspSchemeFill;
  records: EspReviewRecord[];
  rounds: EspJointRound[];
  actions: EspReviewActions;
};

/** 审查列表行（schemeReview/page）：片区行 + 状态三键（联审两态 + 待办标记） */
export type EspReviewListRow = EspSchemeListRow & {
  reviewStatus: ReviewStatusKey;
  /** 联审视角两态（仅联审数据范围时返回；其余 null） */
  jointStatus?: 'reviewing' | 'reviewed' | null;
  /** 联审待办：pending=最新轮指派本部门未提交 / submitted=已提交 / none=非联审 */
  myTaskStatus?: 'pending' | 'submitted' | 'none';
};

/** 审查字典（schemeReview/dict） */
export type EspReviewDict = {
  /** 联审单位=授有机构角色 esp_pqchsbsc_joint_review 的部门 */
  jointUnits: { code: string; name: string }[];
  districts: string[];
  funcTypes: string[];
  batches: string[];
};

/** 联审待办条目 */
export type EspReviewTodoItem = { id: string; name: string; round: number; pushTime: string };

// ---------------- 1. 列表 / 详情 ----------------

/** 1.1 审查列表分页（数据范围按登录角色；状态由 approve_status 驱动） */
export async function schemeReviewPage(params: Recordable): Promise<TablePage<EspReviewListRow>> {
  const { pageNo, pageSize, ...rest } = params ?? {};
  const data = unwrap<EspPage<EspReviewListRow>>(
    await defHttp.get({
      url: adminPath + '/esp/schemeReview/page',
      params: { ...rest, pageNum: pageNo, pageSize },
    }),
  );
  return { count: data.total, list: data.list };
}

/** 1.2 审查页详情：records 已按查看者角色过滤，actions 驱动按钮 */
export async function schemeReviewForm(id: string): Promise<EspReviewForm> {
  return unwrap(await defHttp.get({ url: adminPath + '/esp/schemeReview/form', params: { id } }));
}

// ---------------- 2. 审查流转操作 ----------------

/** 2.1 主审提交结论：通过 → passed 终态 / 退回修改 → returned */
export async function schemeReviewMainSubmit(
  id: string,
  data: { conclusion: 'passed' | 'returned'; opinion: string; files?: EspSchemeFile[] },
): Promise<{ reviewStatus: ReviewStatusKey; recordId: string }> {
  return unwrap(await defHttp.postJson({ url: adminPath + '/esp/schemeReview/mainSubmit', params: { id }, data }));
}

/** 2.2 主审发起联合审查：插一轮 → jointReviewing → 站内消息按部门推送（后端负责） */
export async function schemeReviewJointPush(
  id: string,
  unitCodes: string[],
): Promise<{ round: number; pushTime: string }> {
  return unwrap(
    await defHttp.postJson({ url: adminPath + '/esp/schemeReview/jointPush', params: { id }, data: { unitCodes } }),
  );
}

/** 2.3 联审单位提交本轮意见（每轮每单位一次，已提交后端拒绝） */
export async function schemeReviewJointSubmit(
  id: string,
  data: { conclusion: ReviewConclusion; opinion: string; files?: EspSchemeFile[] },
): Promise<{ recordId: string }> {
  return unwrap(await defHttp.postJson({ url: adminPath + '/esp/schemeReview/jointSubmit', params: { id }, data }));
}

// ---------------- 3. 待办 / 字典 ----------------

/** 3.1 联审待办（最新轮指派本部门、联合审查中且未提交） */
export async function schemeReviewTodo(): Promise<{ jointPending: number; items: EspReviewTodoItem[] }> {
  return unwrap(await defHttp.get({ url: adminPath + '/esp/schemeReview/todo' }));
}

/** 3.2 审查字典：联审单位 / 行政区 / 功能定位 / 批次 */
export async function schemeReviewDict(): Promise<EspReviewDict> {
  return unwrap(await defHttp.get({ url: adminPath + '/esp/schemeReview/dict' }));
}
