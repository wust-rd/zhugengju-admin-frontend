import { computed, defineComponent, type CSSProperties, type PropType } from 'vue';
import { cn, type ClassValue } from '@jeesite/core/libs';

/**
 * GlowingButton —— 扫光发光按钮（参照 badtz-ui glowing-button 实现）
 *
 * 效果（三层叠加，全部绝对定位在根元素内）：
 * 1. 静态辉光层：覆盖按钮内部，从左到右渐强（透明 → via(0.075) → to(0.2)），
 *    顶部白色内阴影模拟高光，增加立体感；
 * 2. 动态扫光条：常驻右边缘的 5px 竖条 + 向左辉光阴影（-2px 0 10px），
 *    hover 时 group-hover:translate-x-full 向右扫出，留下一道光痕；
 * 3. 内容层：relative z-10 置于辉光之上。
 *
 * 按钮底色为深色渐变（from-zinc-900 to-zinc-800），适配页面深蓝背景。
 *
 * props：
 * - glowColor: 辉光颜色 hex（默认 #22d3ee 青色，与页面霓虹风格一致）
 * - class:     透传 UnoCSS 类（尺寸 / 外边距等，如 w-280px、mx-auto）
 *
 * 用法：
 * ```tsx
 * <GlowingButton glowColor="#22d3ee" class="mx-auto">开始巡检</GlowingButton>
 * ```
 */

// hex → rgba（支持 3/6 位简写，非法值回退黑色）
function hexToRgba(hex: string, alpha = 1): string {
  let h = hex.replace('#', '');
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return `rgba(0, 0, 0, ${alpha})`;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const GlowingButton = defineComponent({
  name: 'GlowingButton',
  // 输出约束：对象形式声明事件及参数校验（见 vue-tsx-best-practices skill）
  emits: {
    // click：透传原生鼠标事件
    click: (_e: MouseEvent) => true,
  },
  props: {
    /** 辉光颜色 hex（默认青色 #22d3ee） */
    glowColor: { type: String, default: '#22d3ee' },
    /** 透传 UnoCSS 类（尺寸 / 外边距 / 圆角等） */
    class: { type: [String, Object, Array] as PropType<ClassValue>, default: '' },
  },
  setup(props, { slots, emit }) {
    // 三个 CSS 变量档位：主色 / 渐变中间(0.075) / 渐变末尾(0.2)
    const glow = computed(() => ({
      color: hexToRgba(props.glowColor),
      via: hexToRgba(props.glowColor, 0.075),
      to: hexToRgba(props.glowColor, 0.2),
    }));

    const rootStyle = computed<CSSProperties>(() => ({
      '--glow-color': glow.value.color,
      '--glow-color-via': glow.value.via,
      '--glow-color-to': glow.value.to,
    }));

    return () => (
      <div
        role="button"
        class={cn(
          // 根：深色渐变底 + 边框，group 供扫光条 group-hover 联动
          'group relative flex h-40px w-min items-center justify-center overflow-hidden rounded-md border px-20px cursor-pointer select-none',
          'border-zinc-700 bg-gradient-to-t from-zinc-900 to-zinc-800 text-white transition-colors duration-200',
          'group-hover:text-white/80',
          props.class,
        )}
        style={rootStyle.value}
        onClick={(e: MouseEvent) => emit('click', e)}
      >
        {/* 静态辉光层：从左到右渐强 + 顶部白色内阴影高光 */}
        <div
          class="absolute inset-0"
          style={{
            background: `linear-gradient(to right, transparent 40%, ${glow.value.via} 70%, ${glow.value.to} 100%)`,
            boxShadow: 'rgba(255, 255, 255, 0.15) 0 1px 0 inset',
          }}
        />

        {/* 动态扫光条：常驻右边缘，hover 时向右扫出（阴影发光形成光痕） */}
        <div
          class="absolute right-0 h-60% w-5px rounded-l transition-all duration-200 group-hover:translate-x-full"
          style={{
            background: glow.value.color,
            boxShadow: `-2px 0 10px ${glow.value.color}`,
          }}
        />

        {/* 内容层：置于辉光层之上 */}
        <div class="relative z-10 flex items-center text-14px">{slots.default?.()}</div>
      </div>
    );
  },
});
