/**
 * ifco —— 项目进展填报/统计：指标清单、类目、数据模型与汇总计算
 *
 * 纯假数据阶段：不发起任何接口请求，数据存模块级内存仓库（progressFillStore，
 * 填报页与统计页共享同一份假数据；后端接入后整体替换为接口读写）。
 * 指标清单源自《字段.csv》：23 行，缩进 = 层级 × 4 个全角空格（保留在名称串内），
 * 指标代码：r2~r21 = 101~120 连续，r23 = 121；r1（项目总投资）与 r22（来源）无代码。
 *
 * 汇总口径：
 * - 编号行（1./2./3.、（1）～（5））与「合计中：」引导的行计入上级求和；
 * - 「其中：」且无编号的行（其中：本年新开工、其中：金融机构信贷资金）为参考子集，可填但不参与求和；
 * - 汇总行共 4 行：本年实际到位资金 / 1.国家预算资金 / （1）中央预算资金 / 2.社会资本；
 * - 「城市更新项目总数」为 count 行：不可填写，各项目列单元格留空，合计 = 项目列数；
 * - 「新增就业岗位」为 total 行：各项目单元格不填值，合计值在填报页通过指标名称旁的
 *   「编辑」按钮以 Modal 直接录入；总览 = 各类目（叶子）录入值之总计。
 */

import { reactive } from 'vue';

/** 指标行类型：fill=直接填报叶子行；sum=自动汇总行（不可编辑）；text=文字说明行；
 *  count=项目数自动行（合计=列数）；total=合计级录入行（单元格不填，合计直接录入） */
export type IndicatorKind = 'fill' | 'sum' | 'text' | 'count' | 'total';

/** 指标（表格行）定义 */
export type IndicatorDef = {
  /** 稳定 key（r1～r23，对应《字段.csv》行序） */
  key: string;
  /** 指标名称（含层级缩进：层级 × 4 个全角空格；「其中：/合计中：」前缀保留在名称内） */
  name: string;
  /** 计量单位 */
  unit: string;
  /** 指标代码（r2~r21=101~120、r23=121；r1/r22 无代码） */
  code: string;
  /** 行类型 */
  kind: IndicatorKind;
  /** 汇总构成子行（仅 kind=sum；「其中：」参考行不进入任何 parts） */
  parts?: string[];
};

/** 填报类目：一级类目，嵌套类目（老旧街区、老旧厂区、城中村等更新改造）含二级 */
export type CategoryDef = {
  key: string;
  label: string;
  children?: CategoryDef[];
};

/** 项目列（表格列） */
export type ProjectColumn = {
  key: string;
  name: string;
  /** 是否为「带入上一季度」生成的列（二三四季度不可删除，一季度带入的可删除） */
  imported: boolean;
  /** 单元格值：指标 key → 数值（text 行为字符串；无值 = 未填） */
  values: Record<string, number | string>;
};

/** 单个叶子类目的填报数据 */
export type TabFillData = {
  projects: ProjectColumn[];
  /** 合计级录入行（total，如新增就业岗位）：指标 key → 直接录入的合计值 */
  totals: Record<string, number>;
};

/** 单个报送单位在一个周期内全部叶子类目的数据 */
export type PeriodFillData = Record<string, TabFillData>;

/**
 * 全部数据：周期 key（`${year}-Q${quarter}`）→ 报送单位 → 周期数据。
 * 填报页只操作当前选中单位的数据；统计页按单位聚合。
 */
export type ProgressFillStore = Record<string, Record<string, PeriodFillData>>;

/** 层级缩进：空格数 */
const INDENT = (level: number) => '\u3000'.repeat(level);

function indicator(
  key: string,
  indent: number,
  name: string,
  unit: string,
  code = '',
  kind: IndicatorKind = 'fill',
  parts?: string[],
): IndicatorDef {
  return { key, name: `${INDENT(indent)}${name}`, unit, code, kind, parts };
}

/**
 * 指标清单（行序与《字段.csv》一致）。
 * 指标代码：r2~r21 = 101~120 连续；r23 = 121；r1（项目总投资）与 r22（来源）无代码。
 */
export const INDICATORS: IndicatorDef[] = [
  indicator('r1', 0, '项目总投资', '万元'),
  indicator('r2', 0, '城市更新项目总数', '个', '101', 'count'),
  indicator('r3', 4, '其中：本年新开工', '个', '102'),
  indicator('r4', 0, '本年完成投资额', '万元', '103'),
  indicator('r5', 0, '本年实际到位资金', '万元', '104', 'sum', ['r6', 'r16', 'r21']),
  indicator('r6', 4, '合计中：1.国家预算资金', '万元', '105', 'sum', [
    'r7',
    'r12',
    'r13',
    'r14',
    'r15',
  ]),
  indicator('r7', 8, '其中：（1）中央预算资金', '万元', '106', 'sum', ['r8', 'r9', 'r10', 'r11']),
  indicator('r8', 14, '合计中：中央预算内投资', '万元', '107'),
  indicator('r9', 18, '其他中央财政资金', '万元', '108'),
  indicator('r10', 18, '国债（增发国债）', '万元', '109'),
  indicator('r11', 18, '超长期特别国债', '万元', '110'),
  indicator('r12', 11, '（2）省级预算资金', '万元', '111'),
  indicator('r13', 11, '（3）市级及以下预算资金', '万元', '112'),
  indicator('r14', 11, '（4）地方政府一般债券', '万元', '113'),
  indicator('r15', 11, '（5）地方政府专项债券', '万元', '114'),
  indicator('r16', 4, '2.社会资本', '万元', '115', 'sum', ['r17', 'r18', 'r19']),
  indicator('r17', 8, '其中：（1）产权单位出资', '万元', '116'),
  indicator('r18', 11, '（2）规模化实施运营主体出资', '万元', '117'),
  indicator('r19', 11, '（3）居民出资', '万元', '118'),
  indicator('r20', 8, '其中：金融机构信贷资金', '万元', '119'),
  indicator('r21', 4, '3.其他本年实际到位资金（应注明来源）', '万元', '120'),
  indicator('r22', 5, '其他本年实际到位资金的来源', '', '', 'text'),
  indicator('r23', 0, '新增就业岗位', '个', '121', 'total'),
];

export const INDICATOR_MAP: Record<string, IndicatorDef> = Object.fromEntries(
  INDICATORS.map((item) => [item.key, item]),
);

/** 一级类目（第一项为只读的总览） */
export const CATEGORIES: CategoryDef[] = [
  { key: 'overview', label: '总览' },
  { key: 'existing-building', label: '既有建筑改造利用' },
  { key: 'old-community', label: '城镇老旧小区整治改造' },
  { key: 'complete-community', label: '完整社区建设' },
  {
    key: 'renewal-complex',
    label: '老旧街区、老旧厂区、城中村等更新改造',
    children: [
      { key: 'old-street', label: '老旧街区更新改造' },
      { key: 'old-factory', label: '老旧厂区更新改造' },
      { key: 'urban-village', label: '城中村改造' },
    ],
  },
  { key: 'city-function', label: '城市功能完善' },
  { key: 'city-infrastructure', label: '城市基础设施建设改造' },
  { key: 'ecological-restoration', label: '城市生态修复' },
  { key: 'historical-culture', label: '城市历史文化保护传承' },
];

export const CATEGORY_MAP: Record<string, CategoryDef> = Object.fromEntries(
  CATEGORIES.flatMap((cat) => [cat, ...(cat.children ?? [])].map((item) => [item.key, item])),
);

/** 除总览外的全部一级类目（总览聚合、导出分组用） */
export const DATA_CATEGORIES = CATEGORIES.filter((cat) => cat.key !== 'overview');

/** 叶子类目（实际持有项目列的 tab）：简单类目自身，嵌套类目的二级 */
export const LEAF_CATEGORIES: CategoryDef[] = DATA_CATEGORIES.flatMap((cat) => cat.children ?? [cat]);

/** 季度选项 */
export const QUARTER_OPTIONS = [
  { label: '一季度', value: '1' },
  { label: '二季度', value: '2' },
  { label: '三季度', value: '3' },
  { label: '四季度', value: '4' },
];

/** 项目报送单位：武汉市各行政区（与体检模块 ADMIN_DIVISIONS 同口径，假数据阶段仅作筛选条件） */
export const REPORT_UNITS = [
  '江岸区',
  '江汉区',
  '硚口区',
  '汉阳区',
  '武昌区',
  '青山区',
  '洪山区',
  '东西湖区',
  '蔡甸区',
  '江夏区',
  '黄陂区',
  '新洲区',
  '汉南区',
] as const;

const QUARTER_LABELS: Record<string, string> = {
  '1': '一季度',
  '2': '二季度',
  '3': '三季度',
  '4': '四季度',
};

export function quarterLabel(quarter: string): string {
  return QUARTER_LABELS[quarter] ?? quarter;
}

/** 周期 key：`${year}-Q${quarter}` */
export function toPeriodKey(year: number | string, quarter: string): string {
  return `${year}-Q${quarter}`;
}

/** 上一周期：一季度回到上一年四季度 */
export function prevPeriod(year: number, quarter: string): { year: number; quarter: string } {
  return quarter === '1' ? { year: year - 1, quarter: '4' } : { year, quarter: String(Number(quarter) - 1) };
}

/** 示例项目列名（每个叶子类目预置 20 列） */
export const SAMPLE_PROJECT_NAMES = [
  'A1',
  'A2',
  'A3',
  'B1',
  'B2',
  'B3',
  'C1',
  'C2',
  'C3',
  'D1',
  'D2',
  'D3',
  'E1',
  'E2',
  'E3',
  'F1',
  'F2',
  'F3',
  'G1',
  'G2',
];

/** 文字行（其他本年实际到位资金的来源）的示例取值 */
const SAMPLE_SOURCES = ['企业自筹为主', '银行贷款为主', '市区两级财政配套', '专项债券为主', '社会资本投入为主'];

/** 数值行示例值区间 [min, max]（万元 / 个） */
const SAMPLE_RANGES: Record<string, [number, number]> = {
  r1: [800, 52000],
  r3: [0, 1],
  r4: [200, 16000],
  r8: [100, 8000],
  r9: [50, 3000],
  r10: [0, 5000],
  r11: [0, 4000],
  r12: [100, 6000],
  r13: [100, 6000],
  r14: [0, 4000],
  r15: [0, 8000],
  r17: [100, 5000],
  r18: [100, 8000],
  r19: [0, 2000],
  r20: [0, 6000],
  r21: [0, 4000],
  r23: [5, 300],
};

/** FNV-1a 字符串哈希：让示例值随（类目,项目,指标）确定生成、每次渲染不变 */
function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function sampleCellValue(tabKey: string, columnKey: string, item: IndicatorDef): number | string {
  const seed = hashSeed(`${tabKey}|${columnKey}|${item.key}`);
  if (item.kind === 'text') {
    return SAMPLE_SOURCES[seed % SAMPLE_SOURCES.length];
  }
  const [min, max] = SAMPLE_RANGES[item.key] ?? [0, 100];
  if (min === max) return min;
  // 万元行取整十，观感更接近真实投资数
  const value = min + (seed % (max - min + 1));
  return item.unit === '万元' ? value - (value % 10) : value;
}

export function createSampleProjects(tabKey: string): ProjectColumn[] {
  return SAMPLE_PROJECT_NAMES.map((name) => {
    const key = `${tabKey}-${name}`;
    const values: Record<string, number | string> = {};
    for (const item of INDICATORS) {
      // sum/count 为自动行,不存填报值
      if (item.kind !== 'fill' && item.kind !== 'text') continue;
      values[item.key] = sampleCellValue(tabKey, key, item);
    }
    return { key, name, imported: false, values };
  });
}

/** 新周期的初始数据：每个叶子类目 20 列示例项目 + 合计级录入行示例值 */
export function createPeriodData(): PeriodFillData {
  const data: PeriodFillData = {};
  for (const leaf of LEAF_CATEGORIES) {
    data[leaf.key] = {
      projects: createSampleProjects(leaf.key),
      totals: createSampleTotals(leaf.key),
    };
  }
  return data;
}

/** 合计级录入行(total)的示例值：新增就业岗位按叶子类目给一个个位数~三百的数 */
function createSampleTotals(tabKey: string): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const item of INDICATORS) {
    if (item.kind !== 'total') continue;
    totals[item.key] = Number(sampleCellValue(tabKey, `${tabKey}-total`, item));
  }
  return totals;
}

// ── 内存假数据仓库（模块级单例，填报页与统计页共享；后端接入后整体替换） ──
export const progressFillStore: ProgressFillStore = reactive({});

/** 取某周期某报送单位的数据（懒初始化：首次访问生成 20 列示例数据） */
export function ensureUnitPeriodData(periodKey: string, unit: string): PeriodFillData {
  if (!progressFillStore[periodKey]) {
    progressFillStore[periodKey] = {};
  }
  if (!progressFillStore[periodKey]![unit]) {
    progressFillStore[periodKey]![unit] = createPeriodData();
  }
  return progressFillStore[periodKey]![unit];
}

/** 只读取某周期某报送单位的数据（不触发懒初始化） */
export function getUnitPeriodData(periodKey: string, unit: string): PeriodFillData | undefined {
  return progressFillStore[periodKey]?.[unit];
}

/**
 * 单元格取值：汇总行 = 构成子行递归求和；count/total 行不落单元格（返回 undefined）；
 * 填报行 = 已填值（未填返回 undefined）。
 */
export function cellValue(item: IndicatorDef, column: ProjectColumn): number | string | undefined {
  if (item.kind === 'sum') {
    let sum = 0;
    for (const partKey of item.parts ?? []) {
      const part = INDICATOR_MAP[partKey];
      const value = part ? cellValue(part, column) : undefined;
      if (typeof value === 'number') sum += value;
    }
    return sum;
  }
  if (item.kind === 'count' || item.kind === 'total') return undefined;
  const value = column.values[item.key];
  return value === undefined || value === '' ? undefined : value;
}

/**
 * 一行指标在某叶子类目上的「合计」：
 * total 行 = 直接录入的合计值（各项目单元格不填值）；
 * count 行 = 项目列数；text 行无合计（undefined）；其余 = 各列数值之和。
 */
export function tabTotal(item: IndicatorDef, tab: TabFillData | undefined): number | undefined {
  if (item.kind === 'total') return tab?.totals[item.key];
  if (item.kind === 'count') return tab?.projects.length ?? 0;
  if (item.kind === 'text') return undefined;
  let sum = 0;
  for (const column of tab?.projects ?? []) {
    const value = cellValue(item, column);
    if (typeof value === 'number') sum += value;
  }
  return sum;
}

/** 单个单位总览的总计：各叶子类目合计之和（text 行无总计） */
export function grandTotal(item: IndicatorDef, periodData: PeriodFillData | undefined): number | undefined {
  if (item.kind === 'text') return undefined;
  let sum = 0;
  for (const leaf of LEAF_CATEGORIES) {
    const value = tabTotal(item, periodData?.[leaf.key]);
    if (typeof value === 'number') sum += value;
  }
  return sum;
}

// ── 统计页聚合口径：把一批报送单位的数据相加 ──────────────────────────

/** 统计口径：一批单位聚合后，某指标在某叶子类目上的合计（text 行恒为空） */
export function tabTotalOfUnits(
  item: IndicatorDef,
  units: PeriodFillData[],
  leafKey: string,
): number | undefined {
  if (item.kind === 'text') return undefined;
  let sum = 0;
  for (const data of units) {
    const value = tabTotal(item, data[leafKey]);
    if (typeof value === 'number') sum += value;
  }
  return sum;
}

/** 统计口径：一批单位聚合后的总计（text 行恒为空） */
export function grandTotalOfUnits(item: IndicatorDef, units: PeriodFillData[]): number | undefined {
  if (item.kind === 'text') return undefined;
  let sum = 0;
  for (const data of units) {
    const value = grandTotal(item, data);
    if (typeof value === 'number') sum += value;
  }
  return sum;
}
