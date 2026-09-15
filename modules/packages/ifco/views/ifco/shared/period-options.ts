/**
 * ifco —— 填报周期（年份 × 季度）选项共用逻辑
 *
 * 选项范围 = 上线周期（2026 年三季度）～ 当前周期（进展/成效填报与统计四页共用）：
 * 上线前周期不存在、未来季度不可选；年份切换后所选季度可能失效，需先回退再触发重载。
 */
import { computed, ref, type ComputedRef, type Ref } from 'vue';
import { buildFillQuarterOptions, buildFillYearOptions } from '@jeesite/ifco/api/ifco/common';

export type PeriodSelectors = {
  year: Ref<number>;
  quarter: Ref<string>;
  yearOptions: { label: string; value: number }[];
  quarterOptions: ComputedRef<{ label: string; value: string }[]>;
  /** 年份切换后：所选季度不在该年可选项时回退到该年最后一个可选季度（须在触发重载前调用） */
  syncQuarterToYear: () => void;
};

export function usePeriodSelectors(): PeriodSelectors {
  const year = ref(new Date().getFullYear());
  const quarter = ref(String(Math.floor(new Date().getMonth() / 3) + 1));
  const yearOptions = buildFillYearOptions();
  const quarterOptions = computed(() => buildFillQuarterOptions(year.value));

  function syncQuarterToYear() {
    if (!quarterOptions.value.some((option) => option.value === quarter.value)) {
      quarter.value = quarterOptions.value[quarterOptions.value.length - 1].value;
    }
  }

  return { year, quarter, yearOptions, quarterOptions, syncQuarterToYear };
}
