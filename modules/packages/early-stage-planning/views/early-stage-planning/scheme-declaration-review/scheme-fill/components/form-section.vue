<!--
  填报页区块外壳：白色卡片 + 标题条 + 锚点定位

  - id 供右侧悬浮导航（anchor-nav.vue）scrollIntoView 定位；
  - scroll-mt 消费 form.vue 根元素注入的 --section-scroll-mt
    （= 布局固定头 + 吸顶操作栏高度），锚点定位时不被顶部悬浮元素遮挡；
  - 区块内容（各 section-*.vue 的 BasicForm）经默认插槽注入，由 form.vue 统一组装。
-->
<template>
  <section :id="id" class="scroll-mt-[var(--section-scroll-mt,12px)] bg-white rd-8px px-24px py-20px shadow-sm">
    <div class="mb-16px flex items-center gap-8px">
      <span class="h-16px w-4px rd-2px bg-[#1677ff]"></span>
      <span class="text-16px font-500 text-gray-800">{{ title }}</span>
    </div>
    <slot></slot>
  </section>
</template>
<script lang="ts" setup>
  defineProps<{ id: string; title: string }>();
</script>
