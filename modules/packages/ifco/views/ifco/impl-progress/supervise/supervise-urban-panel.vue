<!--
  ifco —— 提示/督办列表面板（市级端）

  搜索表单（选择年份/选择月份/选择行政区/下发编号/下发状态/处理状态）+ 工具栏
  （新增工作提示单/新增督办单/一键导出）+ 表格（下发编号维度整单行：下发编号/
  类型/行政区/巡查月份/下发状态/处理截止日期/处理状态）。
  业务流：新增提交 → 待下发（处理状态同为待下发），操作列=查看/导出单据/编辑/
  下发，下发前可无限编辑；下发（行按钮二次确认）→ 已下发+待处理，操作列=查看/
  导出单据，进入区级处理流程；区级提交 → 待确认，操作列追加确认（确认抽屉选
  同意/不同意处理结果，提交后处理状态转已确认，流程办结）。查看/编辑/确认走
  dispatch-form 抽屉（查看=整表只读）；导出单据走 dispatch-export 生成 docx
  （督办单/工作提示单两套公文模板，编号与落款下发日期取单据实际值）。
-->
<template>
  <div>
    <BasicTable @register="registerTable">
      <template #toolbar>
        <a-button type="primary" @click="handleCreate('工作提示')"> 新增工作提示单 </a-button>
        <a-button type="primary" @click="handleCreate('督办')"> 新增督办单 </a-button>
        <a-button @click="handleTodo('一键导出')"> 一键导出 </a-button>
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

    <!-- 新增工作提示单/新增督办单/查看/编辑 抽屉 -->
    <DispatchForm @register="registerDispatchDrawer" @success="refresh" />
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
    SUPERVISES,
    dispatchStatusTagProps,
    filterSupervises,
    handleStatusTagProps,
    type DispatchStatus,
    type HandleStatus,
    type SuperviseItem,
    type SuperviseType,
  } from '@jeesite/ifco/api/ifco/impl-progress';
  import DispatchForm from './dispatch-form.vue';
  import { exportDispatchDocx } from './dispatch-export';

  const { showMessage } = useMessage();

  /** 下发编号固定左侧，处理状态固定右侧（与操作列同翼） */
  const columns: BasicColumn[] = [
    { title: '下发编号', dataIndex: 'dispatchNo', width: 180, fixed: 'left' },
    { title: '类型', dataIndex: 'superviseType', width: 90 },
    { title: '行政区', dataIndex: 'district', width: 110 },
    { title: '巡查月份', dataIndex: 'inspectMonth', width: 100 },
    { title: '下发状态', dataIndex: 'dispatchStatus', width: 100, slot: 'dispatchStatus' },
    { title: '处理截止日期', dataIndex: 'deadline', width: 110 },
    { title: '处理状态', dataIndex: 'districtHandleStatus', width: 100, fixed: 'right', slot: 'handleStatus' },
  ];

  type UrbanSuperviseAction = '查看' | '导出单据' | '编辑' | '下发' | '确认';

  /** 操作列按钮按 下发状态 × 处理状态 变化（exhaustive：新增状态漏配时编译报错）：
   * 待下发=查看/导出单据/编辑/下发（下发前可无限编辑）；已下发=查看/导出单据；
   * 已下发+待确认=追加确认（区级已提交处理结果） */
  function actionsByRow(dispatchStatus: DispatchStatus, handleStatus: HandleStatus): UrbanSuperviseAction[] {
    return match([dispatchStatus, handleStatus] as const)
      .with(['待下发', P._], () => ['查看', '导出单据', '编辑', '下发'] as UrbanSuperviseAction[])
      .with(['已下发', '待确认'], () => ['查看', '导出单据', '确认'] as UrbanSuperviseAction[])
      .with(['已下发', P._], () => ['查看', '导出单据'] as UrbanSuperviseAction[])
      .exhaustive();
  }

  const actionColumn: BasicColumn = {
    width: 280,
    fixed: 'right',
    actions: (record: Recordable) =>
      actionsByRow(record.dispatchStatus as DispatchStatus, record.districtHandleStatus as HandleStatus).map(
        (action) =>
          action === '下发'
            ? {
                label: action,
                popConfirm: { title: '确认下发该单据？下发后进入区级处理流程', confirm: () => confirmDispatch(record) },
              }
            : {
                label: action,
                onClick: () => handleAction(action, record),
              },
      ),
  };

  const [registerDispatchDrawer, { openDrawer: openDispatchDrawer, setDrawerProps: setDispatchDrawerProps }] =
    useDrawer();

  /** 新增工作提示单/新增督办单：打开下发抽屉（单据类型由按钮带入） */
  function handleCreate(type: SuperviseType) {
    setDispatchDrawerProps({ showFooter: true });
    openDispatchDrawer(true, { isNewRecord: true, superviseType: type });
  }

  function handleAction(action: UrbanSuperviseAction, record: Recordable) {
    match(action)
      .with('查看', () => {
        setDispatchDrawerProps({ showFooter: false });
        openDispatchDrawer(true, { ...record, isNewRecord: false, isView: true });
      })
      .with('编辑', () => {
        setDispatchDrawerProps({ showFooter: true });
        openDispatchDrawer(true, { ...record, isNewRecord: false });
      })
      .with('导出单据', () => exportDispatchDocx(record as SuperviseItem))
      .with('下发', () => confirmDispatch(record))
      .with('确认', () => {
        setDispatchDrawerProps({ showFooter: true });
        openDispatchDrawer(true, { ...record, isNewRecord: false, mode: 'urbanConfirm' });
      })
      .exhaustive();
  }

  /** 下发（行按钮二次确认）：下发状态=已下发、处理状态=待处理，记录下发时间 */
  function confirmDispatch(record: Recordable) {
    const target = SUPERVISES.find((item) => item.dispatchNo === record.dispatchNo);
    if (target) {
      target.dispatchStatus = '已下发';
      target.districtHandleStatus = '待处理';
      target.dispatchDate = new Date().toISOString().slice(0, 10);
    }
    showMessage('下发成功，已进入区级处理流程');
    refresh();
  }

  const districtOptions = DISTRICTS.map((name) => ({ label: name, value: name }));
  const dispatchStatusOptions = DISPATCH_STATUS_OPTIONS.map((name) => ({ label: name, value: name }));
  /** 市级处理状态含待下发（提交后未下发）；其余选项与填报/区级端共用 */
  const handleStatusOptions = ['待下发', ...HANDLE_STATUS_OPTIONS].map((name) => ({ label: name, value: name }));
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

  /** 下发/编辑后按当前条件重铺数据（假数据为内存变更，刷新即恢复） */
  function refresh() {
    setTableData(filterSupervises(getForm().getFieldsValue()));
  }

  /** 占位操作（TODO：随导出后端接入） */
  function handleTodo(label: string) {
    showMessage(`${label}：功能待接入`);
  }
</script>
