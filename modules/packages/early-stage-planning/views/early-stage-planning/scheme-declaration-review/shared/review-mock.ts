/*
  片区策划申报审查 · 审查流转假数据层（填报单位 ⇄ 主审单位 ⇄ 联合审查单位）

  背景（2026-09-18）：三类角色尚未在后端建档，审查流转接口、「审核状态」列、
  审查意见/联合审查记录字段也都没有 —— 本文件用一份前端假数据把整条流程跑通，
  后端与角色就绪后集中替换本文件（替换点见文末 TODO）。

  流转口径（业务确认版）：
   1. 填报单位：暂存 → 未提交（可编辑）；保存提交 → 审核中（填报单位只读）；
   2. 主审单位审查（….scheme-review/form.vue）：
      - 通过 → 通过（终态，结束）；
      - 退回修改 → 退回修改（填报单位可 查看/编辑/重新提交/修改意见，重提后回到审核中）；
      - 联合审查 → 弹窗多选联合审查单位，**点确定即推送**（弹窗里已填的主审内容不作数）：
        状态 → 联合审查中，被选单位账号收到通知，可在自己的审查列表里审查填报内容；
        联合审查单位填 通过 / 退回修改 / 不涉及（每轮每单位只能提交一次，提交后不可修改）；
      - 主审不等待联审单位全部提交（可随时再出结论：通过 / 退回修改 / 再次联合审查）；
      - 再次联合审查 → 轮次 +1（第二次、第三次…），直到主审点「通过」流程结束。
   3. 填报单位看到的「联合审查中」仍显示为「审核中」（fillSideStatusOf）。

  替换点（后端 TODO）：
   1. 审核状态：ESP_MAP_AREA 增加 review_status（未提交/审核中/退回修改/联合审查中/通过）
      + 列表/详情回显，前端改为读接口值并删除 statusOf 的哈希兜底与 localStorage 缓存；
   2. 审查列表接口：按状态/角色查询（现复用待审查片区 isApprove=2 page 接口 + 前端过滤）；
   3. 审查记录：主审与联合审查的意见（审核结果/审核意见/附件/时间/单位/轮次）落库并回显，
      建议单表 ESP_REVIEW_RECORD（a_uid, role, unit_code, round, conclusion, opinion, files, time）；
   4. 联合审查：轮次与单位分配落库（a_uid, round, unit_codes, push_time）；
   5. 通知：现为前端 notification 提示 + 本地推送记录；有单位账号后改调框架内消息接口
      （packages/core 的 msg 模块）按单位推送；
   6. 角色与数据权限：填报单位仅见本单位片区、主审/联合审查单位按分配可见（现全部可见）。
*/
import { reactive } from 'vue';
import { dateUtil } from '@jeesite/core/utils/dateUtil';
import { useUserStoreWithOut } from '@jeesite/core/store/modules/user';
import type { EspSchemeFile } from '@jeesite/early-stage-planning/api/early-stage-planning/scheme-declaration-review/scheme-fill';

// ---------------- 审核状态 ----------------

/** 审核状态五类（标签/颜色对齐设计稿，列表状态列共用） */
export type ReviewStatusKey = 'unsubmitted' | 'reviewing' | 'returned' | 'jointReviewing' | 'passed';

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

/** 行主键：优先 id（后端行），无 id 的临时行退化为片区名称 */
export function schemeRowKey(record: Recordable): string {
  return String(record?.id ?? record?.name ?? '');
}

/** 轮次中文序号（1 → 一、2 → 二…），审查记录各处共用（第N次联合审查） */
const ROUND_TEXT = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

export function roundText(round: number): string {
  return ROUND_TEXT[round - 1] ?? String(round);
}

function nowText(): string {
  return dateUtil().format('YYYY-MM-DD HH:mm:ss');
}

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

/** 当前登录者身份：角色 + 单位名称（写入审查记录的「审查单位」） */
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

/** 当前登录者的角色（读框架用户信息里的授权角色，不再有前端演示身份） */
export function roleOfCurrentUser(): ReviewerRole {
  const roles = (useUserStoreWithOut().getRoleList ?? []) as string[];
  if (roles.includes(ROLE_CODE.mainReview)) return 'main';
  if (roles.includes(ROLE_CODE.jointReview)) return 'joint';
  if (roles.includes(ROLE_CODE.fillUnit)) return 'fill';
  return 'none';
}

/** 当前用户的单位名称（联审单位按它与「联合审查单位字典」名称匹配） */
export function currentUnitName(): string {
  const info = useUserStoreWithOut().getUserInfo ?? {};
  return String(info.officeName || info.company || info.userName || '');
}

/** 当前登录者身份（角色的优先级：主审 > 联合审查 > 填报 > 无） */
export function currentIdentity(): ReviewerIdentity {
  const role = roleOfCurrentUser();
  const name = currentUnitName();
  return { code: role === 'joint' ? name : role, name: name || '当前用户', role };
}

/**
 * 联合审查单位候选（弹窗多选；设计稿给的 10 家市级部门）。
 * ⚠️ 分配记录按**单位名称**存储，联审单位账号的机构名称需与这里的名称一致才能被匹配到；
 * 后端提供「联审单位字典（含部门编码）」后改为按编码分配与匹配（见接口文档 TODO）。
 */
export const JOINT_REVIEW_UNITS: ReviewerIdentity[] = [
  '市资建局',
  '市发改委',
  '市经信局',
  '市商务局',
  '市教育局',
  '市卫健委',
  '市财政局',
  '市交通局',
  '市水务局',
  '市消防局',
].map((name) => ({ code: name, name, role: 'joint' as const }));

// ---------------- 审查记录 / 联合审查轮次 ----------------

/** 审核结果：通过 / 退回修改 / 不涉及（联合审查单位可选「不涉及」） */
export type ReviewConclusion = 'passed' | 'returned' | 'na';

export const CONCLUSION_LABEL: Record<ReviewConclusion, { label: string; color: string }> = {
  passed: { label: '通过', color: '#52c41a' },
  returned: { label: '退回修改', color: '#fa8c16' },
  na: { label: '不涉及', color: '#8a94a6' },
};

/** 一条审查记录（主审或某个联合审查单位的一次提交） */
export type ReviewRecord = {
  id: string;
  /** main=主审单位 / joint=联合审查单位 */
  role: 'main' | 'joint';
  /** 审查单位名称 */
  unitName: string;
  /** 联合审查轮次（role=joint 时有值；主审记录不带轮次） */
  round?: number;
  conclusion: ReviewConclusion;
  opinion: string;
  files: EspSchemeFile[];
  time: string;
};

/** 一次联合审查的分配（轮次 + 选中的单位 + 推送时间） */
export type JointRound = {
  round: number;
  units: ReviewerIdentity[];
  time: string;
};

/** 通知推送记录（假数据：正式版按单位账号调框架内消息接口） */
export type PushNotice = {
  /** 接收单位 code */
  unitCode: string;
  unitName: string;
  round: number;
  /** 片区名称，便于展示 */
  rowName: string;
  time: string;
};

// ---------------- 落盘形态 ----------------

const STORAGE_KEY = 'scheme-declaration-review-mock';
/** 结构版本：形态变更后旧缓存自动作废（避免脏数据） */
const STORAGE_VERSION = 2;

type MockState = {
  version: number;
  /** id → 审核状态 */
  statuses: Record<string, ReviewStatusKey>;
  /** id → 审查记录（含主审与联合审查，按提交顺序） */
  records: Record<string, ReviewRecord[]>;
  /** id → 联合审查轮次分配 */
  rounds: Record<string, JointRound[]>;
  /** id → 推送通知记录 */
  notices: Record<string, PushNotice[]>;
};

function emptyState(): MockState {
  return { version: STORAGE_VERSION, statuses: {}, records: {}, rounds: {}, notices: {} };
}

function loadMockState(): MockState {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<MockState>;
    if (parsed.version !== STORAGE_VERSION) return emptyState();
    const statuses = Object.fromEntries(
      Object.entries(parsed.statuses ?? {}).filter(([, value]) => value in REVIEW_STATUS),
    ) as Record<string, ReviewStatusKey>;
    return {
      version: STORAGE_VERSION,
      statuses,
      records: parsed.records ?? {},
      rounds: parsed.rounds ?? {},
      notices: parsed.notices ?? {},
    };
  } catch {
    return emptyState(); // 无缓存/被禁用/脏数据：按空表处理
  }
}

const initialState = loadMockState();

const statusMap = reactive(new Map<string, ReviewStatusKey>(Object.entries(initialState.statuses)));
const recordMap = reactive(new Map<string, ReviewRecord[]>(Object.entries(initialState.records)));
const roundMap = reactive(new Map<string, JointRound[]>(Object.entries(initialState.rounds)));
const noticeMap = reactive(new Map<string, PushNotice[]>(Object.entries(initialState.notices)));

function persistMockState(): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: STORAGE_VERSION,
        statuses: Object.fromEntries(statusMap),
        records: Object.fromEntries(recordMap),
        rounds: Object.fromEntries(roundMap),
        notices: Object.fromEntries(noticeMap),
      } satisfies MockState),
    );
  } catch {
    // 隐私模式等写不进：忽略，仅影响刷新后的回显
  }
}

// ---------------- 状态读写 ----------------

/**
 * 稳定哈希兜底状态：仅对「本次会话没操作过」的存量行生效。
 * 7 取模：0/1/2 → 未提交/审核中/退回修改，其余 → 通过（多数通过）。
 * ⚠️ 后端状态列就绪后连同本函数一起删除。
 */
export function mockStatusKey(record: Recordable): ReviewStatusKey {
  const id = schemeRowKey(record);
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) % 997;
  }
  return (['unsubmitted', 'reviewing', 'returned'] as const)[h % 7] ?? 'passed';
}

/**
 * 当前状态：会话内记录优先，其次「行自带状态」（接口/种子假数据下发或前端附加的 status），
 * 最后哈希兜底。
 */
export function statusOf(record: Recordable): ReviewStatusKey {
  const written = statusMap.get(schemeRowKey(record));
  if (written) return written;
  const carried = record?.status as ReviewStatusKey | undefined;
  if (carried && carried in REVIEW_STATUS) return carried;
  return mockStatusKey(record);
}

/** 填报单位侧展示用状态：联合审查中在填报单位看来仍是「审核中」 */
export function fillSideStatusOf(record: Recordable): ReviewStatusKey {
  const status = statusOf(record);
  return status === 'jointReviewing' ? 'reviewing' : status;
}

/** 写状态（暂存=unsubmitted / 保存提交=reviewing / 审查结论=见各动作函数） */
export function setReviewStatus(recordOrId: Recordable | string, status: ReviewStatusKey): void {
  const key = typeof recordOrId === 'string' ? recordOrId : schemeRowKey(recordOrId);
  if (key) {
    statusMap.set(key, status);
    persistMockState();
  }
}

/** 审查列表可见性：暂存（未提交）的片区不进审查 */
export function isSubmittedToReview(record: Recordable): boolean {
  return statusOf(record) !== 'unsubmitted';
}

// ---------------- 审查记录读写 ----------------

function keyOf(recordOrId: Recordable | string): string {
  return typeof recordOrId === 'string' ? recordOrId : schemeRowKey(recordOrId);
}

/** 某片区的全部审查记录（主审 + 联合审查，按提交顺序） */
export function reviewRecordsOf(recordOrId: Recordable | string): ReviewRecord[] {
  return recordMap.get(keyOf(recordOrId)) ?? [];
}

/** 某片区的主审审查记录（倒序，最新在前） */
export function mainRecordsOf(recordOrId: Recordable | string): ReviewRecord[] {
  return reviewRecordsOf(recordOrId)
    .filter((item) => item.role === 'main')
    .reverse();
}

/** 某单位的审查记录（再次进入审查页时回填/判断是否已提交） */
export function recordsOfUnit(
  recordOrId: Recordable | string,
  unitName: string,
  round?: number,
): ReviewRecord[] {
  return reviewRecordsOf(recordOrId).filter(
    (item) =>
      item.role === 'joint' && item.unitName === unitName && (round == null || item.round === round),
  );
}

/** 某片区已发起的联合审查轮次（按轮次升序） */
export function jointRoundsOf(recordOrId: Recordable | string): JointRound[] {
  return roundMap.get(keyOf(recordOrId)) ?? [];
}

/** 当前（最后一次）联合审查轮次；没发起过则为 undefined */
export function currentJointRound(recordOrId: Recordable | string): JointRound | undefined {
  const rounds = jointRoundsOf(recordOrId);
  return rounds[rounds.length - 1];
}

/** 某轮次各单位的提交情况（用于展示「已提交 n/m」与单位是否已提交） */
export function roundProgress(
  recordOrId: Recordable | string,
  round: number,
): { total: number; submitted: number; units: ReviewerIdentity[] } {
  const target = jointRoundsOf(recordOrId).find((item) => item.round === round);
  const units = target?.units ?? [];
  const submitted = units.filter((unit) => recordsOfUnit(recordOrId, unit.name, round).length > 0).length;
  return { total: units.length, submitted, units };
}

/** 推送通知记录 */
export function noticesOf(recordOrId: Recordable | string): PushNotice[] {
  return noticeMap.get(keyOf(recordOrId)) ?? [];
}

/** 某单位是否被当前轮次指派（用于联审单位列表里判断「待我审查」） */
export function isAssignedToMe(recordOrId: Recordable | string, identity = currentIdentity()): boolean {
  if (identity.role !== 'joint') return false;
  return (currentJointRound(recordOrId)?.units ?? []).some((unit) => unit.code === identity.code);
}

/** 我在当前轮次是否已提交（联审单位：提交后不可修改） */
export function hasSubmittedCurrentRound(recordOrId: Recordable | string, identity = currentIdentity()): boolean {
  if (identity.role !== 'joint') return false;
  const round = currentJointRound(recordOrId);
  if (!round) return false;
  return recordsOfUnit(recordOrId, identity.name, round.round).length > 0;
}

/**
 * 联合审查待办提醒（被指派且本轮未提交）—— 进入页面/推送后提示联合审查单位「您有 N 个片区待审查」，
 * 与站内消息（msgInner）推送互为补充。
 */
export function pendingJointTasks(identity = currentIdentity()): { rowKey: string; round: number }[] {
  if (identity.role !== 'joint') return [];
  const tasks: { rowKey: string; round: number }[] = [];
  for (const [key, rounds] of roundMap) {
    const round = rounds[rounds.length - 1];
    if (!round || !round.units.some((unit) => unit.code === identity.code)) continue;
    if (recordsOfUnit(key, identity.name, round.round).length > 0) continue;
    tasks.push({ rowKey: key, round: round.round });
  }
  return tasks;
}

/** 追加一条审查记录（内部） */
function appendRecord(key: string, record: Omit<ReviewRecord, 'id'>): ReviewRecord {
  const list = recordMap.get(key) ?? [];
  const created: ReviewRecord = { ...record, id: `rr-${key}-${list.length + 1}` };
  recordMap.set(key, [...list, created]);
  return created;
}

// ---------------- 联合审查单位自己的列表口径（两态，与主审的五态无关） ----------------

/**
 * 联审单位侧的状态（**单独一套逻辑，只有两态**）：
 *  - `reviewing` 审核中：被指派了但自己还没提交（或被指派后主审又发起新一轮、我没交）；
 *  - `reviewed` 已审核：自己把意见提交了 —— 只要提交过就是已审核。
 */
export type JointSideStatus = 'reviewing' | 'reviewed';

export const JOINT_SIDE_STATUS: Record<JointSideStatus, { label: string; color: string }> = {
  reviewing: { label: '审核中', color: '#1677ff' },
  reviewed: { label: '已审核', color: '#52c41a' },
};

/** 我被指派的联合审查轮次（升序）；非联审角色返回空 */
export function myJointRounds(recordOrId: Recordable | string, identity = currentIdentity()): JointRound[] {
  if (identity.role !== 'joint') return [];
  return jointRoundsOf(recordOrId).filter((round) => round.units.some((unit) => unit.name === identity.name));
}

/**
 * 联审单位的列表可见性：**只有被发起联合审查且指派到本单位时，列表才显示该片区**；
 * 没被指派过的一律不显示（主审/填报单位有自己的口径，不走这里）。
 */
export function visibleForJointUnit(recordOrId: Recordable | string, identity = currentIdentity()): boolean {
  return myJointRounds(recordOrId, identity).length > 0;
}

/** 联审单位侧状态：以「我被指派的最新一轮」是否已提交为准 */
export function jointSideStatusOf(recordOrId: Recordable | string, identity = currentIdentity()): JointSideStatus {
  const rounds = myJointRounds(recordOrId, identity);
  if (!rounds.length) return 'reviewing';
  const latest = rounds[rounds.length - 1];
  return recordsOfUnit(recordOrId, identity.name, latest.round).length ? 'reviewed' : 'reviewing';
}

/** 主审提交结论：通过 → 通过（终态）；退回修改 → 退回修改；追加主审审查记录 */
export function submitMainReview(
  record: Recordable,
  input: { conclusion: Exclude<ReviewConclusion, 'na'>; opinion: string; files: EspSchemeFile[] },
  identity = currentIdentity(),
): ReviewRecord {
  const key = schemeRowKey(record);
  const created = appendRecord(key, {
    role: 'main',
    unitName: identity.name,
    conclusion: input.conclusion,
    opinion: input.opinion,
    files: input.files,
    time: nowText(),
  });
  statusMap.set(key, input.conclusion === 'passed' ? 'passed' : 'returned');
  persistMockState();
  return created;
}

/**
 * 主审发起联合审查（弹窗点「确定」即推送）：轮次 +1、状态 → 联合审查中、
 * 记录推送通知；弹窗里主审已填的审核内容不作数（不落记录）。
 */
export function pushJointReview(record: Recordable, units: ReviewerIdentity[]): JointRound {
  const key = schemeRowKey(record);
  const rounds = roundMap.get(key) ?? [];
  const created: JointRound = { round: rounds.length + 1, units: [...units], time: nowText() };
  roundMap.set(key, [...rounds, created]);
  noticeMap.set(key, [
    ...(noticeMap.get(key) ?? []),
    ...units.map((unit) => ({
      unitCode: unit.code,
      unitName: unit.name,
      round: created.round,
      rowName: String(record.name ?? ''),
      time: created.time,
    })),
  ]);
  statusMap.set(key, 'jointReviewing');
  persistMockState();
  return created;
}

/** 联合审查单位提交本轮意见（每轮每单位一次；已提交则拒绝覆盖） */
export function submitJointReview(
  record: Recordable,
  input: { conclusion: ReviewConclusion; opinion: string; files: EspSchemeFile[] },
  identity = currentIdentity(),
): ReviewRecord | undefined {
  const key = schemeRowKey(record);
  const round = currentJointRound(key);
  if (!round || identity.role !== 'joint') return undefined;
  if (recordsOfUnit(key, identity.name, round.round).length > 0) return undefined; // 提交后不可修改
  const created = appendRecord(key, {
    role: 'joint',
    unitName: identity.name,
    round: round.round,
    conclusion: input.conclusion,
    opinion: input.opinion,
    files: input.files,
    time: nowText(),
  });
  persistMockState();
  return created;
}

// ---------------- 列表行与种子假数据 ----------------

/**
 * 审查列表行 = 待审查片区列表字段 + 审查状态。
 * 字段刻意做成可选，后端 page 接口行（EspSchemeListRow）可直接赋值，种子假数据也无需凑全。
 */
export type ReviewRow = {
  id: string;
  name: string;
  district?: string;
  areaHa?: number | null;
  funcTypes?: string[];
  /** 申报年份（= 后端 batch，待审查片区存年份） */
  batch?: string;
  invest?: number | null;
  reportTime?: string | null;
  reportOrg?: string | null;
  status: ReviewStatusKey;
  /** 演示标记：种子假数据（后端审查接口/测试数据就绪后删除本标记与 REVIEW_SEED_ROWS） */
  mock?: boolean;
};

/**
 * 审查列表种子假数据：**仅在后端接口不可用或查不到任何待审查片区时兜底展示**，
 * 保证页面在联调前不为空。正式数据一律来自填报单位填报（isApprove=2 片区）。
 */
export const REVIEW_SEED_ROWS: ReviewRow[] = [
  {
    id: 'mock-review-1',
    name: '汉阳区墨水湖片更新单元',
    district: '汉阳区',
    areaHa: 128.6,
    funcTypes: ['TOD', 'COD'],
    batch: '2026',
    invest: 42.6,
    reportTime: '2026-09-12 10:20:00',
    reportOrg: '汉阳区住房和城市更新局',
    status: 'reviewing',
    mock: true,
  },
  {
    id: 'mock-review-2',
    name: '武昌区杨园片更新单元',
    district: '武昌区',
    areaHa: 96.2,
    funcTypes: ['SOD', 'EOD'],
    batch: '2026',
    invest: 35.8,
    reportTime: '2026-09-13 15:05:00',
    reportOrg: '武昌区住房和城市更新局',
    status: 'jointReviewing',
    mock: true,
  },
  {
    id: 'mock-review-3',
    name: '江汉区常青片更新单元',
    district: '江汉区',
    areaHa: 74.5,
    funcTypes: ['IOD'],
    batch: '2026',
    invest: 21.3,
    reportTime: '2026-09-14 09:40:00',
    reportOrg: '江汉区住房和城市更新局',
    status: 'returned',
    mock: true,
  },
  {
    id: 'mock-review-4',
    name: '青山区红钢城片更新单元',
    district: '青山区',
    areaHa: 152.9,
    funcTypes: ['HOD', 'POD'],
    batch: '2026',
    invest: 58.1,
    reportTime: '2026-09-15 16:32:00',
    reportOrg: '青山区住房和城市更新局',
    status: 'passed',
    mock: true,
  },
];

/** 种子数据的内存过滤 + 分页（对齐 BasicTable fetchSetting 的 { list, count }） */
export function mockReviewPage(
  rows: ReviewRow[],
  params: Recordable,
): { list: ReviewRow[]; count: number } {
  const { pageNo = 1, pageSize = 10, name, district, batch, status } = params ?? {};
  const filtered = rows.filter((row) => {
    if (name && !String(row.name ?? '').includes(String(name))) return false;
    if (district && row.district !== district) return false;
    if (batch && row.batch !== batch) return false;
    if (status && row.status !== status) return false;
    return true;
  });
  const start = (Number(pageNo) - 1) * Number(pageSize);
  return { list: filtered.slice(start, start + Number(pageSize)), count: filtered.length };
}
