import { cn, type ClassValue } from '@jeesite/core/libs';
import { defineComponent, type PropType, type SlotsType } from 'vue';

// 文字发光（多层 text-shadow，从近到远、从窄到宽、从亮到淡）
const TEXT_SHADOW = ['0 0 4px rgba(255, 255, 255, 0.4)', '0 0 20px rgba(54, 94, 255, 0.6)'].join(', ');

/**
 * ArtFont —— 青色霓虹发光艺术字
 *
 * 纯文字组件，无容器包裹，由父级负责布局（定位、背景等）。
 * 文字默认优设标题黑 + 多层青色霓虹光晕，内容通过默认插槽传入。
 *
 * props：
 * - class：尺寸/颜色等任意 class，会合并到文字节点上（后写可覆盖默认样式）
 *
 * 用法：
 * ```tsx
 * <ArtFont class="font-20px">数据看板</ArtFont>
 * ```
 */
export const ArtFont = defineComponent({
  name: 'ArtFont',
  props: {
    class: { type: [String, Object, Array] as PropType<ClassValue>, default: '' },
  },
  slots: {} as SlotsType<{ default: () => unknown }>,
  setup(props, { slots }) {
    return () => (
      <div
        class={cn('text-white font-youshe font-normal tracking-widest', props.class)}
        style={{
          textShadow: TEXT_SHADOW,
          // Figma 渐变填充：青白渐变裁切到文字形状
          background: 'linear-gradient(180deg, #A8FAFF 11.67%, #FFF 146.67%)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        {slots.default?.()}
      </div>
    );
  },
});
