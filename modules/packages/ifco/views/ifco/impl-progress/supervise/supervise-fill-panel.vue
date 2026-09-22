<!--
  ifco —— 实施进度填报 · 提示/督办处理列表面板

  搜索表单（项目名称/五改类型/片区名称/项目归属/当前建设阶段/处理状态/选择年份/选择月份）
  + 工具栏（一键导出）+ 表格（督办 × 关联项目 扁平行：每行 = 一个项目收到的一条
  提示/督办，逐行独立处理）。操作列按处理状态变化：待处理/处理中=查看+去处理，
  已处理=仅查看。去处理走 supervise-form.vue 处理抽屉（下发信息横幅 + 处理表单）。
-->
<template>
  <div>
    <BasicTable @register="registerTable">
      <template #toolbar>
        <a-button @click="handleTodo('一键导出')"> 一键导出 </a-button>
      </template>
      <template #fiveReformType="{ record }">{{ fiveReformLabel(record.fiveReformType) }}</template>
      <template #handleStatus="{ record }">
        <Tag v-bind="handleStatusTagProps(record.handleStatus)" style="border-radius: 10px">
          {{ record.handleStatus }}
        </Tag>
      </template>
    </BasicTable>

    <!-- 查看/去处理一体处理抽屉 -->
    <SuperviseForm @register="registerDrawer" @success="handleSuccess" />
  </div>
</template>
<script lang="ts" setup name="ViewsIfcoImplProgressFillSupervisePanel">
  import { Tag } from 'antdv-next';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useDrawer } from '@jeesite/core/components/Drawer';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { buildYearItems } from '@jeesite/core/libs/year';
  import { match } from 'ts-pattern';
  import { FIVE_REFORM_TYPE_OPTIONS, PROJECT_AFFILIATION_OPTIONS } from '@jeesite/ifco/api/ifco/project-library';
  import {
    CONSTRUCTION_STAGE_OPTIONS,
    HANDLE_STATUS_OPTIONS,
    MONTH_OPTIONS,
    filterSuperviseRows,
    fiveReformLabel,
    handleStatusTagProps,
    type HandleStatus,
  } from '@jeesite/ifco/api/ifco/impl-progress';
  import SuperviseForm from './supervise-form.vue';

  const { showMessage } = useMessage();

  /** 项目编号/项目名称固定左侧，处理状态固定右侧（与操作列同翼）；具体问题超长省略 */
  const columns: BasicColumn[] = [
    { title: '项目编号', dataIndex: 'projectCode', width: 100, fixed: 'left' },
    { title: '项目名称', dataIndex: 'projectName', width: 200, fixed: 'left', ellipsis: true },
    { title: '行政区', dataIndex: 'district', width: 90 },
    { title: '片区名称', dataIndex: 'renewalAreaName', width: 100 },
    { title: '五改分类', dataIndex: 'fiveReformType', width: 110, slot: 'fiveReformType' },
    { title: '当前形象进度', dataIndex: 'currentProgress', width: 130, ellipsis: true },
    { title: '指定填报主体', dataIndex: 'reportOrg', width: 120 },
    { title: '具体问题', dataIndex: 'problem', width: 200, ellipsis: true },
    { title: '下发时间', dataIndex: 'dispatchDate', width: 110 },
    { title: '处理截止日期', dataIndex: 'deadline', width: 110 },
    { title: '处理状态', dataIndex: 'handleStatus', width: 100, fixed: 'right', slot: 'handleStatus' },
  ];

  type SuperviseAction = '查看' | '去处理';

  /** 操作列按钮按处理状态变化（exhaustive：新增状态漏配时编译报错） */
  function actionsByStatus(status: HandleStatus): SuperviseAction[] {
    return match(status)
      .with('待处理', '处理中', () => ['查看', '去处理'] as SuperviseAction[])
      .with('已处理', '已确认', () => ['查看'] as SuperviseAction[])
      .exhaustive();
  }

  const actionColumn: BasicColumn = {
    width: 120,
    fixed: 'right',
    actions: (record: Recordable) =>
      actionsByStatus(record.handleStatus as HandleStatus).map((action) => ({
        label: action,
        onClick: () => handleAction(action, record),
      })),
  };

  const [registerDrawer, { openDrawer, setDrawerProps }] = useDrawer();

  /** 打开处理抽屉：查看=表单禁用且无底部按钮（showFooter 打开前预设，硬性规则） */
  function handleForm(record: Recordable) {
    setDrawerProps({ showFooter: !record.isView });
    openDrawer(true, record);
  }

  function handleAction(action: SuperviseAction, record: Recordable) {
    match(action)
      .with('查看', () => handleForm({ ...record, isView: true }))
      .with('去处理', () => handleForm({ ...record }))
      .exhaustive();
  }

  const handleStatusOptions = HANDLE_STATUS_OPTIONS.map((name) => ({ label: name, value: name }));
  const stageOptions = CONSTRUCTION_STAGE_OPTIONS.map((name) => ({ label: name, value: name }));
  const yearOptions = (buildYearItems(3) as { key: string; label: string }[]).map((item) => ({
    label: item.label,
    value: item.key,
  }));

  const [registerTable, { setTableData, getForm }] = useTable({
    dataSource: filterSuperviseRows({}),
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
          label: '片区名称',
          field: 'renewalAreaName',
          component: 'Input',
          componentProps: { placeholder: '请输入片区名称' },
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
          label: '处理状态',
          field: 'handleStatus',
          component: 'Select',
          componentProps: { options: handleStatusOptions, allowClear: true },
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
      setTableData(filterSuperviseRows(params));
      return params;
    },
  });

  /** 处理抽屉保存回调：重铺数据（假数据为内存变更，刷新即恢复） */
  function handleSuccess() {
    setTableData(filterSuperviseRows(getForm().getFieldsValue()));
  }

  /** 占位操作（TODO：随导出后端接入） */
  function handleTodo(label: string) {
    showMessage(`${label}：功能待接入`);
  }
</script>
