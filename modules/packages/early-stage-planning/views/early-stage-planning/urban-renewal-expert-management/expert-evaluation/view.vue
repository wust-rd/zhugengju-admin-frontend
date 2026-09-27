<!--
  市住更局 —— 城市更新专家管理 · 专家评价 查看页（独立路由页，已接后端 /a/ure/eval/page）

  从「专家评价」列表已完成项目的【查看】进入（query：projectCode/projectName）。
  卡片流展示本项目全部评价记录（每位参与专家的每条评价）：被评专家 / 评价人 / 评价时间 /
  三维度星级（只读）/ 评价说明；卡片右上「删除」可移除单条记录（逻辑删除）。
  规划路由（后端隐藏菜单）：
   - 链接地址：/early-stage-planning/urban-renewal-expert-management/expert-evaluation/view?projectCode=xx
   - 组件位置：.../expert-evaluation/view；是否可见：隐藏；上级菜单挂「专家评价」以点亮侧边栏
-->
<template>
  <PageWrapper contentClass="flex flex-col gap-16px">
    <!-- 头部：返回 + 标题 -->
    <div class="flex items-center gap-12px shrink-0">
      <a-button @click="goBack">
        <span class="inline-flex items-center gap-4px">
          <span class="i-ant-design:arrow-left-outlined"></span> 返回
        </span>
      </a-button>
      <span class="text-16px font-500 text-gray-800">查看评价</span>
      <span v-if="projectName" class="text-14px text-gray-500">- {{ projectName }}</span>
      <span class="ml-auto text-13px text-gray-400">共 {{ records.length }} 条评价</span>
    </div>

    <!-- 评价记录卡片流 -->
    <div v-if="loading" class="bg-white rd-12px b-1 b-solid b-gray-100 p-48px text-center text-14px text-gray-400 shadow-sm">
      加载中…
    </div>
    <div v-else-if="records.length === 0" class="bg-white rd-12px b-1 b-solid b-gray-100 p-48px text-center text-14px text-gray-400 shadow-sm">
      本项目暂无评价记录
    </div>
    <div v-else class="space-y-16px">
      <div v-for="rec in records" :key="rec.id" class="bg-white rd-12px b-1 b-solid b-gray-100 p-24px shadow-sm">
        <!-- 卡片头：被评专家 + 评价人 + 时间 + 删除 -->
        <div class="flex items-center gap-16px">
          <div class="flex size-40px shrink-0 items-center justify-center rd-full bg-cyan-100 text-16px font-500 text-cyan-700">
            {{ (expertNameOf(rec.expertId) || '专').slice(0, 1) }}
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-8px">
              <span class="text-15px font-500 text-gray-800">{{ expertNameOf(rec.expertId) || '未知专家' }}</span>
              <span v-if="isLeaderOf(rec.expertId)" class="rd-4px px-6px py-2px text-12px text-white" style="background: #3a8ef6"
                >组长</span
              >
            </div>
            <div class="mt-2px text-13px text-gray-500">评价人：{{ rec.evaluator || '—' }}</div>
          </div>
          <span class="shrink-0 text-13px text-gray-400">{{ rec.time }}</span>
          <a-button type="link" danger size="small" :loading="deleting === rec.id" @click="handleDelete(rec)">删除</a-button>
        </div>

        <!-- 三维度星级（只读） -->
        <div class="mt-16px flex flex-wrap items-center gap-x-48px gap-y-8px border-t border-gray-100 pt-16px text-13px text-gray-700">
          <span class="flex items-center gap-8px"
            >活跃度：<Rate :value="rec.activityStars" allow-half disabled class="text-16px" />
            <span class="text-gray-500">{{ rec.activityScore ?? 0 }} 分</span></span
          >
          <span class="flex items-center gap-8px"
            >专业度：<Rate :value="rec.coverageStars" allow-half disabled class="text-16px" />
            <span class="text-gray-500">{{ rec.coverageScore ?? 0 }} 分</span></span
          >
          <span class="flex items-center gap-8px"
            >效率：<Rate :value="rec.efficiencyStars" allow-half disabled class="text-16px" />
            <span class="text-gray-500">{{ rec.efficiencyScore ?? 0 }} 分</span></span
          >
        </div>

        <!-- 评价说明 -->
        <div class="mt-12px flex items-start gap-8px border-t border-gray-100 pt-12px text-13px">
          <span class="shrink-0 text-gray-700">评价说明:</span>
          <span class="leading-22px text-gray-600">{{ rec.comment || '—' }}</span>
        </div>
      </div>
    </div>
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsEarlyStageUrbanRenewalExpertEvaluationView">
  import { onMounted, ref, unref } from 'vue';
  import { Rate } from 'antdv-next';
  import { useGo } from '@jeesite/core/hooks/web/usePage';
  import { useRoute } from 'vue-router';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { ureEvalDelete, ureEvalList, ureEvalPage } from '@jeesite/early-stage-planning/api/early-stage-planning/ure-eval';
  import type { UreEvalExpertRow, UreEvalRecordRow } from '@jeesite/early-stage-planning/api/early-stage-planning/ure-eval';

  const { showMessage } = useMessage();
  const route = useRoute();
  const go = useGo();

  const LIST_ROUTE = '/early-stage-planning/urban-renewal-expert-management/expert-evaluation/index';

  /** 路由参数：projectCode / projectName */
  const projectCode = String(unref(route.query).projectCode ?? '');
  const projectName = String(unref(route.query).projectName ?? '');

  /** 评价记录（该项目全部） */
  const records = ref<UreEvalRecordRow[]>([]);
  /** 项目参与专家（expertId → 姓名/组长标记） */
  const experts = ref<UreEvalExpertRow[]>([]);
  const loading = ref(true);
  const deleting = ref('');

  function expertNameOf(expertId: string) {
    return experts.value.find((e) => e.id === expertId)?.name ?? '';
  }
  function isLeaderOf(expertId: string) {
    return experts.value.find((e) => e.id === expertId)?.isLeader === true;
  }

  onMounted(loadAll);

  async function loadAll() {
    if (!projectCode) {
      loading.value = false;
      return;
    }
    try {
      const [page, list] = await Promise.all([
        ureEvalPage({ projectCode, pageNo: 1, pageSize: 100 }),
        ureEvalList({ projectCode }),
      ]);
      records.value = page.list;
      experts.value = list;
    } catch (e) {
      showMessage((e as Error)?.message || '评价记录加载失败');
    } finally {
      loading.value = false;
    }
  }

  /** 删除单条评价记录（逻辑删除） */
  async function handleDelete(rec: Recordable) {
    deleting.value = String(rec.id);
    try {
      await ureEvalDelete(rec.id);
      showMessage('删除成功');
      records.value = records.value.filter((r) => r.id !== rec.id);
    } catch (e) {
      showMessage((e as Error)?.message || '删除失败');
    } finally {
      deleting.value = '';
    }
  }

  function goBack() {
    go(LIST_ROUTE);
  }
</script>
