import { cn, parseSizeFromClass, type ClassValue } from '@jeesite/core/libs';
import { defineComponent, useId, type PropType, type SlotsType } from 'vue';

/**
 * DoubleRing —— 双层发光圆环（SVG 保真）
 *
 * 由 double-circle.svg 转写：三层视觉叠加——
 *   1. 外圈渐变描边：圆形路径 stroke 渐变（#B7F0FF → #13CDFF，0.89px）
 *   2. 内部发光弧线：多段曲线填充同系渐变（opacity 0.4），环绕圆环内侧的高光装饰
 *   3. 青色内阴影：feMorphology + feGaussianBlur 组合，向圆心方向的内发光
 *
 * 与 GlowButton 同款尺寸机制：
 * - props.width / height：数字为 px，字符串透传 CSS 值（如 '100%'）
 * - class 中的 w-* / h-* 工具类优先于 props（parseSizeFromClass 解析）
 * - SVG viewBox 固定 32×32 + preserveAspectRatio=none 拉伸铺满容器
 *
 * slot：
 * - default：圆环中间内容（图标 / 文字 / 任意元素），默认居中
 *
 * 用法：
 * ```tsx
 * <DoubleRing width={64} height={64}>
 *   <div class="i-ri-user-line size-24px text-white" />
 * </DoubleRing>
 * <DoubleRing class="w-64px h-64px">★</DoubleRing>
 * ```
 */
export const DoubleRing = defineComponent({
  name: 'DoubleRing',
  props: {
    /** 宽度：数字为 px，字符串作为 CSS 值透传 */
    width: { type: [Number, String] as PropType<number | string>, default: 32 },
    /** 高度：数字为 px，字符串作为 CSS 值透传 */
    height: { type: [Number, String] as PropType<number | string>, default: 32 },
    class: { type: [String, Object, Array] as PropType<ClassValue>, default: '' },
  },
  slots: {} as SlotsType<{ default: () => unknown }>,
  setup(props, { slots }) {
    // svg defs id 唯一化：组件多处实例时不冲突
    const uid = useId();
    const filterId = `dc-filter-${uid}`; // 内阴影 filter
    const strokeGradId = `dc-stroke-${uid}`; // 外圈描边渐变
    const fillGradId = `dc-fill-${uid}`; // 内部弧线渐变

    // 尺寸：class 的 w-*/h-* 优先于 props（与 GlowButton 一致）
    const { size } = parseSizeFromClass(props.class);
    const width = size.width ?? props.width;
    const height = size.height ?? props.height;
    const px = (v: number | string) => (typeof v === 'number' ? `${v}px` : v);

    return () => (
      <div
        class={cn('relative flex items-center justify-center', props.class)}
        style={{ width: px(width), height: px(height) }}
      >
        {/* SVG 视觉层：外圈渐变描边 + 内部发光弧线 + 青色内阴影 */}
        <svg
          class="absolute inset-0 size-full"
          viewBox="0 0 32 32"
          preserveAspectRatio="none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* 1. 外圈渐变描边圆 */}
          <path
            d="M16 0.444336C24.5911 0.444336 31.5557 7.4089 31.5557 16C31.5557 24.5911 24.5911 31.5557 16 31.5557C7.4089 31.5557 0.444336 24.5911 0.444336 16C0.444336 7.4089 7.4089 0.444336 16 0.444336Z"
            stroke={`url(#${strokeGradId})`}
            stroke-width="0.888889"
          />
          {/* 2. 内部发光弧线（opacity 0.4） */}
          <path
            opacity="0.4"
            d="M7.24561 24.6357C9.54404 26.9661 12.6679 28.2978 16.0259 28.2978C16.5288 28.2967 17.0277 28.2649 17.521 28.204L17.6646 29.3661C17.1244 29.4328 16.5782 29.4675 16.0269 29.4687C12.3514 29.4687 8.92814 28.0096 6.41162 25.4579L7.24561 24.6357ZM28.186 21.7411C26.4184 25.4898 23.0006 28.244 18.938 29.1484L18.6831 28.0058C22.3912 27.1805 25.5124 24.6642 27.1265 21.2411L28.186 21.7411ZM4.01709 13.2372C3.80868 14.1441 3.70546 15.0706 3.70557 16.0634C3.7195 18.9426 4.72592 21.6648 6.5249 23.8378L5.62256 24.5849C3.6525 22.2052 2.54895 19.2215 2.53369 16.0663C2.53356 14.9828 2.64807 13.9682 2.87646 12.9745L4.01709 13.2372ZM27.3511 8.75285C28.7116 10.8791 29.4522 13.3488 29.4663 15.9296C29.4665 17.5856 29.1924 19.1436 28.6538 20.6191L27.5532 20.2177C28.0447 18.8711 28.2956 17.4488 28.2954 15.9325C28.2825 13.5782 27.6066 11.3256 26.3647 9.38469L27.3511 8.75285ZM11.8843 4.41399C8.31427 5.68184 5.50738 8.55206 4.3208 12.1513L3.2085 11.7851C4.50838 7.84184 7.58171 4.70041 11.4927 3.31145L11.8843 4.41399ZM16.0005 2.53703C20.2127 2.53703 24.1047 4.48417 26.6401 7.74699L25.7153 8.46574C23.3995 5.48543 19.8472 3.70793 16.0005 3.70793V2.53703ZM15.9575 3.70793C14.9448 3.71135 13.9488 3.83704 12.9849 4.08L12.6987 2.94426C13.7548 2.67808 14.8455 2.54077 15.9536 2.53703L15.9575 3.70793Z"
            fill={`url(#${fillGradId})`}
          />
          <defs>
            {/* 青色内阴影（原 SVG filter0：morphology 收缩 + 高斯模糊 → 内发光） */}
            <filter
              id={filterId}
              x="0"
              y="0"
              width="32"
              height="32"
              filterUnits="userSpaceOnUse"
              color-interpolation-filters="sRGB"
            >
              <feFlood flood-opacity="0" result="BackgroundImageFix" />
              <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
              <feColorMatrix
                in="SourceAlpha"
                type="matrix"
                values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                result="hardAlpha"
              />
              <feMorphology radius="1.09086" operator="erode" in="SourceAlpha" result="effect1_innerShadow" />
              <feOffset />
              <feGaussianBlur stdDeviation="2.18171" />
              <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
              <feColorMatrix type="matrix" values="0 0 0 0 0.2 0 0 0 0 0.792953 0 0 0 0 1 0 0 0 0.503888 0" />
              <feBlend mode="normal" in2="shape" result="effect1_innerShadow" />
            </filter>
            {/* 外圈描边渐变：纵向 #B7F0FF → #13CDFF */}
            <linearGradient id={strokeGradId} x1="0" y1="0" x2="0" y2="32" gradientUnits="userSpaceOnUse">
              <stop stop-color="#B7F0FF" />
              <stop offset="1" stop-color="#13CDFF" />
            </linearGradient>
            {/* 内部弧线渐变：同系纵向 #B7F0FF → #13CDFF */}
            <linearGradient
              id={fillGradId}
              x1="2.53369"
              y1="2.53703"
              x2="2.53369"
              y2="29.4687"
              gradientUnits="userSpaceOnUse"
            >
              <stop stop-color="#B7F0FF" />
              <stop offset="1" stop-color="#13CDFF" />
            </linearGradient>
          </defs>
        </svg>

        {/* 中间内容层：覆盖在 SVG 之上，默认居中 */}
        <div class="relative z-10 flex items-center justify-center">{slots.default?.()}</div>
      </div>
    );
  },
});
