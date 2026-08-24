import { defineComponent, onMounted, ref, watch, type PropType } from 'vue';
import { motion } from 'motion-v';
import { cn, type ClassValue } from '@jeesite/core/libs';

/** LayerTabs 页签项数据结构 */
export interface LayerTabItem {
  key: string;
  label: string;
}

/** 滑块移动动画时长（与 glow-tabs 等组件节奏一致） */
const SLIDE_DURATION = 0.3;
/** 滑块移动缓动 */
const SLIDE_EASE = 'easeInOut' as const;
/** 滑块固定宽度（px）：居中显示在激活按钮正下方 */
const SLIDE_WIDTH = 32;

/**
 * LayerTabs —— 底部渐变滑块式横向文字页签
 *
 * 在 designer 给的手写 tabs 结构上把指示器升级为「滑块」：
 * 指示器是容器内唯一的绝对定位渐变条，**固定宽 32px**，点击切换时通过 motion-v
 * 在按钮间**左右平滑滑动**，并始终**居中于激活按钮正下方**。
 *
 * 结构 / 外观（沿用给定 div）：
 * - 每个页签为 button（`data-layer-tab-key` 标识 key），激活项文字白色、未激活白色/60；
 * - 激活指示器：底部渐变横条（默认青蓝，`indicatorColor` 可配）；
 * - 去掉移动端滚动/兼容类（overflow/no-visible-scrollbar/perspective/sm:overflow-visible 等）。
 *
 * 抽象组件：不持有 tabs 数据，tab 完全由 items prop 驱动；activeKey 受控，
 * 点击通过 v-model:activeKey 同步（emit('update:activeKey')）。
 *
 * props：
 * - items:          页签项 [{ key, label }]
 * - activeKey:      当前激活项 key（v-model:activeKey 双向绑定）
 * - indicatorColor: 滑块渐变起始色，默认面板青蓝 #00b8d4
 * - class:          透传 UnoCSS 类
 *
 * 用法：
 * ```tsx
 * <LayerTabs
 *   activeKey={activeKey}
 *   onUpdate:activeKey={(k) => (activeKey = k)}
 *   items={[{ key: 'opened', label: '已打开图层' }, { key: 'fav', label: '我的收藏图层' }]}
 * />
 * ```
 */
export const LayerTabs = defineComponent({
  name: 'LayerTabs',
  props: {
    /** 页签项配置 */
    items: { type: Array as PropType<LayerTabItem[]>, default: () => [] },
    /** 当前激活项 key（v-model:activeKey 受控） */
    activeKey: { type: [String, Number] as PropType<string | number>, default: '' },
    /** 滑块渐变起始色（默认面板青蓝，可传任意 CSS 颜色） */
    indicatorColor: { type: String, default: '#00b8d4' },
    // ClassValue 是纯类型，运行时需用构造函数组合，编译期用 PropType 约束
    class: { type: [String, Object, Array] as PropType<ClassValue>, default: '' },
  },
  emits: {
    'update:activeKey': (key: string | number) => typeof key === 'string' || typeof key === 'number',
  },
  setup(props, { emit }) {
    // tabs 容器引用：用于查询带 data-layer-tab-key 的按钮，测量滑块位置
    const containerRef = ref<HTMLDivElement | null>(null);
    // 滑块水平偏移（px）：固定宽 32px，居中于激活按钮正下方，由 motion.div 声明式动画驱动
    const sliderX = ref(0);

    /** 测量当前激活项的位置，将滑块居中到其正下方 */
    const refreshSlider = () => {
      const container = containerRef.value;
      if (!container || props.activeKey == null) return;
      const active = container.querySelector<HTMLElement>(`[data-layer-tab-key="${props.activeKey}"]`);
      if (!active) return;
      // 激活按钮中心 - 半滑块宽，使滑块水平居中于按钮下方
      sliderX.value = active.offsetLeft + active.offsetWidth / 2 - SLIDE_WIDTH / 2;
    };

    // 初始定位（首次渲染不播动画，motion initial={false}）
    onMounted(() => refreshSlider());
    // 受控更新：外部改变 activeKey（v-model 或其他方式）时滑块跟随
    watch(
      () => props.activeKey,
      () => refreshSlider(),
      { flush: 'post' },
    );

    /** 点击委托：命中带 data-layer-tab-key 的按钮时 emit 并移动滑块 */
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest<HTMLElement>('[data-layer-tab-key]');
      if (!target) return;
      const key = target.dataset.layerTabKey;
      if (key == null) return;
      emit('update:activeKey', key);
    };

    return () => (
      <div
        ref={containerRef}
        class={cn('relative flex w-full flex-row items-baseline justify-start', props.class)}
        onClick={handleClick}
      >
        {/* 渐变滑块：固定宽 32px，居中于激活按钮正下方，切换时平滑左右滑动；pointer-events-none 不挡点击 */}
        <motion.div
          class="absolute bottom-0 left-0 h-4px w-32px pointer-events-none rd-full"
          initial={false}
          animate={{ x: sliderX.value }}
          transition={{ duration: SLIDE_DURATION, ease: SLIDE_EASE }}
          style={{
            background: `linear-gradient(90deg, ${props.indicatorColor} 0%, transparent 100%)`,
          }}
        />

        {/* 页签内容：items 驱动，每个按钮带 data-layer-tab-key */}
        {props.items.map((item) => {
          const active = item.key === props.activeKey;
          return (
            <button
              key={item.key}
              type="button"
              data-layer-tab-key={item.key}
              class="relative bg-transparent pb-4px px-8px cursor-pointer"
            >
              <span
                class={cn(
                  'relative block px-8px py-2px font-500 transition-all',
                  active ? 'text-white' : 'text-white/60',
                )}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    );
  },
});
