<script lang="ts" setup>
  /**
   * 通用「当前填报周期与截止日期」红字提示行
   *
   * 纯展示组件：周期文案由 year+quarter 拼装，截止日期由调用方传入
   * （各业务模块的截止规则不同——如 ifco = 季度末+8 天，由模块层算好传入）。
   * deadline 传 Date 自动格式化为 YYYY-MM-DD；传字符串原样显示（支持"2026-10-08 00:00"等自定义粒度）。
   */
  import { computed } from 'vue';

  const props = defineProps<{
    /** 填报年份，如 2026 */
    year: number | string;
    /** 填报季度（1~4） */
    quarter: string;
    /** 截止日期：Date 自动格式化；字符串原样显示 */
    deadline: string | Date;
  }>();

  const deadlineLabel = computed(() => {
    if (typeof props.deadline === 'string') {
      return props.deadline;
    }
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${props.deadline.getFullYear()}-${pad(props.deadline.getMonth() + 1)}-${pad(props.deadline.getDate())}`;
  });
</script>

<template>
  <div class="text-red-500 text-14px">
    *当前填报周期：{{ year }}年第{{ quarter }}季度，截止填报日期：{{ deadlineLabel }}
  </div>
</template>
