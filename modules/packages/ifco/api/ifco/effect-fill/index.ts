/**
 * ifco —— 项目实施成效填报/统计：真实接口层（对接 modules/ifco 后端）
 *
 * 契约来源：《接口文档-项目进展填报.md》v4 第 4 节（成效模块）。
 * 与进展域的结构差异（后端定案）：
 * - 无类目维度：每「周期 × 单位」只有一份项目列表（无 tabs / 无 saveTotal）；
 * - 指标含 kind=section 节标题行（一、～八、，加粗展示、不填报、不提交）；
 * - 双值行拆键：后端 r226a(数)/r226b(面积) 两个独立键；本层加载时按 dualGroup
 *   合并为一行（key=dualGroup，格值二元组 [数, 面积]），提交时再拆回 a/b 两键；
 * - 单位清单复用进展域 /progress/dict/units（同一套数据权限映射）；
 * - 带入标记成效域独立计数（与进展域互不影响）。
 */

import { reactive } from 'vue';
import { match } from 'ts-pattern';
import NP from 'number-precision';
import { defHttp } from '@jeesite/core/utils/http/axios';
import { useGlobSetting } from '@jeesite/core/hooks/setting';
import type { ProjectColumn } from '../common';
import { ensureProgressDicts, unwrap } from '../progress-fill';

export { UNITS, UNIT_NAME_MAP, CAN_EXPORT_ALL_PROJECTS, ensureProgressDicts } from '../progress-fill';
export { QUARTER_OPTIONS, quarterLabel } from '../common';

/** 指标行类型：fill=直接填报行；section=节标题行（一、～八、，不填写） */
export type EffectIndicatorKind = 'fill' | 'section';

/** 指标（表格行）定义（前端展示形态：name 已含缩进；双值行 dual=true） */
export type EffectIndicatorDef = {
  /** 稳定 key（数据行 r<代码>，双值行合并后 key=dualGroup 如 r226；节标题行 s1～s8） */
  key: string;
  /** 指标名称（含层级缩进与「其中：/合计中：」前缀；双值行「…数|面积」） */
  name: string;
  /** 计量单位（节标题行为空；双值行「个|平方米」） */
  unit: string;
  /** 指标代码（节标题行为空） */
  code: string;
  /** 行类型 */
  kind: EffectIndicatorKind;
  /** 双值行（数|面积）：一格存二元组 [数, 面积]，编辑时两个输入框 */
  dual?: boolean;
};

// ── 服务端 VO ───────────────────────────────────────────────────────

/** GET /effect/fill/indicators 行 */
type EffectIndicatorVo = {
  key: string;
  code: string | null;
  name: string;
  level: number;
  unit: string | null;
  kind: EffectIndicatorKind;
  dualGroup: string | null;
  dualSlot: number | null;
  sortNo: number;
};

/** GET /effect/fill/data 的 data */
type EffectFillDataVo = {
  year: string;
  quarter: string;
  unitCode: string;
  unitName: string | null;
  broughtIn: boolean;
  fillDate: string | null;
  projects: EffectProjectVo[];
};

type EffectProjectVo = {
  id: string;
  name: string;
  imported: boolean;
  createByName?: string | null;
  createDeptName?: string | null;
  createDate?: string | null;
  values: Record<string, number | string | null>;
};

/** GET /effect/stat/data 的 data */
type EffectStatDataVo = {
  year: string;
  quarter: string;
  allowedUnits: { code: string; name: string }[];
  rows: EffectStatRowVo[];
};

type EffectStatRowVo = {
  key: string;
  code: string | null;
  name: string;
  level: number;
  unit: string | null;
  kind: EffectIndicatorKind;
  dualGroup: string | null;
  dualSlot: number | null;
  total: number | null;
  units: Record<string, number | null> | null;
};

const { adminPath } = useGlobSetting();
const BASE = adminPath + '/ifco/effect';

/** 双值行展示名 b 槽后缀：取与 a 槽名称最长公共前缀之后的余文（如「面积」） */
function dualSuffix(nameA: string, nameB: string): string {
  let i = 0;
  while (i < nameA.length && i < nameB.length && nameA[i] === nameB[i]) i += 1;
  return nameB.slice(i) || nameB;
}

/** 指标 VO 序列 → 展示形态（双值相邻两行合并；name 拼缩进） */
function adaptIndicators(vos: EffectIndicatorVo[]): EffectIndicatorDef[] {
  const rows: EffectIndicatorDef[] = [];
  const dualB = new Map<string, EffectIndicatorVo>();
  for (const vo of vos) {
    if (vo.dualGroup && vo.dualSlot === 1) dualB.set(vo.dualGroup, vo);
  }
  for (const vo of vos) {
    const indent = '\u3000'.repeat(vo.level || 0);
    if (vo.dualGroup && vo.dualSlot === 0) {
      const b = dualB.get(vo.dualGroup);
      const nameB = b?.name ?? vo.name;
      rows.push({
        key: vo.dualGroup,
        name: `${indent}${vo.name}|${dualSuffix(vo.name, nameB)}`,
        unit: b?.unit ? `${vo.unit ?? ''}|${b.unit}` : (vo.unit ?? ''),
        code: vo.code ?? '',
        kind: 'fill',
        dual: true,
      });
      continue;
    }
    if (vo.dualGroup && vo.dualSlot === 1) continue; // 已并入 a 槽行
    rows.push({
      key: vo.key,
      name: indent + vo.name,
      unit: vo.unit ?? '',
      code: vo.code ?? '',
      kind: vo.kind,
    });
  }
  return rows;
}

// ── 字典状态（模块级单例；单位复用进展域） ────────────────────────────

/** 成效指标清单（59 行 → 合并双值后 55 行；加载前为空数组） */
export const EFFECT_INDICATORS = reactive<EffectIndicatorDef[]>([]);
/** 指标 key → 定义 */
export const EFFECT_INDICATOR_MAP = reactive<Record<string, EffectIndicatorDef>>({});

let dictsPromise: Promise<void> | undefined;

/**
 * 拉取成效指标（同时确保进展域单位字典就绪，单位下拉共用）。
 * 并发调用共享同一 Promise；失败后允许重试。
 */
export async function ensureEffectDicts(): Promise<void> {
  if (dictsPromise) return dictsPromise;
  dictsPromise = (async () => {
    const [indicatorVos] = await Promise.all([
      unwrap<EffectIndicatorVo[]>(defHttp.get({ url: BASE + '/fill/indicators' })),
      ensureProgressDicts(),
    ]);
    const rows = adaptIndicators(indicatorVos);
    EFFECT_INDICATORS.splice(0, EFFECT_INDICATORS.length, ...rows);
    Object.keys(EFFECT_INDICATOR_MAP).forEach((k) => delete EFFECT_INDICATOR_MAP[k]);
    for (const item of rows) EFFECT_INDICATOR_MAP[item.key] = item;
  })().catch((e) => {
    dictsPromise = undefined;
    throw e;
  });
  return dictsPromise;
}

// ── 导出所有项目（仅超管/综合协调组）：全量单位项目明细 ────────────────

/** GET /fill/allProjects 的单位包 */
export type EffectAllProjectsUnit = {
  unitCode: string;
  unitName: string;
  projects: EffectProjectVo[];
};

/** GET /fill/allProjects 的 data */
type AllProjectsVo = {
  year: string;
  quarter: string;
  unitDatas: EffectAllProjectsUnit[];
};

/** 前端形态：项目列已归一（key=id、values 剔空、双值合并二元组） */
export type EffectAllProjectsUnitData = {
  unitCode: string;
  unitName: string;
  projects: ProjectColumn[];
};

export async function loadAllEffectProjects(
  year: number | string,
  quarter: string,
): Promise<EffectAllProjectsUnitData[]> {
  const vo = await unwrap<AllProjectsVo>(
    defHttp.get({ url: BASE + '/fill/allProjects', params: { year: String(year), quarter } }),
  );
  return (vo.unitDatas ?? []).map((unit) => ({
    unitCode: unit.unitCode,
    unitName: unit.unitName,
    projects: (unit.projects ?? []).map((project) => {
      const values: Record<string, number | string | [number, number]> = {};
      for (const [k, v] of Object.entries(project.values ?? {})) {
        if (v === null || v === '' || v === undefined) continue;
        values[k] = v;
      }
      return { key: project.id, id: project.id, name: project.name, imported: project.imported, values };
    }),
  }));
}

// ── 填报数据：整包加载（双值 a/b 两键 → 合并行二元组） ────────────────

/** 后端扁平 values（r226a/r226b 独立键） → 前端 values（r226 = [数, 面积]） */
function mergeDualValues(
  vo: EffectProjectVo,
  dualGroups: Set<string>,
): Record<string, number | string | [number, number]> {
  const values: Record<string, number | string | [number, number]> = {};
  for (const [k, v] of Object.entries(vo.values ?? {})) {
    if (v === null || v === '' || v === undefined) continue;
    const m = /^(r\d+)a$/.exec(k);
    if (m && dualGroups.has(m[1])) {
      const b = vo.values[`${m[1]}b`];
      values[m[1]] = [Number(v), b === null || b === undefined || b === '' ? 0 : Number(b)];
      continue;
    }
    if (/^r\d+b$/.test(k)) continue; // b 槽已在 a 槽合并时取走
    values[k] = v;
  }
  return values;
}

/** 前端 values（含二元组） → 后端扁平 values（拆回 a/b 两键，仅 fill 行键） */
function splitDualValues(
  values: Record<string, number | string | [number, number] | undefined>,
  fillKeys: Set<string>,
  dualGroups: Set<string>,
): Record<string, number | string> {
  const out: Record<string, number | string> = {};
  for (const [k, v] of Object.entries(values)) {
    if (v === undefined || v === null || v === '') continue;
    if (Array.isArray(v)) {
      if (dualGroups.has(k)) {
        if (v[0] !== 0) out[`${k}a`] = v[0];
        if (v[1] !== 0) out[`${k}b`] = v[1];
      }
      continue;
    }
    if (fillKeys.has(k)) out[k] = v;
  }
  return out;
}

/** 单位一周期成效数据（前端形态） */
export type EffectUnitData = {
  projects: ProjectColumn[];
};

/** 加载成效填报数据（含 broughtIn 标记） */
export async function loadEffectFillData(
  year: number | string,
  quarter: string,
  unit: string,
): Promise<{ unitData: EffectUnitData; broughtIn: boolean }> {
  const vo = await unwrap<EffectFillDataVo>(
    defHttp.get({
      url: BASE + '/fill/data',
      params: { year: String(year), quarter, unit },
    }),
  );
  const dualGroups = new Set(EFFECT_INDICATORS.filter((item) => item.dual).map((item) => item.key));
  const projects: ProjectColumn[] = (vo.projects ?? []).map((p) => ({
    key: p.id,
    id: p.id,
    name: p.name,
    imported: p.imported,
    values: mergeDualValues(p, dualGroups),
  }));
  return { unitData: { projects }, broughtIn: vo.broughtIn === true };
}

/** 保存成效项目列（body 无 leafKey；values 只接受 fill 行键，双值拆 a/b） */
export async function saveEffectProject(params: {
  year: number | string;
  quarter: string;
  unit: string;
  project: { id?: string; name: string; values: Record<string, number | string | [number, number]> };
}): Promise<{ projectId: string; projectName: string; sortNo: number }> {
  const fillKeys = new Set(
    EFFECT_INDICATORS.filter((item) => item.kind === 'fill' && !item.dual).map((item) => item.key),
  );
  const dualGroups = new Set(EFFECT_INDICATORS.filter((item) => item.dual).map((item) => item.key));
  return unwrap<{ projectId: string; projectName: string; sortNo: number }>(
    defHttp.postJson({
      url: BASE + '/fill/saveProject',
      data: {
        year: params.year,
        quarter: params.quarter,
        unit: params.unit,
        project: {
          id: params.project.id ?? null,
          name: params.project.name,
          values: splitDualValues(params.project.values, fillKeys, dualGroups),
        },
      },
    }),
  );
}

/** 删除成效项目列 */
export async function deleteEffectProject(id: string): Promise<{ projectName: string }> {
  return unwrap<{ projectName: string }>(
    defHttp.post({ url: BASE + `/fill/deleteProject?id=${encodeURIComponent(id)}` }),
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

/** 导入写入参数（year/quarter/unit 由页面带当前周期与所选单位） */
export type EffectImportProjectsParams = {
  year: number | string;
  quarter: string;
  unit: string;
  /** 解析出的项目列（name + 指标 key → 值；双值行拆 a/b 两键） */
  projects: { name: string; values: Record<string, number> }[];
};

/** Excel 导入成效项目列（同名覆盖 + 新增追加；值全量同步） */
export async function importEffectProjects(
  params: EffectImportProjectsParams,
): Promise<{ broughtProjectCount: number; overwrittenProjectCount: number; skippedProjectCount: number }> {
  return unwrap<{ broughtProjectCount: number; overwrittenProjectCount: number; skippedProjectCount: number }>(
    defHttp.postJson({ url: BASE + '/fill/importProjects', data: params }),
  );
}

/** 成效带入上一季度（与进展域带入次数互不影响；force=强制，覆盖同名项目列数据） */
export async function bringInPrevPeriod(params: {
  year: number | string;
  quarter: string;
  unit: string;
  force?: boolean;
  namesOnly?: boolean;
}): Promise<BringInResult> {
  return unwrap<BringInResult>(defHttp.postJson({ url: BASE + '/fill/bringIn', data: params }));
}

// ── 统计（服务端已聚合；双值两行合并为二元组展示） ────────────────────

/** 统计展示行：普通行 value = 单位合计；双值行 = [数, 面积]；节标题行恒空 */
export type EffectStatRow = {
  key: string;
  kind: EffectIndicatorKind;
  name: string;
  unit: string;
  code: string;
  dual?: boolean;
  /** 全武汉市合计（= 可见单位合计；节标题行 undefined） */
  total: number | [number, number] | undefined;
  /** 单位编码 → 该单位合计（双值行为二元组） */
  units: Record<string, number | [number, number] | undefined>;
};

/** 成效统计数据 */
export type EffectStatData = {
  allowedUnits: { code: string; name: string }[];
  rows: EffectStatRow[];
};

/** 成效统计（单位维度即表格列；无 unit 参数） */
export async function loadEffectStatData(year: number | string, quarter: string): Promise<EffectStatData> {
  const vo = await unwrap<EffectStatDataVo>(
    defHttp.get({ url: BASE + '/stat/data', params: { year: String(year), quarter } }),
  );
  // 双值行两两合并：a 行取数、b 行取面积
  const rows: EffectStatRow[] = [];
  const byGroup = new Map<string, { a?: EffectStatRowVo; b?: EffectStatRowVo }>();
  for (const r of vo.rows ?? []) {
    if (r.dualGroup) {
      const slot = byGroup.get(r.dualGroup) ?? {};
      if (r.dualSlot === 0) slot.a = r;
      else slot.b = r;
      byGroup.set(r.dualGroup, slot);
    }
  }
  for (const r of vo.rows ?? []) {
    const indent = '\u3000'.repeat(r.level || 0);
    if (r.dualGroup && r.dualSlot === 0) {
      const pair = byGroup.get(r.dualGroup)!;
      const b = pair.b;
      const units: Record<string, number | [number, number] | undefined> = {};
      for (const u of vo.allowedUnits ?? []) {
        units[u.code] = [r.units?.[u.code] ?? 0, b?.units?.[u.code] ?? 0];
      }
      rows.push({
        key: r.dualGroup,
        kind: 'fill',
        name: `${indent}${r.name}|${dualSuffix(r.name, b?.name ?? r.name)}`,
        unit: b?.unit ? `${r.unit ?? ''}|${b.unit}` : (r.unit ?? ''),
        code: r.code ?? '',
        dual: true,
        total: [r.total ?? 0, b?.total ?? 0],
        units,
      });
      continue;
    }
    if (r.dualGroup && r.dualSlot === 1) continue;
    const units: Record<string, number | [number, number] | undefined> = {};
    for (const u of vo.allowedUnits ?? []) {
      units[u.code] = r.units?.[u.code] ?? undefined;
    }
    rows.push({
      key: r.key,
      kind: r.kind,
      name: indent + r.name,
      unit: r.unit ?? '',
      code: r.code ?? '',
      total: r.kind === 'section' ? undefined : (r.total ?? undefined),
      units,
    });
  }
  return { allowedUnits: vo.allowedUnits ?? [], rows };
}

// ── 展示口径：行合计（填报页「合计」列由前端实时计算） ────────────────

/** 单元格取值：双值行返回二元组；填报行 = 已填值；节标题行不落单元格 */
export function cellValue(
  item: EffectIndicatorDef,
  column: ProjectColumn,
): number | string | [number, number] | undefined {
  return match(item.kind)
    .with('section', () => undefined)
    .with('fill', () => {
      const value = column.values[item.key];
      if (item.dual) {
        return Array.isArray(value) ? value : undefined;
      }
      return value === undefined || value === '' || Array.isArray(value) ? undefined : value;
    })
    .exhaustive();
}

/** 一行指标的「合计」：双值行按位求和返回二元组；普通行 = 数值之和；节标题行无合计（金额累加走 number-precision，规避浮点尾差） */
export function rowTotal(
  item: EffectIndicatorDef,
  data: EffectUnitData | undefined,
): number | [number, number] | undefined {
  return match(item.kind)
    .with('section', () => undefined)
    .with('fill', (): number | [number, number] | undefined => {
      if (item.dual) {
        let sumA = 0;
        let sumB = 0;
        for (const column of data?.projects ?? []) {
          const value = cellValue(item, column);
          if (Array.isArray(value)) {
            sumA = NP.plus(sumA, value[0]);
            sumB = NP.plus(sumB, value[1]);
          }
        }
        return [sumA, sumB] as [number, number];
      }
      let sum = 0;
      for (const column of data?.projects ?? []) {
        const value = cellValue(item, column);
        if (typeof value === 'number') sum = NP.plus(sum, value);
      }
      return sum;
    })
    .exhaustive();
}
