import { cn, type ClassValue } from '@jeesite/core/libs';
import { defineComponent, ref, type PropType, type SlotsType } from 'vue';
import { AnimatePresence, motion } from 'motion-v';
import { Light } from '@jeesite/display/components/light';
import { GlowBadge } from '@jeesite/display/components/glow-badge';

/**
 * GlowCollapse —— 霓虹风折叠面板
 *
 * 头部：白色荧光点 + 标题 + 可选青色徽章 + 旋转箭头；点击整行展开/收起。
 * 内容：通过默认插槽传入，展开/收起带 height + opacity 动画（motion-v）。
 *
 * props：
 * - title:            头部标题，必传
 * - badgeValue:       头部徽章数值（数字或字符串），不传则不显示徽章
 * - defaultExpanded:  初始是否展开，默认 true
 * - class:            透传 UnoCSS 类（外边距等）
 *
 * 用法：
 * ```tsx
 * <GlowCollapse title="生态宜居" badgeValue={25}>
 *   <CornerPanel highlight="line" />
 * </GlowCollapse>
 * ```
 */
export const GlowCollapse = defineComponent({
  name: 'GlowCollapse',
  props: {
    /** 头部标题 */
    title: { type: String, required: true },
    /** 头部徽章数值（数字或字符串）；不传则不渲染徽章 */
    badgeValue: { type: [Number, String] as PropType<number | string>, default: '' },
    /** 初始是否展开，默认 true */
    defaultExpanded: { type: Boolean, default: true },
    // ClassValue 是纯类型，运行时需用构造函数组合，编译期用 PropType 约束
    class: { type: [String, Object, Array] as PropType<ClassValue>, default: '' },
  },
  // 面板内容通过默认插槽传入（见 vue-tsx-best-practices skill）
  slots: {} as SlotsType<{ default: () => unknown }>,
  setup(props, { slots }) {
    const expanded = ref(props.defaultExpanded);

    return () => (
      <div class={cn('', props.class)}>
        {/* 折叠面板头部：点击展开 / 收起 */}
        <div
          class="p-6px flex items-center w-full cursor-pointer"
          onClick={() => {
            expanded.value = !expanded.value;
          }}
        >
          {/* 白色荧光点（figma 样式）：多层白色 box-shadow 叠加出泛光效果 */}
          <Light />

          <div class="mx-12px text-16px text-white font-500">{props.title}</div>

          {/* 青色荧光胶囊徽章（GlowBadge 组件），数值由 badgeValue 传入 */}
          {props.badgeValue !== '' && <GlowBadge value={props.badgeValue} />}

          {/* 箭头：展开时旋转 180° 朝上，收起时回正朝下 */}
          <div class="ml-auto b b-gray-500 size-24px rd-full flex items-center justify-center bg-white/12 cursor-pointer">
            <motion.div
              class="i-ri-arrow-down-s-line size-14px text-gray-300"
              animate={{ rotate: expanded.value ? 0 : -90 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* 面板内容：展开/收起动画（motion-v） */}
        <AnimatePresence initial={false}>
          {expanded.value && (
            <motion.div
              key="panel-body"
              class="overflow-hidden"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              {slots.default?.()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  },
});
