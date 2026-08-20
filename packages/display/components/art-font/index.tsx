import { cn, type ClassValue } from '@jeesite/core/libs';
import { defineComponent, type PropType, type SlotsType } from 'vue';

// 用户指定的灯管蓝：lch(85% 45 211)（≈ #00eaff，与最初 lch(85% 58 205)≈#00f0ff 同亮度 85%，
// 色相 205→211 往蓝调一档，保持梦幻感但更蓝）
const TUBE_BLUE = 'lch(85% 45 211)';

// 文字渐变填充：顶部白高光模拟灯管玻璃反光 → 主体灯管蓝
const TEXT_GRADIENT = `linear-gradient(to right, #ffffff 0%, ${TUBE_BLUE} 90%)`;

// 外发光：与主色同色的灯管蓝光晕
const TEXT_SHADOW = '0 0 20px lch(85% 45 211 / 0.6)';

/**
 * ArtFont —— 渐变霓虹发光艺术字
 *
 * 纯文字组件，无容器包裹，由父级负责布局（定位、背景等）。
 * 文字默认优设标题黑 + 渐变填充（白高光 → 灯管蓝 lch(85% 45 211) ≈ #00eaff）+ 同色外发光，
 * 呈明亮蓝色灯管质感，内容通过默认插槽传入。
 *
 * 实现要点：
 * - color: transparent + background-clip: text：文字内部透出渐变背景
 * - text-shadow：0 0 10px lch(85% 45 211 / 0.6)，紧贴字形的灯管蓝光晕
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
        class={cn('font-youshe tracking-widest', props.class)}
        style={{
          // 渐变文字：文字透明，透出背景渐变
          color: 'transparent',
          background: TEXT_GRADIENT,
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          // 外发光
          textShadow: TEXT_SHADOW,
        }}
      >
        {slots.default?.()}
      </div>
    );
  },
});
