/**
 * ifco —— 投融资管理（接口层）
 *
 * 菜单三级：资金分类管理（列表+填报抽屉）/ 项目资金管理（区划·片区·项目三形态汇总）/
 * 资金统计分析（行政区投资进度·到位率柱线图 + 到位资金分类·五改总投资饼图 +
 * 资金流向桑基图）。资金分类行集 = 实施库项目 ∪ 最新年度任务已采纳项目
 * （拼装自 project-library/compilation 接口，会话缓存一次）；填报保存走会话内存
 * 登记（资金后端未接入，刷新即恢复）；行政区/五改类别/片区批次/项目归属枚举复用
 * project-library 口径；金额累加走 number-precision。
 */
import NP from 'number-precision';
import dayjs from 'dayjs';
import { defHttp } from '@jeesite/core/utils/http/axios';
import { useGlobSetting } from '@jeesite/core/hooks/setting';
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
import { fetchMonthlyRows, orientationLabel } from '@jeesite/ifco/api/ifco/impl-progress';
import { unwrap } from '../progress-fill';

const { adminPath } = useGlobSetting();

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
    unit: '亿元',
    code: '104',
    autoOf: ['r105', 'r115', 'r120'],
    note: '自动计算，104=105+115+120',
  },
  {
    key: 'r105',
    name: '合计中：1.国家预算资金',
    indent: 2,
    unit: '亿元',
    code: '105',
    autoOf: ['r106', 'r111', 'r112', 'r113', 'r114'],
    note: '自动计算，105=106+111+112+113+114',
  },
  {
    key: 'r106',
    name: '其中：（1）中央预算资金',
    indent: 7,
    unit: '亿元',
    code: '106',
    autoOf: ['r107', 'r108', 'r109', 'r110'],
    note: '自动计算，106=107+108+109+110',
  },
  { key: 'r107', name: '合计中：中央预算内投资', indent: 12, unit: '亿元', code: '107' },
  { key: 'r108', name: '其他中央财政资金', indent: 16, unit: '亿元', code: '108' },
  { key: 'r109', name: '国债（增发国债）', indent: 16, unit: '亿元', code: '109' },
  { key: 'r110', name: '超长期特别国债', indent: 16, unit: '亿元', code: '110' },
  { key: 'r111', name: '（2）省级预算资金', indent: 10, unit: '亿元', code: '111' },
  {
    key: 'r112',
    name: '（3）市级及以下预算资金',
    indent: 10,
    unit: '亿元',
    code: '112',
    autoOf: ['cityBudget', 'districtBudget'],
    note: '自动计算，112=市级预算资金+区级预算资金',
  },
  { key: 'cityBudget', name: '合计中：市级预算资金', indent: 12, unit: '亿元', code: '' },
  { key: 'districtBudget', name: '区级预算资金', indent: 16, unit: '亿元', code: '' },
  { key: 'r113', name: '（4）地方政府一般债券', indent: 10, unit: '亿元', code: '113' },
  { key: 'r114', name: '（5）地方政府专项债券', indent: 10, unit: '亿元', code: '114' },
  {
    key: 'r115',
    name: '2.社会资本',
    indent: 6,
    unit: '亿元',
    code: '115',
    autoOf: ['r116', 'r117', 'r118'],
    note: '自动计算，115=116+117+118',
  },
  { key: 'r116', name: '其中：（1）产权单位出资', indent: 7, unit: '亿元', code: '116' },
  { key: 'r117', name: '（2）规模化实施运营主体出资', indent: 10, unit: '亿元', code: '117' },
  { key: 'r118', name: '（3）居民出资', indent: 10, unit: '亿元', code: '118' },
  { key: 'r119', name: '其中：金融机构信贷资金', indent: 7, unit: '亿元', code: '119' },
  { key: 'finFunds', name: '包含：金融机构资金', indent: 10, unit: '亿元', code: '' },
  { key: 'policyToolFunds', name: '政策金融工具资金', indent: 13, unit: '亿元', code: '' },
  { key: 'creditedFunds', name: '已授信金融资金', indent: 13, unit: '亿元', code: '' },
  { key: 'loanedFunds', name: '已放款金融资金', indent: 13, unit: '亿元', code: '' },
  { key: 'r120', name: '3.其他本年实际到位资金（应注明来源）', indent: 6, unit: '亿元', code: '120' },
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
  /** 投资纳统金额（亿元，手填；字段名沿用 statInvestWan 存量契约） */
  statInvestWan?: number;
  /** 项目资金缺口（亿元） */
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

// ── 项目资金管理 · 区划汇总（资金组合查询，真实口径） ────────────────

/** 统计期起始月份下限（业务口径：统计自 2026 年 10 月起，开始月份选择器同此限制） */
export const PORTFOLIO_START_MONTH = '2026-10';

/** 资金组合查询 · 项目指标快照（区划/片区/项目汇总的数据底座，会话缓存一次；采纳/填报变更刷新页面生效） */
export type PortfolioProject = {
  pUid: string;
  projectCode: string;
  projectName: string;
  district: string;
  /** 片区名称（实施库 area_name；空=片区外零星项目，不进片区汇总） */
  renewalAreaName: string;
  /** 片区批次（实施库 batch；片区行元数据兜底用，优先取策划方案） */
  renewalAreaBatch: string;
  /** 五改分类（实施库 wg_big 代码，展示经 fiveReformLabel 转中文） */
  fiveReformType: string;
  /** 项目归属（实施库 project_affiliation 代码 market/district/scattered） */
  projectAffiliation: string;
  /** 项目投资估算（亿元，实施库 inv_bil） */
  investEstimate: number;
  /** 本年度计划完成投资（亿元，年度计划编制已采纳行） */
  yearPlanInvest: number;
  /** 入库月份（YYYY-MM；缺入库时间视为已在库；在库项目数量按「入库月 ≤ 结束月」随统计期变化） */
  inLibraryMonth: string;
  /** 本年度累计完成投资（亿元，最新一次月度进度填报） */
  yearAccumulatedInvest: number;
  /** 逐月当月完成投资（YYYY-MM → 亿元；月度填报逐月暂存值，统计周期内加和用） */
  monthlyInvest: Record<string, number>;
  /** 逐月实际到位资金（YYYY-MM → 亿元；资金填报 r104 当月值=各子项自动求和） */
  monthlyArrived: Record<string, number>;
};

/** 区划汇总统计行（列口径见项目资金管理 list.vue 列定义） */
export type DistrictFundStatRow = {
  district: string;
  /** 在库项目数量（随统计期变化：入库月 ≤ 结束月） */
  projectCount: number;
  totalInvest: number;
  yearPlanInvest: number;
  yearAccumulatedInvest: number;
  /** 年度投资进度 = 本年度累计完成投资/本年度计划完成投资（%） */
  yearProgressRate: number;
  periodCompletedInvest: number;
  yearArrivedFunds: number;
  periodArrivedFunds: number;
  /** 年度资金到位率 = 本年度累计实际到位资金/本年度计划完成投资（%） */
  yearArrivalRate: number;
};

/** 枚举 [from, to] 闭区间月份（YYYY-MM；非法区间返回空） */
function enumerateMonths(from: string, to: string): string[] {
  if (!/^\d{4}-\d{2}$/.test(from) || !/^\d{4}-\d{2}$/.test(to) || from > to) return [];
  const months: string[] = [];
  let [year, month] = from.split('-').map(Number);
  const [endYear, endMonth] = to.split('-').map(Number);
  while (year < endYear || (year === endYear && month <= endMonth)) {
    months.push(`${year}-${String(month).padStart(2, '0')}`);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return months;
}

/** 资金组合查询项目集：既在实施库、且最新年度计划已采纳（交集）；
 *  逐月完成取月度填报 monthEntries、逐月到位取资金填报登记 r104 */
let portfolioCache: PortfolioProject[] | null = null;

async function fetchPortfolioProjects(): Promise<PortfolioProject[]> {
  if (portfolioCache) return portfolioCache;
  const [libRows, tasks, monthlyRows] = await Promise.all([
    fetchAllImplementingRows(),
    fetchCompileTasks(),
    fetchMonthlyRows(),
  ]);
  const task = tasks[0];
  const workbenchRows = task ? ((await fetchWorkbenchRows(task.code)) ?? []) : [];
  const adoptedByUid = new Map(
    workbenchRows.filter((row) => row.adoptStatus === '已采纳').map((row) => [row.pUid, row]),
  );
  const monthlyByCode = new Map(monthlyRows.map((row) => [row.projectCode, row]));
  portfolioCache = libRows
    .filter((row) => adoptedByUid.has(row.p_uid))
    .map((row) => {
      const adopted = adoptedByUid.get(row.p_uid)!;
      const monthly = monthlyByCode.get(String(row.lib_project_code ?? ''));
      const reportYear = String(monthly?.reportMonth ?? '').slice(0, 4) || String(new Date().getFullYear());
      const monthlyInvest: Record<string, number> = {};
      for (const [month, entry] of Object.entries(monthly?.monthEntries ?? {})) {
        const monthInvest = entry?.monthCompletedInvest;
        if (monthInvest != null) {
          monthlyInvest[`${reportYear}-${String(month).padStart(2, '0')}`] = monthInvest;
        }
      }
      const monthlyArrived: Record<string, number> = {};
      for (const [month, monthValues] of Object.entries(fundFillStore.get(row.p_uid)?.values ?? {})) {
        monthlyArrived[month] = autoValueOf('r104', monthValues);
      }
      return {
        pUid: row.p_uid,
        projectCode: String(row.lib_project_code ?? ''),
        projectName: String(row.pj_name ?? ''),
        district: String(row.dist ?? ''),
        renewalAreaName: String(row.area_name ?? ''),
        renewalAreaBatch: String(row.batch ?? ''),
        fiveReformType: String(row.wg_big ?? ''),
        projectAffiliation: String(row.project_affiliation ?? ''),
        investEstimate: Number(row.inv_bil ?? 0),
        yearPlanInvest: Number(adopted.yearPlanInvest ?? 0),
        inLibraryMonth: (adopted.inLibraryDate ?? '').slice(0, 7) || '0000-01',
        yearAccumulatedInvest: monthly?.yearAccumulatedInvest ?? 0,
        monthlyInvest,
        monthlyArrived,
      };
    });
  return portfolioCache;
}

/** 统计期与当年月份口径归一（缺省统计期=[2026-10, 当前月]；当前月早于下限取下限；起大于止取单月下限） */
function portfolioPeriod(startMonth: string, endMonth: string) {
  const now = dayjs().format('YYYY-MM');
  const end =
    endMonth && /^\d{4}-\d{2}$/.test(endMonth) ? endMonth : now > PORTFOLIO_START_MONTH ? now : PORTFOLIO_START_MONTH;
  const start =
    startMonth && /^\d{4}-\d{2}$/.test(startMonth) && startMonth >= PORTFOLIO_START_MONTH
      ? startMonth
      : PORTFOLIO_START_MONTH;
  const year = now.slice(0, 4);
  return {
    end,
    periodMonths: enumerateMonths(start, end > start ? end : start),
    yearMonths: enumerateMonths(`${year}-01`, `${year}-12`),
  };
}

/** 逐月数值按月份清单加和（金额走 NP 规避浮点尾差） */
function sumOf(values: Record<string, number>, months: string[]): number {
  return NP.round(
    months.reduce((sum, month) => NP.plus(sum, values[month] ?? 0), 0),
    2,
  );
}

/** 项目清单按取值函数加和 */
function sumBy(list: PortfolioProject[], pick: (project: PortfolioProject) => number): number {
  return NP.round(
    list.reduce((sum, project) => NP.plus(sum, pick(project)), 0),
    2,
  );
}

/** 在库项目数量口径：入库月 ≤ 结束月（随统计期变化） */
function projectCountInPeriod(list: PortfolioProject[], end: string): number {
  return list.filter((project) => project.inLibraryMonth <= end).length;
}

/** 区划/片区汇总共用的金额与两率口径（不随统计期变化列 + 统计期逐月加和列） */
function portfolioMetrics(list: PortfolioProject[], periodMonths: string[], yearMonths: string[]) {
  const yearPlan = sumBy(list, (project) => project.yearPlanInvest);
  const yearCompleted = sumBy(list, (project) => project.yearAccumulatedInvest);
  const yearArrived = sumBy(list, (project) => sumOf(project.monthlyArrived, yearMonths));
  const percent = (value: number) => (yearPlan ? Math.round(NP.times(NP.divide(value, yearPlan), 100)) : 0);
  return {
    yearPlanInvest: yearPlan,
    yearAccumulatedInvest: yearCompleted,
    yearProgressRate: percent(yearCompleted),
    periodCompletedInvest: sumBy(list, (project) => sumOf(project.monthlyInvest, periodMonths)),
    yearArrivedFunds: yearArrived,
    periodArrivedFunds: sumBy(list, (project) => sumOf(project.monthlyArrived, periodMonths)),
    yearArrivalRate: percent(yearArrived),
  };
}

/**
 * 区划汇总统计（含末行全市合计，行政区按 DISTRICTS 序、未知区置尾）。
 * 口径：在库项目数量随统计期变化（入库月 ≤ 结束月）；总投资=实施库投资估算加和；
 * 其余金额与两率见 portfolioMetrics（本年度口径不随统计期变化，统计周期内两列随期逐月加和）。
 */
export async function fetchDistrictFundStats(startMonth: string, endMonth: string): Promise<DistrictFundStatRow[]> {
  const projects = await fetchPortfolioProjects();
  const { end, periodMonths, yearMonths } = portfolioPeriod(startMonth, endMonth);

  const buildRow = (district: string, list: PortfolioProject[]): DistrictFundStatRow => ({
    district,
    projectCount: projectCountInPeriod(list, end),
    totalInvest: sumBy(list, (project) => project.investEstimate),
    ...portfolioMetrics(list, periodMonths, yearMonths),
  });

  const groups = new Map<string, PortfolioProject[]>();
  for (const project of projects) {
    const list = groups.get(project.district) ?? [];
    list.push(project);
    groups.set(project.district, list);
  }
  const rows = [...groups.entries()]
    .sort((a, b) => {
      const districtOrder = DISTRICTS as readonly string[];
      const indexA = districtOrder.indexOf(a[0]);
      const indexB = districtOrder.indexOf(b[0]);
      return (indexA === -1 ? districtOrder.length : indexA) - (indexB === -1 ? districtOrder.length : indexB);
    })
    .map(([district, list]) => buildRow(district, list));
  rows.push(buildRow('全市合计', projects));
  return rows;
}

// ── 片区汇总（真实口径；片区元数据与总体投资估算取自策划方案填报） ──

/** 策划方案片区行（编号/批次/功能定位/总体投资估算来源；接口 /esp/schemeFill/page） */
type SchemeAreaRow = {
  code: string;
  name: string;
  district: string;
  batch: string;
  funcTypes: string[];
  invest: number | null;
};

let schemeAreasCache: SchemeAreaRow[] | null = null;

/** 策划方案片区行集（已批准+待审查两页签合并，会话缓存一次） */
async function fetchSchemeAreas(): Promise<SchemeAreaRow[]> {
  if (schemeAreasCache) return schemeAreasCache;
  const fetchPage = (isApprove: '1' | '2') =>
    unwrap<{ total: number; list: SchemeAreaRow[] }>(
      defHttp.get({ url: adminPath + '/esp/schemeFill/page', params: { isApprove, pageNum: 1, pageSize: 200 } }),
    );
  const [approved, pending] = await Promise.all([fetchPage('1'), fetchPage('2')]);
  schemeAreasCache = [...(approved?.list ?? []), ...(pending?.list ?? [])];
  return schemeAreasCache;
}

/** 片区汇总统计行（列口径见项目资金管理 list.vue 列定义） */
export type AreaFundStatRow = {
  /** 片区编号（策划方案 code；无方案为空） */
  areaCode: string;
  district: string;
  renewalAreaName: string;
  renewalAreaBatch: string;
  /** 片区功能定位（方案代码经 orientationLabel 转中文顿号拼接；无方案为空） */
  orientation: string;
  /** 项目数量（随统计期变化：片区内入库月 ≤ 结束月的项目数） */
  projectCount: number;
  /** 片区总体投资估算（亿元，策划方案填报 invest，片区口径非项目加和；无方案为 0） */
  areaTotalInvest: number;
  yearPlanInvest: number;
  yearAccumulatedInvest: number;
  yearProgressRate: number;
  periodCompletedInvest: number;
  yearArrivedFunds: number;
  periodArrivedFunds: number;
  yearArrivalRate: number;
};

/**
 * 片区汇总统计（仅含有关联项目的片区，按片区编号排序、无编号置尾）。
 * 片区外零星项目（无片区名）不进片区汇总；片区元数据（编号/行政区/批次/功能定位）
 * 与总体投资估算取自策划方案填报，方案缺项回退项目行值。
 */
export async function fetchAreaFundStats(startMonth: string, endMonth: string): Promise<AreaFundStatRow[]> {
  const [projects, schemes] = await Promise.all([fetchPortfolioProjects(), fetchSchemeAreas()]);
  const { end, periodMonths, yearMonths } = portfolioPeriod(startMonth, endMonth);
  const schemeByName = new Map(schemes.map((scheme) => [scheme.name, scheme]));

  const groups = new Map<string, PortfolioProject[]>();
  for (const project of projects) {
    if (!project.renewalAreaName) continue;
    const list = groups.get(project.renewalAreaName) ?? [];
    list.push(project);
    groups.set(project.renewalAreaName, list);
  }
  return [...groups.entries()]
    .map(([areaName, list]) => {
      const scheme = schemeByName.get(areaName);
      const fallbackDistrict = list[0]?.district ?? '';
      return {
        areaCode: scheme?.code ?? '',
        district: scheme?.district || fallbackDistrict,
        renewalAreaName: areaName,
        renewalAreaBatch: scheme?.batch || list[0]?.renewalAreaBatch || '',
        orientation: (scheme?.funcTypes ?? []).map((type) => orientationLabel(type)).join('、'),
        projectCount: projectCountInPeriod(list, end),
        areaTotalInvest: Number(scheme?.invest ?? 0),
        ...portfolioMetrics(list, periodMonths, yearMonths),
      } satisfies AreaFundStatRow;
    })
    .sort((a, b) => a.areaCode.localeCompare(b.areaCode));
}

// ── 项目汇总（真实口径；一行一项目，片区总体投资估算取所属片区策划方案值） ──

/** 项目汇总统计行（列口径见项目资金管理 list.vue 列定义） */
export type ProjectFundStatRow = {
  pUid: string;
  projectCode: string;
  projectName: string;
  district: string;
  renewalAreaName: string;
  renewalAreaBatch: string;
  fiveReformType: string;
  projectAffiliation: string;
  /** 片区总体投资估算（亿元，项目所属片区的策划方案 invest；无片区/无方案为 0） */
  areaTotalInvest: number;
  /** 项目投资估算（亿元，实施库 inv_bil） */
  projectInvestEstimate: number;
  yearPlanInvest: number;
  yearAccumulatedInvest: number;
  yearProgressRate: number;
  periodCompletedInvest: number;
  yearArrivedFunds: number;
  periodArrivedFunds: number;
  yearArrivalRate: number;
};

/**
 * 项目汇总统计（一行一项目，按项目编号排序）。统计对象与区划/片区一致
 * （实施库 ∩ 最新年度计划已采纳）；片区总体投资估算=所属片区策划方案值，
 * 片区批次优先取方案值；金额与两率口径见 portfolioMetrics。
 */
export async function fetchProjectFundStats(startMonth: string, endMonth: string): Promise<ProjectFundStatRow[]> {
  const [projects, schemes] = await Promise.all([fetchPortfolioProjects(), fetchSchemeAreas()]);
  const { periodMonths, yearMonths } = portfolioPeriod(startMonth, endMonth);
  const schemeByName = new Map(schemes.map((scheme) => [scheme.name, scheme]));
  return projects
    .map((project) => {
      const scheme = project.renewalAreaName ? schemeByName.get(project.renewalAreaName) : undefined;
      return {
        pUid: project.pUid,
        projectCode: project.projectCode,
        projectName: project.projectName,
        district: project.district,
        renewalAreaName: project.renewalAreaName,
        renewalAreaBatch: scheme?.batch || project.renewalAreaBatch || '',
        fiveReformType: project.fiveReformType,
        projectAffiliation: project.projectAffiliation,
        areaTotalInvest: Number(scheme?.invest ?? 0),
        projectInvestEstimate: project.investEstimate,
        ...portfolioMetrics([project], periodMonths, yearMonths),
      } satisfies ProjectFundStatRow;
    })
    .sort((a, b) => a.projectCode.localeCompare(b.projectCode));
}

// ── 资金统计分析（图表聚合；行集与口径同资金分类管理） ──────────────

/**
 * 到位资金七分类（饼图/资金流向图的资金分类口径；key 对应 FUND_INDICATORS 行键，
 * 自动行（市级及以下预算资金/社会资本）经 autoValueOf 按子项求和）。
 */
export const FUND_CATEGORY_DEFS: { key: string; label: string }[] = [
  { key: 'r107', label: '中央预算内投资' },
  { key: 'r111', label: '省级预算资金' },
  { key: 'r112', label: '市级及以下预算资金' },
  { key: 'r113', label: '地方政府一般债券' },
  { key: 'r114', label: '地方政府专项债券' },
  { key: 'r115', label: '社会资本' },
  { key: 'r120', label: '其他资金' },
];

/** 本年度月份键清单（YYYY-MM × 12；到位资金分类统计的加和口径） */
function currentYearMonths(): string[] {
  const year = dayjs().format('YYYY');
  return enumerateMonths(`${year}-01`, `${year}-12`);
}

/**
 * 项目本年度实际到位资金分类统计（资金分类管理行集的资金填报逐月值，
 * 按本年度 12 个月加和；district 空=全市）。返回顺序同 FUND_CATEGORY_DEFS。
 */
export async function fetchFundCategoryStats(district: string): Promise<{ label: string; value: number }[]> {
  const items = (await fetchFundItems()).filter((item) => !district || item.district === district);
  const yearMonths = currentYearMonths();
  return FUND_CATEGORY_DEFS.map(({ key, label }) => ({
    label,
    value: NP.round(
      items.reduce(
        (sum, item) => NP.plus(sum, yearMonths.reduce((s, month) => NP.plus(s, autoValueOf(key, item.values[month] ?? {})), 0)),
        0,
      ),
      2,
    ),
  }));
}

/** 资金流向桑基图连线（source=资金分类，target=五改分类，value=统计期实际到位资金亿元） */
export type FundFlowLink = { source: string; target: string; value: number };

/**
 * 资金流向统计：资金分类 → 五改分类 的统计期实际到位资金（startMonth~endMonth 逐月加和；
 * district 空=全市；仅返回 value>0 的连线，资金分类顺序同 FUND_CATEGORY_DEFS）。
 */
export async function fetchFundFlowStats(
  startMonth: string,
  endMonth: string,
  district: string,
): Promise<FundFlowLink[]> {
  const items = (await fetchFundItems()).filter((item) => !district || item.district === district);
  const { periodMonths } = portfolioPeriod(startMonth, endMonth);
  const byPair = new Map<string, FundFlowLink>();
  for (const item of items) {
    const target = fiveReformLabel(item.fiveReformType);
    for (const { key, label } of FUND_CATEGORY_DEFS) {
      const value = periodMonths.reduce(
        (sum, month) => NP.plus(sum, autoValueOf(key, item.values[month] ?? {})),
        0,
      );
      if (!value) continue;
      const pairKey = `${label}|${target}`;
      const existed = byPair.get(pairKey);
      byPair.set(pairKey, {
        source: label,
        target,
        value: NP.round(NP.plus(existed?.value ?? 0, value), 2),
      });
    }
  }
  return [...byPair.values()];
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

// ══════════════════════ 区划汇总趋势图（演示数据） ══════════════════════

/** 统计区间各月 投资进度/资金到位率/月完成投资额（柱线混合图；项目资金管理·查看趋势图） */
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
