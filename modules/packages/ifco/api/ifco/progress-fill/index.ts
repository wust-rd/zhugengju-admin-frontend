/**
 * ifco —— 项目进展填报/统计：真实接口层（对接 modules/ifco 后端）
 *
 * 契约来源：《接口文档-项目进展填报.md》v4（zhugengju-admin-backend/modules/ifco/docs）。
 * - 字典（指标/类目/单位）进入页面时经 ensureProgressDicts() 拉取一次，写入下方
 *   模块级 reactive 常量（INDICATORS / CATEGORIES / UNITS ...），页面与导出按数组读取；
 * - 填报数据按「年份 × 季度 × 报送单位」整包加载（loadProgressFillData），
 *   保存按项目列颗粒度（saveProgressProject，值全量同步语义见文档 1.3）；
 * - 统计页直接渲染服务端算好的 loadProgressStatData，本地不再聚合；
 * - sum 汇总行 / count 项目数由前端实时计算展示（口径同后端，见 cellValue/tabTotal）。
 *
 * 指标名称缩进：接口 name 不含缩进，level 值 = 全角空格缩进数（已实测 r3=4、r8=14）。
 */

import { reactive, ref } from 'vue';
import { match } from 'ts-pattern';
import NP from 'number-precision';
import { defHttp } from '@jeesite/core/utils/http/axios';
import { useGlobSetting } from '@jeesite/core/hooks/setting';
import type { CategoryDef, ProjectColumn, TabFillData, PeriodFillData } from '../common';

// ── 与成效域共用：类目/单位/周期类型与工具 ─────────────────────────────
export type { CategoryDef, ProjectColumn, TabFillData, PeriodFillData } from '../common';
export { QUARTER_OPTIONS, quarterLabel } from '../common';

/** 指标行类型：fill=直接填报叶子行；sum=自动汇总行（不可编辑）；text=文字说明行；
 *  count=项目数自动行（合计=列数）；total=合计级录入行（单元格不填，合计直接录入） */
export type IndicatorKind = 'fill' | 'sum' | 'text' | 'count' | 'total';

/** 指标（表格行）定义（前端展示形态：name 已含缩进、code 空串、parts 仅 sum 行） */
export type IndicatorDef = {
  /** 稳定 key（r1～r23，对应官方报表行序） */
  key: string;
  /** 指标名称（含层级缩进：level × 全角空格；「其中：/合计中：」前缀保留在名称内） */
  name: string;
  /** 计量单位（无单位为空串） */
  unit: string;
  /** 指标代码（r2~r21=101~120、r23=121；r1/r22 无代码为空串） */
  code: string;
  /** 行类型 */
  kind: IndicatorKind;
  /** 汇总构成子行（仅 kind=sum；「其中：」参考行不进入任何 parts） */
  parts?: string[];
};

// ── 服务端 VO（接口返回的 data 形状） ────────────────────────────────

/** GET /dict/indicators 行 */
type IndicatorVo = {
  key: string;
  code: string | null;
  name: string;
  level: number;
  unit: string | null;
  kind: IndicatorKind;
  parts: string[] | null;
  sortNo: number;
};

/** GET /dict/categories 行（平铺：一级 + 二级紧随父） */
type CategoryVo = {
  key: string;
  name: string;
  parentKey: string | null;
  isLeaf: boolean;
  sortNo: number;
};

/** GET /dict/units 行 */
type UnitVo = { code: string; name: string; editable?: boolean };

/** GET /fill/data 的 data */
type FillDataVo = {
  year: string;
  quarter: string;
  unitCode: string;
  unitName: string | null;
  broughtIn: boolean;
  fillDate: string | null;
  tabs: Record<string, { projects: FillProjectVo[]; totals: Record<string, number> | null }>;
};

type FillProjectVo = {
  id: string;
  name: string;
  imported: boolean;
  createByName?: string | null;
  createDeptName?: string | null;
  createDate?: string | null;
  values: Record<string, number | string | null>;
};

/** GET /stat/data 的 data（一次返回全部可见口径：overview + 每单位一份） */
type StatDataVo = {
  year: string;
  quarter: string;
  allowedUnits: UnitVo[];
  categories: { key: string; name: string }[];
  overview: StatRowVo[];
  unitDatas: { code: string; name: string; rows: StatRowVo[] }[];
};

type StatRowVo = {
  key: string;
  code: string | null;
  name: string;
  level: number;
  unit: string | null;
  kind: IndicatorKind;
  grand: number | null;
  categories: Record<string, number | null>;
};

// ── 统一响应解包 ─────────────────────────────────────────────────────

/** ifco 接口统一响应体 {code, msg, data}；code=200 成功 */
type IfcoBody<T> = { code: number; msg: string; data: T };

const { adminPath } = useGlobSetting();
const BASE = adminPath + '/ifco/progress';

/** ifco 统一响应解包：非 200 抛 Error(msg)（成效域复用） */
export async function unwrap<T>(p: Promise<IfcoBody<T>>): Promise<T> {
  const res = await p;
  if (!res || typeof res.code !== 'number') {
    throw new Error('接口返回格式异常');
  }
  if (res.code !== 200) {
    throw new Error(res.msg || '请求失败');
  }
  return res.data;
}

// ── 字典状态（模块级单例，进入页面时加载一次） ────────────────────────

/** 指标清单（按官方报表行序；加载前为空数组） */
export const INDICATORS = reactive<IndicatorDef[]>([]);
/** 指标 key → 定义（加载前为空对象） */
export const INDICATOR_MAP = reactive<Record<string, IndicatorDef>>({});
/** 一级类目（第一项为只读总览；加载前为空数组） */
export const CATEGORIES = reactive<CategoryDef[]>([]);
/** 类目 key → 定义（含二级） */
export const CATEGORY_MAP = reactive<Record<string, CategoryDef>>({});
/** 除总览外的全部一级类目 */
export const DATA_CATEGORIES = reactive<CategoryDef[]>([]);
/** 叶子类目（实际持有项目列的 tab） */
export const LEAF_CATEGORIES = reactive<CategoryDef[]>([]);
/** 报送单位（已按数据权限过滤；value=单位编码） */
export const UNITS = reactive<UnitVo[]>([]);
/** 是否可「导出所有项目」（仅超管/综合协调组；来自 /dict/units 的 exportAll 标记） */
export const CAN_EXPORT_ALL_PROJECTS = ref(false);
/** 单位编码 → 名称 */
export const UNIT_NAME_MAP = reactive<Record<string, string>>({});

let dictsPromise: Promise<void> | undefined;

/** 指标 VO → 展示形态（name 拼缩进、code null→''、parts 仅 sum 行保留） */
function adaptIndicator(vo: IndicatorVo): IndicatorDef {
  return {
    key: vo.key,
    name: '\u3000'.repeat(vo.level || 0) + vo.name,
    unit: vo.unit ?? '',
    code: vo.code ?? '',
    kind: vo.kind,
    parts: vo.kind === 'sum' && vo.parts?.length ? [...vo.parts] : undefined,
  };
}

/** 平铺类目 VO → 树（「总览」为前端聚合概念，头部补齐） */
function adaptCategories(vos: CategoryVo[]): CategoryDef[] {
  type Node = CategoryDef & { sortNo: number };
  const byKey = new Map<string, Node>();
  for (const vo of vos) {
    byKey.set(vo.key, { key: vo.key, label: vo.name, sortNo: vo.sortNo });
  }
  const roots: Node[] = [];
  for (const vo of vos) {
    const node = byKey.get(vo.key)!;
    if (vo.parentKey && byKey.has(vo.parentKey)) {
      const parent = byKey.get(vo.parentKey)!;
      parent.children = parent.children ?? [];
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return [{ key: 'overview', label: '总览' }, ...roots];
}

/**
 * 拉取进展域字典（指标 + 类目 + 单位），写入模块级 reactive 常量。
 * 并发调用共享同一 Promise；已加载成功后直接返回。
 */
export async function ensureProgressDicts(): Promise<void> {
  if (dictsPromise) return dictsPromise;
  dictsPromise = (async () => {
    const [indicatorVos, categoryVos, unitBody] = await Promise.all([
      unwrap<IndicatorVo[]>(defHttp.get({ url: BASE + '/dict/indicators' })),
      unwrap<CategoryVo[]>(defHttp.get({ url: BASE + '/dict/categories' })),
      defHttp.get<unknown>({ url: BASE + '/dict/units' }),
    ]);
    // units 响应 v2：{code, msg, data:[...], exportAll}（exportAll 在顶层,不能走 unwrap）
    const unitsBody = unitBody as { code?: number; msg?: string; data?: UnitVo[]; exportAll?: boolean };
    const unitVos: UnitVo[] = unitsBody.data ?? [];
    if (unitsBody.code !== undefined && unitsBody.code !== 200) {
      throw new Error(unitsBody.msg || '单位清单请求失败');
    }
    INDICATORS.splice(0, INDICATORS.length, ...indicatorVos.map(adaptIndicator));
    Object.keys(INDICATOR_MAP).forEach((k) => delete INDICATOR_MAP[k]);
    for (const item of INDICATORS) INDICATOR_MAP[item.key] = item;

    const tree = adaptCategories(categoryVos);
    CATEGORIES.splice(0, CATEGORIES.length, ...tree);
    Object.keys(CATEGORY_MAP).forEach((k) => delete CATEGORY_MAP[k]);
    for (const cat of tree) {
      for (const item of [cat, ...(cat.children ?? [])]) CATEGORY_MAP[item.key] = item;
    }
    const dataCats = tree.filter((cat) => cat.key !== 'overview');
    DATA_CATEGORIES.splice(0, DATA_CATEGORIES.length, ...dataCats);
    LEAF_CATEGORIES.splice(0, LEAF_CATEGORIES.length, ...dataCats.flatMap((cat) => cat.children ?? [cat]));

    UNITS.splice(0, UNITS.length, ...unitVos);
    Object.keys(UNIT_NAME_MAP).forEach((k) => delete UNIT_NAME_MAP[k]);
    for (const unit of unitVos) UNIT_NAME_MAP[unit.code] = unit.name;
    CAN_EXPORT_ALL_PROJECTS.value = unitsBody.exportAll === true;
  })().catch((e) => {
    // 失败允许重试：丢弃共享 Promise
    dictsPromise = undefined;
    throw e;
  });
  return dictsPromise;
}

// ── 填报数据：整包加载 ───────────────────────────────────────────────

/** 服务端项目列 → 前端列（key=服务端 id；values 归一：null/空值剔除） */
function adaptProject(vo: FillProjectVo): ProjectColumn {
  const values: Record<string, number | string | [number, number]> = {};
  for (const [k, v] of Object.entries(vo.values ?? {})) {
    if (v === null || v === '' || v === undefined) continue;
    values[k] = v;
  }
  return { key: vo.id, id: vo.id, name: vo.name, imported: vo.imported, values };
}

/** 一周期一单位的填报数据（前端形态，含 broughtIn 标记） */
export type ProgressFillData = {
  periodData: PeriodFillData;
  broughtIn: boolean;
};

/** 加载某周期某单位的整包填报数据（全部叶子类目都有键，空数据为空结构） */
export async function loadProgressFillData(
  year: number | string,
  quarter: string,
  unit: string,
): Promise<ProgressFillData> {
  const vo = await unwrap<FillDataVo>(
    defHttp.get({
      url: BASE + '/fill/data',
      params: { year: String(year), quarter, unit },
    }),
  );
  const periodData: PeriodFillData = {};
  for (const leaf of LEAF_CATEGORIES) {
    const tab = vo.tabs?.[leaf.key];
    periodData[leaf.key] = {
      projects: (tab?.projects ?? []).map(adaptProject),
      totals: { ...(tab?.totals ?? {}) },
    };
  }
  return { periodData, broughtIn: vo.broughtIn === true };
}

// ── 导出所有项目（仅超管/综合协调组）：全单位整包数据 ─────────────────

/** GET /fill/allProjects 的单位包 */
type AllProjectsUnitVo = {
  unitCode: string;
  unitName: string;
  tabs: Record<string, { projects: FillProjectVo[]; totals: Record<string, number> | null }>;
};

/** GET /fill/allProjects 的 data */
type AllProjectsVo = {
  year: string;
  quarter: string;
  unitDatas: AllProjectsUnitVo[];
};

/** 前端形态：单位名 + 已适配的整包 periodData */
export type ProgressAllProjectsUnitData = {
  unitName: string;
  periodData: PeriodFillData;
};

export async function loadAllProgressProjects(
  year: number | string,
  quarter: string,
): Promise<ProgressAllProjectsUnitData[]> {
  const vo = await unwrap<AllProjectsVo>(
    defHttp.get({ url: BASE + '/fill/allProjects', params: { year: String(year), quarter } }),
  );
  return (vo.unitDatas ?? []).map((unit) => {
    const periodData: PeriodFillData = {};
    for (const leaf of LEAF_CATEGORIES) {
      const tab = unit.tabs?.[leaf.key];
      periodData[leaf.key] = {
        projects: (tab?.projects ?? []).map(adaptProject),
        totals: { ...(tab?.totals ?? {}) },
      };
    }
    return { unitName: unit.unitName, periodData };
  });
}

// ── 导入（Excel 上传解析后的批量写入：同名覆盖 + 新增追加） ───────────

/** 导入写入参数（year/quarter/unit 由页面带当前周期与所选单位） */
export type ImportProjectsParams = {
  year: number | string;
  quarter: string;
  unit: string;
  /** 解析出的项目列（leafKey + name + 指标 key → 值） */
  projects: { leafKey: string; name: string; values: Record<string, number | string> }[];
};

/** 导入结果（与强制带入同语义的三计数） */
export async function importProgressProjects(
  params: ImportProjectsParams,
): Promise<{ broughtProjectCount: number; overwrittenProjectCount: number; skippedProjectCount: number }> {
  return unwrap<{ broughtProjectCount: number; overwrittenProjectCount: number; skippedProjectCount: number }>(
    defHttp.postJson({ url: BASE + '/fill/importProjects', data: params }),
  );
}

// ── 填报写操作 ───────────────────────────────────────────────────────

/** 保存项目列返回 */
export type SaveProjectResult = { projectId: string; projectName: string; sortNo: number };

/**
 * 保存项目列（按项目颗粒度、值全量同步）：
 * project.id 为空 = 新建（返回 projectId）；非空 = 更新（可改名）；
 * values 只需提交 fill/text 键，本次未提交的已有键视为清空。
 */
export async function saveProgressProject(params: {
  year: number | string;
  quarter: string;
  unit: string;
  leafKey: string;
  project: { id?: string; name: string; values: Record<string, number | string> };
}): Promise<SaveProjectResult> {
  return unwrap<SaveProjectResult>(defHttp.postJson({ url: BASE + '/fill/saveProject', data: params }));
}

/** 删除项目列（级联删除该列全部值；id 为 query 参数） */
export async function deleteProgressProject(id: string): Promise<{ projectName: string }> {
  return unwrap<{ projectName: string }>(
    defHttp.post({ url: BASE + `/fill/deleteProject?id=${encodeURIComponent(id)}` }),
  );
}

/** 保存合计级录入行（kind=total，目前仅 r23 新增就业岗位）；value=null 清空 */
export async function saveProgressTotal(params: {
  year: number | string;
  quarter: string;
  unit: string;
  leafKey: string;
  indicatorKey: string;
  value: number | null;
}): Promise<{ indicatorKey: string; value: number | null }> {
  return unwrap<{ indicatorKey: string; value: number | null }>(
    defHttp.postJson({ url: BASE + '/fill/saveTotal', data: params }),
  );
}

/** 带入上一季度结果（两域共用形态） */
export type BringInResult = {
  /** 新增带入的项目列数 */
  broughtProjectCount: number;
  /** 强制带入覆盖的同名列数（普通带入为 0） */
  overwrittenProjectCount?: number;
  /** 跳过的同名列数（本季度已存在） */
  skippedProjectCount?: number;
  fromYear: string;
  fromQuarter: string;
};

/** 带入上一季度（普通模式每「周期×单位」限一次；force=true 强制：跳过限制并覆盖同名项目列数据） */
export async function bringInPrevPeriod(params: {
  year: number | string;
  quarter: string;
  unit: string;
  force?: boolean;
  namesOnly?: boolean;
}): Promise<BringInResult> {
  return unwrap<BringInResult>(defHttp.postJson({ url: BASE + '/fill/bringIn', data: params }));
}

// ── 统计（服务端已聚合，前端直接渲染） ───────────────────────────────

/** 统计页展示行（name 已拼缩进；categories = 叶子类目 key → 合计值） */
export type ProgressStatRow = IndicatorDef & {
  grand: number | undefined;
  categories: Record<string, number | undefined>;
};

/** 单个报送单位的统计行包 */
export type ProgressStatUnitData = {
  code: string;
  name: string;
  rows: ProgressStatRow[];
};

/** 统计页数据（一次返回全部可见口径，切换单位无需重复调用） */
export type ProgressStatData = {
  allowedUnits: UnitVo[];
  /** 允许单位合计行（区局账号 = 本单位数据） */
  overviewRows: ProgressStatRow[];
  /** 每个允许单位一份行数据（市局 = 全部报送单位；区局 = 仅本单位） */
  unitDatas: ProgressStatUnitData[];
};

/** 进展统计：一次拉取全部可见口径（overview + 每单位一份） */
export async function loadProgressStatData(
  year: number | string,
  quarter: string,
): Promise<ProgressStatData> {
  const vo = await unwrap<StatDataVo>(
    defHttp.get({
      url: BASE + '/stat/data',
      params: { year: String(year), quarter },
    }),
  );
  const adaptRows = (list: StatRowVo[]): ProgressStatRow[] =>
    list.map((row) => {
      const categories: Record<string, number | undefined> = {};
      for (const [k, v] of Object.entries(row.categories ?? {})) {
        categories[k] = v ?? undefined;
      }
      return {
        key: row.key,
        name: '\u3000'.repeat(row.level || 0) + row.name,
        unit: row.unit ?? '',
        code: row.code ?? '',
        kind: row.kind,
        parts: undefined,
        grand: row.grand ?? undefined,
        categories,
      };
    });
  return {
    allowedUnits: vo.allowedUnits ?? [],
    overviewRows: adaptRows(vo.overview ?? []),
    unitDatas: (vo.unitDatas ?? []).map((unit) => ({
      code: unit.code,
      name: unit.name,
      rows: adaptRows(unit.rows ?? []),
    })),
  };
}

// ── 展示口径：sum 汇总 / count 项目数由前端实时计算（同后端口径；金额累加走 number-precision，规避 IEEE 754 浮点尾差） ──

/**
 * 单元格取值：汇总行 = 构成子行递归求和；count/total 行不落单元格（返回 undefined）；
 * 填报行 = 已填值（未填返回 undefined）。
 */
export function cellValue(item: IndicatorDef, column: ProjectColumn): number | string | undefined {
  return match(item.kind)
    .with('sum', () => {
      let sum = 0;
      for (const partKey of item.parts ?? []) {
        const part = INDICATOR_MAP[partKey];
        const value = part ? cellValue(part, column) : undefined;
        if (typeof value === 'number') sum = NP.plus(sum, value);
      }
      return sum;
    })
    // 自动行不落单元格
    .with('count', 'total', () => undefined)
    .with('fill', 'text', () => {
      const value = column.values[item.key];
      if (Array.isArray(value)) return undefined;
      return value === undefined || value === '' ? undefined : value;
    })
    // kind 新增种类而漏处理时编译报错,而不是静默落默认分支
    .exhaustive();
}

/**
 * 一行指标在某叶子类目上的「合计」：
 * total 行 = 直接录入的合计值；count 行 = 项目列数；text 行无合计；其余 = 各列之和。
 */
export function tabTotal(item: IndicatorDef, tab: TabFillData | undefined): number | undefined {
  return match(item.kind)
    .with('total', () => tab?.totals?.[item.key])
    .with('count', () => tab?.projects.length ?? 0)
    .with('text', () => undefined)
    .with('fill', 'sum', () => {
      let sum = 0;
      for (const column of tab?.projects ?? []) {
        const value = cellValue(item, column);
        if (typeof value === 'number') sum = NP.plus(sum, value);
      }
      return sum;
    })
    .exhaustive();
}

/** 单个单位总览的总计：各叶子类目合计之和（text 行无总计） */
export function grandTotal(item: IndicatorDef, periodData: PeriodFillData | undefined): number | undefined {
  return match(item.kind)
    .with('text', () => undefined)
    .with('fill', 'sum', 'count', 'total', () => {
      let sum = 0;
      for (const leaf of LEAF_CATEGORIES) {
        const value = tabTotal(item, periodData?.[leaf.key]);
        if (typeof value === 'number') sum = NP.plus(sum, value);
      }
      return sum;
    })
    .exhaustive();
}
