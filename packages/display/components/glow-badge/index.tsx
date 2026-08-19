import { defineComponent, type CSSProperties, type PropType } from 'vue';
import { cn, type ClassValue } from '@jeesite/core/libs';

/**
 * GlowBadge —— 绿色荧光胶囊徽章（figma 样式封装）
 *
 * 底部绿色→青色径向渐变向上发散 + 深蓝黑半透明底 + 毛玻璃模糊，
 * 配合页面霓虹风格显示数量 / 指标值。
 *
 * props：
 * - value: 徽章中间显示的数值，必传
 * - class: 透传 UnoCSS 类（外边距等）
 *
 * 用法：
 * ```tsx
 * <GlowBadge value={25} />
 * <GlowBadge value="优" class="ml-8px" />
 * ```
 */

// figma 原始样式常量
const FIGMA_BORDER_RADIUS = '200px';
const FIGMA_BACKGROUND =
  'radial-gradient(88.65% 51.18% at 50% 100%, rgba(64, 255, 140, 0.30) 0%, rgba(12, 198, 255, 0.00) 100%), var(--alpha---ui-bg-inverted-30, rgba(15, 23, 42, 0.30))';
const FIGMA_BACKGROUND_BLEND_MODE = 'plus-lighter, color-dodge';

export const GlowBadge = defineComponent({
  name: 'GlowBadge',
  props: {
    /** 徽章中间显示的数值 */
    value: { type: [Number, String] as PropType<number | string>, required: true },
    /** 透传 UnoCSS 类（外边距等） */
    class: { type: [String, Object, Array] as PropType<ClassValue>, default: '' },
  },
  setup(props) {
    const style = (): CSSProperties => ({
      background: FIGMA_BACKGROUND,
      backgroundBlendMode: FIGMA_BACKGROUND_BLEND_MODE,
    });

    return () => (
      <div
        class={cn(
          'w-40px h-20px flex items-center justify-center gap-10px rd-full border border-white/10 backdrop-blur-12px text-14px text-white font-400',
          props.class,
        )}
        style={style()}
      >
        {props.value}
      </div>
    );
  },
});
