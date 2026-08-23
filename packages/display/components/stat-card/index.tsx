import { cn, type ClassValue } from '@jeesite/core/libs';
import { defineComponent, type PropType, type SlotsType } from 'vue';

/**
 * StatCard —— 统计卡片边框容器（抽象组件）
 *
 * 只提供外层边框 + 背景容器（深蓝渐变 + 右下青色光晕 + 青色描边），
 * 内容完全由默认插槽渲染（标题、数值、指标等由调用方决定）。
 *
 * props：
 * - class：尺寸/边距等 class，合并到根容器
 *
 * slot：
 * - default：卡片内容
 *
 * 用法：
 * ```tsx
 * <StatCard class="mt-16px">
 *   <div class="text-white">标题/数值/指标…</div>
 * </StatCard>
 * ```
 */
export const StatCard = defineComponent({
  name: 'StatCard',
  props: {
    class: { type: [String, Object, Array] as PropType<ClassValue>, default: '' },
  },
  slots: {} as SlotsType<{ default: () => unknown }>,
  setup(props, { slots }) {
    return () => (
      <div
        class={cn('relative w-full rd-8px px-20px py-16px overflow-hidden border-2 border-cyan-900', props.class)}
        style={{
          background:
            'radial-gradient(47.72% 70.48% at 96.63% 102.07%, rgba(46, 213, 255, 0.14) 0%, rgba(46, 213, 255, 0.02) 100%), linear-gradient(109deg, #0B1B2A 17.52%, rgba(23, 85, 122, 0.75) 90.25%)',
        }}
      >
        {slots.default?.()}
      </div>
    );
  },
});
