/**
 * ifco 填报共用 —— 填报截止（两填报域同构；纯前端拦截，用户定案后端不动）
 *
 * 截止 = 季度结束日后 8 天零点：Q1→04-08、Q2→07-08、Q3→10-08、Q4→次年 01-08。
 * 超期该周期仅可查看：canFill = 单位可编辑 && 未过截止（隐藏新增/保存/带入/
 * 列头编辑入口，工具栏显示截止提示）；切回历史周期自然只读。
 */
import { computed, type ComputedRef, type Ref } from 'vue';

export function useFillDeadline(
  year: Ref<number>,
  quarter: Ref<string>,
  unitEditable: ComputedRef<boolean>,
) {
  /** 截止时刻（下季度首日 + 7 天 = 季度末 + 8 天零点；月份为 0 基，Q4 跨年） */
  const fillDeadline = computed(() => {
    const q = Number(quarter.value);
    const nextQuarterFirst = q < 4 ? new Date(year.value, q * 3, 1) : new Date(year.value + 1, 0, 1);
    nextQuarterFirst.setDate(nextQuarterFirst.getDate() + 7);
    return nextQuarterFirst;
  });

  /** 提示用日期文案（YYYY-MM-DD） */
  const deadlineLabel = computed(() => {
    const d = fillDeadline.value;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });

  const fillExpired = computed(() => new Date() >= fillDeadline.value);

  /** 可填报 = 单位可编辑 且 未过填报截止时间 */
  const canFill = computed(() => unitEditable.value && !fillExpired.value);

  return { fillDeadline, deadlineLabel, fillExpired, canFill };
}
