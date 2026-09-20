<!--
  ifco —— 提示/督办列表面板（市级端）

  搜索表单（选择年份/选择月份/选择行政区/下发编号/处理状态）+ 工具栏
  （新增提示/新增督办/一键导出）+ 表格（下发编号维度整单行，含对应行政区与
  下发状态）。操作列按 下发状态 × 处理状态 变化：待下发=查看+下发；
  已下发未确认=查看+确认；已下发已确认=仅查看（exhaustive 分支）。
  新增提示/新增督办、下发走 dispatch-form 抽屉；查看/确认走 confirm-form 抽屉
  （确认后处理状态转已确认，流程办结）。
-->
<template>
  <div>
    <BasicTable @register="registerTable">
      <template #toolbar>
        <a-button @click="handleCreate('工作提示')"> 新增提示 </a-button>
        <a-button type="primary" @click="handleCreate('督办')"> 新增督办 </a-button>
        <a-button @click="handleTodo('一键导出')"> 一键导出 </a-button>
      </template>
      <template #superviseType="{ record }">
        <Tag :color="record.superviseType === '督办' ? 'orange' : 'blue'" style="border-radius: 10px">
          {{ record.superviseType }}
        </Tag>
      </template>
      <template #dispatchStatus="{ record }">
        <Tag v-bind="dispatchStatusTagProps(record.dispatchStatus)" style="border-radius: 10px">
          {{ record.dispatchStatus }}
        </Tag>
      </template>
      <template #handleStatus="{ record }">
        <Tag v-bind="handleStatusTagProps(record.districtHandleStatus)" style="border-radius: 10px">
          {{ record.districtHandleStatus }}
        </Tag>
      </template>
    </BasicTable>

    <!-- 新增提示/新增督办/下发 抽屉 -->
    <DispatchForm @register="registerDispatchDrawer" @success="refresh" />

    <!-- 查看/确认 抽屉 -->
    <ConfirmForm @register="registerConfirmDrawer" @success="refresh" />
  </div>
</template>
<script lang="ts" setup name="ViewsIfcoImplProgressUrbanSupervisePanel">
  import { Tag } from 'antdv-next';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useDrawer } from '@jeesite/core/components/Drawer';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { buildYearItems } from '@jeesite/core/libs/year';
  import { match, P } from 'ts-pattern';
  import { DISTRICTS } from '@jeesite/ifco/api/ifco/project-library';
  import {
    DISPATCH_STATUS_OPTIONS,
    HANDLE_STATUS_OPTIONS,
    MONTH_OPTIONS,
    dispatchStatusTagProps,
    filterSupervises,
    handleStatusTagProps,
    type DispatchStatus,
    type HandleStatus,
    type SuperviseType,
  } from '@jeesite/ifco/api/ifco/impl-progress';
  import DispatchForm from './dispatch-form.vue';
  import ConfirmForm from './confirm-form.vue';

  const { showMessage } = useMessage();

  /** 下发编号固定左侧，处理状态固定右侧（与操作列同翼） */
  const columns: BasicColumn[] = [
    { title: '下发编号', dataIndex: 'dispatchNo', width: 180, fixed: 'left' },
    { title: '类型', dataIndex: 'superviseType', width: 90, slot: 'superviseType' },
    { title: '对应行政区', dataIndex: 'district', width: 110 },
    { title: '下发状态', dataIndex: 'dispatchStatus', width: 100, slot: 'dispatchStatus' },
    { title: '处理状态', dataIndex: 'districtHandleStatus', width: 100, fixed: 'right', slot: 'handleStatus' },
    { title: '下发部门', dataIndex: 'dispatchOrg', width: 110 },
    { title: '下发时间', dataIndex: 'dispatchDate', width: 110 },
    { title: '处理截止日期', dataIndex: 'deadline', width: 110 },
    { title: '具体问题', dataIndex: 'problem', width: 220, ellipsis: true },
  ];

  type UrbanSuperviseAction = '查看' | '确认' | '下发';

  /** 操作列按钮按 下发状态 × 处理状态 变化（exhaustive：新增状态漏配时编译报错） */
  function actionsByRow(dispatchStatus: DispatchStatus, handleStatus: HandleStatus): UrbanSuperviseAction[] {
    return match([dispatchStatus, handleStatus] as const)
      .with(['待下发', P._], () => ['查看', '下发'] as UrbanSuperviseAction[])
      .with(['已下发', '已确认'], () => ['查看'] as UrbanSuperviseAction[])
      .with(['已下发', P._], () => ['查看', '确认'] as UrbanSuperviseAction[])
      .exhaustive();
  }

  const actionColumn: BasicColumn = {
    width: 130,
    fixed: 'right',
    actions: (record: Recordable) =>
      actionsByRow(record.dispatchStatus as DispatchStatus, record.districtHandleStatus as HandleStatus).map(
        (action) => ({
          label: action,
          onClick: () => handleAction(action, record),
        }),
      ),
  };

  const [registerDispatchDrawer, { openDrawer: openDispatchDrawer, setDrawerProps: setDispatchDrawerProps }] =
    useDrawer();
  const [registerConfirmDrawer, { openDrawer: openConfirmDrawer, setDrawerProps: setConfirmDrawerProps }] = useDrawer();

  /** 新增提示/新增督办：打开下发抽屉（类型由按钮带入） */
  function handleCreate(type: SuperviseType) {
    openDispatchDrawer(true, { isNewRecord: true, superviseType: type });
  }

  function handleAction(action: UrbanSuperviseAction, record: Recordable) {
    match(action)
      .with('查看', () => {
        setConfirmDrawerProps({ showFooter: false });
        openConfirmDrawer(true, { ...record, isView: true });
      })
      .with('确认', () => {
        setConfirmDrawerProps({ showFooter: true });
        openConfirmDrawer(true, { ...record });
      })
      .with('下发', () => {
        setDispatchDrawerProps({ showFooter: true });
        openDispatchDrawer(true, { ...record, isNewRecord: false });
      })
      .exhaustive();
  }

  const districtOptions = DISTRICTS.map((name) => ({ label: name, value: name }));
  const dispatchStatusOptions = DISPATCH_STATUS_OPTIONS.map((name) => ({ label: name, value: name }));
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
          label: '选择行政区',
          field: 'district',
          component: 'Select',
          componentProps: { options: districtOptions, allowClear: true },
        },
        {
          label: '下发编号',
          field: 'dispatchNo',
          component: 'Input',
          componentProps: { placeholder: '请输入下发编号' },
        },
        {
          label: '下发状态',
          field: 'dispatchStatus',
          component: 'Select',
          componentProps: { options: dispatchStatusOptions, allowClear: true },
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

  /** 下发/确认后按当前条件重铺数据（假数据为内存变更，刷新即恢复） */
  function refresh() {
    setTableData(filterSupervises(getForm().getFieldsValue()));
  }

  /** 占位操作（TODO：随导出后端接入） */
  function handleTodo(label: string) {
    showMessage(`${label}：功能待接入`);
  }
</script>
