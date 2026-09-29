<!--
  ifco —— 月度进度填报（公共组件）

  从实施进度·月度填报抽屉步骤②抽取的填报区，供两处复用：月度进度填报抽屉
  （配 #review 审查结果插槽）、资金分类填报抽屉（步骤②进度填报，无审查区）。
  结构：月份页签（当月至当年 1 月倒序，标签 x年x月；未来月份不显示；已过月份
  只读）+
  月度进度信息（按月切换；当前进度计划安排=导入倒排工期计划当月内容，恒只读）
  + 月度投资情况/项目纳统情况/困难问题/里程碑节点/其他（当期填报，不随页签
  切换；年度投资进度=本年度累计完成投资/本年度计划完成投资 派生只读）。
  父组件经 ref 调用：init(record, disabled) 打开时初始化（表单先重置再回填——
  setFieldsValue 跳过 undefined，不重置会残留上一行的值）；validate() 提交
  必填校验；collect() 收集逐月值+当期值（先暂存当前页签）。审查结果组由
  showReview 开启，轮次 UI 走 #review 插槽（插槽编译于父级作用域，可引用
  父级状态）。
-->
<template>
  <div class="flex flex-col gap-12px">
    <!-- 月份页签（当月至当年 1 月倒序，标签 x年x月；未来月份不显示；每月填报一次，本月不能修改上月填写的数据） -->
    <Tabs v-model:active-key="activeMonthKey" type="card">
      <TabPane v-for="month in monthTabs" :key="String(month)" :tab="`${currentYear}年${month}月`" />
    </Tabs>
    <!-- 月度进度信息：key=月份，切页签时容器重挂载触发方向性滑入动画
         （表单值切换前已暂存 entries，重挂载不丢数据） -->
    <Transition :name="monthSlideName">
      <div :key="activeMonth">
        <BasicForm @register="handleProgressFormRegister" />

        <BasicForm @register="handleReportFormRegister">
          <!-- 年度投资进度（派生只读：本年度累计完成投资/本年度计划完成投资，随输入实时联动） -->
          <template #yearProgressRate="{ model }">
            {{
              yearProgressPercent({
                yearAccumulatedInvest: Number(model.yearAccumulatedInvest ?? 0),
                yearInvest: current.yearInvest,
              })
            }}
          </template>
          <!-- 审查结果（两级，按轮次分组；历史只读、本层级当前轮可填）：UI 由父级插槽提供 -->
          <template v-if="showReview" #reviewBlock>
            <slot name="review"></slot>
          </template>
          <!-- 里程碑节点：形象进度照片上传（picture-card，不超 9 张；before-upload 拦截仅演示记录文件名） -->
          <template #milestonePhotos>
            <Upload
              v-model:file-list="milestonePhotoList"
              list-type="picture-card"
              accept="image/*"
              :before-upload="() => false"
              :disabled="fillDisabled"
            >
              <div v-if="milestonePhotoList.length < 9" class="flex h-full items-center justify-center">
                <span class="i-ant-design:plus-outlined text-20px text-gray-500"></span>
              </div>
            </Upload>
          </template>
        </BasicForm>
      </div>
    </Transition>
  </div>
</template>
<script lang="ts" setup name="ViewsIfcoSharedMonthlyProgressFill">
  import { computed, ref, watch } from 'vue';
  import { TabPane, Tabs, Upload } from 'antdv-next';
  import type { UploadFile } from 'antdv-next';
  import { BasicForm, FormSchema, useForm } from '@jeesite/core/components/Form';
  import type { FormActionType } from '@jeesite/core/components/Form/src/types/form';
  import { YES_NO_OPTIONS } from '@jeesite/ifco/api/ifco/project-library';
  import {
    CONSTRUCTION_STAGE_OPTIONS,
    STATISTICS_CATEGORY_OPTIONS,
    monthPlanOf,
    yearProgressPercent,
    type MonthlyItem,
    type MonthlyProgressEntry,
  } from '@jeesite/ifco/api/ifco/impl-progress';

  const props = defineProps<{ showReview?: boolean }>();

  /** 当前行底稿（父组件 init 传入；表单回填与派生只读都取自它） */
  const current = ref<Partial<MonthlyItem>>({});
  /** 整区只读（查看/审查模式；已过月份在此基础上再加只读） */
  const fillDisabled = ref(false);

  const stageOptions = CONSTRUCTION_STAGE_OPTIONS.map((name) => ({ label: name, value: name }));
  const statisticsCategoryOptions = STATISTICS_CATEGORY_OPTIONS.map((name) => ({ label: name, value: name }));

  /** 当前填报月（默认页签；早于它的月份为已填历史，只读） */
  const currentMonth = computed(
    () => Number(String(current.value.reportMonth ?? '').slice(5, 7)) || new Date().getMonth() + 1,
  );

  /** 当前填报年（页签标签 x年x月 用；缺 reportMonth 时取当前年） */
  const currentYear = computed(
    () => Number(String(current.value.reportMonth ?? '').slice(0, 4)) || new Date().getFullYear(),
  );

  /** 月份页签：当月至当年 1 月倒序（如 9 月 → 2026年9月~2026年1月，未来月份不显示） */
  const monthTabs = computed(() =>
    Array.from({ length: currentMonth.value }, (_, index) => currentMonth.value - index),
  );

  /** 逐月填报值（init 时从行数据复制；切页签暂存，collect 时整体交回） */
  const entries = ref<Partial<Record<number, MonthlyProgressEntry>>>({});
  const activeMonth = ref(1);
  /** Tabs activeKey 为字符串，与数值月份互转 */
  const activeMonthKey = computed({
    get: () => String(activeMonth.value),
    set: (key) => {
      activeMonth.value = Number(key);
    },
  });
  /** 已回填到表单的月份（0=未回填；切页签前先把当前表单值暂存进 entries，重开不算切换） */
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

  /** 打开时初始化逐月值（当月无记录则用行快照兜底） */
  function initEntries(): Partial<Record<number, MonthlyProgressEntry>> {
    const cloned: Partial<Record<number, MonthlyProgressEntry>> = { ...(current.value.monthEntries ?? {}) };
    if (!cloned[currentMonth.value]) {
      cloned[currentMonth.value] = {
        constructionStage: current.value.constructionStage ?? '',
        currentProgress: current.value.currentProgress ?? '',
        implementProgress: current.value.implementProgress,
        progressDesc: current.value.monthProgressDesc ?? '',
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
      monthPlan: monthPlanOf(current.value.projectCode ?? '', activeMonth.value) || '—',
      progressDesc: entry?.progressDesc ?? '',
      actualStartDate: entry?.actualStartDate,
      actualCompletionDate: entry?.actualCompletionDate,
    });
    setProgressProps({ disabled: fillDisabled.value || activeMonth.value < currentMonth.value });
  }

  /** 切页签前把当前表单值暂存进对应月份（已过月份只读，不暂存） */
  function stashEntry(month: number) {
    if (!progressFormReady.value || month < currentMonth.value) return;
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

  /** 月份切换滑入方向：页签为当月→1月倒序，切到更小月份=往右走（stage-left 自右滑入） */
  const monthSlideName = ref<'stage-left' | 'stage-right'>('stage-left');

  // 用户切月份页签：暂存旧月份 → 判向 → 回填新月份 → 已过月份禁改
  watch(activeMonth, (next, prev) => {
    if (appliedMonth && next !== appliedMonth) stashEntry(appliedMonth);
    monthSlideName.value = prev == null || next < prev ? 'stage-left' : 'stage-right';
    appliedMonth = next;
    if (progressFormReady.value) applyProgressFormValues();
  });

  function handleProgressFormRegister(instance: FormActionType, uuid: string) {
    registerProgressForm(instance, uuid);
    progressFormReady.value = true;
    applyProgressFormValues();
  }

  /** 月度投资情况 + 项目纳统情况（当期填报，不随月份页签切换）；审查结果组仅月度填报抽屉开 */
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
    ...(props.showReview
      ? ([
          { label: '审查结果', field: 'reviewGroup', component: 'FormGroup', colProps: { md: 24, lg: 24 } },
          { label: '', field: 'reviewBlock', component: 'Input', slot: 'reviewBlock', colProps: { md: 24, lg: 24 } },
        ] as FormSchema[])
      : []),
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
      monthCompletedInvest: current.value.monthCompletedInvest ?? undefined,
      totalAccumulatedInvest: current.value.totalAccumulatedInvest ?? undefined,
      yearAccumulatedInvest: current.value.yearAccumulatedInvest ?? undefined,
      yearRangeAccumulatedInvest: current.value.yearRangeAccumulatedInvest ?? undefined,
      carryOverAccumulatedInvest: current.value.carryOverAccumulatedInvest ?? undefined,
      statisticsIncluded: current.value.statisticsIncluded || '否',
      statisticsCategory: current.value.statisticsCategory ?? undefined,
      statisticsProjectCode: current.value.statisticsProjectCode ?? '',
      notIncludedReason: current.value.notIncludedReason ?? '',
      difficultyProblem: current.value.difficultyProblem ?? '',
      remark: current.value.remark ?? '',
    });
    milestonePhotoList.value = (current.value.milestonePhotos ?? []).map((name, index) => ({
      uid: `${index}-${name}`,
      name,
      status: 'done' as const,
    }));
    setReportProps({ disabled: fillDisabled.value });
  }

  function handleReportFormRegister(instance: FormActionType, uuid: string) {
    registerReportForm(instance, uuid);
    reportFormReady.value = true;
    applyReportFormValues();
  }

  // ── 暴露 API（父组件经 ref 调用） ───────────────────────────────────

  /** 打开抽屉时初始化：行底稿/只读态落位、逐月值重建、表单先重置再回填 */
  async function init(record: Partial<MonthlyItem>, disabled = false) {
    current.value = record;
    fillDisabled.value = disabled;
    entries.value = initEntries();
    appliedMonth = 0;
    activeMonth.value = currentMonth.value;
    if (progressFormReady.value) {
      await resetProgressFields();
      applyProgressFormValues();
    }
    if (reportFormReady.value) {
      await resetReportFields();
      applyReportFormValues();
    }
  }

  /** 提交必填校验（月度进度信息 + 投资情况/纳统情况） */
  async function validate() {
    await validateProgress();
    await validateReport();
  }

  /** 收集填报值：当前页签先暂存进逐月值，再连同当期值一并交回（表单未就绪返回 null） */
  function collect(): {
    entries: Partial<Record<number, MonthlyProgressEntry>>;
    currentMonth: number;
    snapshot?: MonthlyProgressEntry;
    values: {
      monthCompletedInvest: number;
      totalAccumulatedInvest: number;
      yearAccumulatedInvest: number;
      yearRangeAccumulatedInvest?: number;
      carryOverAccumulatedInvest?: number;
      statisticsIncluded: string;
      statisticsCategory?: string;
      statisticsProjectCode?: string;
      notIncludedReason?: string;
      difficultyProblem?: string;
      milestonePhotos?: string[];
      remark?: string;
    };
  } | null {
    if (!progressFormReady.value || !reportFormReady.value) return null;
    stashEntry(activeMonth.value);
    const raw = getReportFieldsValue() as Record<string, unknown>;
    const cloned: Partial<Record<number, MonthlyProgressEntry>> = { ...entries.value };
    const optNum = (value: unknown) => (value == null || value === '' ? undefined : Number(value));
    const optStr = (value: unknown) => String(value ?? '') || undefined;
    return {
      entries: cloned,
      currentMonth: currentMonth.value,
      snapshot: cloned[currentMonth.value],
      values: {
        monthCompletedInvest: Number(raw.monthCompletedInvest ?? 0),
        totalAccumulatedInvest: Number(raw.totalAccumulatedInvest ?? 0),
        yearAccumulatedInvest: Number(raw.yearAccumulatedInvest ?? 0),
        yearRangeAccumulatedInvest: optNum(raw.yearRangeAccumulatedInvest),
        carryOverAccumulatedInvest: optNum(raw.carryOverAccumulatedInvest),
        statisticsIncluded: String(raw.statisticsIncluded ?? '否'),
        statisticsCategory: raw.statisticsIncluded === '是' ? optStr(raw.statisticsCategory) : undefined,
        statisticsProjectCode: raw.statisticsIncluded === '是' ? optStr(raw.statisticsProjectCode) : undefined,
        notIncludedReason: raw.statisticsIncluded === '否' ? optStr(raw.notIncludedReason) : undefined,
        difficultyProblem: optStr(raw.difficultyProblem),
        milestonePhotos: milestonePhotoList.value.length
          ? milestonePhotoList.value.map((file) => file.name)
          : undefined,
        remark: optStr(raw.remark),
      },
    };
  }

  defineExpose({ init, validate, collect });
</script>

<style>
  /* 月份切换滑入（与 schedule-form 同款；本文件自带避免依赖其它组件的全局样式） */
  .stage-left-enter-active,
  .stage-right-enter-active {
    transition:
      transform 0.24s ease,
      opacity 0.24s ease;
  }

  .stage-left-enter-from {
    transform: translateX(24px);
    opacity: 0;
  }

  .stage-right-enter-from {
    transform: translateX(-24px);
    opacity: 0;
  }
</style>
