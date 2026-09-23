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
 * 当前后端尚未介入：选项清单与行数据为静态假数据（刷新即恢复）；行政区 / 五改类别 /
 * 片区 / 项目归属复用项目库口径（@jeesite/ifco/api/ifco/project-library）。
 */

import NP from 'number-precision';
import { match } from 'ts-pattern';
import {
  DISTRICTS,
  FIVE_REFORM_TYPE_LABEL,
  PROJECT_AFFILIATION_LABEL,
  RENEWAL_AREA_BATCH_LABEL,
  fetchLibPage,
} from '@jeesite/ifco/api/ifco/project-library';

/** 填报页卡片（点选切换 = 表格筛选维度，经路由 ?card= 持久化） */
export type FillCardKey = 'schedule' | 'monthly' | 'supervise';

/** 区级/市级页卡片 */
export type DistrictCardKey = 'confirm' | 'monthly-confirm' | 'tricolor' | 'supervise';

/** 倒排工期 / 月度进度共用流程状态：待提交（表单未提交）→（提交）待区级审查→（区级审查通过）待市级审查→（市级审查通过）市级审查通过；区级/市级审查均可退回（退回修改）→重新提交回待区级审查 */
export type FillStatus = '待提交' | '待区级审查' | '待市级审查' | '市级审查通过' | '退回修改';

export const FILL_STATUS_OPTIONS: FillStatus[] = ['待提交', '待区级审查', '待市级审查', '市级审查通过', '退回修改'];

/** 提示/督办处理状态（已处理 = 区级/填报端已处理；已确认 = 市级已确认处理结果） */
export type HandleStatus = '待处理' | '处理中' | '已处理' | '已确认';

export const HANDLE_STATUS_OPTIONS: HandleStatus[] = ['待处理', '处理中', '已处理', '已确认'];

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

/** 处理状态 → Tag 配色口径：待办橙、进行蓝、完成绿、市级已确认蓝实心 */
export function handleStatusTagProps(status: HandleStatus): { color: string; variant: 'solid' | 'outlined' } {
  return match(status)
    .with('待处理', () => ({ color: 'orange', variant: 'outlined' }) as const)
    .with('处理中', () => ({ color: 'blue', variant: 'outlined' }) as const)
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
  /** 本年度计划完成投资/年度投资计划（亿元，主表 year_invest） */
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
  /** 年度投资计划（亿元，只读） */
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

/** 提示/督办主记录（市级下发；区级端整单处理、市级端确认处理结果） */
export type SuperviseItem = {
  /** 下发编号（如 项目督办〔2026〕001号） */
  dispatchNo: string;
  superviseType: SuperviseType;
  /** 对应行政区（下发指向的区） */
  district: string;
  /** 下发状态（市级端：待下发=暂存，已下发=进入处理流程） */
  dispatchStatus: DispatchStatus;
  /** 督查月份（YYYY-MM） */
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
  /** 涉及片区和项目的处理情况 */
  areaItems: { area: string; projects: { projectName: string; problem: string; foundProblem: string }[] }[];
};

/** 提示/督办填报端行（督办 × 关联项目 扁平行，每行独立处理） */
export type SuperviseHandleRow = {
  dispatchNo: string;
  superviseType: SuperviseType;
  inspectMonth: string;
  dispatchDate: string;
  deadline: string;
  dispatchOrg: string;
  problem: string;
  dispatchFile: string;
  projectCode: string;
  projectName: string;
  district: string;
  renewalAreaName: string;
  fiveReformType: string;
  currentProgress: string;
  /** 指定填报主体 */
  reportOrg: string;
  handleStatus: HandleStatus;
  handleDate: string;
  handleDesc: string;
  handleFileList: string[];
};

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

/** 倒排工期计划（7 行：待填报 1 / 待提交 1 / 待审查 2 / 通过审查 2 / 退回修改 1） */
export const SCHEDULES: ScheduleItem[] = [
  {
    projectCode: '20263609',
    pUid: 'seed-20263609',
    reportOrg: '武汉城建集团',
    projectStatus: '新开工',
    projectName: '三阳设计之都项目（一元路片）',
    district: '江岸区',
    renewalAreaName: '一元片',
    renewalAreaBatch: 'first',
    fiveReformType: 'old-street',
    projectAffiliation: 'city-area',
    investEstimate: 1.8,
    yearInvest: 0.9,
    planStartDate: '2026-03-01',
    planCompletionDate: '2027-12-31',
    inLibraryDate: '2026-09-10',
    isNewInLibrary: true,
    planStartMonth: '2026-03',
    monthPlans: [
      '完成片区前期摸底与入户调查。',
      '启动危旧房安全性鉴定。',
      '完成设计方案初步成果。',
      '',
      '',
      '',
      '',
      '',
      '深化设计方案，同步开展入户调查摸底。',
      '',
      '',
      '',
    ],
    fillStatus: '退回修改',
    lastSubmitDate: '2026-09-12',
    reviewRecords: [
      {
        round: 1,
        level: '区级',
        reviewOrg: '江岸区住房和城市更新局',
        conclusion: '退回修改',
        opinion: '请补充完善6-8月计划内容。',
        reviewDate: '2026-09-14',
      },
    ],
  },
  {
    projectCode: '20263558',
    pUid: 'seed-20263558',
    reportOrg: '和纵盛地产公司',
    projectStatus: '续建',
    projectName: '西马片房地产新模式试点项目等',
    district: '江岸区',
    renewalAreaName: '四马片',
    renewalAreaBatch: 'second',
    fiveReformType: 'old-street',
    projectAffiliation: 'district-area',
    investEstimate: 2.03,
    yearInvest: 1.2,
    planStartDate: '2026-05-01',
    planCompletionDate: '2027-10-31',
    inLibraryDate: '2026-06-18',
    isNewInLibrary: false,
    planStartMonth: '2026-05',
    monthPlans: [
      '完成项目公司组建与资金方案审批。',
      '取得建设工程规划许可证。',
      '完成施工总承包招标。',
      '桩基工程进场施工。',
      '完成土方开挖 30%。',
      '基坑支护完成。',
      '',
      '',
      '按协议落实征地补偿费用，完成桩基工程施工图审查。',
      '',
      '',
      '',
    ],
    fillStatus: '待区级审查',
    lastSubmitDate: '2026-09-18',
  },
  {
    projectCode: '20263559',
    pUid: 'seed-20263559',
    reportOrg: '江岸区住更局',
    projectStatus: '在建',
    projectName: '佛山街（二辉路-三阳路）道路改造',
    district: '江岸区',
    renewalAreaName: '一元片',
    renewalAreaBatch: 'first',
    fiveReformType: 'old-street',
    projectAffiliation: 'city-area',
    investEstimate: 0.28,
    yearInvest: 0.15,
    planStartDate: '2026-04-01',
    planCompletionDate: '2026-11-30',
    inLibraryDate: '2026-07-03',
    isNewInLibrary: false,
    planStartMonth: '2026-04',
    monthPlans: [
      '完成施工围挡与交通疏解方案备案。',
      '雨污水管道开挖施工。',
      '完成路基整形 50%。',
      '水稳层摊铺。',
      '沥青面层施工。',
      '人行道铺装与照明安装。',
      '竣工清理与验收准备。',
      '',
      '完成雨污水管道开挖与路基整形。',
      '',
      '',
      '',
    ],
    fillStatus: '待市级审查',
    lastSubmitDate: '2026-09-12',
    reviewRecords: [
      {
        round: 1,
        level: '区级',
        reviewOrg: '江岸区住房和城市更新局',
        conclusion: '通过审查',
        opinion: '计划内容完整，同意通过。',
        reviewDate: '2026-09-15',
      },
    ],
  },
  {
    projectCode: '20263557',
    pUid: 'seed-20263557',
    reportOrg: '武汉城建集团',
    projectStatus: '在建',
    projectName: '黑泥湖村城中村改造项目等',
    district: '江岸区',
    renewalAreaName: '黑泥湖片',
    renewalAreaBatch: 'second',
    fiveReformType: 'urban-village',
    projectAffiliation: 'city-area',
    investEstimate: 11.6,
    yearInvest: 4.5,
    planStartDate: '2026-02-01',
    planCompletionDate: '2028-06-30',
    inLibraryDate: '2026-03-18',
    isNewInLibrary: false,
    planStartMonth: '2026-02',
    monthPlans: [
      '安置房地块征拆扫尾。',
      '完成安置房基坑围护结构施工。',
      '安置房桩基工程完成 60%。',
      '市政配套道路开工。',
      '安置房主体结构出正负零。',
      '商业地块挂牌前期准备。',
      '主体结构施工至 5 层。',
      '',
      '安置房主体结构施工至5层，商业地块完成挂牌准备。',
      '',
      '',
      '',
    ],
    fillStatus: '市级审查通过',
    lastSubmitDate: '2026-08-28',
    reviewRecords: [
      {
        round: 1,
        level: '区级',
        reviewOrg: '江岸区住房和城市更新局',
        conclusion: '通过审查',
        opinion: '同意该倒排工期计划。',
        reviewDate: '2026-08-30',
      },
      {
        round: 1,
        level: '市级',
        reviewOrg: '市住房和城市更新局',
        conclusion: '通过审查',
        opinion: '同意。',
        reviewDate: '2026-09-06',
      },
    ],
  },
  {
    projectCode: '20263556',
    pUid: 'seed-20263556',
    reportOrg: '江岸区文旅局',
    projectStatus: '已完工',
    projectName: '大智门火车站旧址修缮等',
    district: '江岸区',
    renewalAreaName: '',
    renewalAreaBatch: '',
    fiveReformType: 'old-street',
    projectAffiliation: 'scattered',
    investEstimate: 0.1846,
    yearInvest: 0.09,
    planStartDate: '2026-01-01',
    planCompletionDate: '2026-08-31',
    inLibraryDate: '2026-05-06',
    isNewInLibrary: false,
    planStartMonth: '2026-01',
    monthPlans: [
      '完成历史建筑勘察与修缮方案评审。',
      '屋面揭瓦修缮。',
      '木构件修补与防腐处理。',
      '外墙清水墙修复。',
      '室内展陈施工。',
      '竣工验收并移交。',
      '',
      '',
      '完成室内展陈施工收尾与竣工验收准备。',
      '',
      '',
      '',
    ],
    fillStatus: '市级审查通过',
    lastSubmitDate: '2026-09-05',
    reviewRecords: [
      {
        round: 1,
        level: '区级',
        reviewOrg: '江岸区住房和城市更新局',
        conclusion: '通过审查',
        opinion: '同意该倒排工期计划。',
        reviewDate: '2026-09-08',
      },
      {
        round: 1,
        level: '市级',
        reviewOrg: '市住房和城市更新局',
        conclusion: '通过审查',
        opinion: '同意。',
        reviewDate: '2026-09-16',
      },
    ],
  },
  {
    projectCode: '20263550',
    pUid: 'seed-20263550',
    reportOrg: '武汉建工集团',
    projectStatus: '前期',
    projectName: '二七沿江商务区旧改',
    district: '江岸区',
    renewalAreaName: '二七沿江片',
    renewalAreaBatch: 'first',
    fiveReformType: 'old-street',
    projectAffiliation: 'city-area',
    investEstimate: 6.8,
    yearInvest: 2.1,
    planStartDate: '2026-06-01',
    planCompletionDate: '2028-12-31',
    inLibraryDate: '2026-08-20',
    isNewInLibrary: false,
    planStartMonth: '2026-06',
    monthPlans: ['', '', '', '', '', '地块摘牌与方案设计。', '', '', '完成地块摘牌与方案设计招标。', '', '', ''],
    fillStatus: '待提交',
  },
  {
    projectCode: '20263601',
    pUid: 'seed-20263601',
    reportOrg: '江岸区住更局',
    projectStatus: '实施库入库',
    projectName: '新兴街片旧城更新项目',
    district: '江岸区',
    renewalAreaName: '新兴街片',
    renewalAreaBatch: 'first',
    fiveReformType: 'old-community',
    projectAffiliation: 'city-area',
    investEstimate: 3.2,
    yearInvest: 1.5,
    planStartDate: '2026-10-01',
    planCompletionDate: '2028-03-31',
    inLibraryDate: '2026-09-16',
    isNewInLibrary: true,
    planStartMonth: '2026-10',
    monthPlans: ['', '', '', '', '', '', '', '', '', '', '', ''],
    fillStatus: '待提交',
  },
];

/** 月度进度填报（7 行 = 应填报 7；待区级审查 1 / 待市级审查 1 / 市级审查通过 2 / 退回修改 1 / 待提交 2） */
export const MONTHLIES: MonthlyItem[] = [
  {
    reportMonth: '2026-09',
    projectCode: '20263558',
    pUid: 'seed-20263558',
    projectName: '西马片房地产新模式试点项目等',
    district: '江岸区',
    renewalAreaName: '四马片',
    renewalAreaBatch: 'second',
    fiveReformType: 'old-street',
    projectAffiliation: 'district-area',
    currentProgress: '桩基工程施工中',
    investEstimate: 2.03,
    reportOrg: '和纵盛地产公司',
    yearInvest: 1.2,
    planStartDate: '2026-05-01',
    planCompletionDate: '2027-10-31',
    inLibraryDate: '2026-06-18',
    yearAccumulatedInvest: 0.52,
    monthCompletedInvest: 0.18,
    totalAccumulatedInvest: 0.52,
    yearRangeAccumulatedInvest: 0.3,
    carryOverAccumulatedInvest: 0,
    monthProgressDesc: '项目基坑开挖完成，桩基工程完成50%。',
    implementProgress: 50,
    constructionStage: '建设中',
    statisticsIncluded: '是',
    statisticsCategory: '房地产开发项目',
    statisticsProjectCode: '42010320260012',
    difficultyProblem: '桩基施工涉及军用光缆迁改，需市级领导调度。',
    milestonePhotos: ['桩基施工-1.jpg', '桩基施工-2.jpg', '基坑全景.jpg'],
    monthEntries: {
      7: {
        constructionStage: '建设中',
        currentProgress: '基坑支护完成',
        implementProgress: 30,
        progressDesc: '土方开挖完成30%，基坑支护完成。',
        actualStartDate: '2026-03-15',
      },
      8: {
        constructionStage: '建设中',
        currentProgress: '桩基工程施工中',
        implementProgress: 40,
        progressDesc: '桩基工程完成40%。',
        actualStartDate: '2026-03-15',
      },
      9: {
        constructionStage: '建设中',
        currentProgress: '桩基工程施工中',
        implementProgress: 50,
        progressDesc: '项目基坑开挖完成，桩基工程完成50%。',
        actualStartDate: '2026-03-15',
      },
    },
    fillStatus: '待区级审查',
  },
  {
    reportMonth: '2026-09',
    projectCode: '20263557',
    pUid: 'seed-20263557',
    projectName: '黑泥湖村城中村改造项目等',
    district: '江岸区',
    renewalAreaName: '黑泥湖片',
    renewalAreaBatch: 'second',
    fiveReformType: 'urban-village',
    projectAffiliation: 'city-area',
    currentProgress: '安置房主体结构施工',
    investEstimate: 11.6,
    reportOrg: '武汉城建集团',
    yearInvest: 4.5,
    planStartDate: '2026-02-01',
    planCompletionDate: '2028-06-30',
    inLibraryDate: '2026-03-18',
    yearAccumulatedInvest: 3.86,
    monthCompletedInvest: 0.65,
    totalAccumulatedInvest: 8.16,
    yearRangeAccumulatedInvest: 2.5,
    carryOverAccumulatedInvest: 4.3,
    monthProgressDesc: '安置房主体结构施工至5层，市政配套道路雨污管网同步施工。',
    implementProgress: 60,
    constructionStage: '建设中',
    statisticsIncluded: '是',
    statisticsCategory: '房地产开发项目',
    statisticsProjectCode: '42010320260008',
    monthEntries: {
      7: {
        constructionStage: '建设中',
        currentProgress: '安置房主体结构施工',
        implementProgress: 45,
        progressDesc: '安置房主体结构施工至5层。',
        actualStartDate: '2026-02-20',
      },
      8: {
        constructionStage: '建设中',
        currentProgress: '安置房主体结构施工',
        implementProgress: 52,
        progressDesc: '主体结构施工至6层，市政配套道路雨污管网同步施工。',
        actualStartDate: '2026-02-20',
      },
      9: {
        constructionStage: '建设中',
        currentProgress: '安置房主体结构施工',
        implementProgress: 60,
        progressDesc: '安置房主体结构施工至5层，市政配套道路雨污管网同步施工。',
        actualStartDate: '2026-02-20',
      },
    },
    fillStatus: '待市级审查',
  },
  {
    reportMonth: '2026-09',
    projectCode: '20263559',
    pUid: 'seed-20263559',
    projectName: '佛山街（二辉路-三阳路）道路改造',
    district: '江岸区',
    renewalAreaName: '一元片',
    renewalAreaBatch: 'first',
    fiveReformType: 'old-street',
    projectAffiliation: 'city-area',
    currentProgress: '路基整形施工',
    investEstimate: 0.28,
    reportOrg: '江岸区住更局',
    yearInvest: 0.15,
    planStartDate: '2026-04-01',
    planCompletionDate: '2026-11-30',
    inLibraryDate: '2026-07-03',
    yearAccumulatedInvest: 0.11,
    monthCompletedInvest: 0.04,
    totalAccumulatedInvest: 0.11,
    yearRangeAccumulatedInvest: 0.06,
    carryOverAccumulatedInvest: 0,
    monthProgressDesc: '雨污水管道开挖完成，路基整形完成50%。',
    implementProgress: 45,
    constructionStage: '建设中',
    statisticsIncluded: '否',
    notIncludedReason: '市政道路项目暂未达到纳统标准',
    monthEntries: {
      9: {
        constructionStage: '建设中',
        currentProgress: '路基整形施工',
        implementProgress: 45,
        progressDesc: '雨污水管道开挖完成，路基整形完成50%。',
        actualStartDate: '2026-04-10',
      },
    },
    fillStatus: '市级审查通过',
  },
  {
    reportMonth: '2026-09',
    projectCode: '20263556',
    pUid: 'seed-20263556',
    projectName: '大智门火车站旧址修缮等',
    district: '江岸区',
    renewalAreaName: '',
    renewalAreaBatch: '',
    fiveReformType: 'old-street',
    projectAffiliation: 'scattered',
    currentProgress: '室内展陈施工',
    investEstimate: 0.1846,
    reportOrg: '江岸区文旅局',
    yearInvest: 0.09,
    planStartDate: '2026-01-01',
    planCompletionDate: '2026-08-31',
    inLibraryDate: '2026-05-06',
    yearAccumulatedInvest: 0.078,
    monthCompletedInvest: 0.012,
    totalAccumulatedInvest: 0.078,
    yearRangeAccumulatedInvest: 0.05,
    carryOverAccumulatedInvest: 0,
    monthProgressDesc: '外墙清水墙修复完成，室内展陈施工完成60%。',
    implementProgress: 80,
    constructionStage: '建设中',
    statisticsIncluded: '否',
    notIncludedReason: '文物保护修缮项目不在固定资产投资纳统范围',
    monthEntries: {
      9: {
        constructionStage: '建设中',
        currentProgress: '室内展陈施工',
        implementProgress: 80,
        progressDesc: '外墙清水墙修复完成，室内展陈施工完成60%。',
        actualStartDate: '2026-05-06',
      },
    },
    fillStatus: '市级审查通过',
  },
  {
    reportMonth: '2026-09',
    projectCode: '20263609',
    pUid: 'seed-20263609',
    projectName: '三阳设计之都项目（一元路片）',
    district: '江岸区',
    renewalAreaName: '一元片',
    renewalAreaBatch: 'first',
    fiveReformType: 'old-street',
    projectAffiliation: 'city-area',
    currentProgress: '设计方案深化',
    investEstimate: 1.8,
    reportOrg: '武汉城建集团',
    yearInvest: 0.9,
    planStartDate: '2026-03-01',
    planCompletionDate: '2027-12-31',
    inLibraryDate: '2026-09-10',
    yearAccumulatedInvest: 0,
    monthCompletedInvest: 0,
    totalAccumulatedInvest: 0,
    yearRangeAccumulatedInvest: 0,
    carryOverAccumulatedInvest: 0,
    monthProgressDesc: '',
    implementProgress: 10,
    constructionStage: '前期手续',
    statisticsIncluded: '否',
    notIncludedReason: '项目处于前期手续阶段，未形成有效投资',
    monthEntries: {
      9: { constructionStage: '前期手续', currentProgress: '设计方案深化', implementProgress: 10, progressDesc: '' },
    },
    fillStatus: '退回修改',
    returnInfo: {
      submitDate: '2026-09-12',
      returnDate: '2026-09-14',
      returnOrg: '江岸区住房和城市更新局',
      returnCount: 1,
      returnOpinion: '当月形象进度描述与投资完成情况不实，请核实后重新填报。',
    },
  },
  {
    reportMonth: '2026-09',
    projectCode: '20263550',
    pUid: 'seed-20263550',
    projectName: '二七沿江商务区旧改',
    district: '江岸区',
    renewalAreaName: '二七沿江片',
    renewalAreaBatch: 'first',
    fiveReformType: 'old-street',
    projectAffiliation: 'city-area',
    currentProgress: '方案设计',
    investEstimate: 6.8,
    reportOrg: '武汉建工集团',
    yearInvest: 2.1,
    planStartDate: '2026-06-01',
    planCompletionDate: '2028-12-31',
    inLibraryDate: '2026-08-20',
    yearAccumulatedInvest: 0.15,
    monthCompletedInvest: 0.08,
    totalAccumulatedInvest: 0.15,
    yearRangeAccumulatedInvest: 0.07,
    carryOverAccumulatedInvest: 0,
    monthProgressDesc: '',
    implementProgress: 5,
    constructionStage: '前期手续',
    statisticsIncluded: '否',
    notIncludedReason: '前期准备阶段，未开工不计投资',
    monthEntries: {
      9: { constructionStage: '前期手续', currentProgress: '方案设计', implementProgress: 5, progressDesc: '' },
    },
    fillStatus: '待提交',
  },
  {
    reportMonth: '2026-09',
    projectCode: '20263601',
    pUid: 'seed-20263601',
    projectName: '新兴街片旧城更新项目',
    district: '江岸区',
    renewalAreaName: '新兴街片',
    renewalAreaBatch: 'first',
    fiveReformType: 'old-community',
    projectAffiliation: 'city-area',
    currentProgress: '前期摸底',
    investEstimate: 3.2,
    reportOrg: '江岸区住更局',
    yearInvest: 1.5,
    planStartDate: '2026-10-01',
    planCompletionDate: '2028-03-31',
    inLibraryDate: '2026-09-16',
    yearAccumulatedInvest: 0,
    monthCompletedInvest: 0,
    totalAccumulatedInvest: 0,
    yearRangeAccumulatedInvest: 0,
    carryOverAccumulatedInvest: 0,
    monthProgressDesc: '',
    constructionStage: '前期手续',
    statisticsIncluded: '否',
    notIncludedReason: '前期摸底调查阶段，尚未开工',
    monthEntries: {
      9: { constructionStage: '前期手续', currentProgress: '前期摸底', progressDesc: '' },
    },
    fillStatus: '待提交',
  },
];

/** 提示/督办主记录（区级端整单；市住更局下发） */
export const SUPERVISES: SuperviseItem[] = [
  {
    dispatchNo: '项目督办〔2026〕001号',
    superviseType: '督办',
    district: '江岸区',
    dispatchStatus: '已下发',
    inspectMonth: '2026-10',
    dispatchDate: '2026-10-11',
    deadline: '2026-10-25',
    dispatchOrg: '市住更局',
    problem: '项目实际进度滞后于倒排工期计划。',
    dispatchFile: '督办单.pdf',
    contactPerson: '张三',
    contactPhone: '027-12345678',
    districtHandleStatus: '处理中',
    districtHandleDate: '',
    districtHandleDesc: '',
    districtHandleFileList: [],
    areaItems: [
      {
        area: '一元片',
        projects: [
          {
            projectName: '三阳设计之都项目（一元路片）',
            problem: '倒排工期计划未按期填报。',
            foundProblem: '是',
          },
          { projectName: '佛山街（二辉路-三阳路）道路改造', problem: '进度滞后', foundProblem: '未发现问题' },
        ],
      },
      {
        area: '四马片',
        projects: [
          {
            projectName: '西马片房地产新模式试点项目等',
            problem: '项目实际进度滞后于倒排工期计划。',
            foundProblem: '是',
          },
        ],
      },
    ],
  },
  {
    dispatchNo: '工作提示〔2026〕015号',
    superviseType: '工作提示',
    district: '江岸区',
    dispatchStatus: '已下发',
    inspectMonth: '2026-10',
    dispatchDate: '2026-10-09',
    deadline: '2026-10-20',
    dispatchOrg: '市住更局',
    problem: '月度进度填报不及时，请按每月25日前完成填报。',
    dispatchFile: '工作提示函.pdf',
    districtHandleStatus: '待处理',
    districtHandleDate: '',
    districtHandleDesc: '',
    districtHandleFileList: [],
    areaItems: [
      {
        area: '二七沿江片',
        projects: [{ projectName: '二七沿江商务区旧改', problem: '月度进度未按期填报', foundProblem: '是' }],
      },
    ],
  },
  {
    dispatchNo: '项目督办〔2026〕099号',
    superviseType: '督办',
    district: '江岸区',
    dispatchStatus: '已下发',
    inspectMonth: '2026-09',
    dispatchDate: '2026-09-08',
    deadline: '2026-09-22',
    dispatchOrg: '市住更局',
    problem: '安置房建设进度滞后，需加快施工组织。',
    dispatchFile: '督办单.pdf',
    contactPerson: '张三',
    contactPhone: '027-12345678',
    districtHandleStatus: '已确认',
    districtHandleDate: '2026-09-20',
    districtHandleDesc: '已约谈实施主体，加密施工组织，追加作业班组，进度已恢复正常。',
    districtHandleFileList: ['处理情况报告.pdf'],
    areaItems: [
      {
        area: '黑泥湖片',
        projects: [
          {
            projectName: '黑泥湖村城中村改造项目等',
            problem: '安置房建设进度滞后',
            foundProblem: '是',
          },
        ],
      },
    ],
  },
  {
    // 市级端「新增督办」暂存的样例（待下发：只在市级列表出现，不进填报端/区级端处理流程）
    dispatchNo: '项目督办〔2026〕100号',
    superviseType: '督办',
    district: '硚口区',
    dispatchStatus: '待下发',
    inspectMonth: '2026-10',
    dispatchDate: '',
    deadline: '2026-11-05',
    dispatchOrg: '市住更局',
    problem: '月度进度填报连续两月滞后，需专项整改。',
    dispatchFile: '督办单.pdf',
    districtHandleStatus: '待处理',
    districtHandleDate: '',
    districtHandleDesc: '',
    districtHandleFileList: [],
    areaItems: [],
  },
];

/** 填报端行（督办 × 关联项目 扁平展开；每行独立处理；仅已下发的进入处理流程） */
export const SUPERVISE_ROWS: SuperviseHandleRow[] = SUPERVISES.filter(
  (supervise) => supervise.dispatchStatus === '已下发',
).flatMap((supervise) =>
  supervise.areaItems.flatMap((area) =>
    area.projects.map((project): SuperviseHandleRow => {
      const monthly = MONTHLIES.find((item) => item.projectName === project.projectName);
      return {
        dispatchNo: supervise.dispatchNo,
        superviseType: supervise.superviseType,
        inspectMonth: supervise.inspectMonth,
        dispatchDate: supervise.dispatchDate,
        deadline: supervise.deadline,
        dispatchOrg: supervise.dispatchOrg,
        problem: project.problem,
        dispatchFile: supervise.dispatchFile,
        projectCode: monthly?.projectCode ?? '',
        projectName: project.projectName,
        district: monthly?.district ?? DISTRICTS[0],
        renewalAreaName: area.area,
        fiveReformType: monthly?.fiveReformType ?? 'old-street',
        currentProgress: monthly?.currentProgress ?? '',
        reportOrg: monthly ? `${monthly.district}住更局` : '江岸区住更局',
        handleStatus:
          supervise.dispatchNo === '项目督办〔2026〕001号' && project.foundProblem === '是'
            ? '处理中'
            : supervise.districtHandleStatus === '已处理' || supervise.districtHandleStatus === '已确认'
              ? supervise.districtHandleStatus
              : '待处理',
        handleDate:
          supervise.dispatchNo === '项目督办〔2026〕001号' && project.projectName.includes('西马片')
            ? '2026-10-20'
            : '',
        handleDesc:
          supervise.dispatchNo === '项目督办〔2026〕001号' && project.projectName.includes('西马片')
            ? '已加密施工组织，增加作业班组，追赶滞后进度；同步更新倒排工期计划。'
            : '',
        handleFileList: [],
      };
    }),
  ),
);

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

/** 片区三色图进展（7 行：绿 2 / 黄 2 / 红 1 / 未评估 2；统计卡 待评估 2 / 应评估 7） */
export const AREAS_TRICOLOR: AreaTricolorItem[] = [
  {
    evaluatePeriod: '2026-09',
    areaCode: 'PQ001',
    district: '江岸区',
    areaName: '一元片',
    renewalAreaBatch: 'first',
    orientationList: ['SOD', 'IOD', 'COD'],
    totalInvestEstimate: 2.8,
    accumulatedInvest: 0.66,
    yearTotalPlanInvest: 0.9,
    quarterInvest: 0.11,
    yearCompletedInvest: 0.66,
    yearProgress: 73,
    triColor: '绿色',
    history: [
      { quarter: '2026-2', status: '绿色' },
      { quarter: '2026-1', status: '绿色' },
    ],
  },
  {
    evaluatePeriod: '2026-09',
    areaCode: 'PQ002',
    district: '江岸区',
    areaName: '二七沿江片',
    renewalAreaBatch: 'first',
    orientationList: ['TOD', 'HOD'],
    totalInvestEstimate: 15.6,
    accumulatedInvest: 7.56,
    yearTotalPlanInvest: 2.1,
    quarterInvest: 0.38,
    yearCompletedInvest: 1.2,
    yearProgress: 57,
    triColor: '黄色',
    history: [
      { quarter: '2026-2', status: '黄色' },
      { quarter: '2026-1', status: '绿色' },
    ],
  },
  {
    evaluatePeriod: '2026-09',
    areaCode: 'PQ003',
    district: '江岸区',
    areaName: '四马片',
    renewalAreaBatch: 'second',
    orientationList: ['COD'],
    totalInvestEstimate: 4.2,
    accumulatedInvest: 2.94,
    yearTotalPlanInvest: 1.5,
    quarterInvest: 0.33,
    yearCompletedInvest: 1.05,
    yearProgress: 70,
    triColor: '绿色',
    history: [
      { quarter: '2026-2', status: '黄色' },
      { quarter: '2026-1', status: '绿色' },
    ],
  },
  {
    evaluatePeriod: '2026-09',
    areaCode: 'PQ004',
    district: '江岸区',
    areaName: '黑泥湖片',
    renewalAreaBatch: 'second',
    orientationList: ['IOD'],
    totalInvestEstimate: 14.6,
    accumulatedInvest: 7.3,
    yearTotalPlanInvest: 4.5,
    quarterInvest: 0.45,
    yearCompletedInvest: 2.5,
    yearProgress: 56,
    triColor: '黄色',
    history: [
      { quarter: '2026-2', status: '黄色' },
      { quarter: '2026-1', status: '黄色' },
    ],
  },
  {
    evaluatePeriod: '2026-09',
    areaCode: 'PQ005',
    district: '汉阳区',
    areaName: '龟北片',
    renewalAreaBatch: 'first',
    orientationList: ['COD'],
    totalInvestEstimate: 6.5,
    accumulatedInvest: 3.25,
    yearTotalPlanInvest: 2.0,
    quarterInvest: 0.2,
    yearCompletedInvest: 1.1,
    yearProgress: 55,
    triColor: '黄色',
    history: [
      { quarter: '2026-2', status: '绿色' },
      { quarter: '2026-1', status: '黄色' },
    ],
  },
  {
    evaluatePeriod: '2026-09',
    areaCode: 'PQ006',
    district: '江岸区',
    areaName: '新兴街片',
    renewalAreaBatch: 'first',
    orientationList: ['SOD', 'TOD'],
    totalInvestEstimate: 3.2,
    accumulatedInvest: 1.28,
    yearTotalPlanInvest: 1.5,
    quarterInvest: 0.1,
    yearCompletedInvest: 0.75,
    yearProgress: 50,
    triColor: '红色',
    history: [
      { quarter: '2026-2', status: '黄色' },
      { quarter: '2026-1', status: '绿色' },
    ],
  },
  {
    evaluatePeriod: '2026-09',
    areaCode: 'PQ007',
    district: '青山区',
    areaName: '红钢城片',
    renewalAreaBatch: '',
    orientationList: ['COD', 'SOD'],
    totalInvestEstimate: 8.0,
    accumulatedInvest: 0,
    yearTotalPlanInvest: 1.2,
    quarterInvest: 0,
    yearCompletedInvest: 0,
    yearProgress: 0,
    triColor: '',
    history: [{ quarter: '2026-2', status: '黄色' }],
  },
];

/** 生成下一个下发编号（同类型既有最大序号 + 1，如 工作提示〔2026〕016号） */
export function nextDispatchNo(type: SuperviseType): string {
  const prefix = type === '督办' ? '项目督办〔2026〕' : '工作提示〔2026〕';
  const numbers = SUPERVISES.filter((item) => item.superviseType === type).map((item) => {
    const matched = item.dispatchNo.match(/(\d+)号/);
    return matched ? Number(matched[1]) : 0;
  });
  const next = (numbers.length ? Math.max(...numbers) : 0) + 1;
  return `${prefix}${String(next).padStart(3, '0')}号`;
}

// ── 本地过滤 ──────────────────────────────────────────────────────────

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
  /** 行政区（市级督办列表「对应行政区」、三色图列表筛选项） */
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
/** 倒排工期列表行 = 实施库项目（项目库 page 接口）合并内存工作流态（按项目编码） */
export async function fetchScheduleRows(): Promise<ScheduleItem[]> {
  const page = await fetchLibPage({ library: 'implementing', pageNum: 1, pageSize: 500 });
  return (page.list ?? []).map((row) => {
    const wf = SCHEDULES.find((item) => item.projectCode === row.lib_project_code);
    const inLibraryDate = String(row.in_library_date ?? '').slice(0, 10);
    const isNewInLibrary =
      !!inLibraryDate && Date.now() - new Date(inLibraryDate).getTime() < 20 * 24 * 3600 * 1000;
    return {
      pUid: row.p_uid ?? '',
      projectCode: row.lib_project_code ?? '',
      projectName: row.pj_name ?? '',
      district: row.dist ?? '',
      renewalAreaName: row.area_name ?? '',
      renewalAreaBatch: row.batch ?? '',
      fiveReformType: row.wg_big ?? '',
      projectAffiliation: row.project_affiliation ?? '',
      investEstimate: Number(row.inv_bil ?? 0) || 0,
      yearInvest: Number(row.year_invest ?? 0) || 0,
      planStartDate: String(row.start_date ?? '').slice(0, 10),
      planCompletionDate: String(row.end_date ?? '').slice(0, 10),
      inLibraryDate,
      isNewInLibrary,
      reportOrg: row.report_org ?? '',
      // 实施库行状态恒为 stored（已入库），映射本域中文枚举
      projectStatus: '实施库入库' as ProjectStatus,
      planStartMonth: wf?.planStartMonth ?? '',
      monthPlans: wf?.monthPlans ?? Array.from({ length: 12 }, () => ''),
      fillStatus: wf?.fillStatus ?? '待提交',
      lastSubmitDate: wf?.lastSubmitDate,
      reviewRecords: wf?.reviewRecords,
    };
  });
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
/** 月度列表行 = 实施库项目（项目库 page 接口）合并内存工作流态（按项目编码；当月一行） */
export async function fetchMonthlyRows(): Promise<MonthlyItem[]> {
  const page = await fetchLibPage({ library: 'implementing', pageNum: 1, pageSize: 500 });
  const now = new Date();
  const reportMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return (page.list ?? []).map((row) => {
    const wf = MONTHLIES.find((item) => item.projectCode === row.lib_project_code);
    return {
      reportMonth: wf?.reportMonth ?? reportMonth,
      pUid: row.p_uid ?? '',
      projectCode: row.lib_project_code ?? '',
      projectName: row.pj_name ?? '',
      district: row.dist ?? '',
      renewalAreaName: row.area_name ?? '',
      renewalAreaBatch: row.batch ?? '',
      fiveReformType: row.wg_big ?? '',
      projectAffiliation: row.project_affiliation ?? '',
      currentProgress: wf?.currentProgress ?? '',
      investEstimate: Number(row.inv_bil ?? 0) || 0,
      yearInvest: Number(row.year_invest ?? 0) || 0,
      planStartDate: String(row.start_date ?? '').slice(0, 10),
      planCompletionDate: String(row.end_date ?? '').slice(0, 10),
      inLibraryDate: String(row.in_library_date ?? '').slice(0, 10),
      yearAccumulatedInvest: wf?.yearAccumulatedInvest ?? 0,
      monthCompletedInvest: wf?.monthCompletedInvest ?? 0,
      totalAccumulatedInvest: wf?.totalAccumulatedInvest ?? 0,
      monthProgressDesc: wf?.monthProgressDesc ?? '',
      implementProgress: wf?.implementProgress,
      reportOrg: row.report_org ?? '',
      constructionStage: wf?.constructionStage ?? '',
      statisticsIncluded: wf?.statisticsIncluded ?? '否',
      statisticsCategory: wf?.statisticsCategory,
      statisticsProjectCode: wf?.statisticsProjectCode,
      notIncludedReason: wf?.notIncludedReason,
      difficultyProblem: wf?.difficultyProblem,
      monthEntries: wf?.monthEntries,
      fillStatus: wf?.fillStatus ?? '待提交',
      returnInfo: wf?.returnInfo,
      reviewRecords: wf?.reviewRecords,
    };
  });
}

/** 按项目编码取月度工作流行（无则以列表行为底并入内存仓库；填报/审查写回前置） */
export function upsertMonthlyWorkflow(row: MonthlyItem): MonthlyItem {
  const exist = MONTHLIES.find((item) => item.projectCode === row.projectCode);
  if (exist) return exist;
  MONTHLIES.push({ ...row, monthEntries: { ...(row.monthEntries ?? {}) }, reviewRecords: [...(row.reviewRecords ?? [])] });
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

/** 年度投资进度百分比数值（资金进度=年度累计完成投资/年度投资计划，四舍五入取整；计划为 0 取 0） */
export function yearProgressValue(item: { yearAccumulatedInvest?: number; yearInvest?: number }): number {
  if (!item.yearInvest) return 0;
  return Math.round(NP.times(NP.divide(item.yearAccumulatedInvest ?? 0, item.yearInvest), 100));
}

/** 年度投资进度（列表列：年度累计完成投资/年度投资计划，四舍五入取整；计划为 0 显示 —） */
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

/** 填报端提示/督办行过滤 */
export function filterSuperviseRows(params: ImplProgressQuery): SuperviseHandleRow[] {
  const keyword = (params.projectName ?? '').trim();
  const dispatchNo = (params.dispatchNo ?? '').trim();
  return SUPERVISE_ROWS.filter(
    (item) =>
      (!keyword || item.projectName.includes(keyword)) &&
      (!dispatchNo || item.dispatchNo.includes(dispatchNo)) &&
      (!params.fiveReformType || item.fiveReformType === params.fiveReformType) &&
      (!params.renewalAreaName || item.renewalAreaName === params.renewalAreaName) &&
      (!params.constructionStage || item.currentProgress === params.constructionStage) &&
      (!params.handleStatus || item.handleStatus === params.handleStatus) &&
      matchPeriod(item.inspectMonth, params),
  );
}

/** 区级端提示/督办过滤 */
export function filterSupervises(params: ImplProgressQuery): SuperviseItem[] {
  const dispatchNo = (params.dispatchNo ?? '').trim();
  return SUPERVISES.filter(
    (item) =>
      (!dispatchNo || item.dispatchNo.includes(dispatchNo)) &&
      (!params.district || item.district === params.district) &&
      (!params.dispatchStatus || item.dispatchStatus === params.dispatchStatus) &&
      (!params.handleStatus || item.districtHandleStatus === params.handleStatus) &&
      matchPeriod(item.inspectMonth, params),
  );
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
