/**
 * ifco 进展填报 —— 保存前数据校验（仅前端拦截，后端不重复校验）
 *
 * 规则（2026-09-14 需求）：项目总投资 ≥ 本年完成投资额（103）≥ 本年实际到位资金（104）。
 * - 项目总投资 = r1；103 = r4；104 = r5 为自动汇总行（= r6 国家预算 + r16 社会资本 + r21 其他）；
 * - 比较仅在两侧均已填写时进行（未填项不参与比较，不强制补填）；
 * - 校验失败返回错误文案（调用方以此拦截保存并提示），通过返回 undefined。
 */
import type { ProjectColumn } from '@jeesite/ifco/api/ifco/progress-fill';
import { INDICATOR_MAP, cellValue } from '@jeesite/ifco/api/ifco/progress-fill';

/** 单元格数值（非有限数值视为未填） */
function numberValue(itemKey: string, col: ProjectColumn): number | undefined {
  const item = INDICATOR_MAP[itemKey];
  if (!item) return undefined;
  const value = cellValue(item, col);
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/** 校验单个项目列：违反规则返回提示文案，否则 undefined */
export function validateProgressColumn(col: ProjectColumn): string | undefined {
  if (!col.name.trim()) {
    return '请填写项目名称，不能留空';
  }
  const totalInvest = numberValue('r1', col); // 项目总投资
  const yearDone = numberValue('r4', col); // 103 本年完成投资额
  const yearArrived = numberValue('r5', col); // 104 本年实际到位资金（自动汇总）
  if (totalInvest !== undefined && yearDone !== undefined && yearDone > totalInvest) {
    return `「${col.name}」校验未通过：本年完成投资额（代码103）不能大于项目总投资，请调整后再保存`;
  }
  if (yearDone !== undefined && yearArrived !== undefined && yearArrived > yearDone) {
    return `「${col.name}」校验未通过：本年实际到位资金（代码104）不能大于本年完成投资额（代码103），请调整后再保存`;
  }
  return undefined;
}
