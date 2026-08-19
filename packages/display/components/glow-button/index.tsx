import { computed, defineComponent, useId, type CSSProperties, type PropType } from 'vue';
import { cn, type ClassValue } from '@jeesite/core/libs';

/**
 * GlowButton —— 霓虹发光胶囊按钮（SVG + div 穿插实现）
 *
 * 由「体检页」glow-button-long/short.svg 转写：SVG 层负责全部视觉效果
 * （渐变底 / 底部光晕 / 渐变描边，原生 SVG 渲染保真），div 层负责
 * 定位、交互与文字内容（插槽），两层穿插叠加。
 *
 * 可调细节（props）：
 * - isActive:          激活状态：false 时不渲染任何 SVG 视觉层（渐变底 / 光晕 / 描边），
 *                      按钮透明仅留内容；true 时按下方开关渲染
 * - width / height:    尺寸（长版 202×42 / 短版 102×42；数字为 px，字符串透传 CSS 值，
 *                      SVG 用兜底 viewBox + preserveAspectRatio=none 拉伸铺满，视觉近似）
 * - radius:            圆角半径（原 SVG rx=10；'9999px' 变纯胶囊）
 * - borderGlow:        边框发光开关：true 渲染渐变描边，false 不渲染（需 isActive=true）
 * - bottomGlow:        底部光晕开关（需 isActive=true）
 * - glowOpacity:       底部光晕亮度 0~1（原 SVG fill-opacity=0.75）
 *
 * 尺寸也可以直接写在 class 里（UnoCSS 工具类，class 优先于 props）：
 * - w-<size> / h-<size>：如 w-102px、h-50%、w-100（无单位按 px）
 * - rd-<size>：圆角，如 rd-42px、rd-9999px（纯胶囊）
 *
 * 用法：
 * ```tsx
 * <GlowButton width={202} height={42} radius={10} glowOpacity={0.75}>开始巡检</GlowButton>
 * <GlowButton isActive class="w-102px h-42px rd-42px">激活态（发光）</GlowButton>
 * <GlowButton class="w-102px h-42px rd-42px">非激活（透明，无视觉）</GlowButton>
 * <GlowButton width={102} height={42} borderGlow={false} bottomGlow={false}>纯色按钮</GlowButton>
 * ```
 */

// ---- 原始 SVG 视觉参数（glow-button-long/short.svg） ----
const BODY_TOP = '#00B8D4'; // 底色渐变起色
const BODY_BOTTOM = '#0899E2'; // 底色渐变止色
const GLOW_COLOR = '#32C2E5'; // 底部光晕颜色
const STROKE_TOP = '#17E4FF'; // 描边渐变两端色
const STROKE_MID = '#17C1FF'; // 描边渐变中间色
const GLOW_RX = 26.5; // 光晕椭圆半径 x（长/短两版均为 26.5，不随按钮宽度变化）
const GLOW_RY = 8; // 光晕椭圆半径 y
const GLOW_BLUR = 12; // 光晕 feGaussianBlur 模糊半径
const STROKE_WIDTH = 1; // 描边线宽

// 尺寸参数为字符串（如 '100%'）时 SVG viewBox 的兜底值
const FALLBACK_SIZE = 202;
const FALLBACK_RADIUS = 10;

// 描边渐变归一化百分比（见 setup 内 dims 计算处说明）
const STROKE_P_SHORT = { x1: 0.322, y1: -0.146, x2: 0.731, y2: 1.141 }; // 短版 102×42
const STROKE_P_LONG = { x1: 0.322, y1: -0.146, x2: 0.466, y2: 1.638 }; // 长版 202×42

interface SizeFromClass {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
}

/**
 * 从 class（字符串 / 数组 / 对象）中解析 UnoCSS 尺寸工具类：
 * - w-102px / h-42px / rd-42px：px 转数字（与 props 数字=px 语义一致）
 * - w-50% / h-1.5rem / rd-100%：% / rem / em 保留字符串透传
 * - w-100（无单位）：按数字 px 处理
 * - w-full / w-1/2 等非数值类忽略
 * 返回的 class 值优先于 props（class 后写覆盖）。
 */
function parseSizeFromClass(classValue: ClassValue): SizeFromClass {
  const tokens: string[] = [];
  const collect = (v: ClassValue): void => {
    if (typeof v === 'string') tokens.push(...v.trim().split(/\s+/).filter(Boolean));
    else if (Array.isArray(v)) v.forEach(collect);
    else if (v && typeof v === 'object') {
      for (const [key, on] of Object.entries(v)) if (on) tokens.push(key);
    }
  };
  collect(classValue);

  const out: SizeFromClass = {};
  const toValue = (raw: string): number | string => {
    const m = raw.match(/^(\d+(?:\.\d+)?)(px|rem|em|%)$/);
    if (!m) return Number(raw); // 无单位按数字（px 语义）
    return m[2] === 'px' ? Number(m[1]) : `${m[1]}${m[2]}`;
  };

  for (const token of tokens) {
    const m = token.match(/^(w|h|rd)-(.+)$/);
    if (!m) continue;
    const [, kind, raw] = m;
    if (!/^\d+(?:\.\d+)?(px|rem|em|%)?$/.test(raw)) continue; // 忽略 w-full、w-1/2 等非数值类
    if (kind === 'w' && out.width === undefined) out.width = toValue(raw);
    else if (kind === 'h' && out.height === undefined) out.height = toValue(raw);
    else if (kind === 'rd' && out.radius === undefined) out.radius = toValue(raw);
  }
  return out;
}

export const GlowButton = defineComponent({
  name: 'GlowButton',
  // 输出约束：对象形式声明事件及参数校验（见 vue-tsx-best-practices skill）
  emits: {
    // click：透传原生鼠标事件
    click: (_e: MouseEvent) => true,
  },
  props: {
    /** 根元素 id（可配合 CSS 选择器 / 事件委托定位） */
    id: { type: String, default: '' },
    /** 激活状态：false 时不渲染任何 SVG 视觉（渐变底 / 光晕 / 描边），按钮透明仅留内容 */
    isActive: { type: Boolean, default: false },
    /** 按钮宽度：数字为 px，字符串作为 CSS 值透传（如 '100%'、'18rem'） */
    width: { type: [Number, String] as PropType<number | string>, default: 202 },
    /** 按钮高度：数字为 px，字符串作为 CSS 值透传 */
    height: { type: [Number, String] as PropType<number | string>, default: 42 },
    /** 圆角半径：数字为 px，字符串作为 CSS 值透传（'9999px' 变纯胶囊） */
    radius: { type: [Number, String] as PropType<number | string>, default: 12 },
    /** 边框发光开关：true 渲染青色渐变描边，false 不渲染描边（需 isActive=true 才生效） */
    borderGlow: { type: Boolean, default: true },
    /** 底部光晕开关（需 isActive=true 才生效） */
    bottomGlow: { type: Boolean, default: true },
    /** 底部光晕亮度 0~1（原 SVG fill-opacity=0.75） */
    glowOpacity: {
      type: Number,
      default: 0.75,
      validator: (v: number) => v >= 0 && v <= 1,
    },
    class: { type: [String, Object, Array] as PropType<ClassValue>, default: '' },
  },
  setup(props, { slots, emit }) {
    // SVG defs id 前缀：useId 保证多实例互不冲突
    const uid = useId();
    const ids = {
      bodyGrad: `gb-body-${uid}`,
      strokeGrad: `gb-stroke-${uid}`,
      clip: `gb-clip-${uid}`,
      glowFilter: `gb-glow-${uid}`,
    };

    // 数字尺寸统一转 px 字符串
    const px = (v: number | string) => (typeof v === 'number' ? `${v}px` : v);

    // 尺寸解析：class 中的 w-*/h-*/rd-* 工具类优先，其次 props。
    // 用 computed 保证 class / props 运行时变化也能驱动 SVG 重算。
    const dims = computed(() => {
      const fromClass = parseSizeFromClass(props.class);
      const width = fromClass.width ?? props.width;
      const height = fromClass.height ?? props.height;
      const radius = fromClass.radius ?? props.radius;

      // SVG 坐标系：仅数字尺寸可驱动 viewBox，字符串尺寸回退到兜底值 + CSS 拉伸
      const w = typeof width === 'number' ? width : FALLBACK_SIZE;
      const h = typeof height === 'number' ? height : FALLBACK_SIZE;
      const r = typeof radius === 'number' ? radius : FALLBACK_RADIUS;

      // 描边渐变：发光位置按宽/高百分比分配（原版 SVG 坐标归一化，无角度公式）。
      // 长/短两版渐变并不等比，按宽度就近选用对应版本，保证高光带落在右上角附近：
      //   短版 102×42：(32.8,-6.1)→(74.6,48.0) → (32.2%, -14.5%) → (73.1%, 114.1%)
      //   长版 202×42：(65,-6.1)→(94.2,68.8)   → (32.2%, -14.6%) → (46.6%, 163.8%)
      // 102 与 202 的中位线为 152：≤152 用短版，>152 用长版（280 等更宽尺寸归长版）。
      // 高光（offset 0.51354）恒在渐变中点，高亮带落在右上角与左下角的描边处。
      // 注意：宽高比变化时渐变方向随比例改变（百分比方案的固有行为）。
      const strokeP = w >= 152 ? STROKE_P_LONG : STROKE_P_SHORT;

      // 光晕 filter 区域：椭圆包围盒向外扩展 2×blur，保证模糊扩散不被裁剪。
      // 推导（与 glow-button-long.svg 一致，w=202/h=42 时验证）：
      //   x     = cx − rx − 2*blur     width  = 2*rx + 4*blur
      //   y     = cy − ry − 2*blur     height = 2*ry + 4*blur
      // 例：cx=101.5, cy=42, rx=26.5, ry=8, blur=12 → x=51, y=10, w=101, h=64
      const filterRegion = {
        x: w / 2 - GLOW_RX - GLOW_BLUR * 2,
        y: h - GLOW_RY - GLOW_BLUR * 2,
        width: GLOW_RX * 2 + GLOW_BLUR * 4,
        height: GLOW_RY * 2 + GLOW_BLUR * 4,
      };

      return { width, height, w, h, r, strokeP, filterRegion };
    });

    /** 根 div：定位 + 交互，SVG 与内容层穿插其中 */
    const rootStyle = computed<CSSProperties>(() => ({
      width: px(dims.value.width),
      height: px(dims.value.height),
      boxSizing: 'border-box',
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      userSelect: 'none',
      flexShrink: 0,
    }));

    return () => {
      const { w, h, r, strokeP, filterRegion } = dims.value;

      return (
        <div
          id={props.id || undefined}
          role="button"
          class={cn('select-none', props.class)}
          style={rootStyle.value}
          onClick={(e: MouseEvent) => emit('click', e)}
        >
          {/* SVG 视觉层：全部视觉（渐变底 / 光晕 / 描边）；isActive=false 时不渲染任何视觉 */}
          {props.isActive && (
            <svg
              width="100%"
              height="100%"
              viewBox={`0 0 ${w} ${h}`}
              preserveAspectRatio="none"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              class="absolute inset-0"
              style={{ pointerEvents: 'none' }}
            >
              <g clip-path={`url(#${ids.clip})`}>
                {/* 半透明渐变底（对应 SVG fill-opacity=0.1） */}
                <rect width={w} height={h} rx={r} fill={`url(#${ids.bodyGrad})`} fill-opacity="0.1" />

                {/* 底部光晕（对应 SVG ellipse + feGaussianBlur 12） */}
                {props.bottomGlow && (
                  <g filter={`url(#${ids.glowFilter})`}>
                    <ellipse
                      cx={w / 2}
                      cy={h}
                      rx={GLOW_RX}
                      ry={GLOW_RY}
                      fill={GLOW_COLOR}
                      fill-opacity={props.glowOpacity}
                    />
                  </g>
                )}
              </g>

              {/* 渐变描边（对应 SVG stroke-opacity=0.45 的渐变线） */}
              {props.borderGlow && (
                <rect
                  x={0.5}
                  y={0.5}
                  width={w - STROKE_WIDTH}
                  height={h - STROKE_WIDTH}
                  rx={r - 0.5}
                  stroke={`url(#${ids.strokeGrad})`}
                  stroke-opacity="0.45"
                />
              )}

              <defs>
                {props.bottomGlow && (
                  <filter
                    id={ids.glowFilter}
                    x={filterRegion.x}
                    y={filterRegion.y}
                    width={filterRegion.width}
                    height={filterRegion.height}
                    filterUnits="userSpaceOnUse"
                    color-interpolation-filters="sRGB"
                  >
                    <feGaussianBlur stdDeviation={GLOW_BLUR} result="blur" />
                  </filter>
                )}

                <linearGradient
                  id={ids.bodyGrad}
                  x1={w / 2}
                  y1={0}
                  x2={w / 2}
                  y2={h}
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stop-color={BODY_TOP} />
                  <stop offset="1" stop-color={BODY_BOTTOM} />
                </linearGradient>

                <linearGradient
                  id={ids.strokeGrad}
                  // 发光位置按宽/高百分比分配：x = 宽度×百分比，y = 高度×百分比
                  x1={w * strokeP.x1}
                  y1={h * strokeP.y1}
                  x2={w * strokeP.x2}
                  y2={h * strokeP.y2}
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stop-color={STROKE_TOP} stop-opacity="0.1" />
                  <stop offset="0.51354" stop-color={STROKE_MID} />
                  <stop offset="1" stop-color={STROKE_TOP} stop-opacity="0.1" />
                </linearGradient>

                <clipPath id={ids.clip}>
                  <rect width={w} height={h} rx={r} fill="white" />
                </clipPath>
              </defs>
            </svg>
          )}

          {/* 内容层：覆盖在 SVG 之上，flex 保证图标+文字横向排列 */}
          <div class="relative z-10 flex items-center">{slots.default?.()}</div>
        </div>
      );
    };
  },
});
