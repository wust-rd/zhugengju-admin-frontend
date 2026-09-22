<!--
  ifco —— 月度进度确认列表面板（区级/市级页共用，role 区分视角）

  搜索表单（项目名称/片区名称/片区批次/五改类型/项目归属/流程状态/选择年份/
  选择月份）+ 工具栏（一键导出）+ 表格（与填报端月度列表同数据、同列不分角色：
  表头换行显示，金额四列=项目投资估算/年度投资计划/年度累计完成投资/当月完成
  投资；年度投资进度=累计/计划派生百分比；两描述列+实施进度完成百分比+指定
  填报主体+入库纳统情况，仅操作列按视角区分）。
  操作列按视角+流程状态变化：本视角审查环节（区级=待区级审查，市级=待市级审查）
  =查看+审查，其余=仅查看（exhaustive 分支）。查看走填报端同款 monthly-form
  抽屉（只读）；审查=弹窗选审查结果：通过→区级转待市级审查、市级转市级审查通过；
  退回=必填退回意见（状态转退回修改，写退回信息，填报端呈退回修改横幅态；
  退回部门经 returnOrg prop 注入）。
-->
<template>
  <div class="monthly-confirm-table">
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

    <!-- 查看表单抽屉（只读，复用填报端月度进度表单） -->
    <MonthlyForm @register="registerDrawer" />

    <!-- 审查弹窗（审查结果二选一；退回必填意见） -->
    <Modal v-model:open="reviewOpen" title="审查月度进度填报" @ok="handleReviewOk">
      <div class="mb-4px text-14px"><span class="text-gray-500">项目名称：</span>{{ reviewTarget?.projectName }}</div>
      <div class="mt-8px mb-8px text-14px"> <span class="text-#ff4d4f">*</span> 审查结果 </div>
      <RadioGroup
        v-model:value="reviewResult"
        :options="[
          { label: '通过', value: '通过' },
          { label: '退回', value: '退回' },
        ]"
      />
      <template v-if="reviewResult === '退回'">
        <div class="mt-8px mb-8px text-14px"> <span class="text-#ff4d4f">*</span> 退回意见 </div>
        <TextArea
          v-model:value="reviewOpinion"
          :rows="4"
          :maxlength="200"
          show-count
          placeholder="请输入退回意见，退回后填报端呈退回修改状态"
        />
      </template>
    </Modal>
  </div>
</template>
<script lang="ts" setup name="ViewsIfcoImplProgressSharedMonthlyConfirmPanel">
  import { ref } from 'vue';
  import { Modal, RadioGroup, Tag, TextArea } from 'antdv-next';
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

  /** 退回部门（写入退回信息的部门名；区级页用默认值，市级页传市住更局） */
  const props = withDefaults(
    defineProps<{
      /** 视角：区级=待区级审查环节出审查按钮，市级=待市级审查环节出审查按钮 */
      role: 'district' | 'urban';
      returnOrg?: string;
    }>(),
    {
      returnOrg: '江岸区住房和城市更新局',
    },
  );

  /** 与填报端月度列表同列不分角色：前三列（项目编号/项目名称/行政区）固定左侧；末四列（项目进度提醒/当前建设阶段/流程状态/操作）固定右侧；金额四列右对齐、表头换行 */
  const columns: BasicColumn[] = [
    { title: '项目编号', dataIndex: 'projectCode', width: 100, fixed: 'left' },
    { title: '项目名称', dataIndex: 'projectName', width: 200, fixed: 'left', ellipsis: true },
    { title: '行政区', dataIndex: 'district', width: 90, fixed: 'left' },
    { title: '片区名称', dataIndex: 'renewalAreaName', width: 100 },
    { title: '片区批次', dataIndex: 'renewalAreaBatch', width: 90, slot: 'renewalAreaBatch' },
    { title: '五改分类', dataIndex: 'fiveReformType', width: 110, slot: 'fiveReformType' },
    { title: '项目归属', dataIndex: 'projectAffiliation', width: 130, slot: 'projectAffiliation' },
    { title: '当前形象进度', dataIndex: 'currentProgress', width: 140, ellipsis: true },
    { title: '项目投资估算(亿元)', dataIndex: 'investEstimate', width: 130, align: 'right' },
    { title: '年度投资计划(亿元)', dataIndex: 'yearPlanInvest', width: 130, align: 'right' },
    { title: '年度累计完成投资(亿元)', dataIndex: 'yearAccumulatedInvest', width: 150, align: 'right' },
    { title: '当月完成投资(亿元)', dataIndex: 'monthCompletedInvest', width: 130, align: 'right' },
    { title: '年度投资进度', dataIndex: 'yearProgress', width: 110, slot: 'yearProgress' },
    { title: '当月进度计划安排（分项简要描述）', dataIndex: 'monthPlan', width: 220, slot: 'monthPlan' },
    { title: '完成进度计划情况', dataIndex: 'monthProgressDesc', width: 220, ellipsis: true },
    { title: '实施进度完成百分比', dataIndex: 'implementProgress', width: 130, slot: 'implementProgress' },
    { title: '指定填报主体', dataIndex: 'reportOrg', width: 150 },
    { title: '入库纳统情况', dataIndex: 'statisticsIncluded', width: 110 },
    { title: '项目进度提醒', dataIndex: 'progressReminder', width: 100, fixed: 'right', slot: 'progressReminder' },
    { title: '当前建设阶段', dataIndex: 'constructionStage', width: 100, fixed: 'right' },
    { title: '流程状态', dataIndex: 'fillStatus', width: 100, fixed: 'right', slot: 'fillStatus' },
  ];

  type ConfirmAction = '查看' | '审查';

  /** 本视角负责审查的环节：区级=待区级审查，市级=待市级审查 */
  const REVIEW_STAGE: Record<'district' | 'urban', FillStatus> = {
    district: '待区级审查',
    urban: '待市级审查',
  };

  /** 操作列按钮按流程状态变化（本视角审查环节=查看+审查，其余仅查看；exhaustive 保枚举完整） */
  function actionsByStatus(status: FillStatus): ConfirmAction[] {
    if (status === REVIEW_STAGE[props.role]) return ['查看', '审查'] as ConfirmAction[];
    return match(status)
      .with('待提交', '待区级审查', '待市级审查', '市级审查通过', '退回修改', () => ['查看'] as ConfirmAction[])
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
      .with('审查', () => openReviewModal(record as MonthlyItem))
      .exhaustive();
  }

  // ── 审查弹窗（通过 / 退回） ────────────────────────────────────────
  const reviewOpen = ref(false);
  const reviewResult = ref<'通过' | '退回' | undefined>(undefined);
  const reviewOpinion = ref('');
  const reviewTarget = ref<MonthlyItem | null>(null);

  function openReviewModal(record: MonthlyItem) {
    reviewTarget.value = record;
    reviewResult.value = undefined;
    reviewOpinion.value = '';
    reviewOpen.value = true;
  }

  /** 审查提交：通过→区级转待市级审查、市级转市级审查通过；退回→意见必填，转退回修改并写退回信息（次数累计） */
  function handleReviewOk() {
    if (!reviewResult.value) {
      showMessage('请选择审查结果');
      return;
    }
    const opinion = reviewOpinion.value.trim();
    if (reviewResult.value === '退回' && !opinion) {
      showMessage('请输入退回意见');
      return;
    }
    const target = MONTHLIES.find((item) => item.projectCode === reviewTarget.value?.projectCode);
    if (target) {
      if (reviewResult.value === '通过') {
        target.fillStatus = props.role === 'district' ? '待市级审查' : '市级审查通过';
        target.returnInfo = undefined;
      } else {
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
    }
    reviewOpen.value = false;
    if (reviewResult.value === '通过') {
      showMessage(props.role === 'district' ? '区级审查通过，已提交市级审查' : '市级审查通过');
    } else {
      showMessage('已退回，填报端呈退回修改状态');
    }
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
    // 表头换行：表级 ellipsis 默认 true 会给列灌 ant-table-cell-ellipsis 截断表头（如「项目进度…」），关掉；列上显式 ellipsis: true 仍生效
    ellipsis: false,
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
<style scoped>
  /* 表头换行显示（长列名两行，与填报端月度列表同口径） */
  .monthly-confirm-table :deep(.ant-table-thead > tr > th) {
    white-space: normal;
  }
</style>
