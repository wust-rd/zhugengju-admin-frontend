<!--
  ifco —— 月度进度填报（查看 / 编辑 一体表单抽屉）

  抽屉标题 = 月度进度填报[退回修改] · 项目名 + 项目进度提醒 Tag（派生：资金进度=
  年度投资进度、实施进度=实施进度完成百分比，资金超前实施 15 个百分点以上=滞后，
  其余=正常）；
  退回修改状态在步骤条上方以浅灰蓝横幅只读展示 提交/退回时间、退回部门、退回次数
  + 退回意见。三步步骤条（Stepper 兼页签）：①基本信息查看（共用只读表单）
  → ②进度填报：月份页签（当月至当年 1 月倒序，未来月份不显示；每月填报一次，
  已过月份只读）下
  月度进度信息（按月切换：当前建设阶段 / 当前形象进度 / 实施进度完成百分比 /
  当前进度计划安排（导入倒排工期计划当月内容，不可修改）/ 当前进度落实情况 /
  实际开工时间（转为建设中时必填）/ 实际完工时间（转为已完工时必填））
  + 月度投资情况（当月完成/截止目前累计/本年度累计/2026年1-5月累计（演示口径）/
  年度投资进度（派生）/2025年10月前累计（演示口径））
  + 项目纳统情况（入库纳统情况 / 纳统分类 / 统计局纳统项目编码（纳统=是时显示）/
  未纳统原因（纳统=否时必填）；困难问题 / 里程碑节点（三种情况必填，转建设中、转已完工、
  每季度末月上传形象进度照片不超 9 张）/ 其他=备注；当期填报不随页签切换，
  项目投资估算与年度投资计划见步骤①基本信息）
  → ③确认提交（流程占位页：只表达流程状态，无实际内容）。
  底部按钮：取消 / 保存草稿（状态转待提交）/ 提交（必填项校验；状态转待区级审查、清退回信息）。
  当前后端尚未介入：保存直接改内存行（api/ifco/impl-progress 的 MONTHLIES，刷新即恢复）。
-->
<template>
  <BasicDrawer v-bind="$attrs" force-render width="70%" @register="registerDrawer">
    <template #title>
      <span>{{ title }}</span>
      <Tag
        v-if="record.yearPlanInvest"
        v-bind="progressReminderTagProps(progressReminderOf(record))"
        style="border-radius: 10px"
        class="ml-2"
      >
        {{ progressReminderOf(record) }}
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

    <!-- ① 基本信息查看（共用只读表单；枚举值回填时已转中文） -->
    <Transition :name="slideName">
      <div v-show="activeStep === 0">
        <BasicInfoForm :record="record" />
      </div>
    </Transition>

    <!-- ② 进度填报（月份页签：默认当月、已过月份只读；月度进度信息按月切换 + 投资情况/纳统情况） -->
    <Transition :name="slideName">
      <div v-show="activeStep === 1" class="flex flex-col gap-12px">
        <!-- 月份页签（当月至当年 1 月倒序，未来月份不显示；每月填报一次，本月不能修改上月填写的数据） -->
        <Tabs v-model:active-key="activeMonthKey" type="card">
          <TabPane v-for="month in monthTabs" :key="String(month)" :tab="`${month}月`" />
        </Tabs>
        <BasicForm @register="handleProgressFormRegister" />
        <BasicForm @register="handleReportFormRegister">
          <!-- 年度投资进度（派生只读：本年度累计完成投资/年度投资计划，随输入实时联动） -->
          <template #yearProgressRate="{ model }">
            {{
              yearProgressPercent({
                yearAccumulatedInvest: Number(model.yearAccumulatedInvest ?? 0),
                yearPlanInvest: record.yearPlanInvest,
              })
            }}
          </template>
          <!-- 里程碑节点：形象进度照片上传（picture-card，不超 9 张；before-upload 拦截仅演示记录文件名） -->
          <template #milestonePhotos>
            <Upload
              v-model:file-list="milestonePhotoList"
              list-type="picture-card"
              accept="image/*"
              :before-upload="() => false"
              :disabled="isView"
            >
              <div v-if="milestonePhotoList.length < 9" class="flex h-full items-center justify-center">
                <span class="i-ant-design:plus-outlined text-20px text-gray-500"></span>
              </div>
            </Upload>
          </template>
        </BasicForm>
      </div>
    </Transition>

    <!-- ③ 确认提交（流程占位页：只表达流程状态，无实际内容） -->
    <Transition :name="slideName">
      <div v-show="activeStep === 2" class="bg-white rd-8px px-24px py-20px">
        <div class="text-14px text-gray-400">【当前页面只表达流程状态，无实际内容】</div>
      </div>
    </Transition>

    <!-- 底部按钮：查看=关闭；编辑=取消/保存草稿/提交 -->
    <template #footer>
      <a-button class="mr-2" @click="closeDrawer"> {{ isView ? '关闭' : '取消' }} </a-button>
      <template v-if="!isView">
        <a-button class="mr-2" @click="handleSave('待提交')"> 保存草稿 </a-button>
        <a-button type="primary" @click="handleSave('待区级审查')"> 提交 </a-button>
      </template>
    </template>
  </BasicDrawer>
</template>
<script lang="ts" setup name="ViewsIfcoImplProgressFillMonthlyForm">
  import { computed, ref, watch } from 'vue';
  import { TabPane, Tabs, Tag, Upload } from 'antdv-next';
  import type { UploadFile } from 'antdv-next';
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
    STATISTICS_CATEGORY_OPTIONS,
    monthPlanOf,
    progressReminderOf,
    progressReminderTagProps,
    yearProgressPercent,
    type MonthlyItem,
    type MonthlyProgressEntry,
  } from '@jeesite/ifco/api/ifco/impl-progress';
  import BasicInfoForm from '../shared/basic-info-form.vue';

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

  // ── ② 进度填报：月份页签 + 月度进度信息 + 投资情况/纳统情况 ────────
  const stageOptions = CONSTRUCTION_STAGE_OPTIONS.map((name) => ({ label: name, value: name }));
  const statisticsCategoryOptions = STATISTICS_CATEGORY_OPTIONS.map((name) => ({ label: name, value: name }));

  /** 当前填报月（默认页签；早于它的月份为已填历史，只读） */
  const currentMonth = computed(
    () => Number(String(record.value.reportMonth ?? '').slice(5, 7)) || new Date().getMonth() + 1,
  );

  /** 月份页签：当月至当年 1 月倒序（如 9 月 → 9月~1月，未来月份不显示） */
  const monthTabs = computed(() =>
    Array.from({ length: currentMonth.value }, (_, index) => currentMonth.value - index),
  );

  /** 逐月填报值（打开抽屉时从行数据复制；切页签暂存，保存时整体写回） */
  const entries = ref<Partial<Record<number, MonthlyProgressEntry>>>({});
  const activeMonth = ref(1);
  /** Tabs activeKey 为字符串，与数值月份互转 */
  const activeMonthKey = computed({
    get: () => String(activeMonth.value),
    set: (key) => {
      activeMonth.value = Number(key);
    },
  });
  /** 已回填到表单的月份（0=未回填；切页签前先把当前表单值暂存进 entries，抽屉重开不算切换） */
  let appliedMonth = 0;

  /** 月度进度信息（按月页签切换；当前进度计划安排=导入倒排工期计划当月内容，恒只读） */
  const progressSchemas: FormSchema[] = [
    { label: '月度进度信息', field: 'progressInfoGroup', component: 'FormGroup', colProps: { md: 24, lg: 24 } },
    {
      label: '当前建设阶段',
      field: 'constructionStage',
      component: 'Select',
      componentProps: { options: stageOptions, allowClear: true, placeholder: '请选择当前建设阶段' },
      rules: [{ required: true, message: '请选择当前建设阶段' }],
    },
    {
      label: '当前形象进度',
      field: 'currentProgress',
      component: 'Input',
      componentProps: { maxlength: 100, placeholder: '请输入当前形象进度' },
    },
    {
      label: '实施进度完成百分比',
      field: 'implementProgress',
      component: 'InputNumber',
      componentProps: { precision: 0, min: 0, max: 100, style: 'width: 100%', placeholder: '请输入实施进度完成百分比' },
    },
    {
      label: '当前进度计划安排（此处导入倒排工期计划中填报月份的内容，不可修改）',
      field: 'monthPlan',
      component: 'Input',
      dynamicDisabled: () => true,
      colProps: { md: 24, lg: 24 },
    },
    {
      label: '当前进度落实情况',
      field: 'progressDesc',
      component: 'InputTextArea',
      componentProps: { rows: 3, maxlength: 500, placeholder: '请输入当前进度落实情况' },
      colProps: { md: 24, lg: 24 },
    },
    {
      label: '实际开工时间（由前期手续或征拆阶段转为建设中时，必填）',
      field: 'actualStartDate',
      component: 'DatePicker',
      componentProps: { valueFormat: 'YYYY-MM-DD', style: 'width: 100%', placeholder: '请选择实际开工时间' },
      dynamicRules: ({ values }) =>
        values.constructionStage === '建设中'
          ? [{ required: true, message: '当前建设阶段为建设中，请选择实际开工时间' }]
          : [],
      colProps: { md: 24, lg: 24 },
    },
    {
      label: '实际完工时间（由建设中转为已完工时，必填）',
      field: 'actualCompletionDate',
      component: 'DatePicker',
      componentProps: { valueFormat: 'YYYY-MM-DD', style: 'width: 100%', placeholder: '请选择实际完工时间' },
      dynamicRules: ({ values }) =>
        values.constructionStage === '已完工'
          ? [{ required: true, message: '当前建设阶段为已完工，请选择实际完工时间' }]
          : [],
      colProps: { md: 24, lg: 24 },
    },
  ];

  const [
    registerProgressForm,
    {
      setFieldsValue: setProgressFieldsValue,
      setProps: setProgressProps,
      getFieldsValue: getProgressFieldsValue,
      validate: validateProgress,
      resetFields: resetProgressFields,
    },
  ] = useForm({
    labelWidth: 240,
    schemas: progressSchemas,
    showActionButtonGroup: false,
    baseColProps: { md: 24, lg: 12 },
  });

  const progressFormReady = ref(false);

  /** 打开抽屉时初始化逐月值（当月无记录则用行快照兜底） */
  function initEntries(): Partial<Record<number, MonthlyProgressEntry>> {
    const cloned: Partial<Record<number, MonthlyProgressEntry>> = { ...(record.value.monthEntries ?? {}) };
    if (!cloned[currentMonth.value]) {
      cloned[currentMonth.value] = {
        constructionStage: record.value.constructionStage ?? '',
        currentProgress: record.value.currentProgress ?? '',
        implementProgress: record.value.implementProgress,
        progressDesc: record.value.monthProgressDesc ?? '',
      };
    }
    return cloned;
  }

  function applyProgressFormValues() {
    const entry = entries.value[activeMonth.value];
    setProgressFieldsValue({
      constructionStage: entry?.constructionStage ?? undefined,
      currentProgress: entry?.currentProgress ?? '',
      implementProgress: entry?.implementProgress ?? undefined,
      monthPlan: monthPlanOf(record.value.projectCode ?? '', activeMonth.value) || '—',
      progressDesc: entry?.progressDesc ?? '',
      actualStartDate: entry?.actualStartDate,
      actualCompletionDate: entry?.actualCompletionDate,
    });
    setProgressProps({ disabled: isView.value || activeMonth.value < currentMonth.value });
  }

  /** 切页签前把当前表单值暂存进对应月份（已过月份只读，不暂存） */
  function stashEntry(month: number) {
    if (month < currentMonth.value) return;
    const values = getProgressFieldsValue() as Record<string, unknown>;
    entries.value[month] = {
      constructionStage: String(values.constructionStage ?? ''),
      currentProgress: String(values.currentProgress ?? ''),
      implementProgress:
        values.implementProgress == null || values.implementProgress === ''
          ? undefined
          : Number(values.implementProgress),
      progressDesc: String(values.progressDesc ?? ''),
      actualStartDate: (values.actualStartDate as string) || undefined,
      actualCompletionDate: (values.actualCompletionDate as string) || undefined,
    };
  }

  // 用户切月份页签：暂存旧月份 → 回填新月份 → 已过月份禁改
  watch(activeMonth, (next) => {
    if (appliedMonth && next !== appliedMonth) stashEntry(appliedMonth);
    appliedMonth = next;
    if (progressFormReady.value) applyProgressFormValues();
  });

  function handleProgressFormRegister(instance: FormActionType, uuid: string) {
    registerProgressForm(instance, uuid);
    progressFormReady.value = true;
    applyProgressFormValues();
  }

  /** 月度投资情况 + 项目纳统情况（当期填报，不随月份页签切换） */
  const reportSchemas: FormSchema[] = [
    { label: '月度投资情况', field: 'investGroup', component: 'FormGroup', colProps: { md: 24, lg: 24 } },
    {
      label: '当月完成投资（亿元）',
      field: 'monthCompletedInvest',
      component: 'InputNumber',
      componentProps: { precision: 2, min: 0, style: 'width: 100%', placeholder: '请输入当月完成投资' },
    },
    {
      label: '截止目前累计完成投资（亿元）',
      field: 'totalAccumulatedInvest',
      component: 'InputNumber',
      componentProps: { precision: 2, min: 0, style: 'width: 100%', placeholder: '请输入截止目前累计完成投资' },
    },
    {
      label: '本年度累计完成投资（亿元）',
      field: 'yearAccumulatedInvest',
      component: 'InputNumber',
      componentProps: { precision: 2, min: 0, style: 'width: 100%', placeholder: '请输入本年度累计完成投资' },
    },
    {
      label: '2026年1-5月累计完成投资（亿元）',
      field: 'yearRangeAccumulatedInvest',
      component: 'InputNumber',
      componentProps: { precision: 2, min: 0, style: 'width: 100%', placeholder: '请输入2026年1-5月累计完成投资' },
    },
    {
      label: '年度投资进度',
      field: 'yearProgressRate',
      component: 'Input',
      slot: 'yearProgressRate',
    },
    {
      label: '2025年10月前累计完成投资（亿元）',
      field: 'carryOverAccumulatedInvest',
      component: 'InputNumber',
      componentProps: { precision: 2, min: 0, style: 'width: 100%', placeholder: '请输入2025年10月前累计完成投资' },
    },
    { label: '项目纳统情况', field: 'statisticsGroup', component: 'FormGroup', colProps: { md: 24, lg: 24 } },
    {
      label: '入库纳统情况',
      field: 'statisticsIncluded',
      component: 'RadioGroup',
      componentProps: { options: [...YES_NO_OPTIONS] },
    },
    {
      label: '纳统分类',
      field: 'statisticsCategory',
      component: 'Select',
      componentProps: { options: statisticsCategoryOptions, allowClear: true, placeholder: '请选择纳统分类' },
      ifShow: ({ values }) => values.statisticsIncluded === '是',
    },
    {
      label: '统计局纳统项目编码',
      field: 'statisticsProjectCode',
      component: 'Input',
      componentProps: { maxlength: 50, placeholder: '请输入统计局纳统项目编码' },
      ifShow: ({ values }) => values.statisticsIncluded === '是',
    },
    {
      label: '未纳统原因',
      field: 'notIncludedReason',
      component: 'InputTextArea',
      componentProps: { rows: 2, maxlength: 200, placeholder: '请输入未纳统原因' },
      ifShow: ({ values }) => values.statisticsIncluded === '否',
      dynamicRules: ({ values }) =>
        values.statisticsIncluded === '否' ? [{ required: true, message: '请输入未纳统原因' }] : [],
    },
    { label: '困难问题', field: 'difficultyGroup', component: 'FormGroup', colProps: { md: 24, lg: 24 } },
    {
      label: '困难问题（需市级或市领导调度的问题）',
      field: 'difficultyProblem',
      component: 'InputTextArea',
      componentProps: { rows: 2, maxlength: 200, placeholder: '不属于困难统计范围' },
      colProps: { md: 24, lg: 24 },
    },
    {
      label:
        '里程碑节点（三种情况必填，1.由前期阶段或征拆阶段转为建设中，2.由建设中转为已完工，3.每季度3月、6月、9月、12月）',
      field: 'milestoneGroup',
      component: 'FormGroup',
      colProps: { md: 24, lg: 24 },
    },
    {
      label: '上传形象进度照片（不超过9张）',
      field: 'milestonePhotos',
      component: 'Input',
      slot: 'milestonePhotos',
      colProps: { md: 24, lg: 24 },
    },
    { label: '其他', field: 'otherGroup', component: 'FormGroup', colProps: { md: 24, lg: 24 } },
    {
      label: '备注',
      field: 'remark',
      component: 'InputTextArea',
      componentProps: { rows: 2, maxlength: 200, placeholder: '不属于困难统计范围' },
      colProps: { md: 24, lg: 24 },
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

  /** 形象进度照片（里程碑节点上传，不超 9 张；演示仅记录文件名） */
  const milestonePhotoList = ref<UploadFile[]>([]);

  function applyReportFormValues() {
    setReportFieldsValue({
      monthCompletedInvest: record.value.monthCompletedInvest ?? undefined,
      totalAccumulatedInvest: record.value.totalAccumulatedInvest ?? undefined,
      yearAccumulatedInvest: record.value.yearAccumulatedInvest ?? undefined,
      yearRangeAccumulatedInvest: record.value.yearRangeAccumulatedInvest ?? undefined,
      carryOverAccumulatedInvest: record.value.carryOverAccumulatedInvest ?? undefined,
      statisticsIncluded: record.value.statisticsIncluded || '否',
      statisticsCategory: record.value.statisticsCategory ?? undefined,
      statisticsProjectCode: record.value.statisticsProjectCode ?? '',
      notIncludedReason: record.value.notIncludedReason ?? '',
      difficultyProblem: record.value.difficultyProblem ?? '',
      remark: record.value.remark ?? '',
    });
    milestonePhotoList.value = (record.value.milestonePhotos ?? []).map((name, index) => ({
      uid: `${index}-${name}`,
      name,
      status: 'done' as const,
    }));
  }

  function handleReportFormRegister(instance: FormActionType, uuid: string) {
    registerReportForm(instance, uuid);
    reportFormReady.value = true;
    applyReportFormValues();
  }

  // ── 抽屉 ────────────────────────────────────────────────────────────
  const [registerDrawer, { setDrawerProps, closeDrawer }] = useDrawerInner(async (data: any) => {
    setDrawerProps({ loading: true });
    await resetProgressFields();
    await resetReportFields();
    isView.value = !!data?.isView;
    record.value = (data || {}) as Partial<MonthlyItem>;
    activeStep.value = isView.value ? 0 : 1;
    // 月份页签复位到当月（watch 只管用户切换，这里显式回填；重开抽屉不算切换）
    entries.value = initEntries();
    appliedMonth = 0;
    activeMonth.value = currentMonth.value;
    if (progressFormReady.value) applyProgressFormValues();
    if (reportFormReady.value) applyReportFormValues();
    setReportProps({ disabled: isView.value });
    setDrawerProps({ loading: false });
  });

  /** 保存草稿（不校验）/ 提交（必填校验）：逐月值整体写回内存行，并同步当月快照到行字段（列表展示） */
  async function handleSave(nextStatus: '待提交' | '待区级审查') {
    if (nextStatus === '待区级审查') {
      try {
        await validateProgress();
        await validateReport();
      } catch (error: any) {
        if (error && error.errorFields) {
          showMessage(error.message || '请完善必填项');
        }
        return;
      }
    }
    stashEntry(activeMonth.value);
    const values = getReportFieldsValue() as Record<string, unknown>;
    const target = MONTHLIES.find((item) => item.projectCode === record.value.projectCode);
    if (target) {
      target.monthEntries = { ...entries.value };
      const snapshot = entries.value[currentMonth.value];
      if (snapshot) {
        target.constructionStage = snapshot.constructionStage;
        target.currentProgress = snapshot.currentProgress;
        target.implementProgress = snapshot.implementProgress;
        target.monthProgressDesc = snapshot.progressDesc;
      }
      const yearAccumulated = Number(values.yearAccumulatedInvest ?? 0);
      target.monthCompletedInvest = Number(values.monthCompletedInvest ?? 0);
      target.totalAccumulatedInvest = Number(values.totalAccumulatedInvest ?? 0);
      target.yearAccumulatedInvest = yearAccumulated;
      target.yearRangeAccumulatedInvest =
        values.yearRangeAccumulatedInvest == null || values.yearRangeAccumulatedInvest === ''
          ? undefined
          : Number(values.yearRangeAccumulatedInvest);
      target.carryOverAccumulatedInvest =
        values.carryOverAccumulatedInvest == null || values.carryOverAccumulatedInvest === ''
          ? undefined
          : Number(values.carryOverAccumulatedInvest);
      target.statisticsIncluded = String(values.statisticsIncluded ?? '否');
      target.statisticsCategory =
        values.statisticsIncluded === '是' ? String(values.statisticsCategory ?? '') || undefined : undefined;
      target.statisticsProjectCode =
        values.statisticsIncluded === '是' ? String(values.statisticsProjectCode ?? '') || undefined : undefined;
      target.notIncludedReason =
        values.statisticsIncluded === '否' ? String(values.notIncludedReason ?? '') || undefined : undefined;
      target.difficultyProblem = String(values.difficultyProblem ?? '') || undefined;
      target.milestonePhotos = milestonePhotoList.value.length
        ? milestonePhotoList.value.map((file) => file.name)
        : undefined;
      target.remark = String(values.remark ?? '') || undefined;
      target.fillStatus = nextStatus;
      if (nextStatus === '待区级审查') target.returnInfo = undefined;
    }
    showMessage(nextStatus === '待提交' ? '保存成功（待提交）' : '提交成功，待区级审查');
    closeDrawer();
    emit('success', target);
  }
</script>
