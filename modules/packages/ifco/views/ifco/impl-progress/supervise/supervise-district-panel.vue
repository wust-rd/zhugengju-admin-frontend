<!--
  ifco —— 区级实施进度管理 · 提示/督办列表面板

  搜索表单（选择年份/选择月份/下发编号/处理状态）+ 工具栏（一键导出）+ 表格
  （仅市级已下发的单据：下发编号/类型/行政区/巡查月份/下发状态/处理截止日期/
  处理完成日期/处理状态）。操作列按处理状态变化：待处理/处理中=查看+去处理；
  待确认（已提交市级）/已处理/已确认=仅查看。去处理/查看走 dispatch-form.vue
  处理模式抽屉（与市级新增同构：下发信息+下发对象整表只读，处理结果组全部
  可编辑——处理完成时间/处理情况说明/上传处理照片（仅图片）/上传处理附件
  （必填拦截），提交后处理状态转待确认，回到市级确认）。
-->
<template>
  <div>
    <BasicTable @register="registerTable">
      <template #toolbar>
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

    <!-- 查看/去处理一体处理抽屉（dispatch-form 区级处理模式） -->
    <DispatchForm @register="registerDrawer" @success="handleSuccess" />
  </div>
</template>
<script lang="ts" setup name="ViewsIfcoImplProgressDistrictSupervisePanel">
  import { onMounted, ref } from 'vue';
  import { Tag } from 'antdv-next';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useDrawer } from '@jeesite/core/components/Drawer';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { buildYearItems } from '@jeesite/core/libs/year';
  import { match } from 'ts-pattern';
  import {
    HANDLE_STATUS_OPTIONS,
    MONTH_OPTIONS,
    dispatchStatusTagProps,
    fetchSuperviseList,
    filterSupervises,
    handleStatusTagProps,
    type HandleStatus,
    type SuperviseItem,
  } from '@jeesite/ifco/api/ifco/impl-progress';
  import { useUserStore } from '@jeesite/core/store/modules/user';
  import DispatchForm from './dispatch-form.vue';

  const { showMessage } = useMessage();

  /** 下发编号固定左侧，处理状态/操作列固定右侧；只展示已下发单据（待下发不进区级视野） */
  const columns: BasicColumn[] = [
    { title: '下发编号', dataIndex: 'dispatchNo', width: 180, fixed: 'left' },
    { title: '类型', dataIndex: 'superviseType', width: 90 },
    { title: '行政区', dataIndex: 'district', width: 110 },
    { title: '巡查月份', dataIndex: 'inspectMonth', width: 100 },
    { title: '下发状态', dataIndex: 'dispatchStatus', width: 100, slot: 'dispatchStatus' },
    { title: '处理截止日期', dataIndex: 'deadline', width: 110 },
    { title: '处理完成日期', dataIndex: 'districtHandleDate', width: 110 },
    { title: '处理状态', dataIndex: 'districtHandleStatus', width: 100, fixed: 'right', slot: 'handleStatus' },
  ];

  type SuperviseAction = '查看' | '去处理';

  /** 操作列按钮按处理状态变化（exhaustive：新增状态漏配时编译报错）：
   * 待处理/处理中=查看+去处理；待确认（已提交市级）/已处理/已确认=仅查看；
   * 待下发不进区级视野，分支仅为穷尽性兜底 */
  function actionsByStatus(status: HandleStatus): SuperviseAction[] {
    return match(status)
      .with('待下发', '待处理', '处理中', () => ['查看', '去处理'] as SuperviseAction[])
      .with('待确认', '已处理', '已确认', () => ['查看'] as SuperviseAction[])
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

  /** 打开处理抽屉（mode=districtHandle：下发内容只读+处理结果组；查看=整表只读仅关闭） */
  function handleForm(record: Recordable) {
    setDrawerProps({ showFooter: !record.isView });
    openDrawer(true, { ...record, mode: 'districtHandle' });
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

  /** 已下发单据全集（接口拉取；区级只看本区——登录机构=行政区时过滤，市级看全部） */
  const userOfficeName = useUserStore().getUserInfo?.officeName ?? '';
  const superviseRows = ref<SuperviseItem[]>([]);

  async function loadRows() {
    const all = (await fetchSuperviseList()) ?? [];
    superviseRows.value = all.filter(
      (item) => item.dispatchStatus === '已下发' && (!userOfficeName || item.district === userOfficeName),
    );
    setTableData(filterSupervises(getForm().getFieldsValue(), superviseRows.value));
  }

  onMounted(loadRows);

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
    // 查询/重置走本地过滤（行集=已下发且本区）
    handleSearchInfoFn: (params: Recordable) => {
      setTableData(filterSupervises(params, superviseRows.value));
      return params;
    },
  });

  /** 处理抽屉保存回调：重拉数据（区级提交后处理状态转待确认） */
  const handleSuccess = loadRows;

  /** 占位操作（TODO：随导出后端接入） */
  function handleTodo(label: string) {
    showMessage(`${label}：功能待接入`);
  }
</script>
