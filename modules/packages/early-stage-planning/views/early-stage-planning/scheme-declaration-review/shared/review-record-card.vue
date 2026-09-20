<!--
  单条审查记录卡（主审意见 / 联合审查意见共用）
  展示：角色标签（主审单位 / 第N次联合审查）+ 审查单位 / 审查时间 / 审核结果（着色）+
  审核意见 + 附件（新窗打开）。
  由 review-records.vue 的时间线复用；非 a-button/a-input 的 antd 组件无需 import。
-->
<template>
  <div class="flex flex-col gap-6px rd-6px bg-[#f0f7ff] px-12px py-10px">
    <div class="flex flex-wrap items-center gap-x-16px gap-y-6px text-13px">
      <span class="inline-flex rd-3px px-5px py-1px text-12px font-500" :style="roleTagStyle">{{ roleTagText }}</span>
      <span class="text-gray-700">审查单位：{{ record?.unitName }}</span>
      <span class="text-gray-700">审查时间：{{ record?.reviewTime }}</span>
      <span class="text-gray-700">
        审核结果：
        <span class="font-500" :style="{ color: CONCLUSION_LABEL[conclusion].color }">
          {{ CONCLUSION_LABEL[conclusion].label }}
        </span>
      </span>
    </div>
    <div class="text-13px text-gray-700">
      <span class="text-gray-500">审核意见：</span>{{ record?.opinion || '—' }}
    </div>
    <div class="flex flex-wrap items-center gap-8px text-13px">
      <span class="text-gray-500">附件：</span>
      <template v-if="record?.files?.length">
        <a
          v-for="file in record.files"
          :key="file.objectKey ?? file.name"
          class="text-[#3A8EF6] hover:underline"
          :href="file.url"
          target="_blank"
          rel="noopener"
        >
          {{ file.name }}
        </a>
      </template>
      <span v-else class="text-gray-700">—</span>
    </div>
  </div>
</template>
<script lang="ts" setup name="ViewsEarlyStagePlanningSchemeDeclarationReviewRecordCard">
  import { computed } from 'vue';
  import { CONCLUSION_LABEL, roundText } from './review-constants';
  import type {
    EspReviewRecord,
    ReviewConclusion,
  } from '@jeesite/early-stage-planning/api/early-stage-planning/scheme-declaration-review/scheme-review';

  const props = defineProps<{ record?: EspReviewRecord }>();

  const conclusion = computed<ReviewConclusion>(() => props.record?.conclusion ?? 'na');

  const roleTagText = computed(() =>
    props.record?.role === 'main' ? '主审单位' : `第${roundText(props.record?.round ?? 1)}次联合审查`,
  );

  const roleTagStyle = computed(() =>
    props.record?.role === 'main'
      ? { color: '#1677ff', background: '#e8f1fd' }
      : { color: '#722ed1', background: '#f4ecfd' },
  );
</script>
