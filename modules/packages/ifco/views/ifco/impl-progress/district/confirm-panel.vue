<!--
  ifco —— 区级实施进度管理 · 倒排工期确认列表面板

  搜索表单（项目名称/片区名称/片区批次/五改类型/项目归属/确认状态/选择年份/
  选择月份/选择指导填报主体）+ 工具栏（一键导出）+ 表格（与填报端倒排列表同数据，
  确认状态视角）。操作列按确认状态变化：待确认=查看+确认+退回，其余=仅查看
  （exhaustive 分支）。查看走填报端同款 schedule-form 抽屉（只读）；
  确认=直接通过（状态转已确认）；退回=弹窗必填退回意见（状态转退回修改，
  写退回信息，填报端呈退回修改横幅态）。
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
      <template #fillStatus="{ record }">
        <Tag v-bind="fillStatusTagProps(record.fillStatus)" style="border-radius: 10px">
          {{ record.fillStatus }}
        </Tag>
      </template>
    </BasicTable>

    <!-- 查看表单抽屉（只读，复用填报端倒排工期表单） -->
    <ScheduleForm @register="registerDrawer" />

    <!-- 退回意见弹窗（必填） -->
    <Modal v-model:open="returnOpen" title="退回倒排工期计划" @ok="handleReturnOk">
      <div class="mb-8px text-14px"> <span class="text-#ff4d4f">*</span> 退回意见 </div>
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
<script lang="ts" setup name="ViewsIfcoImplProgressDistrictConfirmPanel">
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
    IMPLEMENT_ORG_LIST,
    PROJECT_AFFILIATION_OPTIONS,
    RENEWAL_AREA_BATCH_OPTIONS,
  } from '@jeesite/ifco/api/ifco/project-library';
  import {
    FILL_STATUS_OPTIONS,
    MONTH_OPTIONS,
    SCHEDULES,
    fillStatusTagProps,
    filterSchedules,
    fiveReformLabel,
    projectAffiliationLabel,
    renewalAreaBatchLabel,
    type FillStatus,
    type ScheduleItem,
  } from '@jeesite/ifco/api/ifco/impl-progress';
  import ScheduleForm from '../fill/schedule-form.vue';

  const { showMessage } = useMessage();

  /** 退回部门（写入退回信息的部门名；区级页用默认值，市级页传市住更局） */
  const props = withDefaults(defineProps<{ returnOrg?: string }>(), {
    returnOrg: '江岸区住房和城市更新局',
  });

  /** 项目编号/项目名称固定左侧，确认状态固定右侧（与操作列同翼） */
  const columns: BasicColumn[] = [
    { title: '项目编号', dataIndex: 'projectCode', width: 100, fixed: 'left' },
    { title: '项目名称', dataIndex: 'projectName', width: 220, fixed: 'left', ellipsis: true },
    { title: '行政区', dataIndex: 'district', width: 90 },
    { title: '片区名称', dataIndex: 'renewalAreaName', width: 100 },
    { title: '片区批次', dataIndex: 'renewalAreaBatch', width: 90, slot: 'renewalAreaBatch' },
    { title: '五改分类', dataIndex: 'fiveReformType', width: 110, slot: 'fiveReformType' },
    { title: '项目归属', dataIndex: 'projectAffiliation', width: 130, slot: 'projectAffiliation' },
    { title: '指定填报主体', dataIndex: 'reportOrg', width: 120 },
    { title: '项目投资估算(亿元)', dataIndex: 'investEstimate', width: 130, align: 'right' },
    { title: '年度投资计划(亿元)', dataIndex: 'yearPlanInvest', width: 130, align: 'right' },
    { title: '计划开工时间', dataIndex: 'planStartDate', width: 110 },
    { title: '计划竣工时间', dataIndex: 'planCompletionDate', width: 110 },
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
      .with('确认', () => handleConfirm(record as ScheduleItem))
      .with('退回', () => openReturnModal(record as ScheduleItem))
      .exhaustive();
  }

  /** 确认通过：状态转已确认（清退回信息） */
  function handleConfirm(record: ScheduleItem) {
    Modal.confirm({
      title: '确认倒排工期计划',
      content: `确认通过「${record.projectName}」的倒排工期计划？`,
      onOk: () => {
        const target = SCHEDULES.find((item) => item.projectCode === record.projectCode);
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
  const returnTarget = ref<ScheduleItem | null>(null);

  function openReturnModal(record: ScheduleItem) {
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
    const target = SCHEDULES.find((item) => item.projectCode === returnTarget.value?.projectCode);
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
  const reportOrgOptions = IMPLEMENT_ORG_LIST.map((name) => ({ label: name, value: name }));
  const yearOptions = (buildYearItems(3) as { key: string; label: string }[]).map((item) => ({
    label: item.label,
    value: item.key,
  }));

  const [registerTable, { setTableData, getForm }] = useTable({
    dataSource: filterSchedules({}),
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
        {
          label: '选择指导填报主体',
          field: 'reportOrg',
          component: 'Select',
          componentProps: { options: reportOrgOptions, allowClear: true },
        },
      ],
    },
    // 无后端：查询/重置走本地过滤
    handleSearchInfoFn: (params: Recordable) => {
      setTableData(filterSchedules(params));
      return params;
    },
  });

  /** 确认/退回后按当前条件重铺数据（假数据为内存变更，刷新即恢复） */
  function refresh() {
    setTableData(filterSchedules(getForm().getFieldsValue()));
  }

  /** 占位操作（TODO：随导出后端接入） */
  function handleTodo(label: string) {
    showMessage(`${label}：功能待接入`);
  }
</script>
