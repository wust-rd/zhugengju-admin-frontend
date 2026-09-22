<!--
  市住更局 —— 评审管理 · 项目评估报告

  由列表「生成评估报告」打开（组件切换，不新增路由）。
  版式对齐设计稿：居中标题 + 三列基础信息 + 专家组构成表 + 综合评估意见 + 结论。
  外框沿用评审表单：吸顶返回栏、白卡片、圆角阴影。
  右上角导出：报告 PDF + 本项目上传的全部附件打成 zip（file-saver）。
-->
<template>
  <div class="flex flex-col gap-16px">
    <div class="sticky z-20 flex items-center gap-12px bg-white rd-8px px-16px py-12px shadow-sm" style="top: 0">
      <a-button @click="emit('back')">
        <span class="inline-flex items-center gap-4px"><span class="i-fluent:arrow-left-12-filled"></span> 返回</span>
      </a-button>
      <span class="text-16px font-500">项目评估报告</span>
      <span class="flex-1"></span>
      <a-button type="primary" :loading="exporting" :disabled="!report" @click="handleExport">
        <span class="inline-flex items-center gap-4px">
          <span class="i-fluent:arrow-export-ltr-16-regular"></span> 导出
        </span>
      </a-button>
    </div>

    <div v-if="loading" class="flex justify-center bg-white rd-8px py-80px shadow-sm">
      <Spin />
    </div>

    <div v-else-if="report" class="flex justify-center">
      <div
        ref="paperRef"
        class="w-full max-w-900px bg-white px-48px py-40px shadow-sm rd-8px text-[#1f2329]"
      >
        <div class="mb-28px text-center">
          <div class="text-24px font-600 tracking-2px">项目评估报告</div>
          <div class="mt-8px text-13px text-gray-500">评估日期：{{ evalDateText }}</div>
        </div>

        <div class="grid grid-cols-3 gap-x-24px gap-y-12px border-b border-solid border-[#f0f0f0] py-16px text-13px">
          <div>项目名称：{{ dash(report.projectName) }}</div>
          <div>片区名称：{{ dash(report.areaName) }}</div>
          <div>评估模式：{{ dash(report.evalMode) }}</div>
          <div>实施主体：{{ dash(report.implementOrg) }}</div>
          <div>统筹主体：{{ dash(report.coordOrg) }}</div>
          <div>责任部门：{{ dash(report.respDept) }}</div>
        </div>

        <section class="mt-28px">
          <div class="mb-12px text-15px font-600">一、专家组构成</div>
          <table class="w-full border-collapse text-13px">
            <thead>
              <tr class="bg-[#f5f7fa]">
                <th class="w-56px">序号</th>
                <th>专家姓名</th>
                <th>单位名称</th>
                <th>专业领域</th>
                <th>职称</th>
                <th class="w-80px">角色</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in experts" :key="item.id || index">
                <td class="text-center">{{ index + 1 }}</td>
                <td>{{ dash(item.name) }}</td>
                <td>{{ dash(item.org) }}</td>
                <td>{{ dash(item.field) }}</td>
                <td>{{ dash(item.title) }}</td>
                <td class="text-center">{{ dash(item.role) }}</td>
              </tr>
              <tr v-if="!experts.length">
                <td colspan="6" class="py-16px text-center text-gray-400">暂无专家数据</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section class="mt-28px">
          <div class="mb-12px text-15px font-600">二、专家组评估意见</div>
          <div class="text-13px leading-28px whitespace-pre-wrap text-gray-800">
            {{ summaryOpinion || '暂无综合评估意见' }}
          </div>
        </section>

        <section class="mt-28px">
          <div class="mb-12px text-15px font-600">三、评估结论</div>
          <div class="flex flex-col gap-8px text-13px leading-28px">
            <div>综合评估结论：{{ summaryResultText }}</div>
            <div>个人评估结论：{{ memberResultText }}</div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup name="ViewsEarlyStagePlanningReviewManagementReport">
  import { computed, onMounted, ref } from 'vue';
  import { Spin } from 'antdv-next';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { dateUtil } from '@jeesite/core/utils/dateUtil';
  import {
    reviewProjectReport,
    type EspReviewOpinion,
    type EspReviewReport,
    type EspReviewReportExpert,
  } from '@jeesite/early-stage-planning/api/early-stage-planning/review-management';
  import { exportReviewReportZip } from './export-report';

  const props = defineProps<{ record?: Recordable }>();
  const emit = defineEmits<{ back: [] }>();
  const { showMessage } = useMessage();

  const loading = ref(true);
  const exporting = ref(false);
  const report = ref<EspReviewReport | null>(null);
  const paperRef = ref<HTMLElement | null>(null);

  function dash(value?: string | null) {
    const text = (value ?? '').trim();
    return text || '—';
  }

  function opinionResult(item: EspReviewOpinion) {
    if (item.resultLabel) return item.resultLabel;
    if (item.result === 'pass') return '通过';
    if (item.result === 'reject') return '不通过';
    return '';
  }

  const experts = computed<EspReviewReportExpert[]>(() => report.value?.experts ?? []);

  const evalDateText = computed(() => {
    const raw = report.value?.evalDate;
    if (!raw) return '—';
    const d = dateUtil(raw);
    return d.isValid() ? d.format('YYYY年M月D日') : raw;
  });

  const summaryOpinion = computed(() => report.value?.summary?.opinion?.trim() || '');

  const summaryResultText = computed(() => {
    const label = report.value?.summary?.resultLabel || report.value?.summaryResultLabel;
    if (label) return label;
    const result = report.value?.summary?.result || report.value?.summaryResult;
    if (result === 'pass') return '通过';
    if (result === 'reject') return '不通过';
    return '—';
  });

  const memberResultText = computed(() => {
    const list = report.value?.memberOpinions ?? [];
    const byId = new Map(list.map((item) => [item.expertId || '', item]));
    const parts: string[] = [];
    const used = new Set<string>();
    for (const expert of experts.value) {
      const item = byId.get(expert.id);
      if (!item) continue;
      used.add(expert.id);
      parts.push(`${expert.name} ${opinionResult(item)}`.trim());
    }
    for (const item of list) {
      if (item.expertId && used.has(item.expertId)) continue;
      parts.push(`${item.expertName || ''} ${opinionResult(item)}`.trim());
    }
    return parts.length ? parts.join('；') : '—';
  });

  async function handleExport() {
    if (!report.value || !paperRef.value || exporting.value) return;
    exporting.value = true;
    try {
      const failed = await exportReviewReportZip({
        paper: paperRef.value,
        projectName: report.value.projectName || '评估报告',
        files: report.value.exportFiles ?? report.value.files ?? [],
      });
      if (failed.length) {
        showMessage(`导出完成，以下附件未能打包：${failed.join('、')}`);
      } else {
        showMessage('导出成功');
      }
    } catch (error) {
      showMessage(error instanceof Error ? error.message : '导出失败');
    } finally {
      exporting.value = false;
    }
  }

  onMounted(async () => {
    try {
      report.value = await reviewProjectReport(props.record?.id);
    } catch (error) {
      showMessage(error instanceof Error ? error.message : '加载评估报告失败');
    } finally {
      loading.value = false;
    }
  });
</script>
<style scoped>
  table th,
  table td {
    border: 1px solid #e8e8e8;
    padding: 10px 12px;
    text-align: left;
  }
</style>
