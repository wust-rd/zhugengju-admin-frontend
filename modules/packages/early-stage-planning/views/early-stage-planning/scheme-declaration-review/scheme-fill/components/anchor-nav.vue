<!--
  填报页右侧悬浮导航（锚点定位）

  - sections 由 form.vue 的区块注册表传入，id 与各 FormSection 的 id 一致；
  - 点击平滑滚动到对应区块；滚动时经 IntersectionObserver 高亮当前可视区块；
  - 仅 xl 及以上宽度显示（避免遮住表单内容，窄窗口自动隐藏）。
-->
<template>
  <div v-if="sections.length" class="fixed right-24px top-1/2 z-10 hidden -translate-y-1/2 xl:block">
    <div class="w-120px bg-white rd-8px py-8px shadow-sm">
      <div
        v-for="s in sections"
        :key="s.id"
        class="cursor-pointer px-14px py-7px text-13px transition-colors"
        :class="activeId === s.id ? 'bg-[#eff6ff] font-500 text-[#1677ff]' : 'text-gray-600 hover:text-[#1677ff]'"
        @click="go(s.id)"
      >
        {{ s.title }}
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
  import { onBeforeUnmount, onMounted, ref } from 'vue';

  type SectionItem = { id: string; title: string };

  const props = defineProps<{ sections: SectionItem[] }>();

  const activeId = ref('');

  let observer: IntersectionObserver | null = null;
  /** 当前落在激活带内的区块 id 集合（IntersectionObserver 回调维护） */
  const visibleIds = new Set<string>();

  onMounted(() => {
    observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visibleIds.add(e.target.id);
          else visibleIds.delete(e.target.id);
        }
        // 按页面顺序取第一个可视区块为当前高亮
        const first = props.sections.find((s) => visibleIds.has(s.id));
        if (first) activeId.value = first.id;
      },
      // 激活带取视口上部 15%~35%：区块标题滚入该带即认为「正在浏览」
      { rootMargin: '-15% 0px -65% 0px', threshold: 0 },
    );
    // 本组件在模板中位于各区块之后，挂载时区块元素均已就位
    for (const s of props.sections) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    if (props.sections.length) {
      activeId.value = props.sections[0].id;
    }
  });

  onBeforeUnmount(() => observer?.disconnect());

  function go(id: string) {
    activeId.value = id;
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
</script>
