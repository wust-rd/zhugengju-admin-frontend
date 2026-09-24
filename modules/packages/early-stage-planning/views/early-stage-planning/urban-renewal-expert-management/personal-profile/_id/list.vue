<!--
  市住更局 —— 城市更新专家管理 · 个人档案 详情页（二级页面）

  从个人档案列表「查看」跳入，整页展示专家信息（空间比弹窗大，便于后续扩展更多区块）。
  已接后端：详情走接口层 ure-expert（GET /a/ure/expert/form?id=）。
  规划路由（RESTful，后端隐藏菜单，待注册）：
   - 链接地址：/early-stage-planning/urban-renewal-expert-management/personal-profile/{id}（{id}=专家 id）
   - 组件位置：/early-stage-planning/urban-renewal-expert-management/personal-profile/_id/list（与链接地址不一致，菜单里需显式填写）
   - 是否可见：隐藏；上级菜单挂「个人档案」以点亮侧边栏
  页面结构：档案头部卡（头像/姓名/职称/领域/单位）→ 基本信息栅格 → 主要经历 → 预留扩展区。
-->
<template>
  <PageWrapper contentClass="flex flex-col gap-16px">
    <template v-if="expert">
      <!-- 档案头部卡 -->
      <div class="bg-white rd-12px b-1 b-solid b-gray-100 p-24px shadow-sm">
        <div class="flex items-center gap-20px">
          <div
            class="size-80px shrink-0 rd-full bg-cyan-100 text-cyan-700 flex items-center justify-center text-32px font-500"
          >
            {{ expert.name.slice(0, 1) }}
          </div>

          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-12px">
              <span class="text-22px font-600 text-gray-900">{{ expert.name }}</span>
              <span class="rd-4px px-8px py-2px text-13px text-amber-500" :style="{ background: '#FDF3E0' }">
                {{ expert.title }}
              </span>
              <span class="rd-4px px-8px py-2px text-13px text-gray-800" :style="{ background: '#EFF6FF' }">
                {{ expert.field }}
              </span>
            </div>
            <div class="mt-6px flex items-center gap-16px text-13px text-gray-500">
              <span>{{ expert.org }}</span>
              <span>{{ expert.orgType }}</span>
              <span>档案编号：{{ expert.code }}</span>
            </div>
          </div>

          <a-button @click="goBack">
            <span class="inline-flex items-center gap-4px">
              <span class="i-ant-design:arrow-left-outlined"></span> 返回列表
            </span>
          </a-button>
        </div>
      </div>

      <!-- 基本信息 -->
      <div class="bg-white rd-12px b-1 b-solid b-gray-100 p-24px shadow-sm">
        <div class="text-16px font-600 text-gray-800">基本信息</div>
        <div class="mt-16px grid grid-cols-4 gap-x-16px gap-y-12px text-14px">
          <div class="min-w-0">
            <div class="text-12px text-gray-400">性别</div>
            <div class="mt-4px text-gray-700">{{ expert.gender }}</div>
          </div>
          <div class="min-w-0">
            <div class="text-12px text-gray-400">年龄</div>
            <div class="mt-4px text-gray-700">{{ expert.age }} 岁</div>
          </div>
          <div class="min-w-0">
            <div class="text-12px text-gray-400">联系电话</div>
            <div class="mt-4px text-gray-700">{{ expert.phone }}</div>
          </div>
          <div class="min-w-0">
            <div class="text-12px text-gray-400">入库时间</div>
            <div class="mt-4px text-gray-700">{{ expert.joinDate }}</div>
          </div>
          <div class="min-w-0">
            <div class="text-12px text-gray-400">专业领域</div>
            <div class="mt-4px text-gray-700">{{ expert.field }}</div>
          </div>
          <div class="min-w-0">
            <div class="text-12px text-gray-400">职称</div>
            <div class="mt-4px text-gray-700">{{ expert.title }}</div>
          </div>
          <div class="min-w-0">
            <div class="text-12px text-gray-400">单位名称</div>
            <div class="mt-4px text-gray-700">{{ expert.org }}</div>
          </div>
          <div class="min-w-0">
            <div class="text-12px text-gray-400">单位性质</div>
            <div class="mt-4px text-gray-700">{{ expert.orgType }}</div>
          </div>
        </div>
      </div>

      <!-- 主要经历 -->
      <div class="bg-white rd-12px b-1 b-solid b-gray-100 p-24px shadow-sm">
        <div class="text-16px font-600 text-gray-800">主要经历</div>
        <p class="mt-12px whitespace-pre-wrap text-14px leading-26px text-gray-700">{{ expert.career || '—' }}</p>
      </div>

      <!-- 过往评审经历 -->
      <div class="bg-white rd-12px b-1 b-solid b-gray-100 p-24px shadow-sm">
        <div class="text-16px font-600 text-gray-800">过往评审经历</div>
        <p class="mt-12px whitespace-pre-wrap text-14px leading-26px text-gray-700">{{
          expert.reviewExperience || '—'
        }}</p>
      </div>

      <!-- 预留扩展区：后续可在此追加 参与项目 / 评价记录 等内容 -->
      <div
        class="flex min-h-160px items-center justify-center rd-12px b-1 b-dashed b-gray-200 bg-gray-50 text-14px text-gray-400"
      >
        预留扩展区（后续内容加在这里）
      </div>
    </template>

    <div v-else-if="loading" class="flex h-300px items-center justify-center text-14px text-gray-400">
      档案加载中...
    </div>
    <div v-else class="flex h-300px items-center justify-center text-14px text-gray-400"> 未找到该专家档案 </div>
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsEarlyStageUrbanRenewalExpertProfileDetail">
  import { ref, unref } from 'vue';
  import { router } from '@jeesite/core/router';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { useGo } from '@jeesite/core/hooks/web/usePage';
  import type { UreExpert } from '@jeesite/early-stage-planning/api/early-stage-planning/ure-expert';
  import { ureExpertForm } from '@jeesite/early-stage-planning/api/early-stage-planning/ure-expert';

  const go = useGo();

  const { params } = unref(router.currentRoute);
  // 兼容菜单链接地址占位符写 {id} 或 {code}：路由参数名与占位符一致；{id} 为专家 id（后端详情按 id 查询）
  const expertId = ((params.id ?? params.code) as string) || '';

  /** 专家档案（接口 2.3 按id加载；id 缺失/不存在/已删除 → 空态） */
  const expert = ref<UreExpert | null>(null);
  const loading = ref(true);
  ureExpertForm(expertId)
    .then((row) => {
      expert.value = row;
    })
    .catch(() => {})
    .finally(() => {
      loading.value = false;
    });

  function goBack() {
    go('/early-stage-planning/urban-renewal-expert-management/personal-profile/index');
  }
</script>
