import { cn, type ClassValue } from '@jeesite/core/libs';
import { animate } from 'motion-v';
import { defineComponent, ref, type PropType, type SlotsType } from 'vue';
import { GlassRing } from '@jeesite/display/components/glass-ring';

/** 左侧面板宽度（px）：布局与收起动画共用 */
export const PANEL_WIDTH = 460;

/** left 作用域插槽 props：调用方可据此绑定收起按钮 / 感知收起态 */
export interface DisplayPageLayoutScope {
  /** 是否已收起 */
  collapsed: boolean;
  /** 收起/展开（面板宽度动画，右侧自动扩展） */
  toggle: () => void;
}

/**
 * DisplayPageLayout —— 大屏页面公共布局：左侧数据面板 + 右侧内容区
 *
 * urban-health-check / early-stage-planning / ifco 三页共用的页面骨架：
 * - 外层 flex 撑满视口；左侧 460px 数据面板（blue-bg 深蓝渐变），右侧 flex-1 内容区
 * - collapsible 时面板可收起：宽度动画 460 → 0，右侧内容自动扩展到全宽；
 *   收起后左边缘显示展开按钮（GlassRing），面板内的收起按钮由调用方通过
 *   left 作用域插槽的 toggle 绑定（头部样式完全由调用方自己控制）
 *
 * props：
 * - collapsible: 是否可收起，默认 true；false 时面板固定宽度、无展开按钮
 * - defaultCollapsed: 初始收起状态，默认 false
 * - class: 透传 UnoCSS 类
 *
 * slots：
 * - left: ({ collapsed, toggle }) => 左侧面板内容（含头部，由调用方自行渲染）
 * - right: () => 右侧内容区（地图/图表等）
 *
 * 用法：
 * ```tsx
 * <DisplayPageLayout>
 *   {{
 *     left: ({ toggle }) => (
 *       <>
 *         <GlowTitle2>…标题… <GlassRing onClick={toggle}>收起</GlassRing></GlowTitle2>
 *         …面板内容…
 *       </>
 *     ),
 *     right: () => <地图 />,
 *   }}
 * </DisplayPageLayout>
 * ```
 */
export const DisplayPageLayout = defineComponent({
  name: 'DisplayPageLayout',
  props: {
    /** 是否可收起，默认 true；false 时面板固定宽度 */
    collapsible: { type: Boolean, default: true },
    /** 初始收起状态，默认 false */
    defaultCollapsed: { type: Boolean, default: false },
    // ClassValue 是纯类型，运行时需用构造函数组合，编译期用 PropType 约束
    class: { type: [String, Object, Array] as PropType<ClassValue>, default: '' },
  },
  slots: {} as SlotsType<{
    left: (scope: DisplayPageLayoutScope) => unknown;
    right: () => unknown;
  }>,
  setup(props, { slots }) {
    const collapsed = ref(props.defaultCollapsed);
    const panelRef = ref<HTMLDivElement | null>(null);

    /** 收起/展开：面板宽度动画（内容固定宽、溢出裁剪），右侧 flex-1 自动扩展 */
    const toggle = () => {
      const el = panelRef.value;
      if (!el) return;
      animate(el, collapsed.value ? { width: ['0px', `${PANEL_WIDTH}px`] } : { width: [`${PANEL_WIDTH}px`, '0px'] }, {
        duration: 0.3,
        ease: 'easeInOut',
      });
      collapsed.value = !collapsed.value;
    };

    return () => (
      <div class={cn('relative flex size-full overflow-hidden', props.class)}>
        {/* 展开按钮：面板收起后固定在左边缘，点击展开面板 */}
        {props.collapsible && collapsed.value && (
          <div class="absolute left-8px top-32px z-30">
            <GlassRing class="w-32px h-32px flex items-center justify-center cursor-pointer" onClick={toggle}>
              <div class="i-ri-arrow-right-double-fill size-20px text-white" />
            </GlassRing>
          </div>
        )}

        {/* 左侧面板：收起时宽度收缩到 0（内容固定宽、溢出裁剪），右侧自动扩展 */}
        <div ref={panelRef} class="shrink-0 w-460px h-full blue-bg overflow-hidden">
          {/* 内容容器：纵向流式堆叠，高度不足时出现纵向滚动条 */}
          <div class="w-460px h-full overflow-y-auto overflow-x-hidden pl-16px pr-24px pt-24px pb-24px blue-bg">
            {slots.left?.({ collapsed: collapsed.value, toggle })}
          </div>
        </div>

        {/* 右侧内容区：flex-1 占满剩余宽度，面板收起后自动扩展到全宽 */}
        <div class="flex-1 min-w-0 relative">{slots.right?.()}</div>
      </div>
    );
  },
});
