<!--
  ifco —— 市级实施进度管理（/ifco/impl-progress/urban）

  实施进度跟踪 · 市级端。顶部四张统计卡（倒排工期计划确认/月度进度确认/
  片区三色图进展/提示督办，卡即单选 select——点选切换下方列表，经路由
  ?card= 持久化，无参数默认倒排工期计划确认）+ 四个列表面板（v-show 切换
  不销毁）。倒排/月度确认复用区级页 confirm-panel 与 shared 的
  monthly-confirm-panel（退回部门写市住更局）；三色图评估走 shared 的
  tricolor-panel；提示/督办为市级专属列表（新增提示/新增督办/下发/确认）。
  统计卡数字照市级设计稿抄录（与演示假数据行数不一致属正常）；
  两端共用同一份内存假数据：市级确认/退回/评估同样落库，填报端与区级端即刻可见。

  菜单注册（菜单名称「市级实施进度管理」）：
   - 链接地址：/ifco/impl-progress/urban
   - 组件位置：/ifco/impl-progress/urban/index（与链接地址一致）
-->
<template>
  <PageWrapper contentClass="flex flex-col gap-16px">
    <!-- 四卡：单选 select（路由参数 ?card=），点选切换下方列表 -->
    <div class="grid grid-cols-1 gap-16px md:grid-cols-2 xl:grid-cols-4">
      <div
        v-for="card in URBAN_CARDS"
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

    <!-- 四个列表面板：v-show 切换不销毁（保留搜索与翻页状态） -->
    <ConfirmPanel v-show="selectedCard === 'confirm'" return-org="市住房和城市更新局" />
    <MonthlyConfirmPanel v-show="selectedCard === 'monthly-confirm'" return-org="市住房和城市更新局" />
    <TriColorPanel v-show="selectedCard === 'tricolor'" />
    <SupervisePanel v-show="selectedCard === 'supervise'" />
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsIfcoImplProgressUrban">
  import { computed } from 'vue';
  import { useRoute, useRouter } from 'vue-router';
  import { Progress } from 'antdv-next';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { URBAN_CARDS, type DistrictCardKey } from '@jeesite/ifco/api/ifco/impl-progress';
  import ConfirmPanel from '../district/confirm-panel.vue';
  import MonthlyConfirmPanel from '../shared/monthly-confirm-panel.vue';
  import TriColorPanel from '../shared/tricolor-panel.vue';
  import SupervisePanel from './supervise-panel.vue';

  const route = useRoute();
  const router = useRouter();

  /** 默认选中倒排工期确认（URL 无 ?card= 参数时同样按其过滤） */
  const DEFAULT_CARD: DistrictCardKey = 'confirm';

  const selectedCard = computed<DistrictCardKey>(() => {
    const card = route.query.card;
    return URBAN_CARDS.some((item) => item.key === card) ? (card as DistrictCardKey) : DEFAULT_CARD;
  });

  /** 统计卡点选（单选）：只改 URL，面板显隐由 route.query 驱动 */
  function handleCardClick(key: DistrictCardKey) {
    if (selectedCard.value === key) return;
    const query: Record<string, string> = {};
    for (const [name, value] of Object.entries(route.query)) {
      if (typeof value === 'string' && value) query[name] = value;
    }
    query.card = key;
    router.replace({ query });
  }
</script>
