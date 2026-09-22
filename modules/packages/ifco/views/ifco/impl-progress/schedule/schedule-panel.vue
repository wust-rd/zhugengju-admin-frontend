<!--
  ifco —— 倒排工期计划列表面板（schedule/list 页三视角渲染，role 区分）

  搜索表单（项目名称/选择月份——DatePicker 月份面板，YYYY-MM/行政区/片区名称/
  片区批次/指定填报主体/五改类型/项目归属/流程状态；区级把指定填报主体放在选择
  月份后、市级把行政区前置到指定填报主体前）+ 工具栏（一键导出）+ 表格（流转
  状态列前带 指定填报主体/当前项目状态 两列，当前项目状态=紫色描边标签；窄列
  表头自动换行）。
  操作列按视角+流程状态变化（exhaustive 保枚举完整）：
  - 填报主体（main）：任何状态恒有查看——待提交=查看+编辑，
    待区级审查/待市级审查=查看，市级审查通过/退回修改=查看+修改计划；
  - 区级（district）/市级（urban）：本视角审查环节（待区级审查/待市级审查）
    =查看+审查，其余仅查看。
  动作全走 schedule-form.vue 表单抽屉（查看=只读；编辑/修改计划=填报保存，
  修改计划仅当前月份至十二月可改、已过月份禁改；审查=步骤②审查结果 FormGroup
  填本层级结论/意见提交）。
-->
<template>
  <div class="schedule-table">
    <BasicTable @register="registerTable">
      <template #toolbar>
        <a-button @click="handleTodo('一键导出')"> 一键导出 </a-button>
      </template>
      <template #renewalAreaBatch="{ record }">{{ renewalAreaBatchLabel(record.renewalAreaBatch) }}</template>
      <template #fiveReformType="{ record }">{{ fiveReformLabel(record.fiveReformType) }}</template>
      <template #projectAffiliation="{ record }">{{ projectAffiliationLabel(record.projectAffiliation) }}</template>
      <template #projectStatus="{ record }">
        <Tag color="purple" style="border-radius: 10px">
          {{ record.projectStatus }}
        </Tag>
      </template>
      <template #fillStatus="{ record }">
        <Tag v-bind="fillStatusTagProps(record.fillStatus)" style="border-radius: 10px">
          {{ record.fillStatus }}
        </Tag>
      </template>
    </BasicTable>

    <!-- 查看/编辑/修改计划/审查 一体表单抽屉 -->
    <ScheduleForm @register="registerDrawer" @success="handleSuccess" />
  </div>
</template>
<script lang="ts" setup name="ViewsIfcoImplProgressSchedulePanel">
  import { Tag } from 'antdv-next';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import type { FormSchema } from '@jeesite/core/components/Form';
  import { useDrawer } from '@jeesite/core/components/Drawer';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { match } from 'ts-pattern';
  import {
    CITY_RENEWAL_AREA_LIST,
    DISTRICTS,
    DISTRICT_RENEWAL_AREA_LIST,
    FIVE_REFORM_TYPE_OPTIONS,
    PROJECT_AFFILIATION_OPTIONS,
    RENEWAL_AREA_BATCH_OPTIONS,
  } from '@jeesite/ifco/api/ifco/project-library';
  import {
    FILL_STATUS_OPTIONS,
    SCHEDULES,
    fillStatusTagProps,
    filterSchedules,
    fiveReformLabel,
    projectAffiliationLabel,
    renewalAreaBatchLabel,
    type FillStatus,
  } from '@jeesite/ifco/api/ifco/impl-progress';
  import ScheduleForm from './schedule-form.vue';

  /** 视角：填报主体=填报动作（编辑/修改计划）；区级/市级=本层级审查 */
  const props = defineProps<{
    role: 'main' | 'district' | 'urban';
  }>();

  const { showMessage } = useMessage();

  /** 项目编号/项目名称固定左侧，流程状态/操作固定右侧；流程状态前列 指定填报主体/当前项目状态 两列 */
  const columns: BasicColumn[] = [
    { title: '项目编号', dataIndex: 'projectCode', width: 100, fixed: 'left' },
    { title: '项目名称', dataIndex: 'projectName', width: 220, fixed: 'left', ellipsis: true },
    { title: '行政区', dataIndex: 'district', width: 90 },
    { title: '片区名称', dataIndex: 'renewalAreaName', width: 100 },
    { title: '片区批次', dataIndex: 'renewalAreaBatch', width: 90, slot: 'renewalAreaBatch' },
    { title: '五改分类', dataIndex: 'fiveReformType', width: 110, slot: 'fiveReformType' },
    { title: '项目归属', dataIndex: 'projectAffiliation', width: 130, slot: 'projectAffiliation' },
    { title: '项目投资估算(亿元)', dataIndex: 'investEstimate', width: 130, align: 'right' },
    { title: '年度投资计划(亿元)', dataIndex: 'yearPlanInvest', width: 130, align: 'right' },
    { title: '计划开工时间', dataIndex: 'planStartDate', width: 110 },
    { title: '计划竣工时间', dataIndex: 'planCompletionDate', width: 110 },
    { title: '指定填报主体', dataIndex: 'reportOrg', width: 150 },
    { title: '当前项目状态', dataIndex: 'projectStatus', width: 110, slot: 'projectStatus' },
    { title: '流程状态', dataIndex: 'fillStatus', width: 100, fixed: 'right', slot: 'fillStatus' },
  ];

  type ScheduleAction = '查看' | '编辑' | '修改计划' | '审查';

  /** 区级/市级视角各自负责审查的环节 */
  const REVIEW_STAGE: Record<'district' | 'urban', FillStatus> = {
    district: '待区级审查',
    urban: '待市级审查',
  };

  /** 操作列按钮按视角+流程状态变化（exhaustive 保枚举完整） */
  function actionsByStatus(status: FillStatus): ScheduleAction[] {
    if (props.role === 'main') {
      return match(status)
        .with('待提交', () => ['查看', '编辑'] as ScheduleAction[])
        .with('待区级审查', '待市级审查', () => ['查看'] as ScheduleAction[])
        .with('市级审查通过', '退回修改', () => ['查看', '修改计划'] as ScheduleAction[])
        .exhaustive();
    }
    if (status === REVIEW_STAGE[props.role]) return ['查看', '审查'] as ScheduleAction[];
    return match(status)
      .with('待提交', '待区级审查', '待市级审查', '市级审查通过', '退回修改', () => ['查看'] as ScheduleAction[])
      .exhaustive();
  }

  const actionColumn: BasicColumn = {
    width: 140,
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

  function handleAction(action: ScheduleAction, record: Recordable) {
    match(action)
      .with('查看', () => handleForm({ ...record, isView: true }))
      .with('编辑', () => handleForm({ ...record }))
      .with('修改计划', () => handleForm({ ...record, revisePlan: true }))
      .with('审查', () => handleForm({ ...record, isReview: true, reviewRole: props.role }))
      .exhaustive();
  }

  const districtOptions = DISTRICTS.map((name) => ({ label: name, value: name }));
  /** 指定填报主体选项：按行数据去重（与「指定填报主体」列同源） */
  const reportOrgOptions = [...new Set(SCHEDULES.map((item) => item.reportOrg))].map((name) => ({
    label: name,
    value: name,
  }));
  const renewalAreaOptions = [
    ...CITY_RENEWAL_AREA_LIST.map((area) => ({ label: area.name, value: area.name })),
    ...DISTRICT_RENEWAL_AREA_LIST.map((name) => ({ label: name, value: name })),
  ];
  const fillStatusOptions = FILL_STATUS_OPTIONS.map((name) => ({ label: name, value: name }));

  /** 搜索字段定义（三视角同款字段，仅顺序不同：区级指定填报主体在选择月份后、市级行政区前置） */
  const projectNameSchema: FormSchema = { label: '项目名称', field: 'projectName', component: 'Input' };
  const monthSchema: FormSchema = {
    label: '选择月份',
    field: 'month',
    component: 'DatePicker',
    componentProps: { picker: 'month', valueFormat: 'YYYY-MM', placeholder: '请选择月份' },
  };
  const reportOrgSchema: FormSchema = {
    label: '指定填报主体',
    field: 'reportOrg',
    component: 'Select',
    componentProps: { options: reportOrgOptions, allowClear: true },
  };
  const districtSchema: FormSchema = {
    label: '行政区',
    field: 'district',
    component: 'Select',
    componentProps: { options: districtOptions, allowClear: true },
  };
  const areaNameSchema: FormSchema = {
    label: '片区名称',
    field: 'renewalAreaName',
    component: 'Select',
    componentProps: { options: renewalAreaOptions, allowClear: true },
  };
  const batchSchema: FormSchema = {
    label: '片区批次',
    field: 'renewalAreaBatch',
    component: 'Select',
    componentProps: { options: [...RENEWAL_AREA_BATCH_OPTIONS], allowClear: true },
  };
  const fiveReformSchema: FormSchema = {
    label: '五改类型',
    field: 'fiveReformType',
    component: 'Select',
    componentProps: { options: [...FIVE_REFORM_TYPE_OPTIONS], allowClear: true },
  };
  const affiliationSchema: FormSchema = {
    label: '项目归属',
    field: 'projectAffiliation',
    component: 'Select',
    componentProps: { options: [...PROJECT_AFFILIATION_OPTIONS], allowClear: true },
  };
  const statusSchema: FormSchema = {
    label: '流程状态',
    field: 'fillStatus',
    component: 'Select',
    componentProps: { options: fillStatusOptions, allowClear: true },
  };

  const searchSchemas: FormSchema[] =
    props.role === 'district'
      ? [
          projectNameSchema,
          monthSchema,
          reportOrgSchema,
          districtSchema,
          areaNameSchema,
          batchSchema,
          fiveReformSchema,
          affiliationSchema,
          statusSchema,
        ]
      : props.role === 'urban'
        ? [
            projectNameSchema,
            monthSchema,
            districtSchema,
            reportOrgSchema,
            areaNameSchema,
            batchSchema,
            fiveReformSchema,
            affiliationSchema,
            statusSchema,
          ]
        : [
            projectNameSchema,
            monthSchema,
            districtSchema,
            areaNameSchema,
            batchSchema,
            reportOrgSchema,
            fiveReformSchema,
            affiliationSchema,
            statusSchema,
          ];

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
      labelWidth: props.role === 'main' ? 90 : 120,
      schemas: searchSchemas,
    },
    // 无后端：查询/重置走本地过滤（月份面板值 YYYY-MM 拆回年+月再过滤）
    handleSearchInfoFn: (params: Recordable) => {
      setTableData(filterSchedules(parseMonthPicker(params)));
      return params;
    },
  });

  /** 表单保存/审查提交回调：重铺数据（假数据为内存变更，刷新即恢复） */
  function handleSuccess() {
    setTableData(filterSchedules(parseMonthPicker(getForm().getFieldsValue())));
  }

  /** 选择月份（DatePicker 月份面板，YYYY-MM）→ 过滤用的 year+month 数值 */
  function parseMonthPicker(values: Recordable): Recordable {
    const parsed = { ...values };
    if (typeof parsed.month === 'string' && parsed.month) {
      const [year, month] = parsed.month.split('-');
      parsed.year = year;
      parsed.month = Number(month);
    } else {
      parsed.year = undefined;
      parsed.month = undefined;
    }
    return parsed;
  }

  /** 占位操作（TODO：随导出后端接入） */
  function handleTodo(label: string) {
    showMessage(`${label}：功能待接入`);
  }
</script>
<style scoped>
  /* 表头换行显示（窄列长列名自动折行，与月度列表同口径；antd th 默认 nowrap） */
  .schedule-table :deep(.ant-table-thead > tr > th) {
    white-space: normal;
  }
</style>
