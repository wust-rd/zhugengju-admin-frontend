<!--
  ifco —— 倒排工期计划（查看 / 编辑 一体表单抽屉）

  抽屉标题 = 倒排工期计划[退回修改] · 项目名 + 填报状态 Tag；退回修改状态在
  步骤条上方以浅灰蓝横幅只读展示 提交时间/退回时间/退回部门/退回次数 + 退回意见。
  三步步骤条（@jeesite/ui 的 Stepper 兼页签）：①基本信息查看（恒只读表单）
  → ②倒排工期计划（计划开始月份恒只读 + 一月~十二月计划，可留空）
  → ③确认提交（逐月计划汇总）。查看=两个表单 disabled + 底部仅关闭。
  底部按钮：取消 / 保存草稿（状态回草稿）/ 提交（状态转待确认、清退回信息）。
  当前后端尚未介入：保存直接改内存行（api/ifco/impl-progress 的 SCHEDULES，刷新即恢复）。
-->
<template>
  <BasicDrawer v-bind="$attrs" force-render width="70%" @register="registerDrawer">
    <template #title>
      <span>{{ title }}</span>
      <Tag
        v-if="record.fillStatus"
        v-bind="fillStatusTagProps(record.fillStatus)"
        style="border-radius: 10px"
        class="ml-2"
      >
        {{ record.fillStatus }}
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

    <!-- 副标题：入库时间 + 距离填报截止（新入库 20 天内 / 在库 12 月 31 日前） -->
    <div class="mb-8px text-13px text-gray-500">
      入库时间：{{ record.inLibraryDate || '/' }}　距离计划填报截止：{{ deadlineHint }}
    </div>

    <!-- 三步步骤条（兼页签：点击切换内容区） -->
    <Stepper v-model:active="activeStep" :steps="stepItems" class="mb-16px" />

    <!-- ① 基本信息查看（恒只读表单；枚举值回填时已转中文） -->
    <Transition :name="slideName">
      <div v-show="activeStep === 0">
        <BasicForm @register="handleBaseFormRegister" />
      </div>
    </Transition>

    <!-- ② 倒排工期计划（计划开始月份恒只读 + 一月~十二月计划，可留空） -->
    <Transition :name="slideName">
      <div v-show="activeStep === 1">
        <BasicForm @register="handlePlanFormRegister">
          <template #planStartMonth="{ model, field }">
            <div class="flex w-full items-center gap-8px">
              <Input :value="model[field]" disabled class="flex-1" />
              <span class="shrink-0 text-12px text-gray-400">提交后不可修改，如需修改请联系项目管理员</span>
            </div>
          </template>
        </BasicForm>
      </div>
    </Transition>

    <!-- ③ 确认提交（逐月计划汇总） -->
    <Transition :name="slideName">
      <div v-show="activeStep === 2" class="bg-white rd-8px px-24px py-20px">
        <div class="text-15px font-600 text-gray-900">倒排工期计划汇总</div>
        <div class="mt-4px text-13px text-gray-400">提交后进入区级确认流程；被退回时可修改后重新提交。</div>
        <div class="mt-12px flex flex-col gap-8px">
          <div
            v-for="(plan, index) in summaryPlans"
            :key="index"
            class="flex items-start gap-12px b-b-1 b-b-solid b-gray-100 pb-8px text-14px"
          >
            <span class="w-70px shrink-0 font-600 text-gray-700">{{ MONTH_PLAN_LABELS[index] }}</span>
            <span class="text-gray-800">{{ plan || '未填写' }}</span>
          </div>
          <div v-if="!summaryPlans.some((plan) => plan)" class="text-14px text-gray-400">暂未填写任何月份计划</div>
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
<script lang="ts" setup name="ViewsIfcoImplProgressFillScheduleForm">
  import { computed, ref, watch } from 'vue';
  import { Input, Tag } from 'antdv-next';
  import { BasicForm, FormSchema, useForm } from '@jeesite/core/components/Form';
  import type { FormActionType } from '@jeesite/core/components/Form/src/types/form';
  import { BasicDrawer, useDrawerInner } from '@jeesite/core/components/Drawer';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { Stepper } from '@jeesite/ui';
  import type { StepItem } from '@jeesite/ui';
  import {
    MONTH_PLAN_LABELS,
    SCHEDULES,
    fillStatusTagProps,
    fiveReformLabel,
    projectAffiliationLabel,
    renewalAreaBatchLabel,
    type ScheduleItem,
  } from '@jeesite/ifco/api/ifco/impl-progress';

  const emit = defineEmits(['success']);
  const { showMessage } = useMessage();

  const isView = ref(false);
  const record = ref<Partial<ScheduleItem>>({});

  const isReturn = computed(() => record.value.fillStatus === '退回修改');
  const title = computed(() => `倒排工期计划${isReturn.value ? '退回修改' : ''} · ${record.value.projectName ?? ''}`);

  /** 距离填报截止：新入库=入库后 20 天，在库=当年 12 月 31 日 */
  const deadlineHint = computed(() => {
    if (!record.value.inLibraryDate) return '/';
    const inDate = new Date(record.value.inLibraryDate);
    const deadline = record.value.isNewInLibrary
      ? new Date(inDate.getTime() + 20 * 24 * 3600 * 1000)
      : new Date(inDate.getFullYear(), 11, 31);
    const days = Math.ceil((deadline.getTime() - Date.now()) / (24 * 3600 * 1000));
    return days >= 0 ? `${days}天` : '已超期';
  });

  // ── 三步步骤条（兼页签） ────────────────────────────────────────────
  const STEP_TITLES = ['基本信息查看', '倒排工期计划', '确认提交'];
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
    { label: '项目投资估算(亿元)', field: 'investEstimate', component: 'Input', dynamicDisabled: () => true },
    { label: '年度投资计划(亿元)', field: 'yearPlanInvest', component: 'Input', dynamicDisabled: () => true },
    { label: '计划开工时间', field: 'planStartDate', component: 'Input', dynamicDisabled: () => true },
    { label: '计划竣工时间', field: 'planCompletionDate', component: 'Input', dynamicDisabled: () => true },
    { label: '入库时间', field: 'inLibraryDate', component: 'Input', dynamicDisabled: () => true },
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
      investEstimate: record.value.investEstimate ?? '',
      yearPlanInvest: record.value.yearPlanInvest ?? '',
      planStartDate: record.value.planStartDate ?? '',
      planCompletionDate: record.value.planCompletionDate ?? '',
      inLibraryDate: record.value.inLibraryDate ?? '',
    });
  }

  function handleBaseFormRegister(instance: FormActionType, uuid: string) {
    registerBaseForm(instance, uuid);
    baseFormReady.value = true;
    applyBaseFormValues();
  }

  // ── ② 倒排工期计划表单 ─────────────────────────────────────────────
  const planSchemas: FormSchema[] = [
    { label: '倒排工期计划', field: 'planGroup', component: 'FormGroup', colProps: { md: 24, lg: 24 } },
    { label: '计划开始月份', field: 'planStartMonth', component: 'Input', slot: 'planStartMonth' },
    ...MONTH_PLAN_LABELS.map((label, index): FormSchema => ({
      label: `${label}计划`,
      field: `monthPlan${index}`,
      component: 'InputTextArea',
      componentProps: { rows: 2, maxlength: 200, placeholder: `请填写${label}计划内容，可留空` },
      colProps: { md: 24, lg: 12 },
    })),
  ];

  const [
    registerPlanForm,
    { setFieldsValue: setPlanFieldsValue, setProps: setPlanProps, getFieldsValue: getPlanFieldsValue },
  ] = useForm({
    labelWidth: 140,
    schemas: planSchemas,
    showActionButtonGroup: false,
  });

  const planFormReady = ref(false);

  /** 月份计划平铺回填（monthPlans 数组 → monthPlan0~11 表单字段） */
  function applyPlanFormValues() {
    const plans = record.value.monthPlans ?? [];
    setPlanFieldsValue({
      planStartMonth: record.value.planStartMonth ?? '',
      ...Object.fromEntries(MONTH_PLAN_LABELS.map((_, index) => [`monthPlan${index}`, plans[index] ?? ''])),
    });
  }

  function handlePlanFormRegister(instance: FormActionType, uuid: string) {
    registerPlanForm(instance, uuid);
    planFormReady.value = true;
    applyPlanFormValues();
  }

  // ── ③ 确认提交汇总（切到步骤③时从表单取快照，避免渲染期读未挂载表单） ─
  const summaryPlans = ref<string[]>([]);

  watch(activeStep, (next) => {
    if (next === 2 && planFormReady.value) summaryPlans.value = getPlanFieldsValueOfMonthPlans();
  });

  function getPlanFieldsValueOfMonthPlans(): string[] {
    const values = getPlanFieldsValue() as Record<string, unknown>;
    return MONTH_PLAN_LABELS.map((_, index) => String(values[`monthPlan${index}`] ?? ''));
  }

  // ── 抽屉 ────────────────────────────────────────────────────────────
  const [registerDrawer, { setDrawerProps, closeDrawer }] = useDrawerInner(async (data: any) => {
    setDrawerProps({ loading: true });
    isView.value = !!data?.isView;
    record.value = (data || {}) as Partial<ScheduleItem>;
    // 编辑落步骤②（填报）；查看落步骤①（基本信息查看）
    activeStep.value = isView.value ? 0 : 1;
    // 非激活步骤面板中的表单：已挂载则直接回填，未挂载等注册回调时回填
    if (baseFormReady.value) applyBaseFormValues();
    if (planFormReady.value) applyPlanFormValues();
    setPlanProps({ disabled: isView.value });
    setDrawerProps({ loading: false });
  });

  /** 保存草稿 / 提交：收拢月份计划写回内存行（月份计划均可留空，无必填校验） */
  function handleSave(nextStatus: '草稿' | '待确认') {
    const plans = getPlanFieldsValueOfMonthPlans().map((plan) => plan.trim());
    const target = SCHEDULES.find((item) => item.projectCode === record.value.projectCode);
    if (target) {
      target.monthPlans = plans;
      target.fillStatus = nextStatus;
      if (nextStatus === '待确认') target.returnInfo = undefined;
    }
    showMessage(nextStatus === '草稿' ? '保存成功（草稿）' : '提交成功，待区级确认');
    closeDrawer();
    emit('success', target);
  }
</script>
<style>
  /* 三步内容切换（Stepper 兼页签）：v-show 瞬时切走旧面板，新面板方向性滑入。
     只写 enter 类（无 leave 动画）——两块 BasicForm 常驻不销毁，避免滑动期间双表单并存跳动 */
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
