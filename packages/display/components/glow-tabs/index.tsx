import { cn, type ClassValue } from '@jeesite/core/libs';
import { motion } from 'motion-v';
import { defineComponent, onMounted, ref, useId, watch, type PropType, type SlotsType } from 'vue';

/** GlowTabs 页签项数据结构（调用方定义 tab 列表时使用；组件本身不持有 tabs） */
export interface GlowTabItem {
  key: string;
  label: string;
  icon?: string;
}

/**
 * GlowTabs —— 发光胶囊滑动 tabs（抽象组件：骨架 + svg 滑动指示器）
 *
 * 由「体检页」区域 tabs 抽取：激活态由 svg 发光胶囊指示器表达（做法 B——
 * 指示器视觉与 GlowButton 激活态一致：渐变底 + 底部光晕 + 渐变描边），
 * 切换时指示器平滑滑动到激活 tab；按钮本身不再单独发光。
 *
 * 抽象组件：不持有 tabs 数据，tab 完全由默认插槽渲染。组件通过
 * data-glow-tab-key 属性识别 tab 元素：
 * - 点击委托：容器点击事件冒泡，closest([data-glow-tab-key]) 取 key 并 emit
 * - 指示器测量：按当前 activeKey 找到对应元素，读取 offsetLeft/offsetWidth
 *
 * props：
 * - activeKey: 当前激活 key（v-model:activeKey 双向绑定）
 * - class:     容器尺寸/边距等 class，合并到根容器（默认 w-full h-54px）
 *
 * slot：
 * - default: 渲染所有 tab（每个元素需带 data-glow-tab-key={key}，其余结构/内容/样式完全由调用方控制）
 *
 * 用法：
 * ```tsx
 * <GlowTabs v-model:activeKey={activeKey.value} class="mt-16px">
 *   {tabs.map((tab) => (
 *     <div key={tab.key} data-glow-tab-key={tab.key} class="px-12px w-102px h-42px ...">
 *       {tab.label}
 *     </div>
 *   ))}
 * </GlowTabs>
 * ```
 */
export const GlowTabs = defineComponent({
  name: 'GlowTabs',
  props: {
    activeKey: { type: [String, Number] as PropType<string | number | null>, default: null },
    class: { type: [String, Object, Array] as PropType<ClassValue>, default: '' },
  },
  emits: {
    'update:activeKey': (key: string | number) =>
      typeof key === 'string' || typeof key === 'number',
  },
  slots: {} as SlotsType<{
    default?: () => unknown;
  }>,
  setup(props, { emit, slots }) {
    // svg defs id 唯一化：组件多处实例时不冲突
    const uid = useId();
    const glowId = `gt-glow-${uid}`; // 底部光晕 filter
    const bodyId = `gt-body-${uid}`; // 渐变底
    const strokeId = `gt-stroke-${uid}`; // 渐变描边
    const clipId = `gt-clip-${uid}`; // 圆角裁剪

    // tabs 容器引用：用于查询带 data-glow-tab-key 的 tab 元素
    const containerRef = ref<HTMLDivElement | null>(null);
    // 指示器位置（px）：水平偏移 x / 宽度 width，由 motion.div 声明式动画驱动
    const indicatorX = ref(0);
    const indicatorW = ref(0);

    /** 测量当前激活 tab 的位置并移动指示器 */
    const refreshIndicator = () => {
      const container = containerRef.value;
      if (!container || props.activeKey == null) return;
      const active = container.querySelector<HTMLElement>(`[data-glow-tab-key="${props.activeKey}"]`);
      if (!active) return;
      indicatorX.value = active.offsetLeft;
      indicatorW.value = active.offsetWidth;
    };

    // 初始定位（首次渲染不播动画，motion initial={false}）
    onMounted(() => refreshIndicator());
    // 受控更新：外部改变 activeKey（v-model 或其他方式）时指示器跟随
    watch(() => props.activeKey, () => refreshIndicator(), { flush: 'post' });

    /** 点击委托：命中带 data-glow-tab-key 的 tab 时 emit 并移动指示器 */
    const handleContainerClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest<HTMLElement>('[data-glow-tab-key]');
      if (!target) return;
      const key = target.dataset.glowTabKey;
      if (key == null) return;
      emit('update:activeKey', key);
      refreshIndicator();
    };

    return () => (
      <div
        ref={containerRef}
        class={cn('relative rd-12px p-6px w-full h-54px bg-black/20 flex items-center', props.class)}
        onClick={handleContainerClick}
      >
        {/* svg 发光胶囊指示器：视觉与 GlowButton 激活态一致（渐变底 + 底部光晕 + 渐变描边），
            绝对定位在激活 tab 位置，切换时随 tabs 滑动；pointer-events-none 不挡点击 */}
        <motion.div
          class="absolute left-0 top-6px h-42px pointer-events-none"
          initial={false}
          animate={{ x: indicatorX.value, width: indicatorW.value }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          <svg
            viewBox="0 0 100 42"
            class="size-full"
            preserveAspectRatio="none"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* 底部光晕模糊（同 GlowButton feGaussianBlur 12） */}
              <filter id={glowId} x="-30" y="-40" width="160" height="160" color-interpolation-filters="sRGB">
                <feGaussianBlur stdDeviation="12" />
              </filter>
              {/* 半透明渐变底（同 GlowButton body：#00B8D4 → #0899E2） */}
              <linearGradient id={bodyId} x1="50" y1="0" x2="50" y2="42" gradientUnits="userSpaceOnUse">
                <stop stop-color="#00B8D4" />
                <stop offset="1" stop-color="#0899E2" />
              </linearGradient>
              {/* 渐变描边（同 GlowButton stroke：#17E4FF → #17C1FF → #17E4FF） */}
              <linearGradient
                id={strokeId}
                x1="32.2"
                y1="-6.1"
                x2="73.1"
                y2="47.9"
                gradientUnits="userSpaceOnUse"
              >
                <stop stop-color="#17E4FF" stop-opacity="0.1" />
                <stop offset="0.51354" stop-color="#17C1FF" />
                <stop offset="1" stop-color="#17E4FF" stop-opacity="0.1" />
              </linearGradient>
              <clipPath id={clipId}>
                <rect width="100" height="42" rx="12" fill="white" />
              </clipPath>
            </defs>

            <g clip-path={`url(#${clipId})`}>
              {/* 1. 半透明渐变底（同 GlowButton fill-opacity 0.1） */}
              <rect width="100" height="42" rx="12" fill={`url(#${bodyId})`} fill-opacity="0.1" />
              {/* 2. 底部光晕（同 GlowButton ellipse + feGaussianBlur） */}
              <g filter={`url(#${glowId})`}>
                <ellipse cx="50" cy="42" rx="26.5" ry="8" fill="#32C2E5" fill-opacity="0.75" />
              </g>
              {/* 3. 渐变描边（同 GlowButton stroke-opacity 0.45） */}
              <rect
                x="0.5"
                y="0.5"
                width="99"
                height="41"
                rx="11.5"
                stroke={`url(#${strokeId})`}
                stroke-opacity="0.45"
              />
            </g>
          </svg>
        </motion.div>

        {/* tab 内容：默认插槽由调用方渲染，每个 tab 元素需带 data-glow-tab-key */}
        {slots.default?.()}
      </div>
    );
  },
});
