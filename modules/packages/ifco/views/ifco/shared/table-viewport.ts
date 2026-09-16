/**
 * ifco 页面共用 —— 表格视口高度（四页共用）
 *
 * 页面骨架：PageWrapper(content-full-height，内容区由框架测量并锁定精确像素高度)
 * → 工具栏卡片(自然高度) → 表格卡片(flex-1 min-h-0) → 表格外层 div(flex-1 min-h-0，
 * 本 composable 的测量对象)。容器高度由布局决定（与表格内容无关），直读无循环。
 * scroll.y = 容器实测高度 − 表头实测高度（ResizeObserver，列宽拖拽换行时跟随）。
 * 兜底：容器测量瞬态(0)时给 160 最小值；视口封顶防异常。
 */
import { computed, onMounted, ref, shallowRef, type Ref } from 'vue';
import { useElementSize, useResizeObserver, useWindowSize } from '@vueuse/core';

export function useTableBodyHeight(wrapRef: Ref<HTMLDivElement | undefined>) {
  const { height: wrapHeight } = useElementSize(wrapRef);
  const { height: winHeight } = useWindowSize();
  const theadHeight = ref(0);
  const theadEl = shallowRef<HTMLElement>();

  useResizeObserver(theadEl, (entries) => {
    theadHeight.value = entries[entries.length - 1].target.offsetHeight;
  });
  onMounted(() => {
    theadEl.value = wrapRef.value?.querySelector('.ant-table-thead') ?? undefined;
  });

  const bodyHeight = computed(() => {
    const usable = Math.min(wrapHeight.value, winHeight.value - 120);
    const h = usable - theadHeight.value - 2;
    return h > 160 ? Math.floor(h) : 160;
  });
  return bodyHeight;
}
