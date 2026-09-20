<!--
  ifco —— 片区三色图进展列表面板（区级/市级页共用）

  搜索表单（选择年份/选择月份/行政区/片区名称/片区批次/三色图状态/评估状态）
  + 工具栏（一键导出表格、一键导出附件）+ 表格（片区维度行：投资五件套 +
  年度投资进度进度条 + 三色图状态胶囊）。三色口径：红=滞后、黄=预警、
  绿=进展良好，未评估显示 -。操作列：查看（占位）+ 三色图进展
  （弹窗选择 红/黄/绿 提交，更新片区本周期评估结果）。
-->
<template>
  <div>
    <BasicTable @register="registerTable">
      <template #toolbar>
        <a-button @click="handleTodo('一键导出表格')"> 一键导出表格 </a-button>
        <a-button @click="handleTodo('一键导出附件')"> 一键导出附件 </a-button>
      </template>
      <template #renewalAreaBatch="{ record }">{{ renewalAreaBatchLabel(record.renewalAreaBatch) }}</template>
      <template #orientationList="{ record }">{{ record.orientationList.join('、') || '/' }}</template>
      <template #yearProgress="{ record }">
        <div class="flex items-center gap-8px">
          <Progress :percent="record.yearProgress" size="small" class="flex-1" />
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

    <!-- 三色图进展评估弹窗（选择本周期评估结果） -->
    <Modal v-model:open="evaluateOpen" title="选择三色图进展" @ok="handleEvaluateOk">
      <div class="mb-8px text-14px">
        <span class="text-#ff4d4f">*</span> 三色图进展
        <span class="ml-8px text-12px text-gray-400">红=滞后、黄=预警、绿=进展良好</span>
      </div>
      <Select
        v-model:value="evaluateValue"
        :options="triColorOptions"
        placeholder="请选择三色图进展"
        style="width: 100%"
      />
    </Modal>
  </div>
</template>
<script lang="ts" setup name="ViewsIfcoImplProgressSharedTricolorPanel">
  import { ref } from 'vue';
  import { Modal, Progress, Select, Tag } from 'antdv-next';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { buildYearItems } from '@jeesite/core/libs/year';
  import {
    AREAS_TRICOLOR,
    MONTH_OPTIONS,
    TRICOLOR_STATUS_OPTIONS,
    filterAreas,
    renewalAreaBatchLabel,
    triColorTagProps,
    type AreaTricolorItem,
    type TriColorStatus,
  } from '@jeesite/ifco/api/ifco/impl-progress';
  import { DISTRICTS, RENEWAL_AREA_BATCH_OPTIONS } from '@jeesite/ifco/api/ifco/project-library';

  const { showMessage } = useMessage();

  /** 片区编号/片区名称固定左侧，三色图状态固定右侧（与操作列同翼）；金额右对齐 */
  const columns: BasicColumn[] = [
    { title: '片区编号', dataIndex: 'areaCode', width: 100, fixed: 'left' },
    { title: '行政区', dataIndex: 'district', width: 110 },
    { title: '片区名称', dataIndex: 'areaName', width: 110, fixed: 'left' },
    { title: '片区批次', dataIndex: 'renewalAreaBatch', width: 90, slot: 'renewalAreaBatch' },
    { title: '片区功能定位', dataIndex: 'orientationList', width: 140, slot: 'orientationList' },
    { title: '总体投资估算(亿元)', dataIndex: 'totalInvestEstimate', width: 130, align: 'right' },
    { title: '累计已完成投资(亿元)', dataIndex: 'accumulatedInvest', width: 140, align: 'right' },
    { title: '年度总体投资计划(亿元)', dataIndex: 'yearTotalPlanInvest', width: 150, align: 'right' },
    { title: '季度完成投资(亿元)', dataIndex: 'quarterInvest', width: 130, align: 'right' },
    { title: '年度已完成投资(亿元)', dataIndex: 'yearCompletedInvest', width: 140, align: 'right' },
    { title: '年度投资进度', dataIndex: 'yearProgress', width: 150, slot: 'yearProgress' },
    { title: '三色图状态', dataIndex: 'triColor', width: 100, fixed: 'right', slot: 'triColor' },
  ];

  type TricolorAction = '查看' | '三色图进展';

  const actionColumn: BasicColumn = {
    width: 150,
    fixed: 'right',
    actions: (record: Recordable) =>
      (['查看', '三色图进展'] as TricolorAction[]).map((action) => ({
        label: action,
        onClick: () => handleAction(action, record),
      })),
  };

  /** 查看=占位（片区详情抽屉待设计稿）；三色图进展=评估弹窗 */
  function handleAction(action: TricolorAction, record: Recordable) {
    if (action === '三色图进展') {
      openEvaluateModal(record as AreaTricolorItem);
    } else {
      handleTodo('查看');
    }
  }

  // ── 三色图进展评估弹窗 ──────────────────────────────────────────────
  const evaluateOpen = ref(false);
  const evaluateValue = ref<TriColorStatus | undefined>(undefined);
  const evaluateTarget = ref<AreaTricolorItem | null>(null);
  const triColorOptions = TRICOLOR_STATUS_OPTIONS.map((name) => ({ label: name, value: name }));

  function openEvaluateModal(record: AreaTricolorItem) {
    evaluateTarget.value = record;
    evaluateValue.value = record.triColor || undefined;
    evaluateOpen.value = true;
  }

  /** 提交评估结果：红/黄/绿必选，写回片区本周期三色图状态 */
  function handleEvaluateOk() {
    if (!evaluateValue.value) {
      showMessage('请选择三色图进展');
      return;
    }
    const target = AREAS_TRICOLOR.find((item) => item.areaCode === evaluateTarget.value?.areaCode);
    if (target) target.triColor = evaluateValue.value;
    evaluateOpen.value = false;
    showMessage('评估成功');
    refresh();
  }

  const districtOptions = DISTRICTS.map((name) => ({ label: name, value: name }));
  const yearOptions = (buildYearItems(3) as { key: string; label: string }[]).map((item) => ({
    label: item.label,
    value: item.key,
  }));

  const [registerTable, { setTableData, getForm }] = useTable({
    dataSource: filterAreas({}),
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
          label: '选择年份',
          field: 'year',
          component: 'Select',
          componentProps: { options: yearOptions, allowClear: true },
        },
        {
          label: '选择月份',
          field: 'month',
          component: 'Select',
          componentProps: { options: [...MONTH_OPTIONS], allowClear: true },
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
    // 无后端：查询/重置走本地过滤
    handleSearchInfoFn: (params: Recordable) => {
      setTableData(filterAreas(params));
      return params;
    },
  });

  /** 评估后按当前条件重铺数据（假数据为内存变更，刷新即恢复） */
  function refresh() {
    setTableData(filterAreas(getForm().getFieldsValue()));
  }

  /** 占位操作（TODO：随片区详情/导出后端接入） */
  function handleTodo(label: string) {
    showMessage(`${label}：功能待接入`);
  }
</script>
