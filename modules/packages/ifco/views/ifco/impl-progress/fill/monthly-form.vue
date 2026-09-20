<!--
  ifco —— 月度进度填报（查看 / 编辑 一体表单抽屉）

  抽屉标题 = 月度进度填报[退回修改] · 项目名 + 项目进度提醒 Tag（正常=绿）；
  退回修改状态在步骤条上方以浅灰蓝横幅只读展示 提交/退回时间、退回部门、退回次数
  + 退回意见。三步步骤条（Stepper 兼页签）：①基本信息查看（恒只读）
  → ②进度填报（月度进度情况 / 月度投资情况 / 项目纳统情况 三分区；
  项目总投资与年度投资计划为系统带入恒只读）→ ③确认提交（填报汇总）。
  底部按钮：取消 / 保存草稿 / 提交（必填项校验；状态转待确认、清退回信息）。
  当前后端尚未介入：保存直接改内存行（api/ifco/impl-progress 的 MONTHLIES，刷新即恢复）。
-->
<template>
  <BasicDrawer v-bind="$attrs" force-render width="70%" @register="registerDrawer">
    <template #title>
      <span>{{ title }}</span>
      <Tag
        v-if="record.progressReminder"
        v-bind="progressReminderTagProps(record.progressReminder)"
        style="border-radius: 10px"
        class="ml-2"
      >
        {{ record.progressReminder }}
      </Tag>
    </template>

    <!-- 退回信息横幅（退回修改状态；步骤条上方浅灰蓝横幅） -->
    <div v-if="record.returnInfo" class="mb-12px rd-4px bg-#e8ecf5 px-16px py-10px text-14px">
      <div class="flex flex-wrap items-center gap-x-32px gap-y-4px text-gray-800">
        <span><span class="text-gray-500">提交时间：</span>{{ record.returnInfo.submitDate }}</span>
        <span><span class="text-gray-500">退回时间：</span>{{ record.returnInfo.returnDate }}</span>
        <span><span class="text-gray-500">退回部门：</span>{{ record.returnInfo.returnOrg }}</span>
        <span><span class="text-gray-500">退回次数：</span>第{{ record.returnInfo.returnCount }}次</span>
      </div>
      <div class="mt-4px text-#d46b08">退回意见：{{ record.returnInfo.returnOpinion }}</div>
    </div>

    <!-- 副标题：当前填报周期 -->
    <div class="mb-8px text-13px text-gray-500">当前填报周期：{{ record.reportMonth || '/' }}</div>

    <!-- 三步步骤条（兼页签：点击切换内容区） -->
    <Stepper v-model:active="activeStep" :steps="stepItems" class="mb-16px" />

    <!-- ① 基本信息查看（恒只读表单；枚举值回填时已转中文） -->
    <Transition :name="slideName">
      <div v-show="activeStep === 0">
        <BasicForm @register="handleBaseFormRegister" />
      </div>
    </Transition>

    <!-- ② 进度填报（月度进度情况 / 月度投资情况 / 项目纳统情况 三分区） -->
    <Transition :name="slideName">
      <div v-show="activeStep === 1">
        <BasicForm @register="handleReportFormRegister" />
      </div>
    </Transition>

    <!-- ③ 确认提交（填报汇总） -->
    <Transition :name="slideName">
      <div v-show="activeStep === 2" class="bg-white rd-8px px-24px py-20px">
        <div class="text-15px font-600 text-gray-900">月度进度填报汇总</div>
        <div class="mt-4px text-13px text-gray-400">提交后进入区级确认流程；被退回时可修改后重新提交。</div>
        <div class="mt-12px grid grid-cols-1 gap-x-32px gap-y-8px md:grid-cols-2">
          <div v-for="item in summaryItems" :key="item.label" class="flex text-14px">
            <span class="w-160px shrink-0 text-gray-500">{{ item.label }}</span>
            <span class="text-gray-800">{{ item.value }}</span>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 底部按钮：查看=关闭；编辑=取消/保存草稿/提交 -->
    <template #footer>
      <a-button class="mr-2" @click="closeDrawer"> {{ isView ? '关闭' : '取消' }} </a-button>
      <template v-if="!isView">
        <a-button class="mr-2" @click="handleSave('草稿')"> 保存草稿 </a-button>
        <a-button type="primary" @click="handleSave('待确认')"> 提交 </a-button>
      </template>
    </template>
  </BasicDrawer>
</template>
<script lang="ts" setup name="ViewsIfcoImplProgressFillMonthlyForm">
  import { computed, ref, watch } from 'vue';
  import { Tag } from 'antdv-next';
  import { BasicForm, FormSchema, useForm } from '@jeesite/core/components/Form';
  import type { FormActionType } from '@jeesite/core/components/Form/src/types/form';
  import { BasicDrawer, useDrawerInner } from '@jeesite/core/components/Drawer';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { Stepper } from '@jeesite/ui';
  import type { StepItem } from '@jeesite/ui';
  import { YES_NO_OPTIONS } from '@jeesite/ifco/api/ifco/project-library';
  import {
    CONSTRUCTION_STAGE_OPTIONS,
    MONTHLIES,
    PROGRESS_REMINDER_OPTIONS,
    fiveReformLabel,
    progressReminderTagProps,
    projectAffiliationLabel,
    renewalAreaBatchLabel,
    type MonthlyItem,
  } from '@jeesite/ifco/api/ifco/impl-progress';

  const emit = defineEmits(['success']);
  const { showMessage } = useMessage();

  const isView = ref(false);
  const record = ref<Partial<MonthlyItem>>({});

  const isReturn = computed(() => record.value.fillStatus === '退回修改');
  const title = computed(() => `月度进度填报${isReturn.value ? '退回修改' : ''} · ${record.value.projectName ?? ''}`);

  // ── 三步步骤条（兼页签） ────────────────────────────────────────────
  const STEP_TITLES = ['基本信息查看', '进度填报', '确认提交'];
  const activeStep = ref(1);
  const slideName = ref<'stage-left' | 'stage-right'>('stage-left');

  watch(activeStep, (next, prev) => {
    slideName.value = next >= prev ? 'stage-left' : 'stage-right';
    if (next === 2 && reportFormReady.value) summaryItems.value = buildSummaryItems();
  });

  const stepItems = computed<StepItem[]>(() =>
    STEP_TITLES.map((title, index) => ({
      title,
      status:
        index === activeStep.value
          ? ('process' as const)
          : index < activeStep.value
            ? ('finish' as const)
            : ('wait' as const),
    })),
  );

  // ── ① 基本信息表单（恒只读；枚举值回填时转中文） ────────────────────
  const baseSchemas: FormSchema[] = [
    { label: '项目基本信息', field: 'basicInfoGroup', component: 'FormGroup', colProps: { md: 24, lg: 24 } },
    { label: '项目编号', field: 'projectCode', component: 'Input', dynamicDisabled: () => true },
    { label: '项目名称', field: 'projectName', component: 'Input', dynamicDisabled: () => true },
    { label: '行政区', field: 'district', component: 'Input', dynamicDisabled: () => true },
    { label: '片区名称', field: 'renewalAreaNameText', component: 'Input', dynamicDisabled: () => true },
    { label: '片区批次', field: 'renewalAreaBatchText', component: 'Input', dynamicDisabled: () => true },
    { label: '五改分类', field: 'fiveReformTypeText', component: 'Input', dynamicDisabled: () => true },
    { label: '项目归属', field: 'projectAffiliationText', component: 'Input', dynamicDisabled: () => true },
  ];

  const [registerBaseForm, { setFieldsValue: setBaseFieldsValue }] = useForm({
    labelWidth: 140,
    schemas: baseSchemas,
    showActionButtonGroup: false,
    baseColProps: { md: 12, lg: 8 },
  });

  const baseFormReady = ref(false);

  function applyBaseFormValues() {
    setBaseFieldsValue({
      projectCode: record.value.projectCode ?? '',
      projectName: record.value.projectName ?? '',
      district: record.value.district ?? '',
      renewalAreaNameText: record.value.renewalAreaName || '/',
      renewalAreaBatchText: renewalAreaBatchLabel(record.value.renewalAreaBatch ?? ''),
      fiveReformTypeText: fiveReformLabel(record.value.fiveReformType ?? ''),
      projectAffiliationText: projectAffiliationLabel(record.value.projectAffiliation ?? ''),
    });
  }

  function handleBaseFormRegister(instance: FormActionType, uuid: string) {
    registerBaseForm(instance, uuid);
    baseFormReady.value = true;
    applyBaseFormValues();
  }

  // ── ② 进度填报表单（三分区） ───────────────────────────────────────
  const stageOptions = CONSTRUCTION_STAGE_OPTIONS.map((name) => ({ label: name, value: name }));
  const reminderOptions = PROGRESS_REMINDER_OPTIONS.map((name) => ({ label: name, value: name }));

  const reportSchemas: FormSchema[] = [
    { label: '月度进度情况', field: 'progressGroup', component: 'FormGroup', colProps: { md: 24, lg: 24 } },
    {
      label: '当月形象进度描述',
      field: 'monthProgressDesc',
      component: 'InputTextArea',
      componentProps: { rows: 3, maxlength: 500, placeholder: '请输入当月形象进度描述' },
      colProps: { md: 24, lg: 24 },
      rules: [{ required: true, message: '请输入当月形象进度描述' }],
    },
    {
      label: '当前建设阶段',
      field: 'constructionStage',
      component: 'Select',
      componentProps: { options: stageOptions, allowClear: true, placeholder: '请选择当前建设阶段' },
      rules: [{ required: true, message: '请选择当前建设阶段' }],
    },
    {
      label: '项目进度提醒',
      field: 'progressReminder',
      component: 'Select',
      componentProps: { options: reminderOptions, allowClear: true, placeholder: '请选择项目进度提醒' },
      rules: [{ required: true, message: '请选择项目进度提醒' }],
    },
    { label: '月度投资情况', field: 'investGroup', component: 'FormGroup', colProps: { md: 24, lg: 24 } },
    {
      label: '项目总投资(亿元)',
      field: 'totalInvest',
      component: 'InputNumber',
      componentProps: { precision: 2, style: 'width: 100%' },
      dynamicDisabled: () => true,
    },
    {
      label: '年度投资计划(亿元)',
      field: 'yearPlanInvest',
      component: 'InputNumber',
      componentProps: { precision: 2, style: 'width: 100%' },
      dynamicDisabled: () => true,
    },
    {
      label: '年度累计完成投资(亿元)',
      field: 'yearAccumulatedInvest',
      component: 'InputNumber',
      componentProps: { precision: 2, min: 0, style: 'width: 100%', placeholder: '请输入年度累计完成投资' },
    },
    {
      label: '当月完成投资(亿元)',
      field: 'monthCompletedInvest',
      component: 'InputNumber',
      componentProps: { precision: 2, min: 0, style: 'width: 100%', placeholder: '请输入当月完成投资' },
    },
    { label: '项目纳统情况', field: 'statisticsGroup', component: 'FormGroup', colProps: { md: 24, lg: 24 } },
    {
      label: '是否纳入统计',
      field: 'statisticsIncluded',
      component: 'RadioGroup',
      componentProps: { options: [...YES_NO_OPTIONS] },
    },
    {
      label: '统计单位名称',
      field: 'statisticsUnit',
      component: 'Input',
      componentProps: { maxlength: 50, placeholder: '请输入统计单位名称' },
      ifShow: ({ values }) => values.statisticsIncluded === '是',
    },
  ];

  const [
    registerReportForm,
    {
      setFieldsValue: setReportFieldsValue,
      setProps: setReportProps,
      getFieldsValue: getReportFieldsValue,
      validate: validateReport,
      resetFields: resetReportFields,
    },
  ] = useForm({
    labelWidth: 160,
    schemas: reportSchemas,
    showActionButtonGroup: false,
  });

  const reportFormReady = ref(false);

  function applyReportFormValues() {
    setReportFieldsValue({
      monthProgressDesc: record.value.monthProgressDesc ?? '',
      constructionStage: record.value.constructionStage ?? undefined,
      progressReminder: record.value.progressReminder ?? undefined,
      totalInvest: record.value.totalInvest ?? undefined,
      yearPlanInvest: record.value.yearPlanInvest ?? undefined,
      yearAccumulatedInvest: record.value.yearAccumulatedInvest ?? undefined,
      monthCompletedInvest: record.value.monthCompletedInvest ?? undefined,
      statisticsIncluded: record.value.statisticsIncluded || '否',
      statisticsUnit: record.value.statisticsUnit ?? '',
    });
  }

  function handleReportFormRegister(instance: FormActionType, uuid: string) {
    registerReportForm(instance, uuid);
    reportFormReady.value = true;
    applyReportFormValues();
  }

  // ── ③ 确认提交汇总（切到步骤③时从表单取快照，避免渲染期读未挂载表单） ─
  const summaryItems = ref<{ label: string; value: string }[]>([]);

  function buildSummaryItems(): { label: string; value: string }[] {
    const values = getReportFieldsValue() as Record<string, unknown>;
    return [
      { label: '当月形象进度描述', value: String(values.monthProgressDesc ?? '') || '未填写' },
      { label: '当前建设阶段', value: String(values.constructionStage ?? '') || '未选择' },
      { label: '项目进度提醒', value: String(values.progressReminder ?? '') || '未选择' },
      { label: '年度累计完成投资(亿元)', value: values.yearAccumulatedInvest?.toString() ?? '未填写' },
      { label: '当月完成投资(亿元)', value: values.monthCompletedInvest?.toString() ?? '未填写' },
      { label: '是否纳入统计', value: String(values.statisticsIncluded ?? '') || '否' },
      { label: '统计单位名称', value: String(values.statisticsUnit ?? '') || '未填写' },
    ];
  }

  // ── 抽屉 ────────────────────────────────────────────────────────────
  const [registerDrawer, { setDrawerProps, closeDrawer }] = useDrawerInner(async (data: any) => {
    setDrawerProps({ loading: true });
    await resetReportFields();
    isView.value = !!data?.isView;
    record.value = (data || {}) as Partial<MonthlyItem>;
    activeStep.value = isView.value ? 0 : 1;
    if (baseFormReady.value) applyBaseFormValues();
    if (reportFormReady.value) applyReportFormValues();
    setReportProps({ disabled: isView.value });
    setDrawerProps({ loading: false });
  });

  /** 保存草稿（不校验）/ 提交（必填校验）：写回内存行 */
  async function handleSave(nextStatus: '草稿' | '待确认') {
    if (nextStatus === '待确认') {
      try {
        await validateReport();
      } catch (error: any) {
        if (error && error.errorFields) {
          showMessage(error.message || '请完善必填项');
        }
        return;
      }
    }
    const values = getReportFieldsValue() as Record<string, unknown>;
    const target = MONTHLIES.find((item) => item.projectCode === record.value.projectCode);
    if (target) {
      target.monthProgressDesc = String(values.monthProgressDesc ?? '');
      target.constructionStage = String(values.constructionStage ?? '');
      target.progressReminder = String(values.progressReminder ?? '');
      target.yearAccumulatedInvest = Number(values.yearAccumulatedInvest ?? 0);
      target.monthCompletedInvest = Number(values.monthCompletedInvest ?? 0);
      target.statisticsIncluded = String(values.statisticsIncluded ?? '否');
      target.statisticsUnit = String(values.statisticsUnit ?? '');
      target.fillStatus = nextStatus;
      if (nextStatus === '待确认') target.returnInfo = undefined;
    }
    showMessage(nextStatus === '草稿' ? '保存成功（草稿）' : '提交成功，待区级确认');
    closeDrawer();
    emit('success', target);
  }
</script>
