<!--
  ifco —— 实施进度填报（/ifco/impl-progress/fill）

  实施进度跟踪 · 填报端。顶部三张统计卡（倒排工期计划/月度进度填报/提示督办处理，
  卡即单选 select——点选切换下方列表，经路由 ?card= 持久化，无参数默认倒排工期计划）
  + 三个列表面板（v-show 切换不销毁，保留各自的搜索与翻页状态）。
  卡片形式对齐在库项目管理 list（/ifco/project-library-management/project-management/list）。

  面板内查看/编辑走各自表单抽屉（form 组件）：倒排工期/月度进度带三步步骤条
  （基本信息查看→填报→确认提交）与退回修改横幅；提示/督办处理为横幅信息+处理表单。
  当前后端尚未介入：数据来自 @jeesite/ifco/api/ifco/impl-progress（内存假数据，刷新即恢复）。

  菜单注册（菜单名称「实施进度填报」）：
   - 链接地址：/ifco/impl-progress/fill
   - 组件位置：/ifco/impl-progress/fill/index（与链接地址一致）
-->
<template>
  <PageWrapper contentClass="flex flex-col gap-16px">
    <!-- 三卡：单选 select（路由参数 ?card=），点选切换下方列表 -->
    <div class="grid grid-cols-1 gap-16px md:grid-cols-3">
      <div
        v-for="card in FILL_CARDS"
        :key="card.key"
        class="cursor-pointer bg-white rd-8px b-1 b-solid px-20px py-16px shadow-sm transition-colors"
        :class="selectedCard === card.key ? 'b-#1677ff bg-#f0f7ff' : 'b-gray-100 hover:b-gray-300'"
        @click="handleCardClick(card.key)"
      >
        <div class="flex items-center justify-between">
          <span
            class="inline-flex items-center rd-full b-1 b-solid px-10px py-1px text-13px font-600"
            :class="selectedCard === card.key ? 'b-#1677ff text-#1677ff' : 'b-#d46b08 text-#d46b08'"
          >
            {{ card.label }}
          </span>
          <span v-if="selectedCard === card.key" class="i-ant-design:check-circle-filled text-16px text-#1677ff"></span>
        </div>
        <div class="mt-8px text-12px leading-18px text-gray-400">{{ card.description }}</div>
        <div class="mt-10px flex flex-wrap items-baseline gap-x-24px gap-y-4px">
          <span v-for="stat in card.stats" :key="stat.label" class="text-13px text-gray-500">
            {{ stat.label }}
            <span class="text-20px font-700 text-gray-900">{{ stat.value }}</span>
          </span>
          <span v-if="card.progress" class="text-13px text-gray-500">
            已{{ card.progress.label }}
            <span class="text-20px font-700 text-gray-900">{{ card.progress.done }}</span>
            / 应{{ card.progress.label }}
            <span class="text-20px font-700 text-gray-900">{{ card.progress.total }}</span>
            项
          </span>
        </div>
        <Progress
          v-if="card.progress"
          :percent="Math.round((card.progress.done / card.progress.total) * 100)"
          size="small"
          class="mt-2px"
        />
      </div>
    </div>

    <!-- 三个列表面板：v-show 切换不销毁（保留搜索与翻页状态） -->
    <SchedulePanel v-show="selectedCard === 'schedule'" />
    <MonthlyPanel v-show="selectedCard === 'monthly'" />
    <SupervisePanel v-show="selectedCard === 'supervise'" />
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsIfcoImplProgressFill">
  import { computed } from 'vue';
  import { useRoute, useRouter } from 'vue-router';
  import { Progress } from 'antdv-next';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { FILL_CARDS, type FillCardKey } from '@jeesite/ifco/api/ifco/impl-progress';
  import SchedulePanel from './schedule-panel.vue';
  import MonthlyPanel from './monthly-panel.vue';
  import SupervisePanel from './supervise-panel.vue';

  const route = useRoute();
  const router = useRouter();

  /** 默认选中倒排工期计划（URL 无 ?card= 参数时同样按其过滤） */
  const DEFAULT_CARD: FillCardKey = 'schedule';

  const selectedCard = computed<FillCardKey>(() => {
    const card = route.query.card;
    return FILL_CARDS.some((item) => item.key === card) ? (card as FillCardKey) : DEFAULT_CARD;
  });

  /** 统计卡点选（单选）：只改 URL，面板显隐由 route.query 驱动 */
  function handleCardClick(key: FillCardKey) {
    if (selectedCard.value === key) return;
    const query: Record<string, string> = {};
    for (const [name, value] of Object.entries(route.query)) {
      if (typeof value === 'string' && value) query[name] = value;
    }
    query.card = key;
    router.replace({ query });
  }
</script>
