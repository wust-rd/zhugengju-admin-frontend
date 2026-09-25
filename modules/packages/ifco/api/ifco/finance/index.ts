/**
 * ifco —— 投融资管理（内存假数据）
 *
 * 菜单三级：资金分类管理（列表+填报抽屉）/ 项目资金管理（区划·片区·项目三形态汇总）/
 * 资金统计分析（七图表）。数据来自本模块内存行（刷新即恢复）；行政区/五改类别/
 * 片区批次/项目归属枚举复用 project-library 口径；金额累加走 number-precision。
 */
import NP from 'number-precision';
import {
  CITY_RENEWAL_AREA_LIST,
  DISTRICTS,
  FIVE_REFORM_TYPE_OPTIONS,
  PROJECT_AFFILIATION_LABEL,
  RENEWAL_AREA_BATCH_LABEL,
} from '@jeesite/ifco/api/ifco/project-library';

// ══════════════════════ 资金分类管理 ══════════════════════

/** 填报状态：待填报 →（保存）待提交 →（提交）已提交 */
export type FundFillStatus = '待填报' | '待提交' | '已提交';

export const FUND_FILL_STATUS_OPTIONS: FundFillStatus[] = ['待填报', '待提交', '已提交'];

/** 资金偏离度提醒 */
export type FundDeviation = '正常' | '偏离' | '严重偏离';

export const FUND_DEVIATION_OPTIONS: FundDeviation[] = ['正常', '偏离', '严重偏离'];

export type YesNo = '是' | '否';

export const YES_NO_OPTIONS: YesNo[] = ['是', '否'];

/** 当前建设阶段（口径同 impl-progress 的 CONSTRUCTION_STAGE_OPTIONS） */
export const CONSTRUCTION_STAGE_OPTIONS = ['前期准备', '报建报批', '施工', '竣工'] as const;

/** 填报周期口径（黄横幅/抽屉副标题共用；演示值照设计稿） */
export const FUND_FILL_PERIOD = { year: 2026, month: 9, deadlineDays: 3 };

/**
 * 资金到位情况指标行（转置网格的行定义；口径参考项目进展填报：
 * 输入行手填、灰色自动行按子项求和实时计算）
 */
export type FundIndicatorRow = {
  key: string;
  name: string;
  unit: string;
  code: string;
  /** 自动行：求和的子行 key（无则输入行） */
  autoOf?: string[];
  /** 备注（自动行展示计算公式） */
  note?: string;
};

export const FUND_INDICATORS: FundIndicatorRow[] = [
  {
    key: 'r104',
    name: '本年实际到位资金',
    unit: '万元',
    code: '104',
    autoOf: ['r105', 'r115', 'r120'],
    note: '自动计算，104=105+115+120',
  },
  {
    key: 'r105',
    name: '　合计中：1.国家预算资金',
    unit: '万元',
    code: '105',
    autoOf: ['r106', 'r111', 'r112', 'r113', 'r114'],
    note: '自动计算，105=106+111+112+113+114',
  },
  {
    key: 'r106',
    name: '　其中：(1) 中央预算资金',
    unit: '万元',
    code: '106',
    autoOf: ['r107', 'r108', 'r109', 'r110'],
    note: '自动计算，106=107+108+109+110',
  },
  { key: 'r107', name: '　　合计中：中央预算内投资', unit: '万元', code: '107' },
  { key: 'r108', name: '　　其中中央财政资金', unit: '万元', code: '108' },
  { key: 'r109', name: '　　国债（增发国债）', unit: '万元', code: '109' },
  { key: 'r110', name: '　　超长期特别国债', unit: '万元', code: '110' },
  { key: 'r111', name: '　(2) 省级财政资金', unit: '万元', code: '111' },
  {
    key: 'r112',
    name: '　(3) 市县及以下财政资金',
    unit: '万元',
    code: '112',
    autoOf: ['cityBudget', 'districtBudget'],
    note: '自动计算，112=市级预算资金+区级预算资金',
  },
  { key: 'cityBudget', name: '　　　市级预算资金', unit: '万元', code: '' },
  { key: 'districtBudget', name: '　　　区级预算资金', unit: '万元', code: '' },
  { key: 'r113', name: '　(4) 地方政府一般债券', unit: '万元', code: '113' },
  { key: 'r114', name: '　(5) 地方政府专项债券', unit: '万元', code: '114' },
  {
    key: 'r115',
    name: '　2.社会资本',
    unit: '万元',
    code: '115',
    autoOf: ['r116', 'r117', 'r118'],
    note: '自动计算，115=116+117+118',
  },
  { key: 'r116', name: '　　(1) 产权单位出资', unit: '万元', code: '116' },
  { key: 'r117', name: '　　(2) 规模化交通运营商出资', unit: '万元', code: '117' },
  { key: 'r118', name: '　　(3) 居民出资', unit: '万元', code: '118' },
  { key: 'finLoan', name: '　金融机构信贷资金', unit: '万元', code: '' },
  { key: 'policyFund', name: '　　　其中：政策性资金', unit: '万元', code: '' },
  { key: 'policyToolFund', name: '　　　政策性工具资金', unit: '万元', code: '' },
  { key: 'paidFinFund', name: '　　　已拨付金融资金', unit: '万元', code: '' },
  { key: 'r120', name: '　3.其他本年实际到位资金（应注明来源）', unit: '万元', code: '120' },
  { key: 'otherSource', name: '　　其他本年实际到位资金的来源', unit: '—', code: '' },
];

/** 自动行数值（递归求和；金额累加走 NP 规避浮点尾差） */
export function autoValueOf(key: string, values: Record<string, number>): number {
  const row = FUND_INDICATORS.find((item) => item.key === key);
  if (!row?.autoOf) return values[key] ?? 0;
  return row.autoOf.reduce((sum, child) => NP.plus(sum, autoValueOf(child, values)), 0);
}

/** 资金分类管理行（列表 + 填报表单一体） */
export type FundItem = {
  projectCode: string;
  projectName: string;
  district: string;
  renewalAreaName: string;
  renewalAreaBatch: string;
  fiveReformType: string;
  projectAffiliation: string;
  investEstimate: number;
  yearPlanInvest: number;
  yearAccumulatedInvest: number;
  monthCompletedInvest: number;
  yearProgressRate: number;
  fundDeviation: FundDeviation;
  fillStatus: FundFillStatus;
  // ── 填报表单 ──
  /** 本年完成投资总额（亿元，进度填报自动带入，只读） */
  yearInvestTotal: number;
  /** 项目资金缺口（万元） */
  fundGap?: number;
  /** 缺口资金是否已有资金安排 */
  gapArranged?: YesNo;
  /** 资金安排说明（安排=是时提交必填） */
  gapArrangeDesc: string;
  /** 是否可以作为 REITs 培育项目 */
  reitsProject?: YesNo;
  /** 资金到位情况输入行数值（key 同 FUND_INDICATORS 的输入行） */
  values: Record<string, number>;
  /** 其他本年实际到位资金的来源（文字行，无代码） */
  otherSource: string;
};

export const FUND_ITEMS: FundItem[] = [
  {
    projectCode: '20263600',
    projectName: '三阳设计之都项目（一元片）',
    district: '江岸区',
    renewalAreaName: '一元片',
    renewalAreaBatch: 'first',
    fiveReformType: 'old-street',
    projectAffiliation: 'city-area',
    investEstimate: 1.8,
    yearPlanInvest: 0.9,
    yearAccumulatedInvest: 0.45,
    monthCompletedInvest: 0.08,
    yearProgressRate: 50,
    fundDeviation: '正常',
    fillStatus: '待填报',
    yearInvestTotal: 1.05,
    fundGap: 111111,
    gapArranged: '是',
    gapArrangeDesc: '',
    reitsProject: '是',
    values: {},
    otherSource: '',
  },
  {
    projectCode: '20263559',
    projectName: '胜利街（二曜路—三阳路）道路改造项目',
    district: '江岸区',
    renewalAreaName: '一元片',
    renewalAreaBatch: 'first',
    fiveReformType: 'old-street',
    projectAffiliation: 'city-area',
    investEstimate: 0.86,
    yearPlanInvest: 0.5,
    yearAccumulatedInvest: 0.35,
    monthCompletedInvest: 0.06,
    yearProgressRate: 70,
    fundDeviation: '正常',
    fillStatus: '待填报',
    yearInvestTotal: 0.62,
    gapArrangeDesc: '',
    values: {},
    otherSource: '',
  },
  {
    projectCode: '20263558',
    projectName: '西马片房地产新模式试点项目',
    district: '江岸区',
    renewalAreaName: '西马片',
    renewalAreaBatch: 'second',
    fiveReformType: 'old-street',
    projectAffiliation: 'city-area',
    investEstimate: 2.03,
    yearPlanInvest: 1.2,
    yearAccumulatedInvest: 0.78,
    monthCompletedInvest: 0.12,
    yearProgressRate: 65,
    fundDeviation: '偏离',
    fillStatus: '待提交',
    yearInvestTotal: 1.05,
    fundGap: 8000,
    gapArranged: '否',
    gapArrangeDesc: '',
    values: {
      r107: 12000,
      r108: 5000,
      r109: 3000,
      r110: 8000,
      r111: 4000,
      cityBudget: 6000,
      districtBudget: 3000,
      r113: 2000,
      r114: 15000,
      r116: 30000,
      r117: 40000,
      r118: 3000,
      finLoan: 20000,
      r120: 500,
    },
    otherSource: '其他财政专项补助',
  },
  {
    projectCode: '20263412',
    projectName: '黑泥湖片完整社区建设项目',
    district: '江岸区',
    renewalAreaName: '黑泥湖片',
    renewalAreaBatch: 'second',
    fiveReformType: 'old-community',
    projectAffiliation: 'city-area',
    investEstimate: 1.35,
    yearPlanInvest: 0.7,
    yearAccumulatedInvest: 0.66,
    monthCompletedInvest: 0.09,
    yearProgressRate: 94,
    fundDeviation: '正常',
    fillStatus: '已提交',
    yearInvestTotal: 0.66,
    reitsProject: '是',
    gapArrangeDesc: '',
    values: {
      r107: 8000,
      r108: 3000,
      r111: 2000,
      cityBudget: 4000,
      districtBudget: 2000,
      r114: 9000,
      r116: 15000,
      r117: 20000,
      r118: 1000,
      r120: 300,
    },
    otherSource: '单位自筹',
  },
  {
    projectCode: '20263388',
    projectName: '红钢城片工业遗产保护利用项目',
    district: '青山区',
    renewalAreaName: '红钢城片',
    renewalAreaBatch: 'first',
    fiveReformType: 'old-factory',
    projectAffiliation: 'district-area',
    investEstimate: 3.6,
    yearPlanInvest: 1.6,
    yearAccumulatedInvest: 0.8,
    monthCompletedInvest: 0.15,
    yearProgressRate: 50,
    fundDeviation: '严重偏离',
    fillStatus: '待提交',
    yearInvestTotal: 0.95,
    fundGap: 26000,
    gapArranged: '是',
    gapArrangeDesc: '拟通过地方政府专项债券解决 1.5 亿元，剩余由企业自筹。',
    values: {
      r107: 6000,
      r110: 5000,
      r111: 3000,
      cityBudget: 5000,
      districtBudget: 4000,
      r114: 12000,
      r116: 20000,
      r117: 30000,
      r118: 0,
      r120: 800,
    },
    otherSource: '文创产业基金',
  },
  {
    projectCode: '20263215',
    projectName: '街道口片环大学片区更新项目',
    district: '洪山区',
    renewalAreaName: '街道口片',
    renewalAreaBatch: 'second',
    fiveReformType: 'old-street',
    projectAffiliation: 'district-area',
    investEstimate: 2.4,
    yearPlanInvest: 1.1,
    yearAccumulatedInvest: 1.02,
    monthCompletedInvest: 0.11,
    yearProgressRate: 93,
    fundDeviation: '正常',
    fillStatus: '已提交',
    yearInvestTotal: 1.02,
    gapArranged: '否',
    gapArrangeDesc: '',
    reitsProject: '是',
    values: {
      r107: 10000,
      r108: 4000,
      r111: 3500,
      cityBudget: 7000,
      districtBudget: 4500,
      r113: 3000,
      r114: 18000,
      r116: 25000,
      r117: 35000,
      r118: 2000,
      finLoan: 15000,
      r120: 600,
    },
    otherSource: '高校共建资金',
  },
];

export type FundQuery = {
  projectName?: string;
  fiveReformType?: string;
  constructionStage?: string;
  fillStatus?: string;
};

function matchText(actual: string, query?: string) {
  return !query || actual.includes(query.trim());
}

export function filterFundItems(params: FundQuery): FundItem[] {
  return FUND_ITEMS.filter(
    (item) =>
      matchText(item.projectName, params.projectName) &&
      (!params.fiveReformType || item.fiveReformType === params.fiveReformType) &&
      (!params.fillStatus || item.fillStatus === params.fillStatus),
  );
}

/** 列表操作：待填报/待提交=查看+编辑，已提交=仅查看 */
export type FundAction = '查看' | '编辑';

/** 填报状态标签配色 */
export function fundFillStatusTagProps(status: FundFillStatus): {
  color: string;
  variant: 'solid' | 'outlined';
} {
  switch (status) {
    case '待填报':
      return { color: 'blue', variant: 'outlined' };
    case '待提交':
      return { color: 'blue', variant: 'solid' };
    case '已提交':
      return { color: 'green', variant: 'solid' };
  }
}

/** 资金偏离度提醒标签配色 */
export function fundDeviationTagProps(deviation: FundDeviation): {
  color: string;
  variant: 'solid' | 'outlined';
} {
  switch (deviation) {
    case '正常':
      return { color: 'blue', variant: 'outlined' };
    case '偏离':
      return { color: 'orange', variant: 'outlined' };
    case '严重偏离':
      return { color: 'red', variant: 'solid' };
  }
}

// ══════════════════════ 项目资金管理（三形态汇总） ══════════════════════

/** 汇总形态：区划 / 片区 / 项目（顶部三卡片点选切换，经路由 ?mode= 持久化） */
export type FundMode = 'district' | 'area' | 'project';

export type FundModeCard = {
  key: FundMode;
  label: string;
  /** 汇总周期行 */
  period: string;
  /** 口径行（除周期外的统计文案） */
  lines: string[];
  /** 进度条（仅区划卡有） */
  progress?: number;
};

export const FUND_MODE_CARDS: FundModeCard[] = [
  {
    key: 'district',
    label: '按区划汇总查询',
    period: '截止汇总周期：2026-06 二季度',
    lines: ['已完成投资750亿元 / 本年度计划完成投资1500亿元'],
    progress: 50,
  },
  {
    key: 'area',
    label: '按片区汇总查询',
    period: '截止汇总周期：2026-06 二季度',
    lines: [
      '第一批更新片区80个 已完成投资250亿元 / 本年度计划完成投资550亿元',
      '第二批更新片区102个 已完成投资250亿元 / 本年度计划完成投资500亿元',
    ],
  },
  {
    key: 'project',
    label: '按项目汇总查询',
    period: '截止汇总周期：2026-06 二季度',
    lines: [
      '市级更新片区内项目668个 已完成投资500亿元 / 本年度计划完成投资1100亿元',
      '市级更新片区外项目423个 已完成投资250亿元 / 本年度计划完成投资400亿元',
    ],
  },
];

/** 按区划汇总行（末行全市合计） */
export type DistrictFundRow = {
  district: string;
  projectCount: number;
  totalInvest: number;
  yearPlanInvest: number;
  periodCompletedInvest: number;
  yearProgressRate: number;
  periodArrivedFunds: number;
  arrivalRate: number;
};

export const DISTRICT_FUND_ROWS: DistrictFundRow[] = [
  {
    district: '江岸区',
    projectCount: 486,
    totalInvest: 486.0,
    yearPlanInvest: 243.0,
    periodCompletedInvest: 121.5,
    yearProgressRate: 50,
    periodArrivedFunds: 60.75,
    arrivalRate: 50,
  },
  {
    district: '江汉区',
    projectCount: 402,
    totalInvest: 402.0,
    yearPlanInvest: 201.0,
    periodCompletedInvest: 100.5,
    yearProgressRate: 50,
    periodArrivedFunds: 50.25,
    arrivalRate: 50,
  },
  {
    district: '硚口区',
    projectCount: 391,
    totalInvest: 391.0,
    yearPlanInvest: 195.5,
    periodCompletedInvest: 97.75,
    yearProgressRate: 50,
    periodArrivedFunds: 48.88,
    arrivalRate: 50,
  },
  {
    district: '汉阳区',
    projectCount: 520,
    totalInvest: 520.0,
    yearPlanInvest: 260.0,
    periodCompletedInvest: 130.0,
    yearProgressRate: 50,
    periodArrivedFunds: 65.0,
    arrivalRate: 50,
  },
  {
    district: '武昌区',
    projectCount: 468,
    totalInvest: 468.0,
    yearPlanInvest: 234.0,
    periodCompletedInvest: 117.0,
    yearProgressRate: 50,
    periodArrivedFunds: 58.5,
    arrivalRate: 50,
  },
  {
    district: '青山区',
    projectCount: 377,
    totalInvest: 377.0,
    yearPlanInvest: 188.5,
    periodCompletedInvest: 94.25,
    yearProgressRate: 50,
    periodArrivedFunds: 47.13,
    arrivalRate: 50,
  },
  {
    district: '洪山区',
    projectCount: 356,
    totalInvest: 356.0,
    yearPlanInvest: 178.0,
    periodCompletedInvest: 89.0,
    yearProgressRate: 50,
    periodArrivedFunds: 44.5,
    arrivalRate: 50,
  },
  {
    district: '全市合计',
    projectCount: 3000,
    totalInvest: 3000.0,
    yearPlanInvest: 1500.0,
    periodCompletedInvest: 750.0,
    yearProgressRate: 50,
    periodArrivedFunds: 375.0,
    arrivalRate: 50,
  },
];

/** 按片区汇总行 */
export type AreaFundRow = {
  areaCode: string;
  district: string;
  renewalAreaName: string;
  renewalAreaBatch: string;
  orientation: string;
  projectCount: number;
  areaTotalInvest: number;
  accumulatedCompletedInvest: number;
  yearInvestPlan: number;
  periodCompletedInvest: number;
  yearProgressRate: number;
  periodArrivedFunds: number;
  arrivalRate: number;
};

export const AREA_FUND_ROWS: AreaFundRow[] = [
  {
    areaCode: 'PQ-001',
    district: '江岸区',
    renewalAreaName: '一元片',
    renewalAreaBatch: 'first',
    orientation: 'TOD',
    projectCount: 32,
    areaTotalInvest: 128.0,
    accumulatedCompletedInvest: 64.0,
    yearInvestPlan: 48.0,
    periodCompletedInvest: 24.0,
    yearProgressRate: 50,
    periodArrivedFunds: 12.0,
    arrivalRate: 50,
  },
  {
    areaCode: 'PQ-002',
    district: '江岸区',
    renewalAreaName: '二七沿江片',
    renewalAreaBatch: 'first',
    orientation: 'HOD',
    projectCount: 26,
    areaTotalInvest: 96.0,
    accumulatedCompletedInvest: 40.0,
    yearInvestPlan: 36.0,
    periodCompletedInvest: 18.0,
    yearProgressRate: 50,
    periodArrivedFunds: 9.0,
    arrivalRate: 50,
  },
  {
    areaCode: 'PQ-003',
    district: '江汉区',
    renewalAreaName: '新兴街片',
    renewalAreaBatch: 'first',
    orientation: 'COD',
    projectCount: 22,
    areaTotalInvest: 78.0,
    accumulatedCompletedInvest: 36.0,
    yearInvestPlan: 30.0,
    periodCompletedInvest: 15.0,
    yearProgressRate: 50,
    periodArrivedFunds: 7.5,
    arrivalRate: 50,
  },
  {
    areaCode: 'PQ-004',
    district: '硚口区',
    renewalAreaName: '四马片',
    renewalAreaBatch: 'second',
    orientation: 'COD',
    projectCount: 18,
    areaTotalInvest: 66.0,
    accumulatedCompletedInvest: 28.0,
    yearInvestPlan: 26.0,
    periodCompletedInvest: 13.0,
    yearProgressRate: 50,
    periodArrivedFunds: 6.5,
    arrivalRate: 50,
  },
  {
    areaCode: 'PQ-005',
    district: '江岸区',
    renewalAreaName: '黑泥湖片',
    renewalAreaBatch: 'second',
    orientation: 'SOD',
    projectCount: 15,
    areaTotalInvest: 52.0,
    accumulatedCompletedInvest: 24.0,
    yearInvestPlan: 20.0,
    periodCompletedInvest: 10.0,
    yearProgressRate: 50,
    periodArrivedFunds: 5.0,
    arrivalRate: 50,
  },
  {
    areaCode: 'PQ-006',
    district: '青山区',
    renewalAreaName: '红钢城片',
    renewalAreaBatch: 'first',
    orientation: 'EOD',
    projectCount: 28,
    areaTotalInvest: 110.0,
    accumulatedCompletedInvest: 52.0,
    yearInvestPlan: 42.0,
    periodCompletedInvest: 21.0,
    yearProgressRate: 50,
    periodArrivedFunds: 10.5,
    arrivalRate: 50,
  },
];

/** 按项目汇总行 */
export type ProjectFundRow = {
  projectCode: string;
  projectName: string;
  district: string;
  renewalAreaName: string;
  renewalAreaBatch: string;
  fiveReformType: string;
  projectAffiliation: string;
  areaTotalInvest: number;
  projectInvestEstimate: number;
  yearInvestPlan: number;
  periodCompletedInvest: number;
  yearProgressRate: number;
  periodArrivedFunds: number;
  arrivalRate: number;
};

export const PROJECT_FUND_ROWS: ProjectFundRow[] = [
  {
    projectCode: '20263600',
    projectName: '三阳设计之都项目（一元片）',
    district: '江岸区',
    renewalAreaName: '一元片',
    renewalAreaBatch: 'first',
    fiveReformType: 'old-street',
    projectAffiliation: 'city-area',
    areaTotalInvest: 128.0,
    projectInvestEstimate: 1.8,
    yearInvestPlan: 0.9,
    periodCompletedInvest: 0.45,
    yearProgressRate: 50,
    periodArrivedFunds: 0.23,
    arrivalRate: 50,
  },
  {
    projectCode: '20263559',
    projectName: '胜利街（二曜路—三阳路）道路改造项目',
    district: '江岸区',
    renewalAreaName: '一元片',
    renewalAreaBatch: 'first',
    fiveReformType: 'old-street',
    projectAffiliation: 'city-area',
    areaTotalInvest: 128.0,
    projectInvestEstimate: 0.86,
    yearInvestPlan: 0.5,
    periodCompletedInvest: 0.35,
    yearProgressRate: 70,
    periodArrivedFunds: 0.3,
    arrivalRate: 60,
  },
  {
    projectCode: '20263558',
    projectName: '西马片房地产新模式试点项目',
    district: '江岸区',
    renewalAreaName: '西马片',
    renewalAreaBatch: 'second',
    fiveReformType: 'old-street',
    projectAffiliation: 'city-area',
    areaTotalInvest: 88.0,
    projectInvestEstimate: 2.03,
    yearInvestPlan: 1.2,
    periodCompletedInvest: 0.78,
    yearProgressRate: 65,
    periodArrivedFunds: 0.5,
    arrivalRate: 42,
  },
  {
    projectCode: '20263412',
    projectName: '黑泥湖片完整社区建设项目',
    district: '江岸区',
    renewalAreaName: '黑泥湖片',
    renewalAreaBatch: 'second',
    fiveReformType: 'old-community',
    projectAffiliation: 'city-area',
    areaTotalInvest: 52.0,
    projectInvestEstimate: 1.35,
    yearInvestPlan: 0.7,
    periodCompletedInvest: 0.66,
    yearProgressRate: 94,
    periodArrivedFunds: 0.62,
    arrivalRate: 89,
  },
  {
    projectCode: '20263388',
    projectName: '红钢城片工业遗产保护利用项目',
    district: '青山区',
    renewalAreaName: '红钢城片',
    renewalAreaBatch: 'first',
    fiveReformType: 'old-factory',
    projectAffiliation: 'district-area',
    areaTotalInvest: 110.0,
    projectInvestEstimate: 3.6,
    yearInvestPlan: 1.6,
    periodCompletedInvest: 0.8,
    yearProgressRate: 50,
    periodArrivedFunds: 0.6,
    arrivalRate: 38,
  },
  {
    projectCode: '20263215',
    projectName: '街道口片环大学片区更新项目',
    district: '洪山区',
    renewalAreaName: '街道口片',
    renewalAreaBatch: 'second',
    fiveReformType: 'old-street',
    projectAffiliation: 'district-area',
    areaTotalInvest: 96.0,
    projectInvestEstimate: 2.4,
    yearInvestPlan: 1.1,
    periodCompletedInvest: 1.02,
    yearProgressRate: 93,
    periodArrivedFunds: 0.98,
    arrivalRate: 89,
  },
  {
    projectCode: '20263107',
    projectName: '吴家山片老旧厂区改造项目',
    district: '东西湖区',
    renewalAreaName: '吴家山片',
    renewalAreaBatch: 'first',
    fiveReformType: 'old-factory',
    projectAffiliation: 'district-area',
    areaTotalInvest: 76.0,
    projectInvestEstimate: 1.9,
    yearInvestPlan: 0.9,
    periodCompletedInvest: 0.85,
    yearProgressRate: 94,
    periodArrivedFunds: 0.8,
    arrivalRate: 89,
  },
  {
    projectCode: '20263066',
    projectName: '汉阳古城历史风貌区改造项目',
    district: '汉阳区',
    renewalAreaName: '汉阳古城片',
    renewalAreaBatch: 'first',
    fiveReformType: 'old-street',
    projectAffiliation: 'district-area',
    areaTotalInvest: 120.0,
    projectInvestEstimate: 3.2,
    yearInvestPlan: 1.5,
    periodCompletedInvest: 0.72,
    yearProgressRate: 48,
    periodArrivedFunds: 0.66,
    arrivalRate: 44,
  },
];

export type FundModeQuery = {
  district?: string;
  renewalAreaName?: string;
  projectName?: string;
  projectAffiliation?: string;
  renewalAreaBatch?: string;
  fiveReformType?: string;
};

export function filterDistrictFundRows(params: FundModeQuery): DistrictFundRow[] {
  return DISTRICT_FUND_ROWS.filter(
    (row) => row.district === '全市合计' || !params.district || row.district === params.district,
  );
}

export function filterAreaFundRows(params: FundModeQuery): AreaFundRow[] {
  return AREA_FUND_ROWS.filter(
    (row) =>
      (!params.district || row.district === params.district) && matchText(row.renewalAreaName, params.renewalAreaName),
  );
}

export function filterProjectFundRows(params: FundModeQuery): ProjectFundRow[] {
  return PROJECT_FUND_ROWS.filter(
    (row) =>
      (!params.district || row.district === params.district) &&
      matchText(row.renewalAreaName, params.renewalAreaName) &&
      matchText(row.projectName, params.projectName) &&
      (!params.projectAffiliation || row.projectAffiliation === params.projectAffiliation) &&
      (!params.renewalAreaBatch || row.renewalAreaBatch === params.renewalAreaBatch) &&
      (!params.fiveReformType || row.fiveReformType === params.fiveReformType),
  );
}

// ══════════════════════ 资金统计分析（七图表数据） ══════════════════════

/** 各行政区统计区间项目数量（柱状图；照设计稿数值） */
export const DISTRICT_PROJECT_COUNTS: { district: string; count: number }[] = [
  { district: '江汉区', count: 40 },
  { district: '硚口区', count: 39 },
  { district: '汉阳区', count: 52 },
  { district: '武昌区', count: 26 },
  { district: '江岸区', count: 35 },
  { district: '青山区', count: 41 },
];

/** 五改项目分类数量（环形图，单位：个） */
export const FIVE_REFORM_COUNTS: { label: string; value: number }[] = [
  { label: '老旧小区改造', value: 83 },
  { label: '既有建筑改造', value: 58 },
  { label: '城中村改造', value: 48 },
  { label: '老旧街区改造', value: 43 },
  { label: '老旧厂区改造', value: 19 },
];

/** 五改项目分类总投资（环形图，单位：万元） */
export const FIVE_REFORM_INVESTS: { label: string; value: number }[] = [
  { label: '老旧小区改造', value: 226922.2 },
  { label: '既有建筑改造', value: 161992.2 },
  { label: '城中村改造', value: 114691 },
  { label: '老旧街区改造', value: 100995.7 },
  { label: '老旧厂区改造', value: 67339 },
];

/** 五改 总投资/年度计划投资/统计区间累计完成投资（分组柱状图，单位：万元） */
export const FIVE_REFORM_GROUPED: { label: string; total: number; yearPlan: number; completed: number }[] =
  FIVE_REFORM_INVESTS.map((item) => ({
    label: item.label,
    total: item.value,
    yearPlan: Math.round(item.value * 0.45),
    completed: Math.round(item.value * 0.22),
  }));

/** 统计区间到位资金全渠道分类（环形图，单位：万元；八渠道） */
export const FUND_CHANNELS: { label: string; value: number }[] = [
  { label: '中央预算内资金', value: 20676 },
  { label: '省级预算内资金', value: 21095 },
  { label: '区级以下预算资金', value: 30116 },
  { label: '地方政府一般债券', value: 14739 },
  { label: '地方政府专项债券', value: 33466 },
  { label: '政策性银行专项债券', value: 23490 },
  { label: '社会资本', value: 13469 },
  { label: '其他资金', value: 8385 },
];

/** 各行政区 总投资/年度计划/累计完成/到位资金（分组柱状图，单位：万元） */
export const DISTRICT_FUND_GROUPED: {
  district: string;
  total: number;
  yearPlan: number;
  completed: number;
  arrived: number;
}[] = [
  { district: '江岸区', total: 92000, yearPlan: 41000, completed: 20600, arrived: 10200 },
  { district: '江汉区', total: 76000, yearPlan: 34000, completed: 17100, arrived: 8500 },
  { district: '硚口区', total: 68000, yearPlan: 30000, completed: 15200, arrived: 7400 },
  { district: '汉阳区', total: 88000, yearPlan: 39000, completed: 19700, arrived: 9600 },
  { district: '武昌区', total: 82000, yearPlan: 37000, completed: 18400, arrived: 9100 },
  { district: '青山区', total: 71000, yearPlan: 32000, completed: 15900, arrived: 7900 },
];

/** 统计区间各月 投资进度/资金到位率/月完成投资额（柱线混合图） */
export const MONTHLY_FUND_TREND: {
  month: string;
  monthCompleted: number;
  progressRate: number;
  arrivalRate: number;
}[] = [
  { month: '2026.03', monthCompleted: 52000, progressRate: 18, arrivalRate: 20 },
  { month: '2026.04', monthCompleted: 68000, progressRate: 32, arrivalRate: 35 },
  { month: '2026.05', monthCompleted: 75000, progressRate: 45, arrivalRate: 42 },
  { month: '2026.06', monthCompleted: 82000, progressRate: 50, arrivalRate: 50 },
];

/** 枚举转中文（只读展示用） */
export function fiveReformLabel(value: string): string {
  return FIVE_REFORM_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function renewalAreaBatchLabel(value: string): string {
  return RENEWAL_AREA_BATCH_LABEL[value] ?? value;
}

export function projectAffiliationLabel(value: string): string {
  return PROJECT_AFFILIATION_LABEL[value] ?? value;
}

/** 行政区选项（搜索表单/图表卡） */
export const DISTRICT_OPTIONS = [
  { label: '全部', value: '' },
  ...DISTRICTS.map((name) => ({ label: name, value: name })),
];

/** 片区名称选项（片区/项目形态搜索：市级+区级片区） */
export const RENEWAL_AREA_OPTIONS = [...CITY_RENEWAL_AREA_LIST.map((area) => ({ label: area.name, value: area.name }))];
