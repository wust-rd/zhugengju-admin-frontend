<!--
  ifco —— 月度进度确认列表面板（区级/市级页共用）

  搜索表单（项目名称/片区名称/片区批次/五改类型/项目归属/确认状态/选择年份/
  选择月份）+ 工具栏（一键导出）+ 表格（与填报端月度列表同数据，确认状态视角）。
  操作列按确认状态变化：待确认=查看+确认+退回，其余=仅查看（exhaustive 分支）。
  查看走填报端同款 monthly-form 抽屉（只读）；确认=直接通过（状态转已确认）；
  退回=弹窗必填退回意见（状态转退回修改，写退回信息，填报端呈退回修改横幅态）。
  退回部门经 returnOrg prop 注入（区级页默认江岸区住更局，市级页传市住更局）。
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

    <!-- 查看表单抽屉（只读，复用填报端月度进度表单） -->
    <MonthlyForm @register="registerDrawer" />

    <!-- 退回意见弹窗（必填） -->
    <Modal v-model:open="returnOpen" title="退回月度进度填报" @ok="handleReturnOk">
      <div class="mb-8px text-14px"><span class="text-#ff4d4f">*</span> 退回意见</div>
      <TextArea
        v-model:value="returnOpinion"
        :rows="4"
        :maxlength="200"
        show-count
        placeholder="请输入退回意见，退回后填报端呈退回修改状态"
      />
    </Modal>
  </div>
</template>
<script lang="ts" setup name="ViewsIfcoImplProgressSharedMonthlyConfirmPanel">
  import { ref } from 'vue';
  import { Modal, Tag, TextArea } from 'antdv-next';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useDrawer } from '@jeesite/core/components/Drawer';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { buildYearItems } from '@jeesite/core/libs/year';
  import { match } from 'ts-pattern';
  import {
    CITY_RENEWAL_AREA_LIST,
    DISTRICT_RENEWAL_AREA_LIST,
    FIVE_REFORM_TYPE_OPTIONS,
    PROJECT_AFFILIATION_OPTIONS,
    RENEWAL_AREA_BATCH_OPTIONS,
  } from '@jeesite/ifco/api/ifco/project-library';
  import {
    FILL_STATUS_OPTIONS,
    MONTHLIES,
    MONTH_OPTIONS,
    fillStatusTagProps,
    filterMonthlies,
    fiveReformLabel,
    progressReminderTagProps,
    projectAffiliationLabel,
    renewalAreaBatchLabel,
    type FillStatus,
    type MonthlyItem,
  } from '@jeesite/ifco/api/ifco/impl-progress';
  import MonthlyForm from '../fill/monthly-form.vue';

  const { showMessage } = useMessage();

  /** 退回部门（写入退回信息的部门名；区级页用默认值，市级页传市住更局） */
  const props = withDefaults(defineProps<{ returnOrg?: string }>(), {
    returnOrg: '江岸区住房和城市更新局',
  });

  /** 项目编号/项目名称固定左侧，确认状态固定右侧（与操作列同翼）；金额右对齐 */
  const columns: BasicColumn[] = [
    { title: '项目编号', dataIndex: 'projectCode', width: 100, fixed: 'left' },
    { title: '项目名称', dataIndex: 'projectName', width: 200, fixed: 'left', ellipsis: true },
    { title: '行政区', dataIndex: 'district', width: 90 },
    { title: '片区名称', dataIndex: 'renewalAreaName', width: 100 },
    { title: '片区批次', dataIndex: 'renewalAreaBatch', width: 90, slot: 'renewalAreaBatch' },
    { title: '五改分类', dataIndex: 'fiveReformType', width: 110, slot: 'fiveReformType' },
    { title: '项目归属', dataIndex: 'projectAffiliation', width: 130, slot: 'projectAffiliation' },
    { title: '当前形象进度', dataIndex: 'currentProgress', width: 140, ellipsis: true },
    { title: '年度累计完成投资(亿元)', dataIndex: 'yearAccumulatedInvest', width: 150, align: 'right' },
    { title: '当月完成投资(亿元)', dataIndex: 'monthCompletedInvest', width: 130, align: 'right' },
    { title: '项目进度提醒', dataIndex: 'progressReminder', width: 100, slot: 'progressReminder' },
    { title: '当前建设阶段', dataIndex: 'constructionStage', width: 100 },
    { title: '确认状态', dataIndex: 'fillStatus', width: 100, fixed: 'right', slot: 'fillStatus' },
  ];

  type ConfirmAction = '查看' | '确认' | '退回';

  /** 操作列按钮按确认状态变化（exhaustive：新增状态漏配时编译报错） */
  function actionsByStatus(status: FillStatus): ConfirmAction[] {
    return match(status)
      .with('待确认', () => ['查看', '确认', '退回'] as ConfirmAction[])
      .with('草稿', '已确认', '退回修改', () => ['查看'] as ConfirmAction[])
      .exhaustive();
  }

  const actionColumn: BasicColumn = {
    width: 160,
    fixed: 'right',
    actions: (record: Recordable) =>
      actionsByStatus(record.fillStatus as FillStatus).map((action) => ({
        label: action,
        onClick: () => handleAction(action, record),
      })),
  };

  const [registerDrawer, { openDrawer, setDrawerProps }] = useDrawer();

  /** 查看走只读表单抽屉（showFooter 打开前预设，硬性规则） */
  function handleView(record: Recordable) {
    setDrawerProps({ showFooter: false });
    openDrawer(true, { ...record, isView: true });
  }

  function handleAction(action: ConfirmAction, record: Recordable) {
    match(action)
      .with('查看', () => handleView(record))
      .with('确认', () => handleConfirm(record as MonthlyItem))
      .with('退回', () => openReturnModal(record as MonthlyItem))
      .exhaustive();
  }

  /** 确认通过：状态转已确认（清退回信息） */
  function handleConfirm(record: MonthlyItem) {
    Modal.confirm({
      title: '确认月度进度填报',
      content: `确认通过「${record.projectName}」的月度进度填报？`,
      onOk: () => {
        const target = MONTHLIES.find((item) => item.projectCode === record.projectCode);
        if (target) {
          target.fillStatus = '已确认';
          target.returnInfo = undefined;
        }
        showMessage('已确认');
        refresh();
      },
    });
  }

  // ── 退回意见弹窗 ────────────────────────────────────────────────────
  const returnOpen = ref(false);
  const returnOpinion = ref('');
  const returnTarget = ref<MonthlyItem | null>(null);

  function openReturnModal(record: MonthlyItem) {
    returnTarget.value = record;
    returnOpinion.value = '';
    returnOpen.value = true;
  }

  /** 退回：意见必填；状态转退回修改并写退回信息（次数累计） */
  function handleReturnOk() {
    const opinion = returnOpinion.value.trim();
    if (!opinion) {
      showMessage('请输入退回意见');
      return;
    }
    const target = MONTHLIES.find((item) => item.projectCode === returnTarget.value?.projectCode);
    if (target) {
      const today = new Date().toISOString().slice(0, 10);
      target.fillStatus = '退回修改';
      target.returnInfo = {
        submitDate: target.returnInfo?.submitDate ?? today,
        returnDate: today,
        returnOrg: props.returnOrg,
        returnCount: (target.returnInfo?.returnCount ?? 0) + 1,
        returnOpinion: opinion,
      };
    }
    returnOpen.value = false;
    showMessage('已退回，填报端呈退回修改状态');
    refresh();
  }

  const renewalAreaOptions = [
    ...CITY_RENEWAL_AREA_LIST.map((area) => ({ label: area.name, value: area.name })),
    ...DISTRICT_RENEWAL_AREA_LIST.map((name) => ({ label: name, value: name })),
  ];
  const fillStatusOptions = FILL_STATUS_OPTIONS.map((name) => ({ label: name, value: name }));
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
      labelWidth: 120,
      schemas: [
        { label: '项目名称', field: 'projectName', component: 'Input' },
        {
          label: '片区名称',
          field: 'renewalAreaName',
          component: 'Select',
          componentProps: { options: renewalAreaOptions, allowClear: true },
        },
        {
          label: '片区批次',
          field: 'renewalAreaBatch',
          component: 'Select',
          componentProps: { options: [...RENEWAL_AREA_BATCH_OPTIONS], allowClear: true },
        },
        {
          label: '五改类型',
          field: 'fiveReformType',
          component: 'Select',
          componentProps: { options: [...FIVE_REFORM_TYPE_OPTIONS], allowClear: true },
        },
        {
          label: '项目归属',
          field: 'projectAffiliation',
          component: 'Select',
          componentProps: { options: [...PROJECT_AFFILIATION_OPTIONS], allowClear: true },
        },
        {
          label: '确认状态',
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

  /** 确认/退回后按当前条件重铺数据（假数据为内存变更，刷新即恢复） */
  function refresh() {
    setTableData(filterMonthlies(getForm().getFieldsValue()));
  }

  /** 占位操作（TODO：随导出后端接入） */
  function handleTodo(label: string) {
    showMessage(`${label}：功能待接入`);
  }
</script>
