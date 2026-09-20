/*
  片区策划申报审查 · 状态口径与角色工具（scheme-declaration-review 共用）

  2026-09-20（二）后端审查流转落地后，本文件只保留**纯展示口径与真实角色读取**：
   - 状态/结论的标签与颜色字典（数据源已改为后端 approve_status / 接口 reviewStatus）；
   - 登录账号的角色/单位读取（后台角色管理已建档，读框架用户信息，无前端假身份）。
  原前端假数据层 review-mock.ts（localStorage 状态/记录/轮次/种子数据）已随对接删除。
*/
import type {
  ReviewConclusion,
  ReviewStatusKey,
} from '@jeesite/early-stage-planning/api/early-stage-planning/scheme-declaration-review/scheme-review';
import { useUserStoreWithOut } from '@jeesite/core/store/modules/user';

// ---------------- 审核状态字典 ----------------

/** 审核状态五类（标签/颜色对齐设计稿，列表状态列共用） */
export const REVIEW_STATUS: Record<ReviewStatusKey, { label: string; color: string }> = {
  unsubmitted: { label: '未提交', color: '#f5222d' },
  reviewing: { label: '审核中', color: '#1677ff' },
  returned: { label: '退回修改', color: '#fa8c16' },
  jointReviewing: { label: '联合审查中', color: '#722ed1' },
  passed: { label: '通过', color: '#52c41a' },
};

/** 状态下拉选项（搜索区/表单用） */
export const REVIEW_STATUS_OPTIONS = (Object.keys(REVIEW_STATUS) as ReviewStatusKey[]).map((key) => ({
  label: REVIEW_STATUS[key].label,
  value: key,
}));

/** 行状态读取：接口行 reviewStatus（page/form 均返回，空值后端已兜底；缺省按未提交展示） */
export function statusKeyOf(record: Recordable): ReviewStatusKey {
  const s = record?.reviewStatus as ReviewStatusKey | undefined;
  return s && s in REVIEW_STATUS ? s : 'unsubmitted';
}

/** 填报单位侧展示口径：「联合审查中」在填报单位看来仍是「审核中」 */
export function fillSideStatusOf(record: Recordable): ReviewStatusKey {
  const status = statusKeyOf(record);
  return status === 'jointReviewing' ? 'reviewing' : status;
}

/** 轮次中文序号（1 → 一、2 → 二…），审查记录各处共用（第N次联合审查） */
const ROUND_TEXT = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

export function roundText(round: number): string {
  return ROUND_TEXT[round - 1] ?? String(round);
}

// ---------------- 审核结论字典 ----------------

/** 审核结果：通过 / 退回修改 / 不涉及（联合审查单位可选「不涉及」） */
export const CONCLUSION_LABEL: Record<ReviewConclusion, { label: string; color: string }> = {
  passed: { label: '通过', color: '#52c41a' },
  returned: { label: '退回修改', color: '#fa8c16' },
  na: { label: '不涉及', color: '#8a94a6' },
};

/** 联审单位侧状态（单独一套，只有两态）：审核中=被指派未提交 / 已审核=已提交过 */
export const JOINT_SIDE_STATUS: Record<'reviewing' | 'reviewed', { label: string; color: string }> = {
  reviewing: { label: '审核中', color: '#1677ff' },
  reviewed: { label: '已审核', color: '#52c41a' },
};

// ---------------- 审查角色（真实角色账号，后台角色管理已建档） ----------------

/**
 * 三类角色代码（后台角色管理；菜单挂在「前期规划-片区策划申报审查」下）：
 *   填报单位   esp_pqchsbsc_fill_unit
 *   联合审查单位 esp_pqchsbsc_joint_review
 *   主审单位   esp_pqchsbsc_main_review
 * 一个人的角色可能同时勾选多个，优先级：主审 > 联合审查 > 填报（主审权限最高）。
 */
export const ROLE_CODE = {
  fillUnit: 'esp_pqchsbsc_fill_unit',
  jointReview: 'esp_pqchsbsc_joint_review',
  mainReview: 'esp_pqchsbsc_main_review',
} as const;

/** 当前登录者的审查角色（都没有 = none，只能查看） */
export type ReviewerRole = 'fill' | 'joint' | 'main' | 'none';

/** 当前登录者身份：角色 + 单位名称（展示用；操作合法性以后端 actions/接口校验为准） */
export type ReviewerIdentity = {
  code: string;
  /** 单位名称：取登录用户信息里的机构/单位名称（officeName，无则公司/用户名） */
  name: string;
  role: ReviewerRole;
};

/** 角色代码 → 中文名（列表/页头展示） */
export const ROLE_LABEL: Record<ReviewerRole, string> = {
  main: '主审单位',
  joint: '联合审查单位',
  fill: '填报单位',
  none: '无审查角色',
};

/** 当前登录者的角色（读框架用户信息里的授权角色） */
export function roleOfCurrentUser(): ReviewerRole {
  const roles = (useUserStoreWithOut().getRoleList ?? []) as string[];
  if (roles.includes(ROLE_CODE.mainReview)) return 'main';
  if (roles.includes(ROLE_CODE.jointReview)) return 'joint';
  if (roles.includes(ROLE_CODE.fillUnit)) return 'fill';
  return 'none';
}

/** 当前用户的单位名称（联审单位按它与后端联审单位字典的名称对应） */
export function currentUnitName(): string {
  const info = useUserStoreWithOut().getUserInfo ?? {};
  return String(info.officeName || info.company || info.userName || '');
}

/** 当前登录者身份（角色的优先级：主审 > 联合审查 > 填报 > 无） */
export function currentIdentity(): ReviewerIdentity {
  const role = roleOfCurrentUser();
  const name = currentUnitName();
  return { code: role === 'joint' ? name : role, name, role };
}
