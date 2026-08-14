import { computed, defineComponent, type PropType, type SlotsType } from 'vue';
import { X } from 'lucide-vue-next';
import { cn, type ClassValue } from '@jeesite/core/libs';

type PopupVariant = 'popover' | 'tooltip';

/**
 * VPopupShell —— 弹窗 / 提示气泡外壳（通用 UI 容器）。
 *
 * 供 VMarkerTooltip 等地图浮层复用，两种视觉变体：
 * - variant="popover"（默认）：圆角卡片，可选右上角关闭按钮（closeButton）。
 * - variant="tooltip"：紧凑深色提示条（无关闭按钮）。
 *
 * 关闭按钮由本组件渲染（而非 MapLibre 自带 closeButton），点击后 emit('close')。
 */
export const VPopupShell = defineComponent({
  name: 'VPopupShell',

  props: {
    /** 视觉变体：'popover'（圆角卡片）| 'tooltip'（紧凑深色提示） */
    variant: { type: String as PropType<PopupVariant>, default: 'popover' },
    /** 是否渲染右上角关闭按钮（仅 popover 变体生效） */
    closeButton: { type: Boolean, default: false },
    /** 追加的 CSS 类 */
    class: { type: [String, Object, Array] as PropType<ClassValue>, default: '' },
  },

  emits: {
    close: () => true,
  },

  slots: {} as SlotsType<{
    default?: () => unknown;
  }>,

  setup(props, { emit, slots }) {
    const cls = computed(() =>
      props.variant === 'tooltip'
        ? cn(
            'bg-slate-900 text-white pointer-events-none rounded-md px-12px py-6px text-14px text-balance shadow-md',
            'animate-in fade-in-0 zoom-in-95 duration-200 ease-out',
            props.class,
          )
        : cn(
            'bg-white text-black relative max-w-62 rounded-md border p-3 shadow-md',
            'animate-in fade-in-0 zoom-in-95 duration-200 ease-out',
            props.class,
          ),
    );

    return () => (
      <div class={cls.value}>
        {props.variant === 'popover' && props.closeButton && (
          <button
            type="button"
            aria-label="Close popup"
            class="focus-visible:ring-ring hover:bg-muted text-foreground absolute top-0.5 right-0.5 z-10 inline-flex size-5 cursor-pointer items-center justify-center rounded-sm transition-colors focus:outline-none focus-visible:ring-2"
            onClick={() => emit('close')}
          >
            <X class="size-4" />
          </button>
        )}
        {slots.default?.()}
      </div>
    );
  },
});
