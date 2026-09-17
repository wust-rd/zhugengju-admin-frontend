/**
 * ifco —— 填报周期（年份 × 季度）共用逻辑
 *
 * 选项范围 = 上线周期（2026 年第3季度）～ 当前周期（选择器 UI 由 shared/PeriodSelects.vue
 * 承载，进展/成效 × 填报/统计四页共用）：上线前周期不存在、未来季度不可选、
 * 已过去的季度保留可选（跳回查看历史填报）。
 */
import { ref, type Ref } from 'vue';
import { buildFillQuarterOptions } from '@jeesite/ifco/api/ifco/common';

/** 当前周期（页面初始值：进入页面默认定位到当前年/当前季度） */
export function useCurrentPeriod(): { year: Ref<number>; quarter: Ref<string> } {
  const year = ref(new Date().getFullYear());
  const quarter = ref(String(Math.floor(new Date().getMonth() / 3) + 1));
  return { year, quarter };
}

/** 年份下合法的季度：所选季度合法原样返回，否则回退到该年最后一个可选季度 */
export function fitQuarterToYear(year: number, quarter: string): string {
  const options = buildFillQuarterOptions(year);
  return options.some((option) => option.value === quarter) ? quarter : options[options.length - 1].value;
}
