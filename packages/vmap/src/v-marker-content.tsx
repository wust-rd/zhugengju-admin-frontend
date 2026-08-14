import { cn } from '@jeesite/core/libs';
import { computed, defineComponent, inject, Teleport, type PropType, type SlotsType } from 'vue';
import { MarkerContextKey } from './context';

/**
 * VMarkerContent —— 把内容渲染进 Marker 的 DOM 元素内（经 Teleport）。
 *
 * 必须放在 <VMarker> 内部（依赖 MarkerContextKey 注入 marker 实例）。
 * 默认渲染一个蓝色圆点，也可通过插槽自定义内容。
 */
export const VMarkerContent = defineComponent({
  name: 'VMarkerContent',

  props: {
    /** 追加到标注容器的 CSS 类 */
    class: { type: String as PropType<string> },
  },

  slots: {} as SlotsType<{
    default?: () => unknown;
  }>,

  setup(props, { slots }) {
    const ctx = inject(MarkerContextKey, null);
    if (!ctx) {
      throw new Error('VMarkerContent must be used within a VMarker component');
    }

    // marker 的 DOM 根元素（存在才可 Teleport）
    const targetEl = computed(() => ctx.marker.value?.getElement() ?? null);

    const containerClass = computed(() => cn('relative cursor-pointer', props.class));

    return () => {
      const el = targetEl.value;
      if (!el) return null;
      return (
        <Teleport to={el}>
          <div class={containerClass.value}>
            {slots.default?.() ?? (
              <div class="relative h-4 w-4 rounded-full border-2 border-white bg-blue-500 shadow-lg" />
            )}
          </div>
        </Teleport>
      );
    };
  },
});
