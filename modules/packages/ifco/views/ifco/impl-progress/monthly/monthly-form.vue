<!--
  ifco —— 月度进度填报（查看 / 编辑 一体表单抽屉）

  抽屉标题 = 月度进度填报[退回修改] · 项目名 + 项目进度提醒 Tag（派生：资金进度=
  年度投资进度、实施进度=实施进度完成百分比，资金超前实施 15 个百分点以上=滞后，
  其余=正常）；
  退回修改状态在步骤条上方以浅灰蓝横幅只读展示 提交/退回时间、退回部门、退回次数
  + 退回意见。三步步骤条（Stepper 兼页签）：①基本信息查看（共用只读表单）
  → ②进度填报（公共组件 shared/monthly-progress-fill：月份页签 + 月度进度信息
  + 投资情况/纳统情况；审查结果区走 #review 插槽，编译于本组件作用域）
  → ③确认提交（流程占位页：只表达流程状态，无实际内容）。
  底部按钮：取消 / 保存草稿（状态转待提交）/ 提交（必填项校验；状态转待区级审查、清退回信息）；
  审查模式（区级/市级列表「审查」入口，isReview+reviewRole）：填报表单全只读，
  步骤②审查结果 FormGroup 两级审查（区级=项目所在行政区住更局、市级=项目推进组，
  按轮次分组，历史只读本层级当前轮可填），底部=取消/提交审查。
  已接后端 /a/ifco/monthly/*：行集 rows（实施库项目左连工作流行）、保存 save
  （整行 upsert，状态编排在前端）；MONTHLIES 为行集本地缓存。
-->
<template>
  <BasicDrawer v-bind="$attrs" force-render width="70%" @register="registerDrawer">
    <template #title>
      <span>{{ title }}</span>
      <Tag
        v-if="record.yearInvest"
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
        <ProjectBasicInfoForm :p-uid="record.pUid ?? ''" disabled />
      </div>
    </Transition>

    <!-- ② 进度填报（公共组件 shared/monthly-progress-fill：月份页签 + 月度进度信息 + 投资情况/纳统情况；
         审查结果 UI 走插槽，编译于本组件作用域） -->
    <Transition :name="slideName">
      <div v-show="activeStep === 1">
        <MonthlyProgressFill ref="fillRef" show-review>
          <template #review>
            <!-- 审查结果（两级：区级=项目所在行政区住更局 / 市级=项目推进组；按轮次分组，
                 历史轮只读，本层级待审查的当前轮可填——与倒排工期计划同款） -->
            <template v-for="round in reviewRounds" :key="round.round">
              <div class="mt-8px mb-8px flex items-center gap-6px">
                <span class="i-ant-design:audit-outlined text-16px text-#1677ff"></span>
                <span class="text-14px font-500 text-gray-800">第{{ roundLabel(round.round) }}次审查</span>
              </div>
              <!-- 区级审查（该轮有区级记录或为当前轮即显示） -->
              <div v-if="round.district || round.isCurrent">
                <div class="mb-1 flex flex-wrap items-center gap-24px bg-gray-100 py-2 px-4 rd-2">
                  <span class="shrink-0 text-14px font-500 text-gray-800">{{ record.district }}住更局审查（区级）</span>
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
                  <span class="shrink-0 text-14px font-500 text-gray-800">市级审查（项目推进组）</span>
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
        </MonthlyProgressFill>
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
      <a-button v-if="isReview" type="primary" @click="handleReviewSubmit"> 提交审查 </a-button>
      <template v-else-if="!isView">
        <a-button class="mr-2" @click="handleSave('待提交')"> 保存草稿 </a-button>
        <a-button type="primary" @click="handleSave('待区级审查')"> 提交 </a-button>
      </template>
    </template>
  </BasicDrawer>
</template>
<script lang="ts" setup name="ViewsIfcoImplProgressFillMonthlyForm">
  import { computed, ref, watch } from 'vue';
  import { Select, Tag, TextArea } from 'antdv-next';
  import { BasicDrawer, useDrawerInner } from '@jeesite/core/components/Drawer';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { Stepper } from '@jeesite/ui';
  import type { StepItem } from '@jeesite/ui';
  import {
    progressReminderOf,
    progressReminderTagProps,
    saveMonthlyWorkflow,
    upsertMonthlyWorkflow,
    type MonthlyItem,
    type ReviewRecord,
  } from '@jeesite/ifco/api/ifco/impl-progress';
  import ProjectBasicInfoForm from '../../shared/project-basic-info-form.vue';
  import MonthlyProgressFill from '../../shared/monthly-progress-fill.vue';

  const emit = defineEmits(['success', 'register']);
  const { showMessage } = useMessage();

  const isView = ref(false);
  /** 审查模式（区级/市级列表「审查」入口）：填报表单只读，审查结果区填本层级结论/意见 */
  const isReview = ref(false);
  const reviewRole = ref<'district' | 'urban' | undefined>(undefined);
  const record = ref<Partial<MonthlyItem>>({});

  /** 进度填报公共组件（月份页签 + 月度进度信息 + 投资情况/纳统情况） */
  const fillRef = ref<InstanceType<typeof MonthlyProgressFill>>();

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

  // ── 审查结果区（两级：区级=项目所在行政区住更局，市级=项目推进组；按轮次分组，
  //    历史只读、本层级待审查的当前轮可填——与倒排工期计划同款交互） ─────────
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

  // ── 抽屉 ────────────────────────────────────────────────────────────
  const [registerDrawer, { setDrawerProps, closeDrawer }] = useDrawerInner(async (data: any) => {
    setDrawerProps({ loading: true });
    isView.value = !!data?.isView;
    isReview.value = !!data?.isReview && !isView.value;
    reviewRole.value = data?.reviewRole;
    districtConclusion.value = undefined;
    districtOpinion.value = '';
    urbanConclusion.value = undefined;
    urbanOpinion.value = '';
    record.value = (data || {}) as Partial<MonthlyItem>;
    // 统一落步骤②（进度填报）；查看/编辑/审查均不例外（09-23 用户定案）
    activeStep.value = 1;
    // 进度填报区（公共组件）按行底稿初始化；查看/审查整区只读
    await fillRef.value?.init(record.value, isView.value || isReview.value);
    setDrawerProps({ loading: false });
  });

  /** 保存草稿（不校验）/ 提交（必填校验）：逐月值整体写回内存行，并同步当月快照到行字段（列表展示） */
  async function handleSave(nextStatus: '待提交' | '待区级审查') {
    if (nextStatus === '待区级审查') {
      try {
        await fillRef.value?.validate();
      } catch (error: any) {
        if (error && error.errorFields) {
          showMessage(error.message || '请完善必填项');
        }
        return;
      }
    }
    const collected = fillRef.value?.collect();
    if (!collected) return;
    // 列表行来自实施库接口：无内存工作流行时按当前行底稿补建（upsert）
    const target = upsertMonthlyWorkflow(record.value as MonthlyItem);
    target.monthEntries = collected.entries;
    if (collected.snapshot) {
      target.constructionStage = collected.snapshot.constructionStage;
      target.currentProgress = collected.snapshot.currentProgress;
      target.implementProgress = collected.snapshot.implementProgress;
      target.monthProgressDesc = collected.snapshot.progressDesc;
    }
    target.monthCompletedInvest = collected.values.monthCompletedInvest;
    target.totalAccumulatedInvest = collected.values.totalAccumulatedInvest;
    target.yearAccumulatedInvest = collected.values.yearAccumulatedInvest;
    target.yearRangeAccumulatedInvest = collected.values.yearRangeAccumulatedInvest;
    target.carryOverAccumulatedInvest = collected.values.carryOverAccumulatedInvest;
    target.statisticsIncluded = collected.values.statisticsIncluded;
    target.statisticsCategory = collected.values.statisticsCategory;
    target.statisticsProjectCode = collected.values.statisticsProjectCode;
    target.notIncludedReason = collected.values.notIncludedReason;
    target.difficultyProblem = collected.values.difficultyProblem;
    target.milestonePhotos = collected.values.milestonePhotos;
    target.remark = collected.values.remark;
    target.fillStatus = nextStatus;
    if (nextStatus === '待区级审查') target.returnInfo = undefined;
    await saveMonthlyWorkflow(target);
    showMessage(nextStatus === '待提交' ? '保存成功（待提交）' : '提交成功，待区级审查');
    closeDrawer();
    emit('success', target);
  }

  /** 提交审查（两级：区级=项目所在行政区住更局，市级=项目推进组）：结论必选、退回必填意见；
   *  记录只追加逐轮保留；通过→区级转待市级审查、市级转市级审查通过；退回→转退回修改并写退回信息 */
  async function handleReviewSubmit() {
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
    const reviewOrg = level === '区级' ? `${record.value.district ?? ''}住房和城市更新局` : '项目推进组';
    const target = upsertMonthlyWorkflow(record.value as MonthlyItem);
    const round =
      (target.reviewRecords ?? []).filter((rec) => rec.level === '区级').length + (level === '区级' ? 1 : 0);
    (target.reviewRecords ??= []).push({
      round,
      level,
      reviewOrg,
      conclusion,
      opinion,
      reviewDate: new Date().toISOString().slice(0, 10),
    });
    const today = new Date().toISOString().slice(0, 10);
    if (conclusion === '通过审查') {
      target.fillStatus = level === '区级' ? '待市级审查' : '市级审查通过';
      target.returnInfo = undefined;
    } else {
      target.fillStatus = '退回修改';
      target.returnInfo = {
        submitDate: target.returnInfo?.submitDate ?? today,
        returnDate: today,
        returnOrg: reviewOrg,
        returnCount: (target.returnInfo?.returnCount ?? 0) + 1,
        returnOpinion: opinion,
      };
    }
    await saveMonthlyWorkflow(target);
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
  /* 月份切换/步骤切换滑入（与 schedule-form 同款；本文件自带避免依赖其它组件的全局样式） */
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
