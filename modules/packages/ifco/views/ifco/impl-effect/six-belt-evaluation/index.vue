<!--
  ifco —— 六带效果评估（/ifco/impl-effect/six-belt-evaluation/index）

  实施成效评估 · 六带效果评估（六带 = 带建设、带保护、带开发、带整治、带管理、
  带改造，枚举口径同 project-library 的 SIX_BRING_TYPE_OPTIONS）。
  暂无设计稿：占位页，待设计稿到位后按稿实施。

  菜单注册（上级菜单「实施成效评估」）：
   - 菜单名称：六带效果评估
   - 链接地址：/ifco/impl-effect/six-belt-evaluation/index
   - 组件位置：/ifco/impl-effect/six-belt-evaluation/index（与链接地址一致）
-->
<template>
  <PageWrapper>
    <div class="flex flex-col items-center justify-center gap-12px bg-white rd-8px px-24px py-120px shadow-sm">
      <span class="i-ant-design:fund-projection-screen-outlined text-48px text-gray-300"></span>
      <div class="text-16px font-600 text-gray-700">六带效果评估</div>
      <div class="text-13px text-gray-400">待设计稿，功能建设中</div>
      <div class="mt-4px text-13px text-gray-400"> 六带：带建设、带保护、带开发、带整治、带管理、带改造 </div>
    </div>
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsIfcoImplEffectSixBeltEvaluationIndex">
  import { PageWrapper } from '@jeesite/core/components/Page';
</script>
