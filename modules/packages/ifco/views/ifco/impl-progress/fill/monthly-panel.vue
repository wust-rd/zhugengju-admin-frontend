<!--
  ifco —— 实施进度填报 · 月度进度填报列表面板

  搜索表单（项目名称/五改类型/片区批次/项目归属/当前建设阶段/填报状态/选择年份/选择月份）
  + 工具栏（一键导出）+ 表格。操作列按填报状态变化：草稿/退回修改=查看+编辑，
  待确认/已确认=仅查看。查看/编辑走 monthly-form.vue 表单抽屉
  （月度进度情况/月度投资情况/项目纳统情况 三区 + 退回修改横幅）。
-->
<template>
  <div>
    <BasicTable @register="registerTable">
      <template #toolbar>
        <a-button @click="handleTodo('一键导出')"> 一键导出 </a-button>
      </template>
      <template #renewalAreaBatch="{ record }">{{ renewalAreaBatchLabel(record.renewalAreaBatch) }}</template>
      <template #fiveReformType="{ record }">{{ fiveReformLabel(record.fiveReformType) }}</template>
      <template #projectAffiliation="{ record }">{{ projectAffiliationLabel(record.projectAffiliation) }}</template>
      <template #progressReminder="{ record }">
        <Tag v-bind="progressReminderTagProps(record.progressReminder)" style="border-radius: 10px">
          {{ record.progressReminder }}
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
    PROGRESS_REMINDER_OPTIONS,
    fillStatusTagProps,
    filterMonthlies,
    fiveReformLabel,
    progressReminderTagProps,
    projectAffiliationLabel,
    renewalAreaBatchLabel,
    type FillStatus,
  } from '@jeesite/ifco/api/ifco/impl-progress';
  import MonthlyForm from './monthly-form.vue';

  const { showMessage } = useMessage();

  /** 项目编号/项目名称固定左侧，填报状态固定右侧（与操作列同翼）；金额右对齐 */
  const columns: BasicColumn[] = [
    { title: '项目编号', dataIndex: 'projectCode', width: 100, fixed: 'left' },
    { title: '项目名称', dataIndex: 'projectName', width: 200, fixed: 'left', ellipsis: true },
    { title: '行政区', dataIndex: 'district', width: 90 },
    { title: '片区名称', dataIndex: 'renewalAreaName', width: 100 },
    { title: '五改分类', dataIndex: 'fiveReformType', width: 110, slot: 'fiveReformType' },
    { title: '当前形象进度', dataIndex: 'currentProgress', width: 140, ellipsis: true },
    { title: '项目总投资(亿元)', dataIndex: 'totalInvest', width: 120, align: 'right' },
    { title: '年度投资计划(亿元)', dataIndex: 'yearPlanInvest', width: 130, align: 'right' },
    { title: '年度累计完成投资(亿元)', dataIndex: 'yearAccumulatedInvest', width: 150, align: 'right' },
    { title: '当月完成投资(亿元)', dataIndex: 'monthCompletedInvest', width: 130, align: 'right' },
    { title: '项目进度提醒', dataIndex: 'progressReminder', width: 100, slot: 'progressReminder' },
    { title: '当前建设阶段', dataIndex: 'constructionStage', width: 100 },
    { title: '填报状态', dataIndex: 'fillStatus', width: 100, fixed: 'right', slot: 'fillStatus' },
  ];

  type MonthlyAction = '查看' | '编辑';

  /** 操作列按钮按填报状态变化（exhaustive：新增状态漏配时编译报错） */
  function actionsByStatus(status: FillStatus): MonthlyAction[] {
    return match(status)
      .with('草稿', '退回修改', () => ['查看', '编辑'] as MonthlyAction[])
      .with('待确认', '已确认', () => ['查看'] as MonthlyAction[])
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

  const [registerTable, { setTableData, getForm }] = useTable({
    dataSource: filterMonthlies({}),
    columns,
    actionColumn,
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
          label: '填报状态',
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
    // 无后端：查询/重置走本地过滤
    handleSearchInfoFn: (params: Recordable) => {
      setTableData(filterMonthlies(params));
      return params;
    },
  });

  /** 表单保存回调：重铺数据（假数据为内存变更，刷新即恢复） */
  function handleSuccess() {
    setTableData(filterMonthlies(getForm().getFieldsValue()));
  }

  /** 占位操作（TODO：随导出后端接入） */
  function handleTodo(label: string) {
    showMessage(`${label}：功能待接入`);
  }
</script>
