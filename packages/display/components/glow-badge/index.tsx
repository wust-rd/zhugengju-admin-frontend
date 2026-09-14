import { defineComponent, type CSSProperties, type PropType } from 'vue';
import { cn, type ClassValue } from '@jeesite/core/libs';

/**
 * GlowBadge —— 青色荧光胶囊徽章（figma 样式封装）
 *
 * 底部青色荧光径向渐变（#00EAFF）向上发散 + 深蓝黑半透明底 + 毛玻璃模糊，
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
// radial-gradient 取色为青色荧光 #00EAFF（rgb(0, 234, 255)）：底部向上发散，末端透明
const FIGMA_BACKGROUND =
  'radial-gradient(88.65% 51.18% at 50% 100%, rgba(0, 234, 255, 0.45) 0%, rgba(0, 234, 255, 0.00) 100%), rgba(15, 23, 42, 0.30)';
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
