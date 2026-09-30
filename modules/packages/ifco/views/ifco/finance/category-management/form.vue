<!--
  ifco —— 资金分类填报（查看 / 编辑 一体抽屉）

  抽屉标题 = 资金分类填报 · 项目名 + 填报状态 Tag；副标题行 = 当前填报周期与截止
  天数；黄色横幅 = 金融政策案例匹配提示 + 投融政策链接（占位）。
  四步步骤条（Stepper 兼页签）：①基本信息查看（共用只读组件 project-basic-info-form，
  含实施条件三字段）→ ②进度填报（公共组件 shared/monthly-progress-fill：月份页签 +
  月度进度信息 + 投资情况/纳统情况，本抽屉恒只读——数据来自月度进度填报，编辑入口
  在月度填报抽屉）→ ③资金填报（平铺无卡片：资金基本情况 + 资金到位情况）→
  ④确认提交（流程占位页）。
  ③资金基本情况（金额均按亿元计量）：本年完成投资总额（=步骤②进度填报的
  本年度累计完成投资，只读自动带入）/ 投资纳统金额（手填）/ REITs 培育项目 /
  项目资金缺口 / 缺口资金是否已有资金安排 / 资金安排说明（安排=是时提交必填，
  红字提示）；
  ③资金到位情况（口径照 impl-progress/monthly/table.csv，备注列不进系统）：
  月份页签（默认月=填报期月夹进项目计划起止月；页签到项目起始月倒序止）+ 指标
  表格（列=指标名称/计量单位/代码/累计实际到位资金/本年度累计实际到位资金/
  月份列；月列=项目起始月至所选月倒序，仅所选月可填，已过月份只读带入；行照
  CSV 层级：输入行手填、灰色自动行按列求和——104=105+115+120、
  105=106+111+112+113+114、106=107+108+109+110、112=市级+区级预算资金、
  115=116+117+118；累计列=月列求和，本年度累计只加所选月同年月份；其他来源为
  按月文字行）。
  底部按钮：查看=关闭；编辑=取消/保存（状态转待提交）/ 提交（校验资金安排说明，
  状态转已提交）。
  保存只写资金登记（api/ifco/finance 的 saveFundFill，会话内存，刷新即恢复；
  不回写月度工作流——进度在本抽屉只读，状态机与编辑都在月度填报侧；行集来自
  实施库∪最新任务已采纳，见 list.vue 头注释）。本年完成投资总额/当月完成投资
  =月度进度填报值带入，随资金登记一并存。
-->
<template>
  <BasicDrawer v-bind="$attrs" force-render width="90%" @register="registerDrawer">
    <template #title>
      <span>资金分类填报 · {{ record.projectName }}</span>
      <Tag
        v-if="record.fillStatus"
        v-bind="fundFillStatusTagProps(record.fillStatus)"
        style="border-radius: 10px"
        class="ml-2"
      >
        {{ record.fillStatus }}
      </Tag>
    </template>

    <!-- 副标题：填报周期与截止天数 -->
    <div class="mb-8px text-13px text-gray-500">
      当前填报周期：{{ FUND_FILL_PERIOD.year }}-{{
        String(FUND_FILL_PERIOD.month).padStart(2, '0')
      }}　距离填报截止天数：{{ FUND_FILL_PERIOD.deadlineDays }}天
    </div>

    <!-- 金融政策案例匹配横幅 -->
    <div class="mb-16px b-l-4px b-l-solid b-l-#d46b08 bg-#fff7e6 rd-4px px-16px py-10px text-14px">
      <div class="text-gray-800"> 金融政策案例匹配：项目为老旧小区改造项目，可参照以下政策案例争取资金 </div>
      <div class="mt-4px flex items-center">
        <span class="text-gray-500">投融资政策链接：</span>
        <span class="cursor-pointer text-#1677ff" @click="handleTodo('政策链接')">
          市财政局市住房和城市更新局关于印发《武汉市城市更新行动中央补助资金管理暂行办法》的通知（武财建〔2024〕63号）
        </span>
      </div>
    </div>

    <!-- 四步步骤条（兼页签）：①基本信息查看 → ②进度填报 → ③资金填报 → ④确认提交 -->
    <Stepper v-model:active="activeStep" :steps="stepItems" class="mb-16px" />

    <!-- ① 基本信息查看（共用只读组件：项目基本信息 + 实施条件三字段；演示数据缺字段显示 /） -->
    <Transition :name="slideName">
      <div v-show="activeStep === 0">
        <ProjectBasicInfoForm :p-uid="record.pUid ?? ''" disabled />
      </div>
    </Transition>

    <!-- ② 进度填报（公共组件：月份页签 + 月度进度信息 + 投资情况/纳统情况；本抽屉恒只读，仅带入月度填报数据） -->
    <Transition :name="slideName">
      <div v-show="activeStep === 1">
        <MonthlyProgressFill ref="fillRef" />
      </div>
    </Transition>

    <!-- ③ 资金填报（资金基本情况 + 资金到位情况；平铺无卡片） -->
    <Transition :name="slideName">
      <div v-show="activeStep === 2" class="flex flex-col gap-16px">
        <!-- 资金基本情况 -->
        <div>
          <div class="text-15px font-600 text-gray-900">资金基本情况(此表使用亿元计量)</div>
          <div class="mt-12px grid grid-cols-1 gap-x-24px gap-y-12px md:grid-cols-2">
            <div class="flex items-center gap-8px">
              <div class="w-180px shrink-0 text-right text-14px text-gray-700">本年完成投资总额（亿元）</div>
              <Input :value="yearInvestTotal" disabled class="flex-1" />
              <span class="shrink-0 text-12px text-#ff4d4f">进度填报时自动带入</span>
            </div>
            <div class="flex items-center gap-8px">
              <div class="w-180px shrink-0 text-right text-14px text-gray-700">投资纳统金额(亿元)</div>
              <InputNumber
                v-model:value="formState.statInvestWan"
                :min="0"
                :disabled="isView"
                class="flex-1"
                placeholder="请输入投资纳统金额"
              />
            </div>
            <div class="flex items-center gap-8px">
              <div class="w-180px shrink-0 text-right text-14px text-gray-700">是否可以作为REITs培育项目</div>
              <Select
                v-model:value="formState.reitsProject"
                :options="yesNoOptions"
                :disabled="isView"
                allow-clear
                class="flex-1"
                placeholder="请选择"
              />
            </div>
            <div class="flex items-center gap-8px">
              <div class="w-180px shrink-0 text-right text-14px text-gray-700">项目资金缺口(亿元)</div>
              <InputNumber
                v-model:value="formState.fundGap"
                :min="0"
                :disabled="isView"
                class="flex-1"
                placeholder="请输入项目资金缺口"
              />
            </div>
            <div class="flex items-center gap-8px">
              <div class="w-180px shrink-0 text-right text-14px text-gray-700">缺口资金是否已有资金安排</div>
              <Select
                v-model:value="formState.gapArranged"
                :options="yesNoOptions"
                :disabled="isView"
                allow-clear
                class="flex-1"
                placeholder="请选择"
              />
            </div>
            <div class="flex items-start gap-8px md:col-span-2">
              <div class="w-180px shrink-0 pt-4px text-right text-14px text-gray-700">
                <span v-if="formState.gapArranged === '是'" class="text-#ff4d4f">*</span> 资金安排说明<span
                  class="mt-2px text-right text-12px text-#ff4d4f"
                >
                  (缺口资金已有资金安排时必填)
                </span>
              </div>
              <div class="min-w-0 flex-1">
                <TextArea
                  v-model:value="formState.gapArrangeDesc"
                  :disabled="isView"
                  :rows="3"
                  :maxlength="300"
                  show-count
                  placeholder="请输入资金安排说明"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- 资金到位情况：月份页签 + 指标表格（列含两列累计 + 起始月至所选月的月列） -->
        <div>
          <div class="text-15px font-600 text-gray-900">资金到位情况</div>
          <!-- 月份页签（默认月 → 项目起始月倒序；切页签换月列，已过月份只读） -->
          <Tabs v-model:active-key="activeFundMonthKey" type="card" class="mt-12px">
            <TabPane v-for="month in fundMonthTabs" :key="month" :tab="fundMonthLabel(month)" />
          </Tabs>
          <div class="overflow-x-auto">
            <table class="w-full text-14px">
              <thead>
                <tr class="b-b-1 b-b-solid b-gray-200 bg-gray-50 text-gray-500">
                  <th class="py-8px text-left font-500" style="padding-left: 12px; min-width: 230px">指标名称</th>
                  <th class="w-80px py-8px font-500">计量单位</th>
                  <th class="w-60px py-8px font-500">代码</th>
                  <th class="w-130px py-8px font-500">累计实际到位资金</th>
                  <th class="w-130px py-8px font-500">本年度累计实际到位资金</th>
                  <th
                    v-for="month in fundColumns"
                    :key="month"
                    class="w-120px py-8px font-500"
                    :class="month === activeFundMonth ? 'text-#1677ff' : ''"
                  >
                    {{ fundMonthLabel(month) }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in FUND_INDICATORS"
                  :key="row.key"
                  class="b-b-1 b-b-solid b-gray-100"
                  :class="row.autoOf ? 'bg-gray-50 font-600 text-gray-800' : ''"
                >
                  <td class="py-6px text-left text-gray-800" style="padding-left: 12px">{{
                    fundIndicatorName(row)
                  }}</td>
                  <td class="py-6px text-center text-gray-600">{{ row.unit }}</td>
                  <td class="py-6px text-center text-gray-600">{{ row.code || '—' }}</td>
                  <!-- 两列累计（只读派生：月列求和；本年度累计只加所选月同年月份；文字行无累计概念显示空） -->
                  <td class="px-6px py-6px text-right text-gray-800">{{ totalText(row, false) }}</td>
                  <td class="px-6px py-6px text-right text-gray-800">{{ totalText(row, true) }}</td>
                  <!-- 月列：仅所选月可填（文字行/输入行），已过月份只读带入；自动行恒只读按列求和；填写列文本右对齐，左右留白防相邻输入框贴死 -->
                  <td v-for="month in fundColumns" :key="month" class="px-6px py-6px text-right">
                    <!-- 文字行（其他来源，按月） -->
                    <template v-if="row.key === 'otherSource'">
                      <Input
                        v-if="month === activeFundMonth && !isView"
                        v-model:value="otherSources[month]"
                        :maxlength="100"
                        size="small"
                        placeholder="请输入来源说明"
                        class="w-full"
                      />
                      <span v-else class="text-13px text-gray-600">{{ otherSources[month] || '' }}</span>
                    </template>
                    <!-- 自动行：按该月子项求和（只读） -->
                    <span v-else-if="row.autoOf" class="text-gray-800">{{ formatAmount(cellValue(row, month)) }}</span>
                    <!-- 输入行：所选月可填，已过月份只读 -->
                    <InputNumber
                      v-else-if="month === activeFundMonth && !isView"
                      :value="fundValues[month]?.[row.key]"
                      :min="0"
                      size="small"
                      :controls="false"
                      class="w-full text-right"
                      placeholder="请输入"
                      @change="(value) => handleValueChange(month, row.key, value)"
                    />
                    <span v-else class="text-gray-600">{{ formatAmount(fundValues[month]?.[row.key] ?? 0) }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="mt-8px text-12px text-gray-400">
            灰色行为自动计算行，无需填写；月列=项目起始月至所选月，仅所选月可填，已过月份只读带入已填数据。
          </div>
        </div>
      </div>
    </Transition>

    <!-- ④ 确认提交（流程占位页：只表达流程状态，无实际内容） -->
    <Transition :name="slideName">
      <div v-show="activeStep === 3" class="bg-white rd-8px px-24px py-20px">
        <div class="text-14px text-gray-400">【当前页面只表达流程状态，无实际内容】</div>
      </div>
    </Transition>

    <!-- 底部按钮：查看=关闭；编辑=取消/保存/提交 -->
    <template #footer>
      <a-button class="mr-2" @click="closeDrawer"> {{ isView ? '关闭' : '取消' }} </a-button>
      <template v-if="!isView">
        <a-button class="mr-2" @click="handleSave('待提交')"> 保存 </a-button>
        <a-button type="primary" @click="handleSave('已提交')"> 提交 </a-button>
      </template>
    </template>
  </BasicDrawer>
</template>
<script lang="ts" setup name="ViewsIfcoFinanceCategoryManagementForm">
  import { computed, reactive, ref, watch } from 'vue';
  import NP from 'number-precision';
  import { Input, InputNumber, Select, TabPane, Tabs, Tag, TextArea } from 'antdv-next';
  import { BasicDrawer, useDrawerInner } from '@jeesite/core/components/Drawer';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { Stepper } from '@jeesite/ui';
  import type { StepItem } from '@jeesite/ui';
  import ProjectBasicInfoForm from '../../shared/project-basic-info-form.vue';
  import MonthlyProgressFill from '../../shared/monthly-progress-fill.vue';
  import { MONTHLIES, yearProgressValue, type MonthlyItem } from '@jeesite/ifco/api/ifco/impl-progress';
  import {
    FUND_FILL_PERIOD,
    FUND_INDICATORS,
    YES_NO_OPTIONS,
    autoValueOf,
    clampFundMonth,
    fundFillStatusTagProps,
    fundIndicatorName,
    fundMonthLabel,
    fundMonthRangeDesc,
    saveFundFill,
    type FundFillStatus,
    type FundIndicatorRow,
    type FundItem,
    type YesNo,
  } from '@jeesite/ifco/api/ifco/finance';

  const emit = defineEmits(['success', 'register']);
  const { showMessage } = useMessage();

  const isView = ref(false);
  const record = ref<Partial<FundItem>>({});

  // ── 四步步骤条（兼页签；v-show 不销毁表单，防丢填写中间态） ──────────
  const STEP_TITLES = ['基本信息查看', '进度填报', '资金填报', '确认提交'];
  const activeStep = ref(1);
  const slideName = ref<'stage-left' | 'stage-right'>('stage-left');

  /** 进度填报公共组件（步骤②） */
  const fillRef = ref<InstanceType<typeof MonthlyProgressFill>>();

  /** 本年完成投资总额（亿元，只读）：步骤②进度填报的本年度累计完成投资自动带入 */
  const yearInvestTotal = ref(0);

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

  const yesNoOptions = YES_NO_OPTIONS.map((name) => ({ label: name, value: name }));

  // ── 资金到位情况：月份页签 + 指标表格 ────────────────────────────────
  /** 起始/结束月：项目计划起止月（工作台行快照；缺失退化为填报期年 1~12 月） */
  const fundStartMonth = computed(
    () => (record.value.planStartDate ?? '').slice(0, 7) || `${FUND_FILL_PERIOD.year}-01`,
  );
  const fundEndMonth = computed(
    () => (record.value.planCompletionDate ?? '').slice(0, 7) || `${FUND_FILL_PERIOD.year}-12`,
  );

  /** 默认月：填报期月夹进项目起止月（不晚于结束月、不早于起始月） */
  const fundDefaultMonth = computed(() =>
    clampFundMonth(
      `${FUND_FILL_PERIOD.year}-${String(FUND_FILL_PERIOD.month).padStart(2, '0')}`,
      fundStartMonth.value,
      fundEndMonth.value,
    ),
  );

  /** 月份页签：默认月 → 项目起始月 倒序 */
  const fundMonthTabs = computed(() => fundMonthRangeDesc(fundStartMonth.value, fundDefaultMonth.value));

  const activeFundMonth = ref('');
  const activeFundMonthKey = computed({
    get: () => activeFundMonth.value,
    set: (key) => {
      activeFundMonth.value = key;
    },
  });

  /** 表格月列：项目起始月 → 所选月 倒序（仅所选月可填，已过月份只读带入） */
  const fundColumns = computed(() =>
    fundMonthRangeDesc(fundStartMonth.value, activeFundMonth.value || fundDefaultMonth.value),
  );

  /** 资金到位输入行数值（月份键 → 行 key → 数值；自动行不落表） */
  const fundValues = ref<Record<string, Record<string, number>>>({});
  /** 其他本年实际到位资金的来源（月份键 → 文字说明） */
  const otherSources = ref<Record<string, string>>({});

  function handleValueChange(month: string, key: string, value: number | null) {
    const monthValues = (fundValues.value[month] ??= {});
    if (value === null || value === undefined) {
      delete monthValues[key];
    } else {
      monthValues[key] = value;
    }
  }

  /** 单月单元格值（自动行按该月子项求和） */
  function cellValue(row: FundIndicatorRow, month: string): number {
    const monthValues = fundValues.value[month] ?? {};
    return row.autoOf ? autoValueOf(row.key, monthValues) : (monthValues[row.key] ?? 0);
  }

  /** 累计列：月列求和（onlyActiveYear=本年度累计，只加所选月同年月份；金额走 NP） */
  function totalCell(row: FundIndicatorRow, onlyActiveYear: boolean): number {
    return fundColumns.value
      .filter((month) => !onlyActiveYear || month.slice(0, 4) === activeFundMonth.value.slice(0, 4))
      .reduce((sum, month) => NP.plus(sum, cellValue(row, month)), 0);
  }

  /** 累计列展示文本（文字行「其他来源」无累计概念，显示空而非 0） */
  function totalText(row: FundIndicatorRow, onlyActiveYear: boolean): string {
    if (row.key === 'otherSource') return '';
    return formatAmount(totalCell(row, onlyActiveYear));
  }

  /** 数值展示：千分位 + 最多两位小数 */
  function formatAmount(value: number) {
    return value.toLocaleString('zh-CN', { maximumFractionDigits: 2 });
  }

  // ── 进度填报底稿（步骤②公共组件的行底稿，本抽屉恒只读展示） ────────
  const progressSeed = ref<Partial<MonthlyItem>>({});

  /** 底稿口径：已有月度工作流行沿用（逐月值/状态/审查保留），无则按本行拼最小底稿 */
  function buildProgressSeed(row: Partial<FundItem>): Partial<MonthlyItem> {
    const existed = MONTHLIES.find((item) => item.projectCode === row.projectCode);
    if (existed) return existed;
    return {
      pUid: row.pUid ?? '',
      projectCode: row.projectCode ?? '',
      projectName: row.projectName ?? '',
      district: row.district ?? '',
      renewalAreaName: row.renewalAreaName ?? '',
      renewalAreaBatch: row.renewalAreaBatch ?? '',
      fiveReformType: row.fiveReformType ?? '',
      projectAffiliation: row.projectAffiliation ?? '',
      investEstimate: row.investEstimate ?? 0,
      // 本年度计划完成投资（公共组件「年度投资进度」派生只读的分母）
      yearInvest: row.yearPlanInvest ?? 0,
      reportMonth: `${FUND_FILL_PERIOD.year}-${String(FUND_FILL_PERIOD.month).padStart(2, '0')}`,
      currentProgress: '',
      constructionStage: row.constructionStage ?? '',
      monthCompletedInvest: row.monthCompletedInvest ?? 0,
      yearAccumulatedInvest: row.yearInvestTotal ?? 0,
      totalAccumulatedInvest: row.yearInvestTotal ?? 0,
      monthProgressDesc: '',
      planStartDate: row.planStartDate ?? '',
      planCompletionDate: row.planCompletionDate ?? '',
      inLibraryDate: '',
      reportOrg: '',
      statisticsIncluded: '否',
      fillStatus: '待提交',
    };
  }

  // ── 表单状态（抽屉打开时按行数据整体重建） ──────────────────────────
  const formState = reactive({
    statInvestWan: undefined as number | undefined,
    reitsProject: undefined as YesNo | undefined,
    fundGap: undefined as number | undefined,
    gapArranged: undefined as YesNo | undefined,
    gapArrangeDesc: '',
  });

  // ── 抽屉 ────────────────────────────────────────────────────────────
  const [registerDrawer, { setDrawerProps, closeDrawer }] = useDrawerInner(async (data: any) => {
    setDrawerProps({ loading: true });
    isView.value = !!data?.isView;
    record.value = (data || {}) as Partial<FundItem>;
    // 统一落步骤③（资金填报，本抽屉的填报主体步）；查看/编辑均不例外
    activeStep.value = 2;
    progressSeed.value = buildProgressSeed(record.value);
    // 进度填报恒只读（编辑入口在月度进度填报抽屉），仅带入月度数据
    await fillRef.value?.init(progressSeed.value, true);
    yearInvestTotal.value = progressSeed.value.yearAccumulatedInvest ?? 0;

    formState.statInvestWan = record.value.statInvestWan;
    formState.reitsProject = record.value.reitsProject;
    formState.fundGap = record.value.fundGap;
    formState.gapArranged = record.value.gapArranged;
    formState.gapArrangeDesc = record.value.gapArrangeDesc ?? '';
    fundValues.value = Object.fromEntries(
      Object.entries(record.value.values ?? {}).map(([month, values]) => [month, { ...values }]),
    );
    otherSources.value = { ...(record.value.otherSource ?? {}) };
    activeFundMonth.value = fundDefaultMonth.value;

    setDrawerProps({ loading: false });
  });

  /** 保存（转待提交，不校验）/ 提交（校验资金安排说明，转已提交）：只写资金登记；
   *  本年完成投资总额/当月完成投资=月度进度填报值（底稿带入），随登记一并存 */
  async function handleSave(nextStatus: Exclude<FundFillStatus, '待填报'>) {
    if (nextStatus === '已提交' && formState.gapArranged === '是' && !formState.gapArrangeDesc.trim()) {
      showMessage('缺口资金已有资金安排时，请填写资金安排说明');
      activeStep.value = 2;
      return;
    }
    const yearAccumulated = yearInvestTotal.value;
    saveFundFill(record.value.pUid ?? record.value.projectCode ?? '', {
      fillStatus: nextStatus,
      yearInvestTotal: yearAccumulated,
      yearAccumulatedInvest: yearAccumulated,
      monthCompletedInvest: progressSeed.value.monthCompletedInvest ?? record.value.monthCompletedInvest ?? 0,
      yearProgressRate: yearProgressValue({
        yearAccumulatedInvest: yearAccumulated,
        yearInvest: record.value.yearPlanInvest,
      }),
      statInvestWan: formState.statInvestWan,
      reitsProject: formState.reitsProject,
      fundGap: formState.fundGap,
      gapArranged: formState.gapArranged,
      gapArrangeDesc: formState.gapArrangeDesc,
      values: Object.fromEntries(Object.entries(fundValues.value).map(([month, values]) => [month, { ...values }])),
      otherSource: { ...otherSources.value },
    });
    showMessage(nextStatus === '待提交' ? '保存成功（待提交）' : '提交成功');
    closeDrawer();
    emit('success');
  }

  /** 占位操作（TODO：政策链接随后端接入） */
  function handleTodo(label: string) {
    showMessage(`${label}：功能待接入`);
  }
</script>
