import { defineComponent, useId, type PropType, type SlotsType } from 'vue';
import { cn, parseSizeFromClass, type ClassValue } from '@jeesite/core/libs';

/**
 * GlassRing —— 玻璃质感发光圆环
 *
 * 由「规划页」glow-circle.svg 转写：圆形玻璃环（原始 32×32），视觉三层叠加：
 *
 *   1. 玻璃底色：青蓝线性渐变（#00B8D4 → #0899E2）填充，fill-opacity 0.1（10% 透明度），
 *      半透明玻璃面板的底色，透出下层背景
 *   2. 淡蓝描边：#17B9FF，stroke-opacity 0.1（10% 透明度），勾勒圆环外缘轮廓
 *   3. 左上角高亮描边：白色 → 透明线性渐变（从左上角白色渐变到右下透明）+ mix-blend-mode:
 *      overlay 叠加混合，形成玻璃左上角受光的高光边缘 —— 这就是「左上角带高亮 border」的玻璃质感来源
 *
 * 容器同时带 backdrop-filter: blur(10px)：背景内容穿过圆环时呈毛玻璃模糊，
 * 对应原 SVG 中 Figma 导出的 foreignObject backdrop-blur。
 *
 * props / slot：
 * - class：可解析 w-<size> / h-<size> 尺寸类（如 w-40px、h-10），
 *   其余 class 原样合并到根容器；不传尺寸时默认 32×32
 * - 默认插槽：圆环内部内容（如图标、数字），叠加在玻璃圆环之上
 *
 * 用法：
 * ```tsx
 * <GlassRing class="w-40px h-40px">★</GlassRing>
 * <GlassRing class="absolute right-16px top-16px w-32px h-32px">3</GlassRing>
 * ```
 */

/** 尺寸值转 CSS：数字按 px，字符串透传 */
function cssSize(v: number | string): string {
  return typeof v === 'number' ? `${v}px` : v;
}

export const GlassRing = defineComponent({
  name: 'GlassRing',
  // 透传原生 click 事件（供外层绑定收起/展开等交互）
  emits: {
    click: (_e: MouseEvent) => true,
  },
  props: {
    class: { type: [String, Object, Array] as PropType<ClassValue>, default: '' },
  },
  slots: {} as SlotsType<{ default: () => unknown }>,
  setup(props, { slots, emit }) {
    // 渐变 id 唯一化：组件多处实例时避免 SVG defs 中 id 冲突
    const uid = useId();
    const bgId = `glass-ring-bg-${uid}`; // 底色渐变
    const hlId = `glass-ring-highlight-${uid}`; // 左上角高亮渐变

    // 尺寸解析（公共 lib）：w-*/h-* 尺寸类 → size，其余 class → rest 透传
    const { size, rest } = parseSizeFromClass(props.class);
    // 圆形语义：只传 w 或 h 时另一维跟随；都不传默认 32px
    const w = size.width === undefined ? '32px' : cssSize(size.width);
    const h = size.height === undefined ? w : cssSize(size.height);

    return () => (
      <div
        class={cn('relative flex items-center justify-center', rest)}
        onClick={(e: MouseEvent) => emit('click', e)}
        style={{
          width: w,
          height: h,
          // 毛玻璃模糊：背景内容穿过圆环时模糊（对应原 SVG foreignObject 的 backdrop-filter: blur(10px)）
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          // 裁成圆形，让 backdrop-filter 只作用于圆内
          borderRadius: '50%',
        }}
      >
        {/* 三层玻璃视觉层：绝对定位铺满容器 */}
        <svg
          class="absolute inset-0 size-full"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          overflow="visible"
        >
          {/* 1. 玻璃底色：青蓝渐变 + 10% 透明度 */}
          <rect x="0" y="0" width="32" height="32" rx="16" fill={`url(#${bgId})`} fill-opacity="1" />
          {/* 2. 淡蓝描边：10% 透明度勾勒圆环外缘 */}
          <rect x="0" y="0" width="32" height="32" rx="16" stroke="#17B9FF" stroke-opacity="0.1" />
          {/* 3. 左上角高亮描边：白 → 透明渐变 + overlay 混合，玻璃高光 */}
          <rect
            x="0"
            y="0"
            width="32"
            height="32"
            rx="16"
            stroke={`url(#${hlId})`}
            style={{ mixBlendMode: 'overlay' }}
          />
          <defs>
            {/* 底色渐变：从左 → 右水平 #0b1631 → #305e9d（青蓝玻璃色） */}
            <linearGradient id={bgId} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
              <stop stop-color="#0b1631" />
              <stop offset="1" stop-color="#305e9d" />
            </linearGradient>
            {/* 高亮渐变：左上角白色 → 右下透明（角度由原 SVG x1/y1/x2/y2 决定） */}
            <linearGradient id={hlId} x1="1.47027" y1="0" x2="13.6679" y2="19.3449" gradientUnits="userSpaceOnUse">
              <stop stop-color="white" />
              <stop offset="1" stop-color="white" stop-opacity="0" />
            </linearGradient>
          </defs>
        </svg>

        {/* 插槽内容：relative + z-10 保证在绝对定位的 SVG 层之上，默认居中 */}
        <div class="relative z-10">{slots.default?.()}</div>
      </div>
    );
  },
});
