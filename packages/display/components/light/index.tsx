import { defineComponent, type CSSProperties, type PropType } from 'vue';
import { cn, type ClassValue } from '@jeesite/core/libs';
import { withAlpha } from '@jeesite/core/libs';
import { motion } from 'motion-v';

/**
 * Light —— 荧光条（figma 样式封装）
 *
 * 多层 box-shadow 叠加出向右侧偏的泛光效果，颜色可通过 color 定制：
 * - 0 0 32px rgba(color, 0.30)：大范围弱光晕
 * - 0 0 24px color：色芯
 * - 1px 0 12px rgba(color, 0.30)：右侧弱偏光
 * - 2px 0 8px rgba(color, 0.60)：右侧强偏光
 *
 * props：
 * - width / height: 尺寸（数字为 px，字符串透传 CSS 值），默认 4×16 竖条
 * - color:          荧光颜色（默认白色 #FFFFFF），背景与泛光随颜色变化
 * - class:          透传 UnoCSS 类（定位 / 外边距等）
 *
 * 用法：
 * ```tsx
 * <Light class="absolute left-0 top-0" />
 * <Light color="#00EAFF" width={2} height={20} />
 * <MotionLight variants={...} initial="exit" animate="enter" exit="exit" color="#00EAFF" />
 * ```
 */

// figma 原始样式常量
const FIGMA_BORDER_RADIUS = '1px 2px 2px 1px';
// 荧光泛光：随 color 生成（大范围弱光晕 + 色芯 + 右侧偏光）
const figmaBoxShadow = (color: string): string =>
  `0 0 32px 0 ${withAlpha(color, 0.3)}, 0 0 24px 0 ${color}, 1px 0 12px 0 ${withAlpha(color, 0.3)}, 2px 0 8px 0 ${withAlpha(
    color,
    0.6,
  )}`;

export const Light = defineComponent({
  name: 'Light',
  props: {
    /** 宽度：数字为 px，字符串作为 CSS 值透传（如 '100%'） */
    width: { type: [Number, String] as PropType<number | string>, default: 4 },
    /** 高度：数字为 px，字符串作为 CSS 值透传 */
    height: { type: [Number, String] as PropType<number | string>, default: 16 },
    /** 荧光颜色（默认白色 #FFFFFF）：背景与多层泛光随颜色变化 */
    color: { type: String, default: '#FFFFFF' },
    /** 透传 UnoCSS 类（定位 / 外边距等） */
    class: { type: [String, Object, Array] as PropType<ClassValue>, default: '' },
  },
  setup(props, { attrs }) {
    const style = (): CSSProperties => ({
      // 外部透传样式（如 motion.create(Light) 的动画 transform/opacity）优先合并
      ...(attrs.style as CSSProperties),
      width: typeof props.width === 'number' ? `${props.width}px` : props.width,
      height: typeof props.height === 'number' ? `${props.height}px` : props.height,
      borderRadius: FIGMA_BORDER_RADIUS,
      background: props.color,
      boxShadow: figmaBoxShadow(props.color),
      flexShrink: 0,
    });

    return () => <div class={cn('shrink-0', props.class)} style={style()} />;
  },
});

// motion 版本：可直接驱动动画的荧光条（motion-v 的 create 类型不保留组件 props，用 any 断言，运行时无影响）
export const MotionLight = motion.create(Light) as any;
