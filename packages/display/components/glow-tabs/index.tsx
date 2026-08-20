import { cn, type ClassValue } from '@jeesite/core/libs';
import { motion } from 'motion-v';
import { defineComponent, onMounted, ref, watch, type PropType, type SlotsType } from 'vue';

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
    'update:activeKey': (key: string | number) => typeof key === 'string' || typeof key === 'number',
  },
  slots: {} as SlotsType<{
    default?: () => unknown;
  }>,
  setup(props, { emit, slots }) {
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
    watch(
      () => props.activeKey,
      () => refreshIndicator(),
      { flush: 'post' },
    );

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
        {/* div 发光指示器：渐变底 + 青色描边 + 底部氛围灯，绝对定位在激活 tab 位置，切换时随 tabs 滑动；
            pointer-events-none 不挡点击 */}
        <motion.div
          class="absolute left-0 top-6px h-42px pointer-events-none"
          initial={false}
          animate={{ x: indicatorX.value, width: indicatorW.value }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          <div class="relative size-full rd-8px b-2 b-cyan-800 of-hidden">
            <div class="absolute left-1/2 -translate-x-1/2 bottom-0 w-1/2 h-8px rounded-full bg-cyan-500 blur-12px" />
          </div>
        </motion.div>

        {/* tab 内容：默认插槽由调用方渲染，每个 tab 元素需带 data-glow-tab-key */}
        {slots.default?.()}
      </div>
    );
  },
});
