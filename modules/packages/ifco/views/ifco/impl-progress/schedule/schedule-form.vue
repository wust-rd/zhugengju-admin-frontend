<!--
  ifco —— 倒排工期计划（查看 / 编辑 / 修改计划 / 审查 一体表单抽屉）

  抽屉标题 = 倒排工期计划[退回修改|修改计划] · 项目名 + 填报状态 Tag；退回修改状态在
  步骤条上方以浅灰蓝横幅只读展示 提交时间/退回时间/退回部门/退回次数 + 退回意见
  （从审查记录派生）。
  三步步骤条（@jeesite/ui 的 Stepper 兼页签）：①基本信息查看（恒只读表单）
  → ②倒排工期计划（一月~十二月计划可留空 + 审查结果 FormGroup——审查历史按轮次
  分组展示）→ ③确认提交（逐月计划汇总）。
  查看=两个表单 disabled + 底部仅关闭。
  修改计划模式（市级审查通过/退回修改行的「修改计划」入口）：仅当前月份至十二月
  计划可改，已过月份禁改（计划年份早于当前年全禁、晚于当前年全开）；保存草稿保持
  现状态，提交重新进入待区级审查。
  审查（区级/市级列表「审查」入口，isReview + reviewRole）：计划只读，步骤②审查结果
  FormGroup 内填本层级 审查结论（通过审查/退回修改）+ 审查意见（退回必填）提交；
  历史审查记录逐轮保留展示（reviewRecords 只追加）。
  底部按钮：填报=取消/保存草稿（状态转待提交）/ 提交（转待区级审查）；
  审查=取消/提交审查；查看=关闭。
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

    <!-- 退回信息横幅（退回修改状态；从审查记录派生，步骤条上方浅灰蓝横幅） -->
    <div v-if="isReturn && lastReturn" class="mb-12px rd-4px bg-#e8ecf5 px-16px py-10px text-14px">
      <div class="flex flex-wrap items-center gap-x-32px gap-y-4px text-gray-800">
        <span><span class="text-gray-500">提交时间：</span>{{ record.lastSubmitDate || '/' }}</span>
        <span><span class="text-gray-500">退回时间：</span>{{ lastReturn.reviewDate }}</span>
        <span><span class="text-gray-500">退回部门：</span>{{ lastReturn.reviewOrg }}</span>
        <span><span class="text-gray-500">退回次数：</span>第{{ returnCount }}次</span>
      </div>
      <div class="mt-4px text-#d46b08">退回意见：{{ lastReturn.opinion }}</div>
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

    <!-- ② 倒排工期计划（一月~十二月计划 + 审查结果 FormGroup，可留空） -->
    <Transition :name="slideName">
      <div v-show="activeStep === 1">
        <BasicForm @register="handlePlanFormRegister">
          <!-- 审查结果（版式参照 project-management/review-block：轮次标题行 +
               审查主体浅灰容器行（标题+按钮式 RadioGroup）+ ml-64px 缩进内容 + 纯文字小节标题）。
               按轮次分组：历史轮只读，本层级待审查的当前轮可填（结论 Select + 意见 TextArea） -->
          <template #reviewBlock>
            <template v-for="round in reviewRounds" :key="round.round">
              <!-- 填报人再次发起（当前轮且非首轮） -->
              <div v-if="round.isCurrent && round.round > 1" class="mt-8px mb-8px flex items-center gap-6px">
                <span class="i-ant-design:audit-outlined text-16px text-#1677ff"></span>
                <span class="text-14px font-500 text-gray-800"
                  >填报人再次发起 --- {{ record.lastSubmitDate || '/' }}</span
                >
              </div>
              <!-- 轮次标题 -->
              <div class="mt-8px mb-8px flex items-center gap-6px">
                <span class="i-ant-design:audit-outlined text-16px text-#1677ff"></span>
                <span class="text-14px font-500 text-gray-800">第{{ roundLabel(round.round) }}次审查</span>
              </div>

              <!-- xxx区审查（该轮有区级记录或为当前轮即显示） -->
              <div v-if="round.district || round.isCurrent">
                <div class="mb-1 flex flex-wrap items-center gap-24px bg-gray-100 py-2 px-4 rd-2">
                  <span class="w-100px shrink-0 text-14px font-500 text-gray-800">{{ record.district }}审查</span>
                </div>
                <div class="ml-64px">
                  <div class="px-8px py-4px text-14px font-500 text-gray-800">审查结论</div>
                  <div class="ml-16px py-8px">
                    <Select
                      :value="conclusionValue(round, 'district')"
                      :options="CONCLUSION_OPTIONS"
                      :disabled="!conclusionEditable(round, 'district')"
                      allow-clear
                      placeholder="请选择审查结论"
                      style="width: 240px"
                      @update:value="(value) => onConclusionUpdate(round, 'district', value)"
                    />
                  </div>
                  <div class="px-8px py-4px text-14px font-500 text-gray-800">审查意见</div>
                  <div class="ml-16px py-8px">
                    <TextArea
                      :value="opinionValue(round, 'district')"
                      :rows="2"
                      :maxlength="200"
                      :disabled="!conclusionEditable(round, 'district')"
                      placeholder="请输入审查意见（退回修改时必填）"
                      @update:value="(value) => onOpinionUpdate(round, 'district', value)"
                    />
                  </div>
                </div>
              </div>

              <!-- 市级审查（该轮有市级记录，或当前轮已流转到市级） -->
              <div v-if="round.urban || (round.isCurrent && urbanStageReached)" class="mt-16px">
                <div class="mb-1 flex flex-wrap items-center gap-24px bg-gray-100 py-2 px-4 rd-2">
                  <span class="w-100px shrink-0 text-14px font-500 text-gray-800">市级审查</span>
                </div>
                <div class="ml-64px">
                  <div class="px-8px py-4px text-14px font-500 text-gray-800">审查结论</div>
                  <div class="ml-16px py-8px">
                    <Select
                      :value="conclusionValue(round, 'urban')"
                      :options="CONCLUSION_OPTIONS"
                      :disabled="!conclusionEditable(round, 'urban')"
                      allow-clear
                      placeholder="请选择审查结论"
                      style="width: 240px"
                      @update:value="(value) => onConclusionUpdate(round, 'urban', value)"
                    />
                  </div>
                  <div class="px-8px py-4px text-14px font-500 text-gray-800">审查意见</div>
                  <div class="ml-16px py-8px">
                    <TextArea
                      :value="opinionValue(round, 'urban')"
                      :rows="2"
                      :maxlength="200"
                      :disabled="!conclusionEditable(round, 'urban')"
                      placeholder="请输入审查意见（退回修改时必填）"
                      @update:value="(value) => onOpinionUpdate(round, 'urban', value)"
                    />
                  </div>
                </div>
              </div>
            </template>
            <div v-if="!reviewRounds.length" class="mt-12px text-14px text-gray-400">暂无审查记录</div>
          </template>
        </BasicForm>
      </div>
    </Transition>

    <!-- ③ 确认提交（逐月计划汇总） -->
    <Transition :name="slideName">
      <div v-show="activeStep === 2" class="bg-white rd-8px px-24px py-20px">
        <div class="text-15px font-600 text-gray-900">倒排工期计划汇总</div>
        <div class="mt-4px text-13px text-gray-400">提交后进入区级审查流程；被退回时可修改后重新提交。</div>
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

    <!-- 底部按钮：查看=关闭；审查=取消/提交审查；填报=取消/保存草稿/提交 -->
    <template #footer>
      <a-button class="mr-2" @click="closeDrawer"> {{ isView ? '关闭' : '取消' }} </a-button>
      <a-button v-if="isReview" type="primary" @click="handleReviewSubmit"> 提交审查 </a-button>
      <template v-else-if="!isView">
        <a-button class="mr-2" @click="handleSave('draft')"> 保存草稿 </a-button>
        <a-button type="primary" @click="handleSave('submit')"> 提交 </a-button>
      </template>
    </template>
  </BasicDrawer>
</template>
<script lang="ts" setup name="ViewsIfcoImplProgressFillScheduleForm">
  import { BasicDrawer, useDrawerInner } from '@jeesite/core/components/Drawer';
  import { BasicForm, FormSchema, useForm } from '@jeesite/core/components/Form';
  import type { FormActionType } from '@jeesite/core/components/Form/src/types/form';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import {
    MONTH_PLAN_LABELS,
    SCHEDULES,
    fillStatusTagProps,
    fiveReformLabel,
    projectAffiliationLabel,
    renewalAreaBatchLabel,
    type ReviewRecord,
    type ScheduleItem,
  } from '@jeesite/ifco/api/ifco/impl-progress';
  import type { StepItem } from '@jeesite/ui';
  import { Stepper } from '@jeesite/ui';
  import { Select, Tag, TextArea } from 'antdv-next';
  import { computed, ref, watch } from 'vue';

  const emit = defineEmits(['success']);
  const { showMessage } = useMessage();

  const isView = ref(false);
  /** 修改计划模式（市级审查通过/退回修改行的「修改计划」入口；已过月份禁改） */
  const isRevise = ref(false);
  /** 审查模式（区级/市级列表「审查」入口）：计划只读，审查结果区填结论/意见 */
  const isReview = ref(false);
  const reviewRole = ref<'district' | 'urban' | undefined>(undefined);
  const record = ref<Partial<ScheduleItem>>({});

  const isReturn = computed(() => record.value.fillStatus === '退回修改');
  const title = computed(
    () =>
      `倒排工期计划${isReturn.value ? '退回修改' : isRevise.value ? '修改计划' : ''} · ${record.value.projectName ?? ''}`,
  );

  /** 退回横幅（从审查记录派生：最近一次退回 + 累计退回次数） */
  const lastReturn = computed(() =>
    [...(record.value.reviewRecords ?? [])].reverse().find((rec) => rec.conclusion === '退回修改'),
  );
  const returnCount = computed(
    () => (record.value.reviewRecords ?? []).filter((rec) => rec.conclusion === '退回修改').length,
  );

  // ── 审查结果区（版式参照 project-management/review-block；按轮次分组，历史只读、
  //    本层级待审查的当前轮可填） ────────────────────────────────────────
  const CONCLUSION_OPTIONS = [
    { label: '通过审查', value: '通过审查' },
    { label: '退回修改', value: '退回修改' },
  ];
  const districtConclusion = ref<ReviewRecord['conclusion'] | undefined>(undefined);
  const districtOpinion = ref('');
  const urbanConclusion = ref<ReviewRecord['conclusion'] | undefined>(undefined);
  const urbanOpinion = ref('');

  const districtEditable = computed(
    () => isReview.value && reviewRole.value === 'district' && record.value.fillStatus === '待区级审查',
  );
  const urbanEditable = computed(
    () => isReview.value && reviewRole.value === 'urban' && record.value.fillStatus === '待市级审查',
  );
  /** 当前轮已流转到市级（市级小节显示条件之一） */
  const urbanStageReached = computed(
    () => record.value.fillStatus === '待市级审查' || record.value.fillStatus === '市级审查通过',
  );

  /** 轮次视图：1~当前轮逐轮排布；待区级审查=新区级轮（无记录），其余状态=既有最大轮 */
  type ReviewRound = { round: number; isCurrent: boolean; district?: ReviewRecord; urban?: ReviewRecord };
  const reviewRounds = computed<ReviewRound[]>(() => {
    const records = record.value.reviewRecords ?? [];
    const maxRound = records.reduce((max, rec) => Math.max(max, rec.round), 0);
    const currentRound = record.value.fillStatus === '待区级审查' ? maxRound + 1 : maxRound;
    return Array.from({ length: currentRound }, (_, index) => {
      const round = index + 1;
      return {
        round,
        isCurrent: round === currentRound,
        district: records.find((rec) => rec.round === round && rec.level === '区级'),
        urban: records.find((rec) => rec.round === round && rec.level === '市级'),
      };
    });
  });

  /** 轮次序号中文（一~十，超出用数字） */
  const ROUND_CN = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
  function roundLabel(round: number): string {
    return ROUND_CN[round - 1] ?? String(round);
  }

  /** 结论/意见取值与可编辑判定：当前轮+本层级待审=绑定输入 ref，其余取记录值只读 */
  function conclusionEditable(round: ReviewRound, level: 'district' | 'urban'): boolean {
    const editable = level === 'district' ? districtEditable.value : urbanEditable.value;
    return round.isCurrent && editable;
  }

  function conclusionValue(round: ReviewRound, level: 'district' | 'urban'): ReviewRecord['conclusion'] | undefined {
    if (conclusionEditable(round, level)) {
      return level === 'district' ? districtConclusion.value : urbanConclusion.value;
    }
    return round[level]?.conclusion;
  }

  function opinionValue(round: ReviewRound, level: 'district' | 'urban'): string {
    if (conclusionEditable(round, level)) {
      return level === 'district' ? districtOpinion.value : urbanOpinion.value;
    }
    return round[level]?.opinion ?? '';
  }

  function onConclusionUpdate(round: ReviewRound, level: 'district' | 'urban', value: unknown): void {
    if (!conclusionEditable(round, level)) return;
    const conclusion = value === '通过审查' || value === '退回修改' ? value : undefined;
    if (level === 'district') districtConclusion.value = conclusion;
    else urbanConclusion.value = conclusion;
  }

  function onOpinionUpdate(round: ReviewRound, level: 'district' | 'urban', value: unknown): void {
    if (!conclusionEditable(round, level)) return;
    if (level === 'district') districtOpinion.value = String(value ?? '');
    else urbanOpinion.value = String(value ?? '');
  }

  /** 修改计划模式：当前起可编辑的月份下标（0~11；计划年份早于当前年=12 全禁、晚于=0 全开） */
  const reviseEditableFrom = computed(() => {
    const now = new Date();
    const planYear = Number((record.value.planStartMonth ?? '').slice(0, 4)) || now.getFullYear();
    if (planYear < now.getFullYear()) return 12;
    if (planYear > now.getFullYear()) return 0;
    return now.getMonth();
  });

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
    baseColProps: { md: 12, lg: 12 },
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

  // ── ② 倒排工期计划表单（一月~十二月计划 + 审查结果 FormGroup） ────────
  const planSchemas: FormSchema[] = [
    { label: '倒排工期计划', field: 'planGroup', component: 'FormGroup', colProps: { md: 24, lg: 24 } },
    ...MONTH_PLAN_LABELS.map((label, index): FormSchema => ({
      label: `${label}计划`,
      field: `monthPlan${index}`,
      component: 'InputTextArea',
      componentProps: { rows: 2, maxlength: 200, placeholder: `请填写${label}计划内容，可留空` },
      // 修改计划模式：已过月份禁改（当前月份至十二月可编辑）
      dynamicDisabled: () => isRevise.value && index < reviseEditableFrom.value,
      colProps: { md: 24, lg: 24 },
    })),
    { label: '审查结果', field: 'reviewGroup', component: 'FormGroup', colProps: { md: 24, lg: 24 } },
    { label: '', field: 'reviewBlock', component: 'Input', slot: 'reviewBlock', colProps: { md: 24, lg: 24 } },
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
    isRevise.value = !!data?.revisePlan && !isView.value;
    isReview.value = !!data?.isReview && !isView.value;
    reviewRole.value = data?.reviewRole;
    districtConclusion.value = undefined;
    districtOpinion.value = '';
    urbanConclusion.value = undefined;
    urbanOpinion.value = '';
    record.value = (data || {}) as Partial<ScheduleItem>;
    // 编辑/审查落步骤②（填报/看计划）；查看落步骤①（基本信息查看）
    activeStep.value = isView.value ? 0 : 1;
    // 非激活步骤面板中的表单：已挂载则直接回填，未挂载等注册回调时回填
    if (baseFormReady.value) applyBaseFormValues();
    if (planFormReady.value) applyPlanFormValues();
    setPlanProps({ disabled: isView.value || isReview.value });
    setDrawerProps({ loading: false });
  });

  /** 保存草稿 / 提交：收拢月份计划写回内存行（月份计划均可留空，无必填校验）。
   *  提交=待区级审查（记录提交时间）；保存草稿=普通填报转待提交、修改计划保持现状态 */
  function handleSave(action: 'draft' | 'submit') {
    const plans = getPlanFieldsValueOfMonthPlans().map((plan) => plan.trim());
    const target = SCHEDULES.find((item) => item.projectCode === record.value.projectCode);
    if (target) {
      target.monthPlans = plans;
      if (action === 'submit') {
        target.fillStatus = '待区级审查';
        target.lastSubmitDate = new Date().toISOString().slice(0, 10);
      } else {
        target.fillStatus = isRevise.value ? target.fillStatus : '待提交';
      }
    }
    showMessage(action === 'submit' ? '提交成功，待区级审查' : isRevise.value ? '保存成功' : '保存成功（待提交）');
    closeDrawer();
    emit('success', target);
  }

  /** 提交审查：结论必选、退回必填意见；记录只追加（轮次=区级审查条数推算），历史全保留。
   *  通过→区级转待市级审查、市级转市级审查通过；退回→转退回修改 */
  function handleReviewSubmit() {
    const role = reviewRole.value;
    if (role !== 'district' && role !== 'urban') return;
    const conclusion = role === 'district' ? districtConclusion.value : urbanConclusion.value;
    const opinion = (role === 'district' ? districtOpinion.value : urbanOpinion.value).trim();
    if (!conclusion) {
      showMessage('请选择审查结论');
      return;
    }
    if (conclusion === '退回修改' && !opinion) {
      showMessage('退回修改必须填写审查意见');
      return;
    }
    const level = role === 'district' ? ('区级' as const) : ('市级' as const);
    const target = SCHEDULES.find((item) => item.projectCode === record.value.projectCode);
    if (target) {
      // 轮次：每轮提交必先过区级，区级记录条数即轮次（区级审查中=条数+1）
      const round =
        (target.reviewRecords ?? []).filter((rec) => rec.level === '区级').length + (level === '区级' ? 1 : 0);
      (target.reviewRecords ??= []).push({
        round,
        level,
        reviewOrg: level === '区级' ? `${record.value.district ?? ''}住房和城市更新局` : '市住房和城市更新局',
        conclusion,
        opinion,
        reviewDate: new Date().toISOString().slice(0, 10),
      });
      target.fillStatus = conclusion === '通过审查' ? (level === '区级' ? '待市级审查' : '市级审查通过') : '退回修改';
    }
    showMessage(
      conclusion === '通过审查'
        ? level === '区级'
          ? '区级审查通过，已提交市级审查'
          : '市级审查通过'
        : '已退回，填报端呈退回修改状态',
    );
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
