/**
 * ifco 进展填报 —— 保存前数据校验（仅前端拦截，后端不重复校验）
 *
 * 完整规则清单（2026-09-17 修订二）：
 * 1. 101 城市更新项目总数 ≥ 102 其中：本年新开工
 * 2. 104 本年实际到位资金 = 105 + 115 + 120
 * 3. 105 合计中：1.国家预算资金 ≥ 106 + 111 + 112 + 113 + 114
 * 4. 106 其中：（1）中央预算资金 ≥ 107 + 108 + 109 + 110
 * 5. 115 2.社会资本 ≥ 116 + 117 + 118
 * 6. 115 2.社会资本 ≥ 119
 *
 * 必填项自动求和与校验是两套口径：代填公式（保存前代填，用户已填不覆盖）
 * 101 = 102；104 = 105+115+120；105 = 106+111+112+113+114；
 * 106 = 107+108+109+110。115 不代填；116~119 有值而 115 为空时提示未填写。
 * 规则表存 r 键（r2=代码101 … r21=代码120，键序 = 代码-99），错误文案按代码展示；
 * 比较口径：主行留空视为 0 参与比较；构成项未填的不计入和，但构成项至少填了一项才触发校验；
 * 求和走 number-precision 规避浮点尾差；校验失败返回错误文案，通过返回 undefined。
 */
import NP from 'number-precision';
import type { ProjectColumn } from '@jeesite/ifco/api/ifco/progress-fill';
import { CATEGORIES, INDICATOR_MAP, cellValue } from '@jeesite/ifco/api/ifco/progress-fill';

/** 校验规则：主行 与 构成行之和 按模式比较 */
type SumRule = {
  /** 主行指标 r 键（如 'r5' = 代码 104） */
  main: string;
  /** 构成行指标 r 键（未填项不计入和） */
  parts: string[];
  /** ge = 主行 ≥ 构成和；eq = 主行 = 构成和 */
  mode: 'ge' | 'eq';
};

const RULES: SumRule[] = [
  { main: 'r2', parts: ['r3'], mode: 'ge' },
  { main: 'r5', parts: ['r6', 'r16', 'r21'], mode: 'eq' },
  { main: 'r6', parts: ['r7', 'r12', 'r13', 'r14', 'r15'], mode: 'ge' },
  { main: 'r7', parts: ['r8', 'r9', 'r10', 'r11'], mode: 'ge' },
  { main: 'r16', parts: ['r17', 'r18', 'r19'], mode: 'ge' },
  { main: 'r16', parts: ['r20'], mode: 'ge' },
];

/** 叶子类目 key → 一级大类名（嵌套类目取父级 label；错误文案标记项目所在大类用） */
function categoryLabelOf(leafKey?: string): string | undefined {
  if (!leafKey) return undefined;
  for (const category of CATEGORIES) {
    for (const leaf of category.children ?? [category]) {
      if (leaf.key === leafKey) return category.label;
    }
  }
  return undefined;
}

/** 单元格数值（数字字符串一并数值化——InputNumber 键入过程可能产出字符串；非有限数值视为未填） */
function numberValue(itemKey: string, col: ProjectColumn): number | undefined {
  const item = INDICATOR_MAP[itemKey];
  if (!item) return undefined;
  const value = cellValue(item, col);
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'string' && value.trim() !== '') {
    const num = Number(value.replace(/[,，\s]/g, ''));
    return Number.isFinite(num) ? num : undefined;
  }
  return undefined;
}

/** r 键 → 指标代码文案（r5 → 代码104；r1/r22 无代码） */
function codeLabel(key: string): string {
  const seq = Number(key.replace(/^r/, ''));
  return Number.isFinite(seq) && seq >= 2 ? `代码${seq + 99}` : key;
}

/** 指标名称（去缩进；字典未加载时回退为代码） */
function nameOf(key: string): string {
  return INDICATOR_MAP[key]?.name.trim() ?? codeLabel(key);
}

/** 自动求和必填项（顺序 = 先底层后顶层，上层求和时能取到已代填的下层值）：
 *  101 = 102；106 = 107+108+109+110；115 = 116+117+118+119（含 119）；
 *  105 = 106+111+112+113+114；104 = 105+115+120。
 *  仅主行不填而子项有值时代填子项之和（用户已填不覆盖） */
const AUTO_SUM_ROWS: { main: string; parts: string[] }[] = [
  { main: 'r2', parts: ['r3'] },
  { main: 'r7', parts: ['r8', 'r9', 'r10', 'r11'] },
  { main: 'r6', parts: ['r7', 'r12', 'r13', 'r14', 'r15'] },
  { main: 'r5', parts: ['r6', 'r16', 'r21'] },
];

/** 保存前自动求和：对 AUTO_SUM_ROWS 逐行代填（写入列内存值，随保存落库） */
export function autoFillSumRows(col: ProjectColumn): void {
  for (const { main, parts } of AUTO_SUM_ROWS) {
    if (numberValue(main, col) !== undefined) continue;
    const nums = parts.map((key) => numberValue(key, col)).filter((v): v is number => v !== undefined);
    if (nums.length === 0) continue;
    col.values[main] = nums.reduce((acc, v) => NP.plus(acc, v), 0);
  }
}

/** 校验单个项目列：违反规则返回提示文案，否则 undefined；
 *  leafKey 用于错误文案标记项目所在大类（如“既有建筑改造利用中「某项目」校验未通过”） */
export function validateProgressColumn(col: ProjectColumn, leafKey?: string): string | undefined {
  if (!col.name.trim()) {
    return '请填写项目名称，不能留空';
  }
  const scope = categoryLabelOf(leafKey);
  const prefix = scope ? `「${scope}」中「${col.name}」校验未通过：` : `「${col.name}」校验未通过：`;
  // 条件必填:115 社会资本不代填,其子项(116~119)有值而 115 为空时提示未填写
  // (不再走留空视为 0 的规则 5/6;子项与 115 全空则不提示)
  if (
    numberValue('r16', col) === undefined &&
    ['r17', 'r18', 'r19', 'r20'].some((k) => numberValue(k, col) !== undefined)
  ) {
    return `${prefix}代码115（2.社会资本）未填写，请填写后再次校验`;
  }
  for (const rule of RULES) {
    const main = numberValue(rule.main, col) ?? 0;
    const partNums = rule.parts.map((key) => numberValue(key, col)).filter((v): v is number => v !== undefined);
    if (partNums.length === 0) continue;
    const partSum = partNums.reduce((acc, v) => NP.plus(acc, v), 0);
    const relation = rule.mode === 'eq' ? '必须等于' : '不能小于';
    if (rule.mode === 'eq' ? main !== partSum : main < partSum) {
      return `${prefix}${codeLabel(rule.main)}（${nameOf(rule.main)}）${relation} ${rule.parts.map((k) => codeLabel(k)).join('+')} 之和，请调整后再次校验`;
    }
  }
  return undefined;
}
