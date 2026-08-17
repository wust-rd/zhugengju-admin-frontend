import { computed, defineComponent, type PropType, type SlotsType } from 'vue';
import { X } from 'lucide-vue-next';
import { clsx, type ClassValue } from '@jeesite/core/libs';

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
      clsx(
        props.variant === 'tooltip'
          ? 'bg-slate-900 text-white pointer-events-none rounded-md px-12px py-6px text-14px text-balance shadow-md'
          : 'bg-white relative max-w-62 rounded-8px px-16px py-12px shadow-md',
        props.class,
      ),
    );

    return () => (
      <div class={cls.value}>
        {props.variant === 'popover' && props.closeButton && (
          <button
            type="button"
            aria-label="Close popup"
            class="hover:bg-gray-200 absolute top-2px right-2px z-50 inline-flex rd-4px size-16px cursor-pointer items-center justify-center transition-colors"
            onClick={() => emit('close')}
          >
            <X class="size-12px" />
          </button>
        )}
        {slots.default?.()}
      </div>
    );
  },
});
