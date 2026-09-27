<!--
  市住更局 —— 城市更新专家管理 · 专家评价 打分页（独立路由页，已接后端 /a/ure/eval/*）

  从「专家评价」列表（或项目评估列表「评价专家」）的【评价】进入（query：projectCode/projectName）。
  对本项目参与专家三维度打分（活跃度/专业度/效率，半星步进一颗星 2 分）：顶部三张排名卡
  （由本项目参与专家的均分排序），下方专家列表（操作：评价 / 历史记录）。
  全部参与专家评完后点右上「完成评价」（后端校验），项目 待评价 → 已完成。
  规划路由（后端隐藏菜单）：
   - 链接地址：/early-stage-planning/urban-renewal-expert-management/expert-evaluation/rate?projectCode=xx
   - 组件位置：.../expert-evaluation/rate；是否可见：隐藏；上级菜单挂「专家评价」以点亮侧边栏
-->
<template>
  <PageWrapper contentClass="flex flex-col gap-16px">
    <!-- 项目上下文头：项目名 + 返回 + 完成评价 -->
    <div class="flex items-center gap-12px shrink-0">
      <a-button @click="goBack">
        <span class="inline-flex items-center gap-4px">
          <span class="i-ant-design:arrow-left-outlined"></span> 返回
        </span>
      </a-button>
      <span class="text-16px font-500 text-gray-800">评价专家</span>
      <span v-if="projectName" class="text-14px text-gray-500">- {{ projectName }}</span>
      <a-button type="primary" class="ml-auto" :loading="finishing" @click="finishProjectEval"> 完成评价 </a-button>
    </div>

    <!-- 三张排名卡 -->
    <div class="grid grid-cols-3 gap-16px">
      <div
        v-for="card in rankCards"
        :key="card.title"
        class="bg-white rd-12px b-1 b-solid b-gray-100 p-16px shadow-sm"
        :style="{ '--accent': card.accent }"
      >
        <div class="flex items-center gap-8px">
          <span class="h-16px w-4px rd-full" :style="{ background: card.accent }"></span>
          <span class="text-15px font-600 text-gray-800">{{ card.title }}</span>
        </div>

        <div v-if="card.rows.length === 0" class="flex h-150px items-center justify-center text-13px text-gray-400">
          暂无评价数据
        </div>
        <div v-else class="mt-12px space-y-14px">
          <div v-for="(row, i) in card.rows" :key="`${card.title}-${row.name}`" class="flex items-center gap-10px">
            <span
              class="rank-badge flex h-22px w-22px shrink-0 items-center justify-center rd-full text-13px font-500 text-gray-500"
              >{{ i + 1 }}</span
            >
            <span class="w-56px shrink-0 truncate text-14px text-gray-800" :title="row.name">{{ row.name }}</span>
            <div class="h-10px flex-1 rd-full bg-[#EEF2F7] overflow-hidden">
              <div
                class="h-full rd-full"
                :style="{ width: `${(row.score / 10) * 100}%`, background: card.barGradient }"
              ></div>
            </div>
            <span class="w-36px shrink-0 text-right text-13px font-500 text-gray-700">{{ row.score.toFixed(1) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 专家列表 -->
    <BasicTable @register="registerTable" :showIndexColumn="false">
      <template #tableTitle>
        <span>项目参与专家</span>
      </template>
    </BasicTable>

    <!-- 打分 Modal -->
    <Modal
      v-model:open="rateModal.open"
      :title="`评价专家 - ${rateModal.expert?.name ?? ''}`"
      :confirm-loading="rateModal.loading"
      ok-text="确定"
      centered
      cancel-text="取消"
      @ok="submitRate"
    >
      <div class="flex flex-col gap-18px py-16px">
        <div v-for="dim in RATE_DIMENSIONS" :key="dim.key" class="flex items-center gap-12px">
          <span class="shrink-0 text-right text-14px text-gray-700 w-200px">{{ dim.label }}（10分）:</span>
          <Rate v-model:value="rateModal[dim.key]" allow-half />
          <span class="text-14px text-gray-500">{{ (rateModal[dim.key] * 2).toFixed(1) }} 分</span>
        </div>
        <div class="flex items-start gap-12px">
          <span class="w-110px shrink-0 text-right text-14px leading-32px text-gray-700">评价说明:</span>
          <Input.TextArea v-model:value="rateModal.comment" :rows="3" placeholder="请输入内容" class="flex-1" />
        </div>
      </div>
    </Modal>

    <!-- 历史评价 Modal -->
    <Modal v-model:open="historyModal.open" width="720px" centered :footer="null">
      <template #title>
        <span>历史评价</span>
        <span v-if="historyModal.expertName" class="ml-8px text-14px font-400 text-gray-500">{{ historyModal.expertName }}</span>
      </template>
      <div class="max-h-[60vh] overflow-y-auto pr-4px">
        <div v-if="historyRecords.length === 0" class="flex h-200px items-center justify-center text-14px text-gray-400">
          该专家暂无评价记录
        </div>
        <div v-else class="space-y-16px">
          <div v-for="rec in historyRecords" :key="rec.id" class="rd-8px bg-[#EBF3FB] p-16px">
            <div class="flex items-center gap-24px text-13px text-gray-700">
              <span>评价人: {{ rec.evaluator }}</span>
              <span>评价时间: {{ rec.time }}</span>
              <a-button type="link" danger size="small" class="ml-auto" @click="handleHistoryDelete(rec)">删除</a-button>
            </div>
            <div class="mt-10px flex flex-wrap items-center gap-x-32px gap-y-6px text-13px text-gray-700">
              <span class="flex items-center gap-8px">活跃度: <Rate :value="rec.activityStars" allow-half disabled class="text-16px" /></span>
              <span class="flex items-center gap-8px">专业度: <Rate :value="rec.coverageStars" allow-half disabled class="text-16px" /></span>
              <span class="flex items-center gap-8px">效率: <Rate :value="rec.efficiencyStars" allow-half disabled class="text-16px" /></span>
            </div>
            <div class="mt-10px flex items-start gap-8px text-13px">
              <span class="shrink-0 text-gray-700">评价说明:</span>
              <span class="leading-22px text-gray-600">{{ rec.comment || '—' }}</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsEarlyStageUrbanRenewalExpertEvaluationRate">
  import { computed, onMounted, reactive, ref, unref } from 'vue';
  import { Input, Modal, Rate } from 'antdv-next';
  import { useGo } from '@jeesite/core/hooks/web/usePage';
  import { useRoute } from 'vue-router';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import {
    ureEvalDelete,
    ureEvalList,
    ureEvalPage,
    ureEvalSave,
  } from '@jeesite/early-stage-planning/api/early-stage-planning/ure-eval';
  import type { UreEvalExpertRow, UreEvalRecordRow } from '@jeesite/early-stage-planning/api/early-stage-planning/ure-eval';
  import { ureProjectDetail, ureProjectFinishEval } from '@jeesite/early-stage-planning/api/early-stage-planning/ure-project';

  const { showMessage } = useMessage();
  const route = useRoute();
  const go = useGo();

  const LIST_ROUTE = '/early-stage-planning/urban-renewal-expert-management/expert-evaluation/index';

  /** 路由参数：projectCode / projectName */
  const projectCode = String(unref(route.query).projectCode ?? '');
  const projectName = String(unref(route.query).projectName ?? '');

  /** 打分维度定义 */
  const RATE_DIMENSIONS = [
    { key: 'activity', label: '活跃度' },
    { key: 'coverage', label: '专业度' },
    { key: 'efficiency', label: '效率' },
  ] as const;

  /** 专家列表行（后端聚合三维度均分与次数；项目模式=该项目参与专家） */
  const expertRows = ref<UreEvalExpertRow[]>([]);

  async function loadExperts() {
    if (!projectCode) return;
    try {
      expertRows.value = await ureEvalList({ projectCode });
      setTableData(expertRows.value);
    } catch (e) {
      showMessage((e as Error)?.message || '专家列表加载失败');
    }
  }

  onMounted(loadExperts);

  /** 三张排名卡（Top5，主题色 per card；由本项目参与专家均分排序） */
  const rankCards = computed(() => [
    {
      title: '活跃度排名',
      accent: '#3A8EF6',
      barGradient: 'linear-gradient(90deg, #5AB2FF 0%, #3A8EF6 100%)',
      rows: [...expertRows.value]
        .filter((e) => e.avgActivity > 0)
        .sort((a, b) => b.avgActivity - a.avgActivity)
        .slice(0, 5)
        .map((e) => ({ name: e.name, score: e.avgActivity })),
    },
    {
      title: '专业度排名',
      accent: '#2AB69B',
      barGradient: 'linear-gradient(90deg, #4ED3B8 0%, #2AB69B 100%)',
      rows: [...expertRows.value]
        .filter((e) => e.avgCoverage > 0)
        .sort((a, b) => b.avgCoverage - a.avgCoverage)
        .slice(0, 5)
        .map((e) => ({ name: e.name, score: e.avgCoverage })),
    },
    {
      title: '效率排名',
      accent: '#F7A832',
      barGradient: 'linear-gradient(90deg, #FFC163 0%, #F7A832 100%)',
      rows: [...expertRows.value]
        .filter((e) => e.avgEfficiency > 0)
        .sort((a, b) => b.avgEfficiency - a.avgEfficiency)
        .slice(0, 5)
        .map((e) => ({ name: e.name, score: e.avgEfficiency })),
    },
  ]);

  /** 表格列 */
  const columns: BasicColumn[] = [
    { title: '专家姓名', dataIndex: 'name', width: 100 },
    { title: '性别', dataIndex: 'gender', width: 70 },
    { title: '年龄', dataIndex: 'age', width: 70 },
    { title: '联系电话', dataIndex: 'phone', width: 130 },
    { title: '评价次数', dataIndex: 'evalCount', width: 90, align: 'center' },
    { title: '活跃度得分（10）', dataIndex: 'avgActivity', width: 140, align: 'center' },
    { title: '专业度得分（10）', dataIndex: 'avgCoverage', width: 140, align: 'center' },
    { title: '效率得分（10）', dataIndex: 'avgEfficiency', width: 130, align: 'center' },
  ];

  const actionColumn: BasicColumn = {
    width: 150,
    actions: (record: Recordable) => [
      { label: '评价', onClick: () => openRateModal(record as unknown as UreEvalExpertRow) },
      { label: '历史记录', onClick: () => openHistory(record as unknown as UreEvalExpertRow) },
    ],
  };

  const [registerTable, { setTableData }] = useTable({
    dataSource: [],
    columns,
    actionColumn,
    showTableSetting: false,
    showIndexColumn: false,
    pagination: { pageSize: 10 },
    canResize: true,
  });

  /** 打分 Modal */
  const rateModal = reactive({
    open: false,
    loading: false,
    activity: 0,
    coverage: 0,
    efficiency: 0,
    comment: '',
    expert: null as UreEvalExpertRow | null,
  });

  function openRateModal(expert: UreEvalExpertRow) {
    rateModal.expert = expert;
    rateModal.activity = 0;
    rateModal.coverage = 0;
    rateModal.efficiency = 0;
    rateModal.comment = '';
    rateModal.open = true;
  }

  async function submitRate() {
    const expert = rateModal.expert;
    if (!expert) return;
    if (!rateModal.activity || !rateModal.coverage || !rateModal.efficiency) {
      showMessage('请为三个维度都打分');
      return;
    }
    rateModal.loading = true;
    try {
      await ureEvalSave({
        expertId: expert.id,
        activityStars: rateModal.activity,
        coverageStars: rateModal.coverage,
        efficiencyStars: rateModal.efficiency,
        comment: rateModal.comment || undefined,
        projectCode: projectCode || undefined,
      });
      rateModal.open = false;
      showMessage('评价成功');
      await loadExperts();
    } finally {
      rateModal.loading = false;
    }
  }

  /** 完成评价（后端校验全部参与专家已有本项目评价记录；待评价 → 已完成） */
  const finishing = ref(false);

  async function finishProjectEval() {
    if (!projectCode) return;
    finishing.value = true;
    try {
      const detail = await ureProjectDetail(projectCode);
      await ureProjectFinishEval(detail.id);
      showMessage('专家评价完成，项目已完成');
      goBack();
    } catch (e) {
      showMessage((e as Error)?.message || '完成评价失败');
    } finally {
      finishing.value = false;
    }
  }

  /** 历史评价 Modal（本项目内该专家的评价记录） */
  const historyModal = reactive({
    open: false,
    expertId: '',
    expertName: '',
  });
  const historyRecords = ref<UreEvalRecordRow[]>([]);

  async function openHistory(expert: UreEvalExpertRow) {
    historyModal.expertId = expert.id;
    historyModal.expertName = expert.name;
    historyModal.open = true;
    try {
      const page = await ureEvalPage({ expertId: expert.id, projectCode: projectCode || undefined, pageNo: 1, pageSize: 50 });
      historyRecords.value = page.list;
    } catch (e) {
      historyRecords.value = [];
    }
  }

  async function handleHistoryDelete(rec: Recordable) {
    try {
      await ureEvalDelete(rec.id);
      showMessage('删除成功');
      const expert = expertRows.value.find((e) => e.id === historyModal.expertId);
      if (expert) await openHistory(expert);
      await loadExperts();
    } catch (e) {
      showMessage((e as Error)?.message || '删除失败');
    }
  }

  function goBack() {
    go(LIST_ROUTE);
  }
</script>

<style scoped>
  .rank-badge {
    transition:
      background-color 0.2s,
      color 0.2s;
  }
  .rank-badge:hover {
    background: var(--accent, #3e8ef7);
    color: #fff;
  }
</style>
