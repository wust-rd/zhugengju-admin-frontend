<!--
  ifco —— 片区三色图进展列表面板（区级/市级页共用，role 区分视角）

  搜索表单（选择季度(DatePicker 季度面板)/行政区/片区名称/片区批次/三色图状态/
  评估状态）+ 工具栏（一键导出表格占位、一键导出附件=三色图附件 docx，见
  tricolor-export.ts）+ 表格（片区维度行：投资五件套 +
  年度投资进度进度条 + 三色图状态胶囊；窄列表头自动换行）。三色口径：红=滞后、黄=预警、
  绿=进展良好，未评估显示 -。
  区级/市级操作列均有「查看」（抽屉展示逐季度评估历史：每季度调整片区三色，
  当前周期+历史季度颜色，最新在前）；市级另有「编辑」（抽屉显示片区编号/片区名称，
  选择 红/黄/绿 提交，更新片区本周期评估结果）。
-->
<template>
  <div class="tricolor-table">
    <BasicTable @register="registerTable">
      <template #toolbar>
        <a-button @click="handleTodo('一键导出表格')"> 一键导出表格 </a-button>
        <a-button @click="handleExportAttachment"> 一键导出附件 </a-button>
      </template>
      <template #renewalAreaBatch="{ record }">{{ renewalAreaBatchLabel(record.renewalAreaBatch) }}</template>
      <template #orientationList="{ record }">
        {{ record.orientationList.map(orientationLabel).join('、') || '/' }}
      </template>
      <template #yearProgress="{ record }">
        <div class="flex items-center gap-8px">
          <Progress :percent="record.yearProgress" :show-info="false" size="small" class="flex-1" />
          <span class="w-38px shrink-0 text-right text-12px text-gray-600">{{ record.yearProgress }}%</span>
        </div>
      </template>
      <template #triColor="{ record }">
        <Tag v-if="record.triColor" v-bind="triColorTagProps(record.triColor)" style="border-radius: 10px">
          {{ record.triColor }}
        </Tag>
        <span v-else class="text-gray-400">-</span>
      </template>
    </BasicTable>

    <!-- 三色图进展评估抽屉（市级编辑入口，选择本周期评估结果） -->
    <BasicDrawer @register="registerDrawer" title="编辑三色图进展" width="480px" show-footer @ok="handleEvaluateOk">
      <div class="mb-16px flex flex-col gap-4px">
        <div><span class="mr-8px text-gray-500">片区编号：</span>{{ evaluateTarget?.areaCode }}</div>
        <div><span class="mr-8px text-gray-500">片区名称：</span>{{ evaluateTarget?.areaName }}</div>
      </div>
      <div class="mb-8px text-14px"> <span class="text-#ff4d4f">*</span> 三色图进展 </div>
      <Select
        v-model:value="evaluateValue"
        :options="triColorOptions"
        placeholder="请选择三色图进展"
        style="width: 100%"
      />
    </BasicDrawer>

    <!-- 三色图历史抽屉（区级/市级查看入口：逐季度评估结果，当前周期+历史季度，最新在前） -->
    <BasicDrawer @register="registerHistoryDrawer" title="查看三色图历史" width="520px" :show-footer="false">
      <div class="mb-16px flex flex-col gap-4px">
        <div><span class="mr-8px text-gray-500">片区编号：</span>{{ viewTarget?.areaCode }}</div>
        <div><span class="mr-8px text-gray-500">片区名称：</span>{{ viewTarget?.areaName }}</div>
      </div>
      <div class="mb-8px text-14px font-600 text-gray-800">逐季度评估结果</div>
      <div class="flex flex-col">
        <div
          v-for="item in viewHistory"
          :key="item.quarter"
          class="flex items-center gap-12px b-b-1 b-b-solid b-gray-100 py-10px text-14px"
        >
          <span class="w-110px shrink-0 text-gray-700">{{ quarterLabel(item.quarter) }}</span>
          <Tag v-if="item.status" v-bind="triColorTagProps(item.status)" style="border-radius: 10px">
            {{ item.status }}
          </Tag>
          <span v-else class="text-gray-400">未评估</span>
          <span v-if="item.current" class="text-12px text-gray-400">本周期</span>
        </div>
      </div>
    </BasicDrawer>
  </div>
</template>
<script lang="ts" setup name="ViewsIfcoImplProgressSharedTricolorPanel">
  import { computed, ref } from 'vue';
  import { Progress, Select, Tag } from 'antdv-next';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { BasicDrawer, useDrawer } from '@jeesite/core/components/Drawer';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { onMounted } from 'vue';
  import {
    AREAS_TRICOLOR,
    TRICOLOR_STATUS_OPTIONS,
    fetchTricolorAreas,
    filterAreas,
    orientationLabel,
    renewalAreaBatchLabel,
    saveTricolorArea,
    triColorTagProps,
    type AreaTricolorItem,
    type TriColorStatus,
  } from '@jeesite/ifco/api/ifco/impl-progress';
  import { DISTRICTS, RENEWAL_AREA_BATCH_OPTIONS } from '@jeesite/ifco/api/ifco/project-library';
  import { exportTricolorDocx } from './tricolor-export';

  /** 视角：区级=纯查看列表（无操作列）；市级=操作列编辑（三色图评估） */
  const props = defineProps<{
    role: 'district' | 'urban';
  }>();

  const { showMessage } = useMessage();

  /** 片区编号/片区名称固定左侧，三色图状态固定右侧（与操作列同翼）；金额右对齐 */
  const columns: BasicColumn[] = [
    { title: '片区编号', dataIndex: 'areaCode', width: 100, fixed: 'left' },
    { title: '片区名称', dataIndex: 'areaName', width: 110, fixed: 'left' },
    { title: '片区批次', dataIndex: 'renewalAreaBatch', width: 90, slot: 'renewalAreaBatch' },
    { title: '行政区', dataIndex: 'district', width: 110 },
    { title: '片区功能定位', dataIndex: 'orientationList', width: 220, slot: 'orientationList' },
    { title: '总体投资估算（亿元）', dataIndex: 'totalInvestEstimate', width: 130, align: 'right' },
    { title: '累计已完成投资（亿元）', dataIndex: 'accumulatedInvest', width: 140, align: 'right' },
    { title: '年度总投资计划（亿元）', dataIndex: 'yearTotalPlanInvest', width: 150, align: 'right' },
    { title: '季度完成投资（亿元）', dataIndex: 'quarterInvest', width: 130, align: 'right' },
    { title: '年度已完成投资（亿元）', dataIndex: 'yearCompletedInvest', width: 140, align: 'right' },
    { title: '年度投资进度', dataIndex: 'yearProgress', width: 150, slot: 'yearProgress' },
    { title: '三色图状态', dataIndex: 'triColor', width: 100, fixed: 'right', slot: 'triColor' },
  ];

  // ── 三色图进展评估抽屉 ──────────────────────────────────────────────
  const evaluateValue = ref<TriColorStatus | undefined>(undefined);
  const evaluateTarget = ref<AreaTricolorItem | null>(null);
  const triColorOptions = TRICOLOR_STATUS_OPTIONS.map((name) => ({ label: name, value: name }));
  const [registerDrawer, { openDrawer, closeDrawer }] = useDrawer();

  function openEvaluateDrawer(record: AreaTricolorItem) {
    evaluateTarget.value = record;
    evaluateValue.value = record.triColor || undefined;
    openDrawer(true);
  }

  /** 提交评估结果：红/黄/绿必选，写回片区本周期三色图状态 */
  async function handleEvaluateOk() {
    if (!evaluateValue.value) {
      showMessage('请选择三色图进展');
      return;
    }
    const target = AREAS_TRICOLOR.find((item) => item.areaCode === evaluateTarget.value?.areaCode);
    if (target) {
      await saveTricolorArea({ ...target, triColor: evaluateValue.value });
    }
    closeDrawer();
    showMessage('评估成功');
    await refresh();
  }

  /** 市级操作列：查看=历史抽屉；编辑=抽屉选择三色图进展 */
  const actionColumn: BasicColumn = {
    width: 110,
    fixed: 'right',
    actions: (record: Recordable) => [
      { label: '查看', onClick: () => openHistoryDrawer(record as AreaTricolorItem) },
      ...(props.role === 'urban'
        ? [{ label: '编辑', onClick: () => openEvaluateDrawer(record as AreaTricolorItem) }]
        : []),
    ],
  };

  // ── 三色图历史抽屉（每季度调整片区三色；当前周期+历史季度，最新在前） ──
  const viewTarget = ref<AreaTricolorItem | null>(null);

  /** 评估周期（YYYY-MM）→ 季度键（YYYY-Q） */
  function quarterOf(period: string): string {
    const year = Number(period.slice(0, 4));
    const month = Number(period.slice(5, 7));
    return year && month ? `${year}-${Math.ceil(month / 3)}` : period;
  }

  /** 季度键（YYYY-Q）→ 文案（2026年第3季度） */
  function quarterLabel(quarter: string): string {
    const [year, seq] = quarter.split('-');
    return year && seq ? `${year}年第${seq}季度` : '/';
  }

  const viewHistory = computed<{ quarter: string; status: TriColorStatus; current?: boolean }[]>(() => {
    const target = viewTarget.value;
    if (!target) return [];
    const items: { quarter: string; status: TriColorStatus; current?: boolean }[] = [
      { quarter: quarterOf(target.evaluatePeriod), status: target.triColor, current: true },
      ...(target.history ?? []),
    ];
    return items.sort((a, b) => b.quarter.localeCompare(a.quarter));
  });

  const [registerHistoryDrawer, { openDrawer: openHistory }] = useDrawer();

  function openHistoryDrawer(record: AreaTricolorItem) {
    viewTarget.value = record;
    openHistory(true);
  }

  const districtOptions = DISTRICTS.map((name) => ({ label: name, value: name }));

  const [registerTable, { setTableData, getForm }] = useTable({
    dataSource: [],
    columns,
    actionColumn,
    rowSelection: { type: 'checkbox' },
    showTableSetting: true,
    showIndexColumn: false,
    useSearchForm: true,
    pagination: { pageSize: 8 },
    canResize: true,
    formConfig: {
      baseColProps: { md: 8, lg: 6 },
      labelWidth: 100,
      schemas: [
        {
          label: '选择季度',
          field: 'quarter',
          component: 'DatePicker',
          componentProps: { picker: 'quarter', valueFormat: 'YYYY-Q', placeholder: '请选择季度' },
        },
        {
          label: '行政区',
          field: 'district',
          component: 'Select',
          componentProps: { options: districtOptions, allowClear: true },
        },
        { label: '片区名称', field: 'areaName', component: 'Input', componentProps: { placeholder: '请输入片区名称' } },
        {
          label: '片区批次',
          field: 'renewalAreaBatch',
          component: 'Select',
          componentProps: { options: [...RENEWAL_AREA_BATCH_OPTIONS], allowClear: true },
        },
        {
          label: '三色图状态',
          field: 'triColorStatus',
          component: 'Select',
          componentProps: { options: triColorOptions, allowClear: true },
        },
        {
          label: '评估状态',
          field: 'evalStatus',
          component: 'Select',
          componentProps: {
            options: [
              { label: '待评估', value: '待评估' },
              { label: '已评估', value: '已评估' },
            ],
            allowClear: true,
          },
        },
      ],
    },
    // 查询/重置走本地过滤（季度面板值 YYYY-Q 由 filterAreas 换算周期匹配）
    handleSearchInfoFn: (params: Recordable) => {
      setTableData(filterAreas(params));
      return params;
    },
  });

  onMounted(refresh);

  /** 行集重拉（后端 /tricolor/rows 回填缓存）后按当前条件重铺 */
  async function refresh() {
    await fetchTricolorAreas();
    setTableData(filterAreas(getForm().getFieldsValue()));
  }

  /** 一键导出附件：当前搜索结果按片区编号排序生成三色图附件 docx（周期=季度面板值，未选取数据最新周期） */
  async function handleExportAttachment() {
    const values = getForm().getFieldsValue();
    const rows = filterAreas(values)
      .slice()
      .sort((a, b) => a.areaCode.localeCompare(b.areaCode));
    if (!rows.length) {
      showMessage('当前条件下无可导出的片区');
      return;
    }
    const period =
      (values.quarter as string) ||
      rows.reduce((max, item) => (item.evaluatePeriod > max ? item.evaluatePeriod : max), rows[0].evaluatePeriod);
    try {
      await exportTricolorDocx(rows, period);
      showMessage('导出成功');
    } catch (error) {
      showMessage(error instanceof Error ? error.message : '导出失败');
    }
  }

  /** 占位操作（TODO：随片区详情/导出后端接入） */
  function handleTodo(label: string) {
    showMessage(`${label}：功能待接入`);
  }
</script>
<style scoped>
  /* 表头换行显示（窄列长列名自动折行，与月度列表同口径；antd th 默认 nowrap） */
  .tricolor-table :deep(.ant-table-thead > tr > th) {
    white-space: normal;
  }
</style>
