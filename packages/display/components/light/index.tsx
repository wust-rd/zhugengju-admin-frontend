import { defineComponent, type CSSProperties, type PropType } from 'vue';
import { cn, type ClassValue } from '@jeesite/core/libs';

/**
 * Light —— 白色荧光条（figma 样式封装）
 *
 * 多层白色 box-shadow 叠加出向右侧偏的泛光效果：
 * - 0 0 32px rgba(255,255,255,0.30)：大范围弱光晕
 * - 0 0 24px #FFF：白芯
 * - 1px 0 12px rgba(255,255,255,0.30)：右侧弱偏光
 * - 2px 0 8px rgba(255,255,255,0.60)：右侧强偏光
 *
 * props：
 * - width / height: 尺寸（数字为 px，字符串透传 CSS 值），默认 4×16 竖条
 * - class:          透传 UnoCSS 类（定位 / 外边距等）
 *
 * 用法：
 * ```tsx
 * <Light class="absolute left-0 top-0" />
 * <Light width={10} height={10} />
 * ```
 */

// figma 原始样式常量
const FIGMA_BORDER_RADIUS = '1px 2px 2px 1px';
const FIGMA_BOX_SHADOW =
  '0 0 32px 0 rgba(255, 255, 255, 0.30), 0 0 24px 0 #FFF, 1px 0 12px 0 rgba(255, 255, 255, 0.30), 2px 0 8px 0 rgba(255, 255, 255, 0.60)';

export const Light = defineComponent({
  name: 'Light',
  props: {
    /** 宽度：数字为 px，字符串作为 CSS 值透传（如 '100%'） */
    width: { type: [Number, String] as PropType<number | string>, default: 4 },
    /** 高度：数字为 px，字符串作为 CSS 值透传 */
    height: { type: [Number, String] as PropType<number | string>, default: 16 },
    /** 透传 UnoCSS 类（定位 / 外边距等） */
    class: { type: [String, Object, Array] as PropType<ClassValue>, default: '' },
  },
  setup(props) {
    const style = (): CSSProperties => ({
      width: typeof props.width === 'number' ? `${props.width}px` : props.width,
      height: typeof props.height === 'number' ? `${props.height}px` : props.height,
      borderRadius: FIGMA_BORDER_RADIUS,
      background: '#FFF',
      boxShadow: FIGMA_BOX_SHADOW,
      flexShrink: 0,
    });

    return () => <div class={cn('shrink-0', props.class)} style={style()} />;
  },
});
