<!--
  ifco —— 填报周期选择器（年份 + 季度，四页共用：进展/成效 × 填报/统计）

  选项口径：上线周期（2026 年第3季度）～ 当前周期——上线前年份（2024/2025 等）不存在、
  未来季度不可选、已过去的季度保留可选（跳回查看历史填报）。
  年份切换后原所选季度在新年份下不可选时，先自动回退到新年份最后一个可选季度，
  再向父组件发 change 事件（父级在事件回调里重载数据，此时季度已修正）。
-->
<template>
  <div class="flex items-center">
    <span class="text-gray-500">填报年份</span>
    <Select v-model:value="year" :options="yearOptions" class="ml-2 w-28" @change="handleChange" />
    <span class="ml-6 text-gray-500">填报季度</span>
    <Select v-model:value="quarter" :options="quarterOptions" class="ml-2 w-28" @change="handleChange" />
  </div>
</template>
<script lang="ts" setup name="IfcoPeriodSelects">
  import { computed } from 'vue';
  import { Select } from 'antdv-next';
  import { buildFillQuarterOptions, buildFillYearOptions } from '@jeesite/ifco/api/ifco/common';
  import { fitQuarterToYear } from './period-options';

  const year = defineModel<number>('year', { required: true });
  const quarter = defineModel<string>('quarter', { required: true });

  const emit = defineEmits<{ change: [] }>();

  const yearOptions = buildFillYearOptions();
  const quarterOptions = computed(() => buildFillQuarterOptions(year.value));

  /** 年份/季度变化：年份切换先修正季度（新年份下原季度可能不可选），再通知父级重载 */
  function handleChange() {
    quarter.value = fitQuarterToYear(year.value, quarter.value);
    emit('change');
  }
</script>
