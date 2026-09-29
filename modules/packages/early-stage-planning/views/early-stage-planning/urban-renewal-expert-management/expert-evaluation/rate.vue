<!--
  市住更局 —— 城市更新专家管理 · 专家评价 打分页（独立路由页，已接后端 /a/ure/eval/*）

  从「专家评价」列表待评价项目的【评价】进入（query：projectCode/projectName）。
  页面结构（对齐设计图）：
  - 顶部「评价说明」信息框（1~10 分制 / 三维度 / 记入专家档案 / 如实评价）；
  - 每位参与专家一张卡片：姓名/单位/专业领域/职称 + 三维度星级（专业水平/履职表现/意见质量，
    半星步进一颗星 2 分）+ 每卡评价说明；已评价的专家卡片只读回显；
  - 底部「取消 / 提交」：一次提交全部未评专家（逐条 save），全部参与专家评完自动完成评价
    （finishEval，项目 → 已完成）。
  维度文案与后端字段的映射：专业水平→activity_score、履职表现→coverage_score、意见质量→efficiency_score
  （沿用既有表列，仅展示文案不同）。
  规划路由（后端隐藏菜单）：
   - 链接地址：/early-stage-planning/urban-renewal-expert-management/expert-evaluation/rate?projectCode=xx
   - 组件位置：.../expert-evaluation/rate；是否可见：隐藏；上级菜单挂「专家评价」以点亮侧边栏
-->
<template>
  <PageWrapper contentClass="flex flex-col gap-16px">
    <!-- 头部：返回 + 标题 + 项目名 -->
    <div class="flex items-center gap-12px shrink-0">
      <a-button @click="goBack">
        <span class="inline-flex items-center gap-4px">
          <span class="i-ant-design:arrow-left-outlined"></span> 返回
        </span>
      </a-button>
      <span class="text-16px font-500 text-gray-800">评价</span>
      <span v-if="projectName" class="text-14px text-gray-500">- {{ projectName }}</span>
      <span class="ml-auto text-13px text-gray-400">已评价 {{ evaluatedCount }} / {{ cards.length }} 位专家</span>
    </div>

    <div v-if="loading" class="bg-white rd-12px b-1 b-solid b-gray-100 p-48px text-center text-14px text-gray-400 shadow-sm">
      加载中…
    </div>
    <div v-else-if="!projectId" class="bg-white rd-12px b-1 b-solid b-gray-100 p-48px text-center text-14px text-gray-400 shadow-sm">
      {{ loadError || '缺少项目参数' }}
    </div>
    <template v-else>
      <!-- 评价说明 -->
      <div class="rd-12px b-1 b-solid b-[#BBD8F5] bg-[#F0F6FF] p-20px">
        <div class="text-15px font-600 text-gray-800">评价说明</div>
        <ul class="mt-8px space-y-4px text-13px leading-22px text-gray-600">
          <li>1. 评分采用 1~10 分制：每颗星 2 分、半颗星 1 分，最低 1 分，最高 10 分。</li>
          <li>2. 评分维度包括：专业水平、履职表现、意见质量。</li>
          <li>3. 评分结果将记入专家个人档案，作为后续项目抽取专家的参考依据。</li>
          <li>4. 请根据专家在项目评估过程中的实际表现，如实客观评价。</li>
        </ul>
      </div>

      <!-- 专家评价卡片 -->
      <div v-for="card in cards" :key="card.expertId" class="bg-white rd-12px b-1 b-solid b-gray-100 p-24px shadow-sm">
        <!-- 卡片头：专家信息 -->
        <div class="flex items-center gap-14px">
          <div class="flex size-44px shrink-0 items-center justify-center rd-full bg-cyan-100 text-16px font-500 text-cyan-700">
            {{ card.name.slice(0, 1) }}
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-8px">
              <span class="text-16px font-600 text-gray-800">{{ card.name }}</span>
              <span v-if="card.isLeader" class="rd-4px px-6px py-2px text-12px text-white" style="background: #3a8ef6">组长</span>
              <Tag v-if="card.evaluated" class="ml-4px" color="cyan">已评价</Tag>
            </div>
            <div class="mt-2px flex flex-wrap gap-x-16px text-13px text-gray-500">
              <span>单位：{{ card.org || '—' }}</span>
              <span>专业领域：{{ card.field || '—' }}</span>
              <span>职称：{{ card.title || '—' }}</span>
            </div>
          </div>
        </div>

        <!-- 三维度星级 + 评价说明（已评价：只读回显） -->
        <template v-if="!card.evaluated">
          <div class="mt-16px space-y-12px border-t border-gray-100 pt-16px">
            <div v-for="dim in RATE_DIMENSIONS" :key="dim.key" class="flex items-center gap-16px">
              <span class="w-90px shrink-0 text-right text-14px text-gray-600">{{ dim.label }}（10分）</span>
              <Rate v-model:value="card[dim.key]" allow-half />
              <span class="w-48px text-13px text-gray-500">{{ (card[dim.key] * 2).toFixed(1) }} 分</span>
            </div>
            <div class="flex items-start gap-16px">
              <span class="w-90px shrink-0 text-right text-14px leading-22px text-gray-600">评价说明</span>
              <Input.TextArea
                v-model:value="card.comment"
                class="flex-1"
                :rows="2"
                :maxlength="1000"
                placeholder="请输入评价说明"
              />
            </div>
          </div>
        </template>
        <template v-else>
          <div class="mt-16px space-y-12px border-t border-gray-100 pt-16px">
            <div v-for="dim in RATE_DIMENSIONS" :key="dim.key" class="flex items-center gap-16px">
              <span class="w-90px shrink-0 text-right text-14px text-gray-600">{{ dim.label }}（10分）</span>
              <Rate :value="card[dim.key]" allow-half disabled />
              <span class="w-48px text-13px text-gray-500">{{ (card[dim.key] * 2).toFixed(1) }} 分</span>
            </div>
            <div class="flex items-start gap-16px">
              <span class="w-90px shrink-0 text-right text-14px leading-22px text-gray-600">评价说明</span>
              <span class="flex-1 whitespace-pre-wrap rounded-8px bg-[#F7F9FC] px-14px py-8px text-13px leading-22px text-gray-700">
                {{ card.comment || '—' }}
              </span>
            </div>
          </div>
        </template>
      </div>

      <!-- 底部操作 -->
      <div class="flex items-center justify-end gap-12px">
        <a-button @click="goBack">取消</a-button>
        <a-button type="primary" :loading="submitting" @click="submitAll">提交</a-button>
      </div>
    </template>
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsEarlyStageUrbanRenewalExpertEvaluationRate">
  import { computed, onMounted, ref, unref } from 'vue';
  import { Input, Rate, Tag } from 'antdv-next';
  import { useGo } from '@jeesite/core/hooks/web/usePage';
  import { useRoute } from 'vue-router';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { ureEvalPage, ureEvalSave } from '@jeesite/early-stage-planning/api/early-stage-planning/ure-eval';
  import type { UreEvalRecordRow } from '@jeesite/early-stage-planning/api/early-stage-planning/ure-eval';
  import {
    ureProjectDetail,
    ureProjectFinishEval,
  } from '@jeesite/early-stage-planning/api/early-stage-planning/ure-project';

  const { showMessage } = useMessage();
  const route = useRoute();
  const go = useGo();

  const LIST_ROUTE = '/early-stage-planning/urban-renewal-expert-management/expert-evaluation/index';

  /** 路由参数：projectCode / projectName */
  const projectCode = String(unref(route.query).projectCode ?? '');
  const projectName = String(unref(route.query).projectName ?? '');

  /**
   * 打分维度定义（展示文案 → 后端字段的映射，沿用既有表列仅文案不同）：
   * 专业水平→activity、履职表现→coverage、意见质量→efficiency
   */
  const RATE_DIMENSIONS = [
    { key: 'activity', label: '专业水平' },
    { key: 'coverage', label: '履职表现' },
    { key: 'efficiency', label: '意见质量' },
  ] as const;

  type RateKey = (typeof RATE_DIMENSIONS)[number]['key'];

  /** 专家评价卡片（参与专家 + 打分状态；已评价的回显只读） */
  type EvalCard = {
    expertId: string;
    name: string;
    org: string;
    field: string;
    title: string;
    isLeader: boolean;
    evaluated: boolean;
    comment: string;
  } & Record<RateKey, number>;

  const cards = ref<EvalCard[]>([]);
  const projectId = ref('');
  const loading = ref(true);
  const loadError = ref('');
  const submitting = ref(false);

  const evaluatedCount = computed(() => cards.value.filter((c) => c.evaluated).length);

  onMounted(async () => {
    if (!projectCode) {
      loading.value = false;
      return;
    }
    try {
      // 参与专家名单（实施主体为创建人可见完整名单）+ 本项目已有评价记录（回显已评专家）
      const [detail, evalPage] = await Promise.all([
        ureProjectDetail(projectCode),
        ureEvalPage({ projectCode, pageNo: 1, pageSize: 100 }).catch(() => ({ list: [] as UreEvalRecordRow[] })),
      ]);
      projectId.value = detail.id;
      const existed = evalPage.list ?? [];
      cards.value = (detail.experts ?? []).map((expert) => {
        const rec = existed.find((r) => r.expertId === expert.id);
        return {
          expertId: expert.id,
          name: expert.name,
          org: expert.org ?? '',
          field: expert.field ?? '',
          title: expert.title ?? '',
          isLeader: expert.isLeader === true,
          evaluated: !!rec,
          activity: rec?.activityStars ?? 0,
          coverage: rec?.coverageStars ?? 0,
          efficiency: rec?.efficiencyStars ?? 0,
          comment: rec?.comment ?? '',
        };
      });
    } catch (e) {
      loadError.value = (e as Error)?.message || '评价数据加载失败';
      showMessage(loadError.value);
    } finally {
      loading.value = false;
    }
  });

  /** 提交：逐个保存未评专家的三维度评价；全部参与专家评完自动完成评价（项目 → 已完成） */
  async function submitAll() {
    if (!projectId.value) return;
    const pending = cards.value.filter((c) => !c.evaluated);
    const invalid = pending.find((c) => !c.activity || !c.coverage || !c.efficiency);
    if (invalid) {
      showMessage(`请为专家「${invalid.name}」的三个维度都打分`);
      return;
    }
    submitting.value = true;
    try {
      for (const card of pending) {
        await ureEvalSave({
          expertId: card.expertId,
          activityStars: card.activity,
          coverageStars: card.coverage,
          efficiencyStars: card.efficiency,
          comment: card.comment || undefined,
          projectCode: projectCode || undefined,
        });
      }
      // 全部参与专家已有评价 → 完成评价，项目流转已完成
      await ureProjectFinishEval(projectId.value);
      showMessage('评价完成，项目已完成');
      goBack();
    } catch (e) {
      showMessage((e as Error)?.message || '提交失败');
    } finally {
      submitting.value = false;
    }
  }

  function goBack() {
    go(LIST_ROUTE);
  }
</script>
