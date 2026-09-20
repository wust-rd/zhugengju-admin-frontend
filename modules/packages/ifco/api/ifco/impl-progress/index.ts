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
 * - 月度进度填报：实施主体每月 25 日前填报实施项目进度（月度进度情况 / 月度投资情况 /
 *   项目纳统情况 三区）；项目进度提醒 = 正常 / 滞后 / 严重滞后；
 * - 提示/督办：市住建局按月下发工作提示与督办；填报端按项目逐行处理，区级端按
 *   下发编号整单处理（含涉及片区和项目的处理情况）。
 *
 * 当前后端尚未介入：选项清单与行数据为静态假数据（刷新即恢复）；行政区 / 五改类别 /
 * 片区 / 项目归属复用项目库口径（@jeesite/ifco/api/ifco/project-library）。
 */

import { match } from 'ts-pattern';
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

/** 倒排工期 / 月度进度共用填报状态：草稿→提交→待确认→区级确认（已确认）/ 退回（退回修改）→重新提交 */
export type FillStatus = '草稿' | '待确认' | '已确认' | '退回修改';

export const FILL_STATUS_OPTIONS: FillStatus[] = ['草稿', '待确认', '已确认', '退回修改'];

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

/** 当前建设阶段（月度进度填报） */
export const CONSTRUCTION_STAGE_OPTIONS = ['前期准备', '报建报批', '施工', '竣工'] as const;

/** 项目进度提醒（月度进度填报；列表红黄绿三色口径同片区三色图） */
export const PROGRESS_REMINDER_OPTIONS = ['正常', '滞后', '严重滞后'] as const;

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

/** 状态 → Tag 配色口径（列表状态列与表单标题 Tag 同源）：终态绿/灰、待办蓝、退回橙 */
export function fillStatusTagProps(status: FillStatus): { color: string; variant: 'solid' | 'outlined' } {
  return match(status)
    .with('已确认', () => ({ color: 'green', variant: 'solid' }) as const)
    .with('草稿', () => ({ color: 'default', variant: 'solid' }) as const)
    .with('待确认', () => ({ color: 'blue', variant: 'outlined' }) as const)
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

/** 进度提醒 → Tag 配色口径（三色：绿/橙/红） */
export function progressReminderTagProps(reminder: string): { color: string; variant: 'solid' | 'outlined' } {
  return match(reminder)
    .with('正常', () => ({ color: 'green', variant: 'solid' }) as const)
    .with('滞后', () => ({ color: 'orange', variant: 'outlined' }) as const)
    .with('严重滞后', () => ({ color: 'red', variant: 'outlined' }) as const)
    .otherwise(() => ({ color: 'default', variant: 'solid' }) as const);
}

/** 退回信息（退回修改状态的行才有值；横幅展示提交/退回时间、退回部门、退回次数与意见） */
export type ReturnInfo = {
  submitDate: string;
  returnDate: string;
  returnOrg: string;
  /** 退回次数（第 N 次） */
  returnCount: number;
  returnOpinion: string;
};

/** 倒排工期计划行 */
export type ScheduleItem = {
  projectCode: string;
  projectName: string;
  district: string;
  renewalAreaName: string;
  renewalAreaBatch: string;
  fiveReformType: string;
  projectAffiliation: string;
  /** 项目投资估算（亿元） */
  investEstimate: number;
  /** 年度投资计划（亿元） */
  yearPlanInvest: number;
  /** 计划开工时间 */
  planStartDate: string;
  /** 计划竣工时间 */
  planCompletionDate: string;
  /** 入库时间（表单副标题展示） */
  inLibraryDate: string;
  /** 是否新入库（统计卡口径：新入库项目 20 天内填报当年计划） */
  isNewInLibrary: boolean;
  /** 指定填报主体（区级确认列表「选择指导填报主体」筛选项） */
  reportOrg: string;
  /** 计划开始月份（YYYY-MM，提交后不可修改） */
  planStartMonth: string;
  /** 一月~十二月计划（12 长度，空串=未填） */
  monthPlans: string[];
  fillStatus: FillStatus;
  /** 退回信息（退回修改状态有值） */
  returnInfo?: ReturnInfo;
};

/** 月度进度填报行 */
export type MonthlyItem = {
  /** 填报周期（YYYY-MM，搜索表单年/月过滤依据） */
  reportMonth: string;
  projectCode: string;
  projectName: string;
  district: string;
  renewalAreaName: string;
  renewalAreaBatch: string;
  fiveReformType: string;
  projectAffiliation: string;
  /** 当前形象进度（列表展示的阶段性总结） */
  currentProgress: string;
  /** 项目总投资（亿元，只读） */
  totalInvest: number;
  /** 年度投资计划（亿元，只读） */
  yearPlanInvest: number;
  /** 年度累计完成投资（亿元） */
  yearAccumulatedInvest: number;
  /** 当月完成投资（亿元） */
  monthCompletedInvest: number;
  /** 当月形象进度描述 */
  monthProgressDesc: string;
  constructionStage: string;
  progressReminder: string;
  /** 是否纳入统计（是/否） */
  statisticsIncluded: string;
  /** 统计单位名称 */
  statisticsUnit: string;
  fillStatus: FillStatus;
  returnInfo?: ReturnInfo;
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
      { label: '待填报倒排工期计划', value: '1' },
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
    description: '处理市住建局下发的提示、督办问题',
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
    description: '处理市住建局下发的提示、督办问题',
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
    description: '市住建局下发、处理提示、督办的问题',
    stats: [
      { label: '已发工作提示', value: '10' },
      { label: '已发督办', value: '10' },
    ],
  },
];

// ── 假数据 ────────────────────────────────────────────────────────────

/** 倒排工期计划（7 行：待填报 1 / 草稿 1 / 待确认 2 / 已确认 2 / 退回修改 1） */
export const SCHEDULES: ScheduleItem[] = [
  {
    projectCode: '20263609',
    reportOrg: '武汉城建集团',
    projectName: '三阳设计之都项目（一元路片）',
    district: '江岸区',
    renewalAreaName: '一元片',
    renewalAreaBatch: 'first',
    fiveReformType: 'old-street',
    projectAffiliation: 'city-area',
    investEstimate: 1.8,
    yearPlanInvest: 0.9,
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
      '',
      '',
      '',
      '',
    ],
    fillStatus: '退回修改',
    returnInfo: {
      submitDate: '2026-09-12',
      returnDate: '2026-09-14',
      returnOrg: '江岸区住房和城市更新局',
      returnCount: 1,
      returnOpinion: '请补充完善6-8月计划内容。',
    },
  },
  {
    projectCode: '20263558',
    reportOrg: '和纵盛地产公司',
    projectName: '西马片房地产新模式试点项目等',
    district: '江岸区',
    renewalAreaName: '四马片',
    renewalAreaBatch: 'second',
    fiveReformType: 'old-street',
    projectAffiliation: 'district-area',
    investEstimate: 2.03,
    yearPlanInvest: 1.2,
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
      '',
      '',
      '',
      '',
    ],
    fillStatus: '待确认',
  },
  {
    projectCode: '20263559',
    reportOrg: '江岸区住建局',
    projectName: '佛山街（二辉路-三阳路）道路改造',
    district: '江岸区',
    renewalAreaName: '一元片',
    renewalAreaBatch: 'first',
    fiveReformType: 'old-street',
    projectAffiliation: 'city-area',
    investEstimate: 0.28,
    yearPlanInvest: 0.15,
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
      '',
      '',
      '',
      '',
    ],
    fillStatus: '待确认',
  },
  {
    projectCode: '20263557',
    reportOrg: '武汉城建集团',
    projectName: '黑泥湖村城中村改造项目等',
    district: '江岸区',
    renewalAreaName: '黑泥湖片',
    renewalAreaBatch: 'second',
    fiveReformType: 'urban-village',
    projectAffiliation: 'city-area',
    investEstimate: 11.6,
    yearPlanInvest: 4.5,
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
      '',
      '',
      '',
      '',
    ],
    fillStatus: '已确认',
  },
  {
    projectCode: '20263556',
    reportOrg: '江岸区文旅局',
    projectName: '大智门火车站旧址修缮等',
    district: '江岸区',
    renewalAreaName: '',
    renewalAreaBatch: '',
    fiveReformType: 'old-street',
    projectAffiliation: 'scattered',
    investEstimate: 0.1846,
    yearPlanInvest: 0.09,
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
      '',
      '',
      '',
      '',
    ],
    fillStatus: '已确认',
  },
  {
    projectCode: '20263550',
    reportOrg: '武汉建工集团',
    projectName: '二七沿江商务区旧改',
    district: '江岸区',
    renewalAreaName: '二七沿江片',
    renewalAreaBatch: 'first',
    fiveReformType: 'old-street',
    projectAffiliation: 'city-area',
    investEstimate: 6.8,
    yearPlanInvest: 2.1,
    planStartDate: '2026-06-01',
    planCompletionDate: '2028-12-31',
    inLibraryDate: '2026-08-20',
    isNewInLibrary: false,
    planStartMonth: '2026-06',
    monthPlans: ['', '', '', '', '', '地块摘牌与方案设计。', '', '', '', '', '', ''],
    fillStatus: '草稿',
  },
  {
    projectCode: '20263601',
    reportOrg: '江岸区住建局',
    projectName: '新兴街片旧城更新项目',
    district: '江岸区',
    renewalAreaName: '新兴街片',
    renewalAreaBatch: 'first',
    fiveReformType: 'old-community',
    projectAffiliation: 'city-area',
    investEstimate: 3.2,
    yearPlanInvest: 1.5,
    planStartDate: '2026-10-01',
    planCompletionDate: '2028-03-31',
    inLibraryDate: '2026-09-16',
    isNewInLibrary: true,
    planStartMonth: '2026-10',
    monthPlans: ['', '', '', '', '', '', '', '', '', '', '', ''],
    fillStatus: '草稿',
  },
];

/** 月度进度填报（7 行 = 应填报 7；已填报 4：待确认 2 + 已确认 2，草稿 3） */
export const MONTHLIES: MonthlyItem[] = [
  {
    reportMonth: '2026-09',
    projectCode: '20263558',
    projectName: '西马片房地产新模式试点项目等',
    district: '江岸区',
    renewalAreaName: '四马片',
    renewalAreaBatch: 'second',
    fiveReformType: 'old-street',
    projectAffiliation: 'district-area',
    currentProgress: '桩基工程施工中',
    totalInvest: 2.03,
    yearPlanInvest: 1.2,
    yearAccumulatedInvest: 0.52,
    monthCompletedInvest: 0.18,
    monthProgressDesc: '项目基坑开挖完成，桩基工程完成50%。',
    constructionStage: '施工',
    progressReminder: '正常',
    statisticsIncluded: '是',
    statisticsUnit: '江岸区统计局',
    fillStatus: '待确认',
  },
  {
    reportMonth: '2026-09',
    projectCode: '20263557',
    projectName: '黑泥湖村城中村改造项目等',
    district: '江岸区',
    renewalAreaName: '黑泥湖片',
    renewalAreaBatch: 'second',
    fiveReformType: 'urban-village',
    projectAffiliation: 'city-area',
    currentProgress: '安置房主体结构施工',
    totalInvest: 11.6,
    yearPlanInvest: 4.5,
    yearAccumulatedInvest: 3.86,
    monthCompletedInvest: 0.65,
    monthProgressDesc: '安置房主体结构施工至5层，市政配套道路雨污管网同步施工。',
    constructionStage: '施工',
    progressReminder: '正常',
    statisticsIncluded: '是',
    statisticsUnit: '江岸区统计局',
    fillStatus: '待确认',
  },
  {
    reportMonth: '2026-09',
    projectCode: '20263559',
    projectName: '佛山街（二辉路-三阳路）道路改造',
    district: '江岸区',
    renewalAreaName: '一元片',
    renewalAreaBatch: 'first',
    fiveReformType: 'old-street',
    projectAffiliation: 'city-area',
    currentProgress: '路基整形施工',
    totalInvest: 0.28,
    yearPlanInvest: 0.15,
    yearAccumulatedInvest: 0.11,
    monthCompletedInvest: 0.04,
    monthProgressDesc: '雨污水管道开挖完成，路基整形完成50%。',
    constructionStage: '施工',
    progressReminder: '正常',
    statisticsIncluded: '否',
    statisticsUnit: '',
    fillStatus: '已确认',
  },
  {
    reportMonth: '2026-09',
    projectCode: '20263556',
    projectName: '大智门火车站旧址修缮等',
    district: '江岸区',
    renewalAreaName: '',
    renewalAreaBatch: '',
    fiveReformType: 'old-street',
    projectAffiliation: 'scattered',
    currentProgress: '室内展陈施工',
    totalInvest: 0.1846,
    yearPlanInvest: 0.09,
    yearAccumulatedInvest: 0.078,
    monthCompletedInvest: 0.012,
    monthProgressDesc: '外墙清水墙修复完成，室内展陈施工完成60%。',
    constructionStage: '施工',
    progressReminder: '正常',
    statisticsIncluded: '否',
    statisticsUnit: '',
    fillStatus: '已确认',
  },
  {
    reportMonth: '2026-09',
    projectCode: '20263609',
    projectName: '三阳设计之都项目（一元路片）',
    district: '江岸区',
    renewalAreaName: '一元片',
    renewalAreaBatch: 'first',
    fiveReformType: 'old-street',
    projectAffiliation: 'city-area',
    currentProgress: '设计方案深化',
    totalInvest: 1.8,
    yearPlanInvest: 0.9,
    yearAccumulatedInvest: 0,
    monthCompletedInvest: 0,
    monthProgressDesc: '',
    constructionStage: '前期准备',
    progressReminder: '正常',
    statisticsIncluded: '否',
    statisticsUnit: '',
    fillStatus: '草稿',
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
    projectName: '二七沿江商务区旧改',
    district: '江岸区',
    renewalAreaName: '二七沿江片',
    renewalAreaBatch: 'first',
    fiveReformType: 'old-street',
    projectAffiliation: 'city-area',
    currentProgress: '方案设计',
    totalInvest: 6.8,
    yearPlanInvest: 2.1,
    yearAccumulatedInvest: 0.15,
    monthCompletedInvest: 0.08,
    monthProgressDesc: '',
    constructionStage: '前期准备',
    progressReminder: '正常',
    statisticsIncluded: '否',
    statisticsUnit: '',
    fillStatus: '草稿',
  },
  {
    reportMonth: '2026-09',
    projectCode: '20263601',
    projectName: '新兴街片旧城更新项目',
    district: '江岸区',
    renewalAreaName: '新兴街片',
    renewalAreaBatch: 'first',
    fiveReformType: 'old-community',
    projectAffiliation: 'city-area',
    currentProgress: '前期摸底',
    totalInvest: 3.2,
    yearPlanInvest: 1.5,
    yearAccumulatedInvest: 0,
    monthCompletedInvest: 0,
    monthProgressDesc: '',
    constructionStage: '前期准备',
    progressReminder: '正常',
    statisticsIncluded: '否',
    statisticsUnit: '',
    fillStatus: '草稿',
  },
];

/** 提示/督办主记录（区级端整单；市住建局下发） */
export const SUPERVISES: SuperviseItem[] = [
  {
    dispatchNo: '项目督办〔2026〕001号',
    superviseType: '督办',
    district: '江岸区',
    dispatchStatus: '已下发',
    inspectMonth: '2026-10',
    dispatchDate: '2026-10-11',
    deadline: '2026-10-25',
    dispatchOrg: '市住建局',
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
    dispatchOrg: '市住建局',
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
    dispatchOrg: '市住建局',
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
    dispatchOrg: '市住建局',
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
        reportOrg: monthly ? `${monthly.district}住建局` : '江岸区住建局',
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
  /** 评估周期（YYYY-MM，搜索表单年/月过滤依据） */
  evaluatePeriod: string;
  /** 片区编号 */
  areaCode: string;
  district: string;
  areaName: string;
  renewalAreaBatch: string;
  /** 片区功能定位（顿号拼接展示） */
  orientationList: string[];
  /** 总体投资估算（亿元） */
  totalInvestEstimate: number;
  /** 累计已完成投资（亿元） */
  accumulatedInvest: number;
  /** 年度总体投资计划（亿元） */
  yearTotalPlanInvest: number;
  /** 季度完成投资（亿元） */
  quarterInvest: number;
  /** 年度已完成投资（亿元） */
  yearCompletedInvest: number;
  /** 年度投资进度（百分数 0~100） */
  yearProgress: number;
  /** 三色图状态（空=未评估） */
  triColor: TriColorStatus;
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
  progressReminder?: string;
  year?: number | string;
  month?: number | string;
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
export function filterSchedules(params: ImplProgressQuery): ScheduleItem[] {
  return SCHEDULES.filter(
    (item) =>
      matchProject(item, params) &&
      (!params.fillStatus || item.fillStatus === params.fillStatus) &&
      (!params.reportOrg || item.reportOrg === params.reportOrg) &&
      matchPeriod(item.planStartMonth, params),
  );
}

/** 月度进度填报过滤 */
export function filterMonthlies(params: ImplProgressQuery): MonthlyItem[] {
  return MONTHLIES.filter(
    (item) =>
      matchProject(item, params) &&
      (!params.fillStatus || item.fillStatus === params.fillStatus) &&
      (!params.constructionStage || item.constructionStage === params.constructionStage) &&
      matchPeriod(item.reportMonth, params),
  );
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
      matchPeriod(item.evaluatePeriod, params),
  );
}

// ── 展示辅助 ──────────────────────────────────────────────────────────

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
