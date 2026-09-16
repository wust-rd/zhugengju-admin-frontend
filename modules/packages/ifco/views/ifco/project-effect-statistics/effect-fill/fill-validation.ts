/**
 * ifco 成效填报 —— 保存前数据校验与自动计算行（仅前端拦截，后端不重复校验）
 *
 * 校验规则（2026-09-14 需求，项 = IFCO_EFFECT_INDICATOR.indicator_code）：
 * 1. 201项 ≥ 202项+203项；201项 ≥ 204项
 * 2. 213项 ≥ 214项+215项+216项
 * 3. 220项 ≥ 221项
 * 4. 223项 ≥ 224项
 * 5. 226项 ≥ 227项（双值行，数/面积分别比较）
 * 6. 229项 ≥ 230项+231项+232项+233项
 * 7. 233项 = 234项+235项+236项 —— 233 不用手填，由 234+235+236 自动计算
 * 8. 各项取整数
 *
 * 约定：比较仅在两侧均已填写时进行（未填项不参与比较）；规则 7 由
 * syncEffectAutoSums 写入值实现（保存前必调），天然满足相等。
 */
import type { ProjectColumn } from '@jeesite/ifco/api/ifco/common';
import { EFFECT_INDICATOR_MAP } from '@jeesite/ifco/api/ifco/effect-fill';

type CellValue = number | string | [number, number] | undefined;

/** 自动计算行：target key = 构成行 key 之和（不可填写，编辑态也只读展示） */
export const EFFECT_AUTO_SUM: Record<string, string[]> = {
  r233: ['r234', 'r235', 'r236'], // 233 排水管道长度 = 234 污水 + 235 雨水 + 236 雨污合流
};

/** 数值化（非有限数值视为未填） */
function num(value: CellValue): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/** 指标项取值（code = 指标代码，如 '201'） */
function codeValue(col: ProjectColumn, code: string): number | undefined {
  return num(col.values[`r${code}`]);
}

/** 指标名称（去缩进；字典未加载时回退为代码） */
function nameOf(code: string): string {
  return EFFECT_INDICATOR_MAP[`r${code}`]?.name.trim() ?? `${code}项`;
}

/** 同步自动计算行（编辑写入与保存提交前必调）：构成行全空则清空目标行 */
export function syncEffectAutoSums(col: ProjectColumn) {
  for (const [target, parts] of Object.entries(EFFECT_AUTO_SUM)) {
    const nums = parts.map((key) => num(col.values[key])).filter((v): v is number => v !== undefined);
    if (nums.length) {
      col.values[target] = nums.reduce((a, b) => a + b, 0);
    } else {
      delete col.values[target];
    }
  }
}

/** 校验单个项目列：违反规则返回提示文案，否则 undefined */
export function validateEffectColumn(col: ProjectColumn): string | undefined {
  if (!col.name.trim()) {
    return '请填写项目名称，不能留空';
  }
  const values = col.values;
  const prefix = `「${col.name}」校验未通过：`;

  // 8. 各项取整数（含双值行两槽）
  for (const [key, value] of Object.entries(values)) {
    const code = key.replace(/^r/, '');
    if (typeof value === 'number' && !Number.isInteger(value)) {
      return `${prefix}${nameOf(code)}（代码${code}）必须取整数（不支持小数），请调整后再保存`;
    }
    if (Array.isArray(value) && (!Number.isInteger(value[0]) || !Number.isInteger(value[1]))) {
      return `${prefix}${nameOf(code)}（代码${code}）必须取整数（不支持小数），请调整后再保存`;
    }
  }

  // 和比较：main ≥ parts 之和（两侧均已填写才比较）
  const sumRules: { main: string; parts: string[] }[] = [
    { main: '201', parts: ['202', '203'] },
    { main: '213', parts: ['214', '215', '216'] },
    { main: '229', parts: ['230', '231', '232', '233'] },
  ];
  for (const rule of sumRules) {
    const main = codeValue(col, rule.main);
    const partNums = rule.parts.map((code) => codeValue(col, code)).filter((v): v is number => v !== undefined);
    if (main === undefined || partNums.length === 0) continue;
    if (partNums.reduce((a, b) => a + b, 0) > main) {
      return `${prefix}代码${rule.main}（${nameOf(rule.main)}）不能小于 ${rule.parts.map((code) => `代码${code}`).join('+')} 之和，请调整后再保存`;
    }
  }

  // 单项比较：main ≥ part
  const singleRules: { main: string; part: string }[] = [
    { main: '201', part: '204' },
    { main: '220', part: '221' },
    { main: '223', part: '224' },
  ];
  for (const rule of singleRules) {
    const main = codeValue(col, rule.main);
    const part = codeValue(col, rule.part);
    if (main !== undefined && part !== undefined && part > main) {
      return `${prefix}代码${rule.main}（${nameOf(rule.main)}）不能小于 代码${rule.part}（${nameOf(rule.part)}），请调整后再保存`;
    }
  }

  // 双值比较：226 ≥ 227（数/面积两槽分别比较）
  const dualA = values.r226;
  const dualB = values.r227;
  if (Array.isArray(dualA) && Array.isArray(dualB)) {
    const slots: [0 | 1, string][] = [
      [0, '数'],
      [1, '面积'],
    ];
    for (const [slot, label] of slots) {
      const a = num(dualA[slot]);
      const b = num(dualB[slot]);
      if (a !== undefined && b !== undefined && b > a) {
        return `${prefix}代码226 的「${label}」不能小于 代码227 的「${label}」，请调整后再保存`;
      }
    }
  }

  return undefined;
}
