import { cn, type ClassValue } from '@jeesite/core/libs';
import { defineComponent, provide, ref, type PropType, type SlotsType, type VNode } from 'vue';
import { AnimatePresence, motion } from 'motion-v';
import { Light, MotionLight } from '@jeesite/display/components/light';
import ltCornerSvg from '@jeesite/assets/svg/display/lt-corner.svg';
import rtCornerSvg from '@jeesite/assets/svg/display/rt-corner.svg';
import lbCornerSvg from '@jeesite/assets/svg/display/lb-corner.svg';
import rbCornerSvg from '@jeesite/assets/svg/display/rb-corner.svg';

// 配套行组件、注入标识与类型：调用方可从同一路径导入（见 row.tsx）
export { CornerPanelRow, RATING_COLOR, CORNER_ACTIVE_KEY, type CornerItem } from './row';
import { CORNER_ACTIVE_KEY } from './row';

/**
 * CornerPanel —— 四角发光面板容器 + 点击行高亮动画
 *
 * 只负责四角装饰 / 背景 / 高亮动画层，内容（items 数据 + 行 div）完全由调用方
 * 通过默认插槽控制，文本内容可动态变更。
 *
 * 高亮动画通过「事件委托 + 行协议」实现，不依赖组件内部的数据结构：
 * - 插槽内的行 div 需带 `data-corner-row` 属性，组件点击时用 closest 定位该行，
 *   读取 offsetTop / offsetHeight 驱动高亮层（slide 滑块 / line 荧光线）
 * - 可选 `data-corner-key` 用作切换行的动画 key（不传则按行位置生成）
 * - 推荐直接使用配套的 CornerPanelRow 组件（自带协议属性与行布局）
 * - 行 div 不带协议属性时，组件退化为纯容器（无高亮交互）
 *
 * props：
 * - highlight: 'slide' 整块滑块滑动（默认）；'line' 上下线生长 + 左右灯开合（motion-v）
 * - class / isRound：透传样式
 *
 * 用法：
 * ```tsx
 * <CornerPanel>
 *   {items.map((item) => <CornerPanelRow key={item.seq} item={item} />)}
 * </CornerPanel>
 * <CornerPanel>任意自由内容</CornerPanel>
 * ```
 */

// line 形式：左右荧光条用 Light 组件（color="#00EAFF"），开/关灯动画用 MotionLight
const LINE_BAR_WIDTH = 2;
const LINE_BAR_HEIGHT = 20;

// line 形式：上下线生长时长（s），左右灯需等线完成后再开灯
const LINE_GROW_DURATION = 0.3;
// line 形式：左右灯开/关时长（s）
const LIGHT_FADE_DURATION = 0.2;

// line 形式动画 variants：
// 入场：背景 + 上下线同步生长（0.3s）→ 灯开灯（延迟 0.3s）
// 退场：灯先关灯（0.25s）→ 背景 + 上下线再离开（延迟 0.25s）
const lineBgVariants = {
  enter: { opacity: 1, transition: { duration: LINE_GROW_DURATION, ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: LINE_GROW_DURATION, ease: 'easeOut', delay: LIGHT_FADE_DURATION } },
};
const lineVariants = {
  enter: { scaleX: 1, transition: { duration: LINE_GROW_DURATION, ease: 'easeOut' } },
  exit: { scaleX: 0, transition: { duration: LINE_GROW_DURATION, ease: 'easeOut', delay: LIGHT_FADE_DURATION } },
};
const lightVariants = {
  enter: {
    opacity: 1,
    scale: 1,
    transition: { duration: LIGHT_FADE_DURATION, ease: 'easeOut', delay: LINE_GROW_DURATION },
  },
  exit: { opacity: 0, scale: 0.4, transition: { duration: LIGHT_FADE_DURATION, ease: 'easeOut' } },
};

// slide 形式：高亮滑块背景（渐变 + 上下渐变边框）
const SLIDE_BACKGROUND =
  'linear-gradient(to right, rgba(9,150,175,0.10), rgba(9,150,175,0.45) 20%, #00EAFF 40%, #00EAFF 60%, rgba(9,150,175,0.45) 80%, rgba(9,150,175,0.10)) top/100% 1px no-repeat, linear-gradient(to right, rgba(9,150,175,0.10), rgba(9,150,175,0.45) 20%, #00EAFF 40%, #00EAFF 60%, rgba(9,150,175,0.45) 80%, rgba(9,150,175,0.10)) bottom/100% 1px no-repeat, linear-gradient(87deg, rgba(41,79,132,0.60) -3.66%, rgba(41,79,132,0.27) 47.74%, rgba(25,140,169,0.60) 103.8%)';

// line 形式：选中行渐变背景
const LINE_BG =
  'linear-gradient(87deg, rgba(41,79,132,0.60) -3.66%, rgba(41,79,132,0.27) 47.74%, rgba(25,140,169,0.60) 103.8%)';

// line 形式：渐变线（中间实色、两端浅青渐隐）
const LINE_GRADIENT =
  'linear-gradient(to right, rgba(9,150,175,0.10), rgba(9,150,175,0.45) 20%, #00EAFF 40%, #00EAFF 60%, rgba(9,150,175,0.45) 80%, rgba(9,150,175,0.10))';

/** 行协议选择器：插槽内行 div 带此属性时，点击可触发高亮动画 */
const ROW_SELECTOR = '[data-corner-row]';

export const CornerPanel = defineComponent({
  name: 'CornerPanel',
  props: {
    /** 高亮形式：'slide' 整块滑块滑动（默认）；'line' 上下线生长 + 左右灯开合（motion-v） */
    highlight: { type: String as PropType<'slide' | 'line'>, default: 'line' },
    // ClassValue 是纯类型，运行时需用构造函数组合，编译期用 PropType 约束
    class: { type: [String, Object, Array] as PropType<ClassValue>, default: '' },
    isRound: { type: Boolean, default: false },
  },
  // 内容（items 数据 + 行 div）完全由默认插槽传入，文本可动态变更
  slots: {} as SlotsType<{ default: () => unknown }>,
  setup(props, { slots }) {
    // 当前选中行：data-corner-key（或行位置兜底），用于切换行动画
    const activeKey = ref('');
    // 选中行几何：点击时从行 div 读取，驱动高亮层定位
    const activeTop = ref(-80);
    const activeHeight = ref(40);

    // 注入选中行 key：插槽内行组件（CornerPanelRow）据此感知自身是否被选中
    provide(CORNER_ACTIVE_KEY, activeKey);

    /** 点击容器：事件委托找到带 data-corner-row 的行，读取几何触发高亮 */
    const handleClick = (e: MouseEvent) => {
      const row = (e.target as HTMLElement).closest?.(ROW_SELECTOR) as HTMLElement | null;
      if (!row) return;
      activeTop.value = row.offsetTop;
      activeHeight.value = row.offsetHeight;
      activeKey.value = row.getAttribute('data-corner-key') ?? `row-${row.offsetTop}`;
    };

    return () => {
      return (
        <div class={cn('relative mt-8px w-full b b-cyan-900 rd-4px bg-[#162a43]', props.class)} onClick={handleClick}>
          {!props.isRound && (
            <>
              {/* 四角装饰：不拦截指针事件 */}
              <img src={ltCornerSvg} alt="" class="absolute -top-14px -left-14px size-36px z-50 pointer-events-none" />
              <img src={rtCornerSvg} alt="" class="absolute -top-14px -right-14px size-36px z-50 pointer-events-none" />
              <img
                src={lbCornerSvg}
                alt=""
                class="absolute bottom-0 -left-10px w-80px h-4px z-50 pointer-events-none"
              />
            </>
          )}

          {/* —— 高亮动画层：绝对定位覆盖在内容之上，不拦截指针 —— */}

          {/* slide 形式：整块滑块，渐变背景 + 上下渐变边框 + 左右荧光条，点击选中行时滑动而来 */}
          {props.highlight === 'slide' && activeKey.value !== '' && (
            <div
              class="absolute left-0 right-0 pointer-events-none"
              style={{
                top: `${activeTop.value}px`,
                height: `${activeHeight.value}px`,
                transition: 'top 0.35s cubic-bezier(0.4, 0, 0.2, 1), height 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                background: SLIDE_BACKGROUND,
              }}
            >
              <Light
                color="#00EAFF"
                width={LINE_BAR_WIDTH}
                height={LINE_BAR_HEIGHT}
                class="absolute left-0 top-1/2 -translate-y-1/2"
              />
              <Light
                color="#00EAFF"
                width={LINE_BAR_WIDTH}
                height={LINE_BAR_HEIGHT}
                class="absolute right-0 top-1/2 -translate-y-1/2"
              />
            </div>
          )}

          {/* line 形式：选中行上绘制上下线生长 + 左右灯开合（切换行时旧层退场、新层进场） */}
          {props.highlight === 'line' && activeKey.value !== '' && (
            <AnimatePresence>
              <motion.div
                key={`${activeKey.value}-bg`}
                class="absolute inset-x-0 pointer-events-none"
                variants={lineBgVariants}
                initial="exit"
                animate="enter"
                exit="exit"
                style={{ top: `${activeTop.value}px`, height: `${activeHeight.value}px`, background: LINE_BG }}
              />
              <motion.div
                key={`${activeKey.value}-top`}
                class="absolute inset-x-0 h-1px"
                variants={lineVariants}
                initial="exit"
                animate="enter"
                exit="exit"
                style={{
                  top: `${activeTop.value}px`,
                  background: LINE_GRADIENT,
                  transformOrigin: 'left center',
                }}
              />
              <motion.div
                key={`${activeKey.value}-bottom`}
                class="absolute inset-x-0 h-1px"
                variants={lineVariants}
                initial="exit"
                animate="enter"
                exit="exit"
                style={{
                  top: `${activeTop.value + activeHeight.value}px`,
                  background: LINE_GRADIENT,
                  transformOrigin: 'right center',
                }}
              />
              <MotionLight
                key={`${activeKey.value}-left`}
                color="#00EAFF"
                width={LINE_BAR_WIDTH}
                height={LINE_BAR_HEIGHT}
                variants={lightVariants}
                initial="exit"
                animate="enter"
                exit="exit"
                class="absolute left-0"
                style={{ top: `${activeTop.value}px`, marginTop: activeHeight.value / 2 - LINE_BAR_HEIGHT / 2 }}
              />
              <MotionLight
                key={`${activeKey.value}-right`}
                color="#00EAFF"
                width={LINE_BAR_WIDTH}
                height={LINE_BAR_HEIGHT}
                variants={lightVariants}
                initial="exit"
                animate="enter"
                exit="exit"
                class="absolute right-0"
                style={{ top: `${activeTop.value}px`, marginTop: activeHeight.value / 2 - LINE_BAR_HEIGHT / 2 }}
              />
            </AnimatePresence>
          )}

          {/* 内容区：完全由调用方插槽控制（行 div 带 data-corner-row 即可联动高亮）
            无内容时不加 py-8px，避免空面板残留内边距高度 */}
          <div class={cn('relative z-10 py-8px')}>{slots.default?.()}</div>
        </div>
      );
    };
  },
});
