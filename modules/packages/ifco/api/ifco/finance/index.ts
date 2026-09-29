/**
 * ifco —— 投融资管理（接口层）
 *
 * 菜单三级：资金分类管理（列表+填报抽屉）/ 项目资金管理（区划·片区·项目三形态汇总）/
 * 资金统计分析（七图表）。资金分类行集 = 实施库项目 ∪ 最新年度任务已采纳项目
 * （拼装自 project-library/compilation 接口，会话缓存一次）；填报保存走会话内存
 * 登记（资金后端未接入，刷新即恢复）；行政区/五改类别/片区批次/项目归属枚举复用
 * project-library 口径；金额累加走 number-precision。
 */
import NP from 'number-precision';
import {
  CITY_RENEWAL_AREA_LIST,
  DISTRICTS,
  FIVE_REFORM_TYPE_OPTIONS,
  PROJECT_AFFILIATION_LABEL,
  RENEWAL_AREA_BATCH_LABEL,
  fetchLibPage,
  type ProjectRow,
} from '@jeesite/ifco/api/ifco/project-library';
import { fetchCompileTasks, fetchWorkbenchRows, type WorkbenchProject } from '@jeesite/ifco/api/ifco/compilation';

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
 * 资金到位情况指标行（口径照 impl-progress/monthly/table.csv：输入行手填、
 * 灰色自动行按子项按列求和；indent=名称前缀的全角空格数，控制层级缩进）
 */
export type FundIndicatorRow = {
  key: string;
  name: string;
  /** 层级缩进（名称前缀的全角空格数，默认 0） */
  indent?: number;
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
    name: '合计中：1.国家预算资金',
    indent: 2,
    unit: '万元',
    code: '105',
    autoOf: ['r106', 'r111', 'r112', 'r113', 'r114'],
    note: '自动计算，105=106+111+112+113+114',
  },
  {
    key: 'r106',
    name: '其中：（1）中央预算资金',
    indent: 7,
    unit: '万元',
    code: '106',
    autoOf: ['r107', 'r108', 'r109', 'r110'],
    note: '自动计算，106=107+108+109+110',
  },
  { key: 'r107', name: '合计中：中央预算内投资', indent: 12, unit: '万元', code: '107' },
  { key: 'r108', name: '其他中央财政资金', indent: 16, unit: '万元', code: '108' },
  { key: 'r109', name: '国债（增发国债）', indent: 16, unit: '万元', code: '109' },
  { key: 'r110', name: '超长期特别国债', indent: 16, unit: '万元', code: '110' },
  { key: 'r111', name: '（2）省级预算资金', indent: 10, unit: '万元', code: '111' },
  {
    key: 'r112',
    name: '（3）市级及以下预算资金',
    indent: 10,
    unit: '万元',
    code: '112',
    autoOf: ['cityBudget', 'districtBudget'],
    note: '自动计算，112=市级预算资金+区级预算资金',
  },
  { key: 'cityBudget', name: '合计中：市级预算资金', indent: 12, unit: '万元', code: '' },
  { key: 'districtBudget', name: '区级预算资金', indent: 16, unit: '万元', code: '' },
  { key: 'r113', name: '（4）地方政府一般债券', indent: 10, unit: '万元', code: '113' },
  { key: 'r114', name: '（5）地方政府专项债券', indent: 10, unit: '万元', code: '114' },
  {
    key: 'r115',
    name: '2.社会资本',
    indent: 6,
    unit: '万元',
    code: '115',
    autoOf: ['r116', 'r117', 'r118'],
    note: '自动计算，115=116+117+118',
  },
  { key: 'r116', name: '其中：（1）产权单位出资', indent: 7, unit: '万元', code: '116' },
  { key: 'r117', name: '（2）规模化实施运营主体出资', indent: 10, unit: '万元', code: '117' },
  { key: 'r118', name: '（3）居民出资', indent: 10, unit: '万元', code: '118' },
  { key: 'r119', name: '其中：金融机构信贷资金', indent: 7, unit: '万元', code: '119' },
  { key: 'finFunds', name: '包含：金融机构资金', indent: 10, unit: '万元', code: '' },
  { key: 'policyToolFunds', name: '政策金融工具资金', indent: 13, unit: '万元', code: '' },
  { key: 'creditedFunds', name: '已授信金融资金', indent: 13, unit: '万元', code: '' },
  { key: 'loanedFunds', name: '已放款金融资金', indent: 13, unit: '万元', code: '' },
  { key: 'r120', name: '3.其他本年实际到位资金（应注明来源）', indent: 6, unit: '万元', code: '120' },
  { key: 'otherSource', name: '其他本年实际到位资金的来源', indent: 7, unit: '—', code: '' },
];

/** 指标名称展示文本（= indent 个全角空格 + 名称；改缩进只动 indent 数字） */
export function fundIndicatorName(row: FundIndicatorRow): string {
  return '　'.repeat(row.indent ?? 0) + row.name;
}

/** 自动行数值（递归求和，按单列/单月值计算；金额累加走 NP 规避浮点尾差） */
export function autoValueOf(key: string, values: Record<string, number>): number {
  const row = FUND_INDICATORS.find((item) => item.key === key);
  if (!row?.autoOf) return values[key] ?? 0;
  return row.autoOf.reduce((sum, child) => NP.plus(sum, autoValueOf(child, values)), 0);
}

// ── 月份键工具（YYYY-MM；资金到位月份页签/表格月列与项目起止月换算） ──

/** 月份键 → 显示标签（2026年6月） */
export function fundMonthLabel(key: string): string {
  const [year, month] = key.split('-');
  return `${year}年${Number(month)}月`;
}

function fundMonthIndex(key: string): number | null {
  const match = /^(\d{4})-(\d{2})$/.exec(key);
  return match ? Number(match[1]) * 12 + Number(match[2]) - 1 : null;
}

function fundIndexMonth(index: number): string {
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return `${year}-${String(month).padStart(2, '0')}`;
}

/** from→to 间全部月份键（含端点），倒序返回（to 在前；起止倒置返回空） */
export function fundMonthRangeDesc(from: string, to: string): string[] {
  const start = fundMonthIndex(from);
  const end = fundMonthIndex(to);
  if (start == null || end == null || end < start) return [];
  return Array.from({ length: end - start + 1 }, (_, index) => fundIndexMonth(end - index));
}

/** 月份键夹进 [start, end]（页签默认月=填报期月，但不晚于项目结束月、不早于起始月） */
export function clampFundMonth(key: string, start: string, end: string): string {
  if (key > end) return end;
  if (key < start) return start;
  return key;
}

/** 资金分类管理行（列表 + 填报表单一体） */
export type FundItem = {
  /** 项目主键（行集并集去重/填报登记表的键） */
  pUid: string;
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
  /** 当前建设阶段（取计划编制工作台行快照，未填报为空） */
  constructionStage?: string;
  /** 计划开工时间（YYYY-MM-DD，工作台行快照；资金到位月份页签的起始月依据） */
  planStartDate?: string;
  /** 计划竣工时间（YYYY-MM-DD，工作台行快照；资金到位月份页签的结束月依据） */
  planCompletionDate?: string;
  // ── 填报表单 ──
  /** 本年完成投资总额（亿元，进度填报自动带入，只读） */
  yearInvestTotal: number;
  /** 投资纳统金额（万元，手填） */
  statInvestWan?: number;
  /** 项目资金缺口（万元） */
  fundGap?: number;
  /** 缺口资金是否已有资金安排 */
  gapArranged?: YesNo;
  /** 资金安排说明（安排=是时提交必填） */
  gapArrangeDesc: string;
  /** 是否可以作为 REITs 培育项目 */
  reitsProject?: YesNo;
  /** 资金到位情况输入行数值（月份键 YYYY-MM → 行 key → 数值；自动行不落表） */
  values: Record<string, Record<string, number>>;
  /** 其他本年实际到位资金的来源（月份键 → 文字说明） */
  otherSource: Record<string, string>;
};

// ── 行集：实施库 ∪ 最新年度任务已采纳（接口层拼装） ────────────────

/** 会话内填报登记（pUid → 填报字段；含进度填报带入的投资值——列表进度条列随保存联动；
 *  资金后端未接入，保存即写内存，刷新恢复） */
type FundFillRecord = Pick<
  FundItem,
  | 'fillStatus'
  | 'reitsProject'
  | 'fundGap'
  | 'gapArranged'
  | 'gapArrangeDesc'
  | 'values'
  | 'otherSource'
  | 'statInvestWan'
  | 'yearInvestTotal'
  | 'yearAccumulatedInvest'
  | 'monthCompletedInvest'
  | 'yearProgressRate'
>;

const fundFillStore = new Map<string, FundFillRecord>();

export function saveFundFill(pUid: string, record: FundFillRecord) {
  fundFillStore.set(pUid, record);
}

/** 已登记的填报数据覆盖回行集（未登记行原样返回） */
function applyFill(items: FundItem[]): FundItem[] {
  return items.map((item) => (fundFillStore.has(item.pUid) ? { ...item, ...fundFillStore.get(item.pUid) } : item));
}

/** 实施库项目全量（分页翻完；上限 20 页防御后端翻不尽） */
async function fetchAllImplementingRows(): Promise<ProjectRow[]> {
  const pageSize = 200;
  const rows: ProjectRow[] = [];
  for (let pageNum = 1; pageNum <= 20; pageNum += 1) {
    const page = await fetchLibPage({ library: 'implementing', pageNum, pageSize });
    rows.push(...(page?.list ?? []));
    if (!page || rows.length >= page.total || (page.list?.length ?? 0) < pageSize) break;
  }
  return rows;
}

/** 后端行 → 资金分类行（进度/偏离度/到位明细暂无后端，置默认值待接入） */
function toFundItem(
  base: Pick<
    FundItem,
    | 'pUid'
    | 'projectCode'
    | 'projectName'
    | 'district'
    | 'renewalAreaName'
    | 'renewalAreaBatch'
    | 'fiveReformType'
    | 'projectAffiliation'
    | 'investEstimate'
    | 'yearPlanInvest'
    | 'constructionStage'
    | 'planStartDate'
    | 'planCompletionDate'
  >,
): FundItem {
  return {
    ...base,
    yearAccumulatedInvest: 0,
    monthCompletedInvest: 0,
    yearProgressRate: 0,
    fundDeviation: '正常',
    fillStatus: '待填报',
    yearInvestTotal: 0,
    gapArrangeDesc: '',
    values: {},
    otherSource: {},
  };
}

/** 会话内行集缓存（同 impl-progress 倒排缓存口径：拼装一次，采纳变更需刷新页面） */
let fundItemsCache: FundItem[] | null = null;

/**
 * 资金分类行集：实施库项目 ∪ 最新年度任务已采纳项目（按 pUid 并集去重）。
 * 实施库行年度计划值/建设阶段取工作台采纳行快照；已采纳但未入实施库的行
 * 追加在尾部（工作台行无片区批次，置空）。重新登记的填报数据随取随覆盖。
 */
export async function fetchFundItems(): Promise<FundItem[]> {
  if (!fundItemsCache) {
    const [libRows, tasks] = await Promise.all([fetchAllImplementingRows(), fetchCompileTasks()]);
    const task = tasks[0];
    const workbenchRows = task ? ((await fetchWorkbenchRows(task.code)) ?? []) : [];
    const workbenchByUid = new Map(workbenchRows.map((row: WorkbenchProject) => [row.pUid, row]));

    const items = libRows.map((row) => {
      const adopted = workbenchByUid.get(row.p_uid);
      return toFundItem({
        pUid: row.p_uid,
        projectCode: String(row.lib_project_code ?? ''),
        projectName: String(row.pj_name ?? ''),
        district: String(row.dist ?? ''),
        renewalAreaName: String(row.area_name ?? ''),
        renewalAreaBatch: String(row.batch ?? ''),
        fiveReformType: String(row.wg_big ?? ''),
        projectAffiliation: String(row.project_affiliation ?? ''),
        investEstimate: Number(row.inv_bil ?? 0),
        yearPlanInvest: Number(adopted?.yearPlanInvest ?? 0),
        constructionStage: adopted?.constructionStage,
        planStartDate: adopted?.planStartDate ?? '',
        planCompletionDate: adopted?.planCompletionDate ?? '',
      });
    });
    const seen = new Set(items.map((item) => item.pUid));
    for (const row of workbenchRows.filter((item) => item.adoptStatus === '已采纳')) {
      if (seen.has(row.pUid)) continue;
      items.push(
        toFundItem({
          pUid: row.pUid,
          projectCode: row.projectCode,
          projectName: row.projectName,
          district: row.district,
          renewalAreaName: row.renewalAreaName,
          renewalAreaBatch: '',
          fiveReformType: row.fiveReformType,
          projectAffiliation: row.projectAffiliation,
          investEstimate: Number(row.investEstimate ?? 0),
          yearPlanInvest: Number(row.yearPlanInvest ?? 0),
          constructionStage: row.constructionStage,
          planStartDate: row.planStartDate ?? '',
          planCompletionDate: row.planCompletionDate ?? '',
        }),
      );
    }
    fundItemsCache = items;
  }
  return applyFill(fundItemsCache);
}

export type FundQuery = {
  projectName?: string;
  fiveReformType?: string;
  constructionStage?: string;
  fillStatus?: string;
};

function matchText(actual: string, query?: string) {
  return !query || actual.includes(query.trim());
}

export function filterFundItems(items: FundItem[], params: FundQuery): FundItem[] {
  return items.filter(
    (item) =>
      matchText(item.projectName, params.projectName) &&
      (!params.fiveReformType || item.fiveReformType === params.fiveReformType) &&
      (!params.constructionStage || item.constructionStage === params.constructionStage) &&
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
    fiveReformType: '老旧街区改造',
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
    fiveReformType: '老旧街区改造',
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
    fiveReformType: '老旧街区改造',
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
    fiveReformType: '老旧小区改造',
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
    fiveReformType: '老旧厂区改造',
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
    fiveReformType: '老旧街区改造',
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
    fiveReformType: '老旧厂区改造',
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
    fiveReformType: '老旧街区改造',
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
