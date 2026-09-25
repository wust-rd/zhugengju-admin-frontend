/**
 * ifco —— 实施进度跟踪（数据层）
 *
 * 实施进度跟踪两个路由共用：
 * - 实施进度填报（/ifco/impl-progress/fill）：倒排工期计划 / 月度进度填报 / 提示督办处理 三卡；
 * - 区级实施进度管理（/ifco/impl-progress/district）：倒排工期确认 / 提示督办 两卡。
 *
 * 字段口径（2026-09-18 设计稿）：
 * - 倒排工期计划：新入库项目入库后 20 天内填报当年度倒排工期计划，在库项目当年
 *   12 月 31 日前填报下一年度倒排工期计划（计划开始月份 + 一月~十二月逐月计划）；
 * - 月度进度填报：实施主体每月 25 日前填报实施项目进度（月份页签按月填——月度进度
 *   信息 / 月度投资情况 / 项目纳统情况；已过月份只读，默认页签=当月；当前进度计划
 *   安排导入倒排工期计划当月内容不可改）；项目进度提醒为派生项：资金进度=年度投资进度、实施进度=
 *   实施进度完成百分比，资金超前实施 15 个百分点以上=滞后，其余（含实施超前资金）=正常；
 * - 提示/督办：市住更局按月下发工作提示与督办；填报端按项目逐行处理，区级端按
 *   下发编号整单处理（含涉及片区和项目的处理情况）。
 *
 * 已接后端：提示/督办 /a/ifco/supervise/*、倒排工期 /a/ifco/schedule/*、月度进度
 * /a/ifco/monthly/*、三色图 /a/ifco/tricolor/*（行集拉取后 SCHEDULES/MONTHLIES/
 * AREAS_TRICOLOR 作为本地缓存回填）；行政区 / 五改类别 /
 * 片区 / 项目归属复用项目库口径（@jeesite/ifco/api/ifco/project-library）。
 */

import NP from 'number-precision';
import { match } from 'ts-pattern';
import { defHttp } from '@jeesite/core/utils/http/axios';
import { useGlobSetting } from '@jeesite/core/hooks/setting';
import { unwrap } from '../progress-fill';

const { adminPath } = useGlobSetting();
const SUPERVISE_BASE = adminPath + '/ifco/supervise';
const SCHEDULE_BASE = adminPath + '/ifco/schedule';
const MONTHLY_BASE = adminPath + '/ifco/monthly';
const TRICOLOR_BASE = adminPath + '/ifco/tricolor';
import {
  DISTRICTS,
  FIVE_REFORM_TYPE_LABEL,
  PROJECT_AFFILIATION_LABEL,
  RENEWAL_AREA_BATCH_LABEL,
} from '@jeesite/ifco/api/ifco/project-library';

/** 填报页卡片（点选切换 = 表格筛选维度，经路由 ?card= 持久化） */
export type FillCardKey = 'schedule' | 'monthly' | 'supervise';

/** 区级/市级页卡片 */
export type DistrictCardKey = 'confirm' | 'monthly-confirm' | 'tricolor' | 'supervise';

/** 倒排工期 / 月度进度共用流程状态：待提交（表单未提交）→（提交）待区级审查→（区级审查通过）待市级审查→（市级审查通过）市级审查通过；区级/市级审查均可退回（退回修改）→重新提交回待区级审查 */
export type FillStatus = '待提交' | '待区级审查' | '待市级审查' | '市级审查通过' | '退回修改';

export const FILL_STATUS_OPTIONS: FillStatus[] = ['待提交', '待区级审查', '待市级审查', '市级审查通过', '退回修改'];

/** 提示/督办处理状态（待下发 = 市级提交后尚未下发；待确认 = 区级已提交待市级确认；
 * 已处理 = 区级/填报端已处理；已确认 = 市级已确认处理结果，流程办结） */
export type HandleStatus = '待下发' | '待处理' | '处理中' | '待确认' | '已处理' | '已确认';

export const HANDLE_STATUS_OPTIONS: HandleStatus[] = ['待处理', '处理中', '待确认', '已处理', '已确认'];

/** 下发状态（市级端：新增的提示/督办先暂存为待下发，下发后进入处理流程） */
export type DispatchStatus = '待下发' | '已下发';

export const DISPATCH_STATUS_OPTIONS: DispatchStatus[] = ['待下发', '已下发'];

/** 片区三色图状态（空串 = 未评估；市级/区级端按季度评估） */
export type TriColorStatus = '红色' | '黄色' | '绿色' | '';

export const TRICOLOR_STATUS_OPTIONS: TriColorStatus[] = ['红色', '黄色', '绿色'];

/** 提示/督办类型 */
export type SuperviseType = '工作提示' | '督办';

export const SUPERVISE_TYPE_OPTIONS: SuperviseType[] = ['工作提示', '督办'];

/** 当前建设阶段（月度进度填报；由前期手续或征拆阶段转为建设中须填实际开工时间，由建设中转为已完工须填实际完工时间） */
export const CONSTRUCTION_STAGE_OPTIONS = ['前期手续', '征拆阶段', '建设中', '已完工'] as const;

/** 当前项目状态（倒排工期列表「当前项目状态」列，紫色描边标签） */
export type ProjectStatus = '实施库入库' | '前期' | '新开工' | '在建' | '续建' | '已完工';

export const PROJECT_STATUS_OPTIONS: ProjectStatus[] = ['实施库入库', '前期', '新开工', '在建', '续建', '已完工'];

/** 纳统分类（入库纳统情况=是时填报） */
export const STATISTICS_CATEGORY_OPTIONS = ['固定资产投资项目', '房地产开发项目'] as const;

/** 月份选项（1~12 月，label 带「月」） */
export const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({ label: `${i + 1}月`, value: i + 1 }));

/** 一月~十二月计划标签（倒排工期表单/确认汇总用） */
export const MONTH_PLAN_LABELS = [
  '一月',
  '二月',
  '三月',
  '四月',
  '五月',
  '六月',
  '七月',
  '八月',
  '九月',
  '十月',
  '十一月',
  '十二月',
] as const;

/** 状态 → Tag 配色口径（列表状态列与表单标题 Tag 同源）：待提交灰、两级审查蓝、终态绿、退回橙 */
export function fillStatusTagProps(status: FillStatus): { color: string; variant: 'solid' | 'outlined' } {
  return match(status)
    .with('市级审查通过', () => ({ color: 'green', variant: 'solid' }) as const)
    .with('待提交', () => ({ color: 'default', variant: 'solid' }) as const)
    .with('待区级审查', '待市级审查', () => ({ color: 'blue', variant: 'outlined' }) as const)
    .with('退回修改', () => ({ color: 'orange', variant: 'outlined' }) as const)
    .exhaustive();
}

/** 处理状态 → Tag 配色口径：待下发/待处理橙、进行蓝、待确认紫、完成绿、市级已确认蓝实心 */
export function handleStatusTagProps(status: HandleStatus): { color: string; variant: 'solid' | 'outlined' } {
  return match(status)
    .with('待下发', '待处理', () => ({ color: 'orange', variant: 'outlined' }) as const)
    .with('处理中', () => ({ color: 'blue', variant: 'outlined' }) as const)
    .with('待确认', () => ({ color: 'purple', variant: 'outlined' }) as const)
    .with('已处理', () => ({ color: 'green', variant: 'solid' }) as const)
    .with('已确认', () => ({ color: 'blue', variant: 'solid' }) as const)
    .exhaustive();
}

/** 下发状态 → Tag 配色口径：已下发蓝、待下发橙 */
export function dispatchStatusTagProps(status: DispatchStatus): { color: string; variant: 'solid' | 'outlined' } {
  return match(status)
    .with('已下发', () => ({ color: 'blue', variant: 'solid' }) as const)
    .with('待下发', () => ({ color: 'orange', variant: 'outlined' }) as const)
    .exhaustive();
}

/** 片区三色图状态 → Tag 配色口径（红=滞后、黄=预警、绿=进展良好；未评估显示 -） */
export function triColorTagProps(status: TriColorStatus): { color: string; variant: 'solid' | 'outlined' } {
  return match(status)
    .with('绿色', () => ({ color: 'green', variant: 'solid' }) as const)
    .with('黄色', () => ({ color: 'orange', variant: 'solid' }) as const)
    .with('红色', () => ({ color: 'red', variant: 'solid' }) as const)
    .with('', () => ({ color: 'default', variant: 'solid' }) as const)
    .exhaustive();
}

/** 进度提醒 → Tag 配色口径（正常蓝描边、滞后红描边；取值见 progressReminderOf 派生规则） */
export function progressReminderTagProps(reminder: string): { color: string; variant: 'solid' | 'outlined' } {
  return match(reminder)
    .with('正常', () => ({ color: 'blue', variant: 'outlined' }) as const)
    .with('滞后', () => ({ color: 'red', variant: 'outlined' }) as const)
    .otherwise(() => ({ color: 'default', variant: 'solid' }) as const);
}

/** 退回信息（月度进度退回修改状态的行才有值；横幅展示提交/退回时间、退回部门、退回次数与意见） */
export type ReturnInfo = {
  submitDate: string;
  returnDate: string;
  returnOrg: string;
  /** 退回次数（第 N 次） */
  returnCount: number;
  returnOpinion: string;
};

/** 倒排工期审查记录（区级/市级每轮审查追加一条；退回重报后再审查为新一轮，历史全保留） */
export type ReviewRecord = {
  /** 第几轮（每次重新提交进入新一轮，同一轮先区级后市级） */
  round: number;
  /** 审查层级 */
  level: '区级' | '市级';
  /** 审查部门（区级=xx区住房和城市更新局，市级=市住房和城市更新局） */
  reviewOrg: string;
  /** 审查结论 */
  conclusion: '通过审查' | '退回修改';
  /** 审查意见 */
  opinion: string;
  /** 审查时间 */
  reviewDate: string;
};

/** 倒排工期计划行 */
export type ScheduleItem = {
  /** 项目 p_uid（基本信息共用组件按它自拉项目库详情） */
  pUid: string;
  projectCode: string;
  projectName: string;
  district: string;
  renewalAreaName: string;
  renewalAreaBatch: string;
  fiveReformType: string;
  projectAffiliation: string;
  /** 项目投资估算（亿元） */
  investEstimate: number;
  /** 本年度计划完成投资（亿元，主表 year_invest） */
  yearInvest: number;
  /** 计划开工时间 */
  planStartDate: string;
  /** 计划竣工时间 */
  planCompletionDate: string;
  /** 入库时间（表单副标题展示） */
  inLibraryDate: string;
  /** 是否新入库（统计卡口径：新入库项目 20 天内填报当年计划） */
  isNewInLibrary: boolean;
  /** 指定填报主体（列表「指定填报主体」列、区级确认列表「选择指导填报主体」筛选项） */
  reportOrg: string;
  /** 当前项目状态（列表「当前项目状态」列） */
  projectStatus: ProjectStatus;
  /** 计划开始月份（YYYY-MM，提交后不可修改） */
  planStartMonth: string;
  /** 一月~十二月计划（12 长度，空串=未填） */
  monthPlans: string[];
  fillStatus: FillStatus;
  /** 最近一次提交时间（退回横幅展示） */
  lastSubmitDate?: string;
  /** 审查记录（区级/市级逐轮追加；退回横幅与表单审查结果区从记录派生） */
  reviewRecords?: ReviewRecord[];
};

/** 月度进度信息逐月填报值（月度进度填报按月页签填；已过月份只读） */
export type MonthlyProgressEntry = {
  /** 当前建设阶段 */
  constructionStage: string;
  /** 当前形象进度 */
  currentProgress: string;
  /** 实施进度完成百分比（0~100，未填报不展示） */
  implementProgress?: number;
  /** 当前进度落实情况 */
  progressDesc: string;
  /** 实际开工时间（当前建设阶段为建设中时必填） */
  actualStartDate?: string;
  /** 实际完工时间（当前建设阶段为已完工时必填） */
  actualCompletionDate?: string;
};

/** 月度进度填报行 */
export type MonthlyItem = {
  /** 填报周期（YYYY-MM，搜索表单年/月过滤依据） */
  reportMonth: string;
  /** 项目 p_uid（基本信息共用组件按它自拉项目库详情） */
  pUid: string;
  projectCode: string;
  projectName: string;
  district: string;
  renewalAreaName: string;
  renewalAreaBatch: string;
  fiveReformType: string;
  projectAffiliation: string;
  /** 当前形象进度（当月快照，列表「当前形象进度」列；逐月值在 monthEntries） */
  currentProgress: string;
  /** 项目投资估算（亿元，只读） */
  investEstimate: number;
  /** 本年度计划完成投资（亿元，只读） */
  yearInvest: number;
  /** 计划开工时间（基本信息展示） */
  planStartDate: string;
  /** 计划竣工时间（基本信息展示） */
  planCompletionDate: string;
  /** 入库时间（基本信息展示） */
  inLibraryDate: string;
  /** 本年度累计完成投资（亿元，列表「年度累计完成投资」列同源） */
  yearAccumulatedInvest: number;
  /** 当月完成投资（亿元） */
  monthCompletedInvest: number;
  /** 截止目前累计完成投资（亿元，含往期结转） */
  totalAccumulatedInvest: number;
  /** 2026年1-5月累计完成投资（亿元；演示口径随周期字面展示，接后端后按填报周期动态） */
  yearRangeAccumulatedInvest?: number;
  /** 2025年10月前累计完成投资（亿元，往期结转；演示口径，接后端后按计划周期动态） */
  carryOverAccumulatedInvest?: number;
  /** 当前进度落实情况（当月快照，列表「完成进度计划情况」列） */
  monthProgressDesc: string;
  /** 实施进度完成百分比（0~100，未填报不展示；当月快照） */
  implementProgress?: number;
  /** 指定填报主体（列表「指定填报主体」列） */
  reportOrg: string;
  constructionStage: string;
  /** 入库纳统情况（是/否，列表「入库纳统情况」列） */
  statisticsIncluded: string;
  /** 纳统分类（入库纳统情况=是时填报） */
  statisticsCategory?: string;
  /** 统计局纳统项目编码（入库纳统情况=是时填报） */
  statisticsProjectCode?: string;
  /** 未纳统原因（入库纳统情况=否时必填） */
  notIncludedReason?: string;
  /** 困难问题（需市级或市领导调度的问题） */
  difficultyProblem?: string;
  /** 形象进度照片文件名（里程碑节点上传，不超过 9 张；演示记录文件名） */
  milestonePhotos?: string[];
  /** 备注 */
  remark?: string;
  /** 月度进度信息逐月填报值（key=月份 1~12；列表展示当月快照字段） */
  monthEntries?: Partial<Record<number, MonthlyProgressEntry>>;
  fillStatus: FillStatus;
  returnInfo?: ReturnInfo;
  /** 审查记录（区级/市级逐轮追加；抽屉审查结果区从记录派生，2026-09-22 起） */
  reviewRecords?: ReviewRecord[];
};

/** 提示/督办主记录（市级发起：待下发→已下发；区级提交处理结果、市级确认办结） */
export type SuperviseItem = {
  /** 主表 id */
  id: string;
  /** 下发编号（如 项目督办〔2026〕002号） */
  dispatchNo: string;
  superviseType: SuperviseType;
  /** 行政区（下发指向的区） */
  district: string;
  /** 下发状态（市级端：待下发=暂存，已下发=进入处理流程） */
  dispatchStatus: DispatchStatus;
  /** 巡查月份（YYYY-MM） */
  inspectMonth: string;
  dispatchDate: string;
  deadline: string;
  dispatchOrg: string;
  problem: string;
  /** 下发文件名 */
  dispatchFile: string;
  /** 联系人（市级下发时填写） */
  contactPerson?: string;
  /** 联系电话（市级下发时填写） */
  contactPhone?: string;
  /** 区级处理 */
  districtHandleStatus: HandleStatus;
  districtHandleDate: string;
  districtHandleDesc: string;
  districtHandleFileList: string[];
  /** 区级处理照片（不限数量、仅图片格式） */
  districtHandlePhotoList?: string[];
  /** 市级确认结果（同意处理结果/不同意处理结果；待确认转已确认时落值） */
  urbanConfirmResult?: string;
  /** 下发对象（片区×项目；保存随单整替） */
  areaItems: { area: string; projects: { pUid?: string; projectName: string; problem: string }[] }[];
};

/** 保存提示/督办单（市级新增/编辑待下发行；提交后 待下发/待下发） */
export function saveSupervise(payload: {
  id?: string;
  superviseType: SuperviseType;
  district: string;
  inspectMonth: string;
  deadline: string;
  contactPerson?: string;
  contactPhone?: string;
  areaItems: { area: string; projects: { pUid?: string; projectName: string; problem: string }[] }[];
}) {
  return unwrap<SuperviseItem>(defHttp.postJson({ url: SUPERVISE_BASE + '/save', data: payload }));
}

/** 单据清单（市级全量；区级按本区可见性由页面按登录机构过滤） */
export function fetchSuperviseList() {
  return unwrap<SuperviseItem[]>(defHttp.get({ url: SUPERVISE_BASE + '/list' }));
}

/** 下一编号（新增抽屉展示：督办=项目督办〔yyyy〕、提示=项目提示〔yyyy〕） */
export function fetchSuperviseNextNo(type: SuperviseType) {
  return unwrap<{ dispatchNo: string }>(defHttp.get({ url: SUPERVISE_BASE + '/nextNo', params: { type } }));
}

/** 下发（待下发→已下发/待处理，记录下发时间） */
export function dispatchSupervise(id: string) {
  return unwrap<SuperviseItem>(defHttp.post({ url: SUPERVISE_BASE + '/dispatch', params: { id } }));
}

/** 区级提交处理结果（→待确认；附件清单必填由前后端双拦截） */
export function districtSubmitSupervise(payload: {
  id: string;
  districtHandleDate?: string;
  districtHandleDesc?: string;
  fileList: string[];
  photoList: string[];
}) {
  return unwrap<SuperviseItem>(defHttp.postJson({ url: SUPERVISE_BASE + '/districtSubmit', data: payload }));
}

/** 市级确认（→已确认，流程办结；确认结果=同意处理结果/不同意处理结果） */
export function urbanConfirmSupervise(payload: { id: string; urbanConfirmResult: string }) {
  return unwrap<SuperviseItem>(defHttp.postJson({ url: SUPERVISE_BASE + '/urbanConfirm', data: payload }));
}

// ── 统计卡 ────────────────────────────────────────────────────────────

/** 统计卡（点选切换表格；stats 为卡内数字区，progress 为进度条） */
export type StatCard<K extends string = string> = {
  key: K;
  label: string;
  description: string;
  stats: { label: string; value: string }[];
  /** 进度条（已填报/应填报、已确认/应确认） */
  progress?: { done: number; total: number; label: '填报' | '确认' };
};

export const FILL_CARDS: StatCard<FillCardKey>[] = [
  {
    key: 'schedule',
    label: '倒排工期计划',
    description: '新入库项目入库后20天内填报当年度倒排工期计划，在库项目当年12月31日前填报下一年度倒排工期计划',
    stats: [
      { label: '新入库项目', value: '1' },
      { label: '待提交倒排工期计划', value: '2' },
    ],
  },
  {
    key: 'monthly',
    label: '月度进度填报',
    description: '实施主体每月25日前填报实施项目进度',
    stats: [
      { label: '当前填报周期', value: '2026-09' },
      { label: '距离填报截止天数', value: '3天' },
    ],
    progress: { done: 4, total: 7, label: '填报' },
  },
  {
    key: 'supervise',
    label: '提示/督办处理',
    description: '处理市住更局下发的提示、督办问题',
    stats: [
      { label: '待处理工作提示', value: '1' },
      { label: '待处理督办', value: '1' },
    ],
  },
];

export const DISTRICT_CARDS: StatCard<DistrictCardKey>[] = [
  {
    key: 'confirm',
    label: '倒排工期计划确认',
    description: '对填报主体的倒排工期计划进行确认',
    stats: [{ label: '当前周期', value: '2026-09 三季度' }],
    progress: { done: 2, total: 7, label: '确认' },
  },
  {
    key: 'monthly-confirm',
    label: '月度进度确认',
    description: '对每月填报进度情况进行确认',
    stats: [{ label: '当前周期', value: '2026-09' }],
    progress: { done: 2, total: 7, label: '确认' },
  },
  {
    key: 'tricolor',
    label: '片区三色图进展',
    description: '每季度对更新片区进行三色图进度评估',
    stats: [
      { label: '当前周期', value: '2026-09 三季度' },
      { label: '待评估', value: '2' },
      { label: '应评估', value: '7' },
    ],
  },
  {
    key: 'supervise',
    label: '提示/督办',
    description: '处理市住更局下发的提示、督办问题',
    stats: [
      { label: '待处理工作提示', value: '1' },
      { label: '待处理督办', value: '1' },
    ],
  },
];

/** 市级页四卡（统计卡数字照市级设计稿抄录，与演示假数据行数不一致属正常） */
export const URBAN_CARDS: StatCard<DistrictCardKey>[] = [
  {
    key: 'confirm',
    label: '倒排工期计划确认',
    description: '对填报主体的倒排工期计划进行确认',
    stats: [{ label: '当前周期', value: '2026-09 三季度' }],
    progress: { done: 368, total: 668, label: '确认' },
  },
  {
    key: 'monthly-confirm',
    label: '月度进度确认',
    description: '对每月填报进度情况进行确认',
    stats: [{ label: '当前周期', value: '2026-09 三季度' }],
    progress: { done: 368, total: 668, label: '确认' },
  },
  {
    key: 'tricolor',
    label: '片区三色图进展',
    description: '每季度对更新片区进行三色图进度评估',
    stats: [
      { label: '当前周期', value: '2026-09 三季度' },
      { label: '待评估', value: '80' },
      { label: '应评估', value: '182' },
    ],
  },
  {
    key: 'supervise',
    label: '提示/督办',
    description: '市住更局下发、处理提示、督办的问题',
    stats: [
      { label: '已发工作提示', value: '10' },
      { label: '已发督办', value: '10' },
    ],
  },
];

// ── 假数据 ────────────────────────────────────────────────────────────

/** 倒排工期工作流本地缓存（fetchScheduleRows 接口拉取后回填；monthPlanOf 等直读） */
export const SCHEDULES: ScheduleItem[] = [];

/** 月度进度工作流本地缓存（fetchMonthlyRows 接口拉取后回填） */
export const MONTHLIES: MonthlyItem[] = [];

// ── 片区三色图（市级/区级端按季度评估；红=滞后、黄=预警、绿=进展良好） ──

/** 片区三色图进展行 */
export type AreaTricolorItem = {
  /** 评估周期（YYYY-MM，搜索表单按季度过滤：月换算季度） */
  evaluatePeriod: string;
  /** 片区编号 */
  areaCode: string;
  district: string;
  areaName: string;
  renewalAreaBatch: string;
  /** 片区功能定位（代码列表，展示经 orientationLabel 转中英文后顿号拼接） */
  orientationList: string[];
  /** 总体投资估算（亿元） */
  totalInvestEstimate: number;
  /** 累计已完成投资（亿元） */
  accumulatedInvest: number;
  /** 年度总投资计划（亿元） */
  yearTotalPlanInvest: number;
  /** 季度完成投资（亿元） */
  quarterInvest: number;
  /** 年度已完成投资（亿元） */
  yearCompletedInvest: number;
  /** 年度投资进度（百分数 0~100） */
  yearProgress: number;
  /** 三色图状态（空=未评估） */
  triColor: TriColorStatus;
  /** 历史季度评估结果（每季度评估后归档一条，quarter=YYYY-Q；查看抽屉展示，最新在前） */
  history?: { quarter: string; status: TriColorStatus }[];
};

/** 片区三色图本地缓存（fetchTricolorAreas 接口拉取后回填） */
export const AREAS_TRICOLOR: AreaTricolorItem[] = [];

/** 通用查询条件（各列表搜索表单字段并集，未传的字段不过滤） */
export type ImplProgressQuery = {
  projectName?: string;
  fiveReformType?: string;
  renewalAreaName?: string;
  renewalAreaBatch?: string;
  projectAffiliation?: string;
  fillStatus?: string;
  constructionStage?: string;
  year?: number | string;
  month?: number | string;
  /** 评估季度（YYYY-Q，三色图列表季度面板筛选值） */
  quarter?: number | string;
  dispatchNo?: string;
  handleStatus?: string;
  reportOrg?: string;
  /** 行政区（市级督办列表「行政区」、三色图列表筛选项） */
  district?: string;
  /** 下发状态（市级督办列表筛选项） */
  dispatchStatus?: string;
  /** 片区名称（三色图列表筛选项） */
  areaName?: string;
  /** 三色图状态（红/黄/绿；三色图列表筛选项） */
  triColorStatus?: string;
  /** 评估状态（待评估/已评估；三色图列表筛选项） */
  evalStatus?: string;
};

/** 填报周期匹配（period 为 YYYY-MM；year/month 来自搜索表单，未传不过滤） */
function matchPeriod(period: string, params: ImplProgressQuery): boolean {
  const [year, month] = period.split('-');
  const filterYear = params.year === undefined || params.year === '' ? undefined : String(params.year);
  const filterMonth =
    params.month === undefined || params.month === '' ? undefined : String(params.month).padStart(2, '0');
  return (!filterYear || year === filterYear) && (!filterMonth || month === filterMonth);
}

/** 项目共用过滤段（编号/名称/五改/片区三件套/归属） */
function matchProject(
  item: {
    projectName: string;
    fiveReformType: string;
    renewalAreaName: string;
    renewalAreaBatch: string;
    projectAffiliation: string;
  },
  params: ImplProgressQuery,
): boolean {
  const keyword = (params.projectName ?? '').trim();
  return (
    (!keyword || item.projectName.includes(keyword)) &&
    (!params.fiveReformType || item.fiveReformType === params.fiveReformType) &&
    (!params.renewalAreaName || item.renewalAreaName === params.renewalAreaName) &&
    (!params.renewalAreaBatch || item.renewalAreaBatch === params.renewalAreaBatch) &&
    (!params.projectAffiliation || item.projectAffiliation === params.projectAffiliation)
  );
}

/** 倒排工期计划过滤 */
/** 倒排工期行集（后端 /schedule/rows：实施库项目左连工作流行；会话内缓存一次，
 * 保存后失效促重拉；SCHEDULES 缓存同步回填供 monthPlanOf 直读） */
let scheduleRowsPromise: Promise<ScheduleItem[]> | null = null;

export function fetchScheduleRows(): Promise<ScheduleItem[]> {
  scheduleRowsPromise ??= unwrap<ScheduleItem[]>(defHttp.get({ url: SCHEDULE_BASE + '/rows' })).then(
    (rows) => {
      SCHEDULES.splice(0, SCHEDULES.length, ...(rows ?? []));
      return SCHEDULES;
    },
    () => SCHEDULES,
  );
  return scheduleRowsPromise;
}

/** 保存倒排工作流行（后端按项目编号 upsert + 本地缓存更新并失效重拉） */
export async function saveScheduleWorkflow(row: ScheduleItem) {
  await unwrap<Recordable>(
    defHttp.postJson({ url: SCHEDULE_BASE + '/save', data: { projectCode: row.projectCode, row } }),
  );
  const index = SCHEDULES.findIndex((item) => item.projectCode === row.projectCode);
  if (index >= 0) SCHEDULES[index] = row;
  else SCHEDULES.push(row);
  scheduleRowsPromise = null;
}

/** 按项目编码取工作流行（无则以列表行为底并入内存仓库；编辑/审查写回前置） */
export function upsertScheduleWorkflow(row: ScheduleItem): ScheduleItem {
  const exist = SCHEDULES.find((item) => item.projectCode === row.projectCode);
  if (exist) return exist;
  SCHEDULES.push({
    ...row,
    monthPlans: [...row.monthPlans],
    reviewRecords: [...(row.reviewRecords ?? [])],
  });
  return SCHEDULES[SCHEDULES.length - 1]!;
}

export function filterSchedules(params: ImplProgressQuery, rows: ScheduleItem[] = SCHEDULES): ScheduleItem[] {
  return rows.filter(
    (item) =>
      matchProject(item, params) &&
      (!params.district || item.district === params.district) &&
      (!params.fillStatus || item.fillStatus === params.fillStatus) &&
      (!params.reportOrg || item.reportOrg === params.reportOrg) &&
      matchPeriod(item.planStartMonth, params),
  );
}

/** 月度进度填报过滤 */
/** 月度行集（后端 /monthly/rows：实施库项目左连工作流行；拉取前温热倒排缓存
 * ——monthPlanOf 当前进度计划安排依赖倒排数据；MONTHLIES 缓存同步回填） */
export async function fetchMonthlyRows(): Promise<MonthlyItem[]> {
  await fetchScheduleRows();
  const rows = await unwrap<MonthlyItem[]>(defHttp.get({ url: MONTHLY_BASE + '/rows' }));
  MONTHLIES.splice(0, MONTHLIES.length, ...(rows ?? []));
  return MONTHLIES;
}

/** 保存月度工作流行（后端按项目编号 upsert + 本地缓存更新） */
export async function saveMonthlyWorkflow(row: MonthlyItem) {
  await unwrap<Recordable>(
    defHttp.postJson({ url: MONTHLY_BASE + '/save', data: { projectCode: row.projectCode, row } }),
  );
  const index = MONTHLIES.findIndex((item) => item.projectCode === row.projectCode);
  if (index >= 0) MONTHLIES[index] = row;
  else MONTHLIES.push(row);
}

/** 按项目编码取月度工作流行（无则以列表行为底并入内存仓库；填报/审查写回前置） */
export function upsertMonthlyWorkflow(row: MonthlyItem): MonthlyItem {
  const exist = MONTHLIES.find((item) => item.projectCode === row.projectCode);
  if (exist) return exist;
  MONTHLIES.push({
    ...row,
    monthEntries: { ...(row.monthEntries ?? {}) },
    reviewRecords: [...(row.reviewRecords ?? [])],
  });
  return MONTHLIES[MONTHLIES.length - 1]!;
}

export function filterMonthlies(params: ImplProgressQuery, rows: MonthlyItem[] = MONTHLIES): MonthlyItem[] {
  return rows.filter(
    (item) =>
      matchProject(item, params) &&
      (!params.fillStatus || item.fillStatus === params.fillStatus) &&
      (!params.constructionStage || item.constructionStage === params.constructionStage) &&
      matchPeriod(item.reportMonth, params),
  );
}

/** 年度投资进度百分比数值（资金进度=年度累计完成投资/本年度计划完成投资，四舍五入取整；计划为 0 取 0） */
export function yearProgressValue(item: { yearAccumulatedInvest?: number; yearInvest?: number }): number {
  if (!item.yearInvest) return 0;
  return Math.round(NP.times(NP.divide(item.yearAccumulatedInvest ?? 0, item.yearInvest), 100));
}

/** 年度投资进度（列表列：年度累计完成投资/本年度计划完成投资，四舍五入取整；计划为 0 显示 —） */
export function yearProgressPercent(item: { yearAccumulatedInvest?: number; yearInvest?: number }): string {
  if (!item.yearInvest) return '—';
  return `${yearProgressValue(item)}%`;
}

/** 项目进度提醒（派生）：资金进度=年度投资进度、实施进度=实施进度完成百分比；
 * 资金超前实施 15 个百分点以上=滞后，其余（偏离 ±15 以内、实施超前资金、缺值）=正常 */
export function progressReminderOf(item: {
  yearAccumulatedInvest?: number;
  yearInvest?: number;
  implementProgress?: number;
}): '正常' | '滞后' {
  if (!item.yearInvest || item.implementProgress == null) return '正常';
  return NP.minus(yearProgressValue(item), item.implementProgress) > 15 ? '滞后' : '正常';
}

/** 当前进度计划安排（导入倒排工期计划中该项目当月填报的计划内容；无倒排数据为空） */
export function monthPlanOf(projectCode: string, month?: number | string): string {
  const index = Number(month ?? 0) - 1;
  if (!(index >= 0 && index <= 11)) return '';
  return SCHEDULES.find((item) => item.projectCode === projectCode)?.monthPlans[index] ?? '';
}

/** 提示/督办清单本地过滤（数据源=接口拉取；搜索表单条件，空值=全部） */
export function filterSupervises(params: ImplProgressQuery, rows: SuperviseItem[]): SuperviseItem[] {
  const dispatchNo = (params.dispatchNo ?? '').trim();
  return rows.filter(
    (item) =>
      (!dispatchNo || item.dispatchNo.includes(dispatchNo)) &&
      (!params.district || item.district === params.district) &&
      (!params.dispatchStatus || item.dispatchStatus === params.dispatchStatus) &&
      (!params.handleStatus || item.districtHandleStatus === params.handleStatus) &&
      matchPeriod(item.inspectMonth, params),
  );
}

/** 片区三色图行集（后端 /tricolor/rows；AREAS_TRICOLOR 缓存同步回填） */
export async function fetchTricolorAreas(): Promise<AreaTricolorItem[]> {
  const rows = await unwrap<AreaTricolorItem[]>(defHttp.get({ url: TRICOLOR_BASE + '/rows' }));
  AREAS_TRICOLOR.splice(0, AREAS_TRICOLOR.length, ...(rows ?? []));
  return AREAS_TRICOLOR;
}

/** 保存片区行（评估后整行 upsert + 本地缓存更新） */
export async function saveTricolorArea(row: AreaTricolorItem) {
  await unwrap<Recordable>(defHttp.postJson({ url: TRICOLOR_BASE + '/save', data: { areaCode: row.areaCode, row } }));
  const index = AREAS_TRICOLOR.findIndex((item) => item.areaCode === row.areaCode);
  if (index >= 0) AREAS_TRICOLOR[index] = row;
  else AREAS_TRICOLOR.push(row);
}

/** 评估周期季度匹配（period 为 YYYY-MM；quarter 为季度面板值 YYYY-Q，未传不过滤） */
function matchQuarter(period: string, params: ImplProgressQuery): boolean {
  if (params.quarter === undefined || params.quarter === '') return true;
  const [year, month] = period.split('-');
  const [filterYear, filterQuarter] = String(params.quarter).split('-');
  return year === filterYear && Math.ceil(Number(month) / 3) === Number(filterQuarter);
}

/** 片区三色图过滤 */
export function filterAreas(params: ImplProgressQuery): AreaTricolorItem[] {
  const areaName = (params.areaName ?? '').trim();
  return AREAS_TRICOLOR.filter(
    (item) =>
      (!areaName || item.areaName.includes(areaName)) &&
      (!params.district || item.district === params.district) &&
      (!params.renewalAreaBatch || item.renewalAreaBatch === params.renewalAreaBatch) &&
      (!params.triColorStatus || item.triColor === params.triColorStatus) &&
      (!params.evalStatus || (params.evalStatus === '待评估' ? item.triColor === '' : item.triColor !== '')) &&
      matchQuarter(item.evaluatePeriod, params),
  );
}

// ── 展示辅助 ──────────────────────────────────────────────────────────

/** 片区功能定位代码 → 中英文口径（未知代码原样显示） */
const ORIENTATION_LABEL: Record<string, string> = {
  SOD: '以公共服务为导向(SOD)',
  IOD: '以产业服务为导向(IOD)',
  COD: '文旅导向（COD）',
  TOD: '以公共交通为导向(TOD)',
  HOD: '以医疗健康为导向(HOD)',
  EOD: '以生态环境为导向(EOD)',
};

/** 片区功能定位显示（代码 → 中英文） */
export function orientationLabel(value: string): string {
  return ORIENTATION_LABEL[value] ?? value;
}

/** 五改分类列显示（value → 中文） */
export function fiveReformLabel(value: string): string {
  return FIVE_REFORM_TYPE_LABEL[value] ?? value;
}

/** 片区批次列显示（value → 中文，空显示 /） */
export function renewalAreaBatchLabel(value: string): string {
  return value ? (RENEWAL_AREA_BATCH_LABEL[value] ?? value) : '/';
}

/** 项目归属列显示（value → 中文） */
export function projectAffiliationLabel(value: string): string {
  return PROJECT_AFFILIATION_LABEL[value] ?? value;
}
