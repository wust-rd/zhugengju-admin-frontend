<!--
  ifco —— 实施进度填报 · 月度进度填报列表面板（monthly/list 页三视角同表格：
  列与筛选不分角色，仅操作列按视角区分）

  搜索表单（项目名称/五改类型/片区批次/项目归属/当前建设阶段/流程状态/选择年份/
  选择月份）+ 工具栏（一键导出）+ 表格（表头换行显示；金额四列=项目投资估算/
  本年度计划完成投资/年度累计完成投资/当月完成投资，均亿元右对齐；年度投资进度=
  累计/计划派生百分比；两描述列+实施进度完成百分比+指定填报主体+入库纳统情况）。
  操作列按流程状态变化（填报主体任何状态恒有查看）：待提交/退回修改=查看+编辑，
  待区级审查/待市级审查/市级审查通过=仅查看。查看/编辑走
  monthly-form.vue 表单抽屉（月度进度情况/月度投资情况/项目纳统情况 三区 +
  退回修改横幅）。
-->
<template>
  <div class="monthly-fill-table">
    <BasicTable @register="registerTable">
      <template #toolbar>
        <a-button @click="handleTodo('一键导出')"> 一键导出 </a-button>
      </template>
      <template #renewalAreaBatch="{ record }">{{ renewalAreaBatchLabel(record.renewalAreaBatch) }}</template>
      <template #fiveReformType="{ record }">{{ fiveReformLabel(record.fiveReformType) }}</template>
      <template #projectAffiliation="{ record }">{{ projectAffiliationLabel(record.projectAffiliation) }}</template>
      <template #monthPlan="{ record }">
        {{ monthPlanOf(record.projectCode, Number(String(record.reportMonth ?? '').slice(5, 7))) }}
      </template>
      <template #yearProgress="{ record }">{{ yearProgressPercent(record) }}</template>
      <template #implementProgress="{ record }">
        {{ record.implementProgress != null ? `${record.implementProgress}%` : '—' }}
      </template>
      <template #progressReminder="{ record }">
        <Tag v-bind="progressReminderTagProps(progressReminderOf(record))" style="border-radius: 10px">
          {{ progressReminderOf(record) }}
        </Tag>
      </template>
      <template #fillStatus="{ record }">
        <Tag v-bind="fillStatusTagProps(record.fillStatus)" style="border-radius: 10px">
          {{ record.fillStatus }}
        </Tag>
      </template>
    </BasicTable>

    <!-- 查看/编辑一体表单抽屉 -->
    <MonthlyForm @register="registerDrawer" @success="handleSuccess" />
  </div>
</template>
<script lang="ts" setup name="ViewsIfcoImplProgressFillMonthlyPanel">
  import { Tag } from 'antdv-next';
  import { onMounted, ref } from 'vue';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useDrawer } from '@jeesite/core/components/Drawer';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { buildYearItems } from '@jeesite/core/libs/year';
  import { match } from 'ts-pattern';
  import {
    FIVE_REFORM_TYPE_OPTIONS,
    PROJECT_AFFILIATION_OPTIONS,
    RENEWAL_AREA_BATCH_OPTIONS,
  } from '@jeesite/ifco/api/ifco/project-library';
  import {
    CONSTRUCTION_STAGE_OPTIONS,
    FILL_STATUS_OPTIONS,
    MONTH_OPTIONS,
    fetchMonthlyRows,
    fillStatusTagProps,
    filterMonthlies,
    fiveReformLabel,
    monthPlanOf,
    progressReminderOf,
    progressReminderTagProps,
    projectAffiliationLabel,
    renewalAreaBatchLabel,
    yearProgressPercent,
    type FillStatus,
    type MonthlyItem,
  } from '@jeesite/ifco/api/ifco/impl-progress';
  import MonthlyForm from './monthly-form.vue';

  const { showMessage } = useMessage();

  /** 前三列（项目编号/项目名称/行政区）固定左侧；末四列（项目进度提醒/当前建设阶段/流程状态/操作）固定右侧；金额四列右对齐、表头换行 */
  const columns: BasicColumn[] = [
    { title: '项目编号', dataIndex: 'projectCode', width: 100, fixed: 'left' },
    { title: '项目名称', dataIndex: 'projectName', width: 200, fixed: 'left' },
    { title: '行政区', dataIndex: 'district', width: 90, fixed: 'left' },
    { title: '片区名称', dataIndex: 'renewalAreaName', width: 100 },
    { title: '片区批次', dataIndex: 'renewalAreaBatch', width: 90, slot: 'renewalAreaBatch' },
    { title: '五改分类', dataIndex: 'fiveReformType', width: 110, slot: 'fiveReformType' },
    { title: '项目归属', dataIndex: 'projectAffiliation', width: 130, slot: 'projectAffiliation' },
    { title: '当前形象进度', dataIndex: 'currentProgress', width: 140 },
    { title: '项目投资估算（亿元）', dataIndex: 'investEstimate', width: 130, align: 'right' },
    { title: '本年度计划完成投资（亿元）', dataIndex: 'yearInvest', width: 130, align: 'right' },
    { title: '年度累计完成投资（亿元）', dataIndex: 'yearAccumulatedInvest', width: 150, align: 'right' },
    { title: '当月完成投资（亿元）', dataIndex: 'monthCompletedInvest', width: 130, align: 'right' },
    { title: '年度投资进度', dataIndex: 'yearProgress', width: 110, slot: 'yearProgress' },
    { title: '当月进度计划安排（分项简要描述）', dataIndex: 'monthPlan', width: 220, slot: 'monthPlan' },
    { title: '完成进度计划情况', dataIndex: 'monthProgressDesc', width: 220 },
    { title: '实施进度完成百分比', dataIndex: 'implementProgress', width: 130, slot: 'implementProgress' },
    { title: '指定填报主体', dataIndex: 'reportOrg', width: 150 },
    { title: '入库纳统情况', dataIndex: 'statisticsIncluded', width: 110 },
    { title: '项目进度提醒', dataIndex: 'progressReminder', width: 120, fixed: 'right', slot: 'progressReminder' },
    { title: '当前建设阶段', dataIndex: 'constructionStage', width: 100, fixed: 'right' },
    { title: '流程状态', dataIndex: 'fillStatus', width: 100, fixed: 'right', slot: 'fillStatus' },
  ];

  type MonthlyAction = '查看' | '编辑';

  /** 操作列按钮按流程状态变化（exhaustive：新增状态漏配时编译报错） */
  function actionsByStatus(status: FillStatus): MonthlyAction[] {
    return match(status)
      .with('待提交', '退回修改', () => ['查看', '编辑'] as MonthlyAction[])
      .with('待区级审查', '待市级审查', '市级审查通过', () => ['查看'] as MonthlyAction[])
      .exhaustive();
  }

  const actionColumn: BasicColumn = {
    width: 120,
    fixed: 'right',
    actions: (record: Recordable) =>
      actionsByStatus(record.fillStatus as FillStatus).map((action) => ({
        label: action,
        onClick: () => handleAction(action, record),
      })),
  };

  const [registerDrawer, { openDrawer, setDrawerProps }] = useDrawer();

  /** 打开表单抽屉：查看=表单禁用且无底部按钮（showFooter 打开前预设，硬性规则） */
  function handleForm(record: Recordable) {
    setDrawerProps({ showFooter: !record.isView });
    openDrawer(true, record);
  }

  function handleAction(action: MonthlyAction, record: Recordable) {
    match(action)
      .with('查看', () => handleForm({ ...record, isView: true }))
      .with('编辑', () => handleForm({ ...record }))
      .exhaustive();
  }

  const fillStatusOptions = FILL_STATUS_OPTIONS.map((name) => ({ label: name, value: name }));
  const stageOptions = CONSTRUCTION_STAGE_OPTIONS.map((name) => ({ label: name, value: name }));
  const yearOptions = (buildYearItems(3) as { key: string; label: string }[]).map((item) => ({
    label: item.label,
    value: item.key,
  }));

  /** 实施库行基线（项目库 page 接口 library=implementing 合并内存工作流态） */
  const baseRows = ref<MonthlyItem[]>([]);

  const [registerTable, { setTableData, getForm }] = useTable({
    dataSource: [],
    columns,
    actionColumn,
    // 表头换行：表级 ellipsis 默认 true 会给列灌 ant-table-cell-ellipsis 截断表头（如「项目进度…」），关掉；列上显式 ellipsis: true 仍生效
    ellipsis: false,
    showTableSetting: true,
    showIndexColumn: false,
    useSearchForm: true,
    pagination: { pageSize: 8 },
    canResize: true,
    formConfig: {
      baseColProps: { md: 8, lg: 6 },
      labelWidth: 90,
      schemas: [
        { label: '项目名称', field: 'projectName', component: 'Input' },
        {
          label: '五改类型',
          field: 'fiveReformType',
          component: 'Select',
          componentProps: { options: [...FIVE_REFORM_TYPE_OPTIONS], allowClear: true },
        },
        {
          label: '片区批次',
          field: 'renewalAreaBatch',
          component: 'Select',
          componentProps: { options: [...RENEWAL_AREA_BATCH_OPTIONS], allowClear: true },
        },
        {
          label: '项目归属',
          field: 'projectAffiliation',
          component: 'Select',
          componentProps: { options: [...PROJECT_AFFILIATION_OPTIONS], allowClear: true },
        },
        {
          label: '当前建设阶段',
          field: 'constructionStage',
          component: 'Select',
          componentProps: { options: stageOptions, allowClear: true },
        },
        {
          label: '流程状态',
          field: 'fillStatus',
          component: 'Select',
          componentProps: { options: fillStatusOptions, allowClear: true },
        },
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
      ],
    },
    // 查询/重置走本地过滤
    handleSearchInfoFn: (params: Recordable) => {
      setTableData(filterMonthlies(params, baseRows.value));
      return params;
    },
  });

  onMounted(loadRows);

  /** 拉取实施库行并按当前搜索条件重铺 */
  async function loadRows() {
    try {
      baseRows.value = (await fetchMonthlyRows()) ?? [];
    } catch (e) {
      showMessage((e as Error)?.message || '实施库项目加载失败');
      baseRows.value = [];
    }
    setTableData(filterMonthlies(getForm().getFieldsValue(), baseRows.value));
  }

  /** 表单保存/审查提交回调：重拉合并（工作流态在内存仓库，基本信息以项目库为准） */
  function handleSuccess() {
    loadRows();
  }

  /** 占位操作（TODO：随导出后端接入） */
  function handleTodo(label: string) {
    showMessage(`${label}：功能待接入`);
  }
</script>
<style scoped>
  /* 表头换行显示（长列名两行，如「年度累计完成投资（亿元）」） */
  .monthly-fill-table :deep(.ant-table-thead > tr > th) {
    white-space: normal;
  }
</style>
