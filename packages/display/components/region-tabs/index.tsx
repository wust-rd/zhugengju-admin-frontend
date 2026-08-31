import { cn, type ClassValue } from '@jeesite/core/libs';
import { AnimatePresence, motion } from 'motion-v';
import { defineComponent, type PropType } from 'vue';
import { GlowTabs, type GlowTabItem } from '@jeesite/display/components/glow-tabs';

/** icon 左移动画时长（s）：文字需等 icon 左移完成后再渐显 */
const ICON_MOVE_DURATION = 0.2;

/** 文字动画方式：'slide-right'（右滑）| 'slide-up'（自下而上） */
const TEXT_ANIMATION_MODE = {
  'slide-right': {
    initial: { opacity: 0, x: 10 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 10 },
  },
  'slide-up': {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 10 },
  },
};

/**
 * RegionTabs —— 区域 tabs（业务组件）
 *
 * 封装 GlowTabs 的「tab 渲染 + 激活态」业务：
 * - animated=true（默认）：激活时 icon 左移、文字随后渐显（urban-health-check 风格），tab 定宽 w-102px
 * - animated=false：icon + 文字颜色切换（plan 风格），tab 等宽 flex-1
 *
 * 激活态视觉统一由 GlowTabs 的 svg 发光胶囊指示器表达（组件本身不发光）。
 *
 * props：
 * - items: tab 列表（{ key, label, icon }）
 * - activeKey: v-model:activeKey 双向绑定
 * - animated: 是否启用文字动画模式，默认 true
 * - textAnimationMode: 动画模式 'slide-right'（默认）| 'slide-up'
 * - class: 透传 UnoCSS 类（GlowTabs 根）
 *
 * 用法：
 * ```tsx
 * <RegionTabs v-model:activeKey={key.value} items={regionTabs} class="mt-16px" />
 * <RegionTabs v-model:activeKey={key.value} items={regionTabs} animated={false} class="mt-20px" />
 * ```
 */
export const RegionTabs = defineComponent({
  name: 'RegionTabs',
  props: {
    /** tab 列表（{ key, label, icon }） */
    items: { type: Array as PropType<GlowTabItem[]>, required: true },
    /** 当前激活 key（v-model:activeKey） */
    activeKey: { type: [String, Number] as PropType<string | number | null>, default: null },
    /** 是否启用文字动画模式，默认 true；false 时用简单的颜色切换样式 */
    animated: { type: Boolean, default: true },
    /** 文字动画方向：'slide-right'（默认）| 'slide-up' */
    textAnimationMode: { type: String as PropType<'slide-right' | 'slide-up'>, default: 'slide-right' },
    // ClassValue 是纯类型，运行时需用构造函数组合，编译期用 PropType 约束
    class: { type: [String, Object, Array] as PropType<ClassValue>, default: '' },
  },
  emits: {
    'update:activeKey': (key: string | number) => typeof key === 'string' || typeof key === 'number',
  },
  setup(props, { emit }) {
    return () => (
      <GlowTabs
        activeKey={props.activeKey}
        class={props.class}
        onUpdate:activeKey={(key) => emit('update:activeKey', key)}
      >
        {{
          default: () =>
            props.items.map((tab) => {
              const active = tab.key === props.activeKey;

              // 动画模式（urban-health-check 风格）：icon 左移 + 文字渐显
              if (props.animated) {
                return (
                  <div
                    key={tab.key}
                    data-glow-tab-key={tab.key}
                    class="shrink-0 px-12px w-102px h-42px rd-12px flex items-center justify-center select-none cursor-pointer"
                  >
                    <motion.div
                      class="relative flex items-center"
                      animate={{ x: active ? -16 : 0 }}
                      transition={{ duration: ICON_MOVE_DURATION, ease: 'easeOut' }}
                    >
                      <div
                        class={cn(tab.icon, 'size-20px transition-all', active ? 'text-white' : 'text-gray-500')}
                      />
                      <AnimatePresence>
                        {active && (
                          <motion.div
                            key={`${tab.key}-label`}
                            class="absolute left-full ml-6px text-16px text-white font-500 whitespace-nowrap"
                            initial={TEXT_ANIMATION_MODE[props.textAnimationMode].initial}
                            animate={TEXT_ANIMATION_MODE[props.textAnimationMode].animate}
                            exit={TEXT_ANIMATION_MODE[props.textAnimationMode].exit}
                            transition={{ duration: 0.2, ease: 'easeOut', delay: ICON_MOVE_DURATION }}
                          >
                            {tab.label}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  </div>
                );
              }

              // 简单模式（plan 风格）：icon + 文字颜色切换，等宽
              return (
                <div
                  key={tab.key}
                  data-glow-tab-key={tab.key}
                  class="shrink-0 px-12px flex-1 h-42px rd-10px flex items-center justify-center gap-8px select-none cursor-pointer"
                >
                  <div
                    class={cn(tab.icon, 'size-20px transition-colors', active ? 'text-white' : 'text-gray-500')}
                  />
                  <div class={cn('text-16px transition-colors', active ? 'text-white' : 'text-gray-500')}>
                    {tab.label}
                  </div>
                </div>
              );
            }),
        }}
      </GlowTabs>
    );
  },
});
