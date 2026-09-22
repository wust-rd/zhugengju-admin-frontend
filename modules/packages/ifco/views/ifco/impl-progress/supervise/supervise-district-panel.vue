<!--
  ifco —— 区级实施进度管理 · 提示/督办列表面板

  搜索表单（选择年份/选择月份/下发编号/处理状态）+ 工具栏（一键导出）+ 表格
  （下发编号 维度整单行）。操作列按处理状态变化：待处理/处理中=查看+去处理，
  已处理=仅查看。去处理走 handle-form.vue 处理抽屉（下发信息只读 +
  涉及片区和项目的处理情况 + 区级处理情况）。
-->
<template>
  <div>
    <BasicTable @register="registerTable">
      <template #toolbar>
        <a-button @click="handleTodo('一键导出')"> 一键导出 </a-button>
      </template>
      <template #superviseType="{ record }">
        <Tag :color="record.superviseType === '督办' ? 'orange' : 'blue'" style="border-radius: 10px">
          {{ record.superviseType }}
        </Tag>
      </template>
      <template #handleStatus="{ record }">
        <Tag v-bind="handleStatusTagProps(record.districtHandleStatus)" style="border-radius: 10px">
          {{ record.districtHandleStatus }}
        </Tag>
      </template>
    </BasicTable>

    <!-- 查看/去处理一体处理抽屉 -->
    <HandleForm @register="registerDrawer" @success="handleSuccess" />
  </div>
</template>
<script lang="ts" setup name="ViewsIfcoImplProgressDistrictSupervisePanel">
  import { Tag } from 'antdv-next';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useDrawer } from '@jeesite/core/components/Drawer';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { buildYearItems } from '@jeesite/core/libs/year';
  import { match } from 'ts-pattern';
  import {
    HANDLE_STATUS_OPTIONS,
    MONTH_OPTIONS,
    filterSupervises,
    handleStatusTagProps,
    type HandleStatus,
  } from '@jeesite/ifco/api/ifco/impl-progress';
  import HandleForm from './handle-form.vue';

  const { showMessage } = useMessage();

  /** 下发编号固定左侧，处理状态固定右侧（与操作列同翼） */
  const columns: BasicColumn[] = [
    { title: '下发编号', dataIndex: 'dispatchNo', width: 180, fixed: 'left' },
    { title: '类型', dataIndex: 'superviseType', width: 90, slot: 'superviseType' },
    { title: '处理状态', dataIndex: 'districtHandleStatus', width: 100, fixed: 'right', slot: 'handleStatus' },
    { title: '下发部门', dataIndex: 'dispatchOrg', width: 110 },
    { title: '下发时间', dataIndex: 'dispatchDate', width: 110 },
    { title: '处理截止日期', dataIndex: 'deadline', width: 110 },
    { title: '具体问题', dataIndex: 'problem', width: 260, ellipsis: true },
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
      actionsByStatus(record.districtHandleStatus as HandleStatus).map((action) => ({
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
  const yearOptions = (buildYearItems(3) as { key: string; label: string }[]).map((item) => ({
    label: item.label,
    value: item.key,
  }));

  const [registerTable, { setTableData, getForm }] = useTable({
    dataSource: filterSupervises({}),
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
          label: '下发编号',
          field: 'dispatchNo',
          component: 'Input',
          componentProps: { placeholder: '请输入下发编号' },
        },
        {
          label: '处理状态',
          field: 'handleStatus',
          component: 'Select',
          componentProps: { options: handleStatusOptions, allowClear: true },
        },
      ],
    },
    // 无后端：查询/重置走本地过滤
    handleSearchInfoFn: (params: Recordable) => {
      setTableData(filterSupervises(params));
      return params;
    },
  });

  /** 处理抽屉保存回调：重铺数据（假数据为内存变更，刷新即恢复） */
  function handleSuccess() {
    setTableData(filterSupervises(getForm().getFieldsValue()));
  }

  /** 占位操作（TODO：随导出后端接入） */
  function handleTodo(label: string) {
    showMessage(`${label}：功能待接入`);
  }
</script>
