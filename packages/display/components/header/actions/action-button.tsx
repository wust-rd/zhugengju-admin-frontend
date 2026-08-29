import { computed, defineComponent, type PropType } from 'vue';
import { cn, type ClassValue } from '@jeesite/core/libs';

/**
 * ActionButton —— display header 通用「图标 + 文字」胶囊动作按钮
 *
 * 由后台 header 的 action 项（AppSearch/Notify/SystemAction 等）转写成 display 视觉：深蓝玻璃拟态胶囊，可带未读/计数角标，
 * 支持 active 高亮（发光）与 hover 态。
 *
 * 用法：
 * ```tsx
 * <ActionButton icon="i-ion:settings-outline" label="设置" onClick={openSetting} />
 * <ActionButton icon="i-ion:notifications-outline" label="通知" badge={3} />
 * <ActionButton icon="i-ion:expand" label="全屏" active />
 * ```
 */
export const ActionButton = defineComponent({
  name: 'ActionButton',
  emits: {
    click: (_e: MouseEvent) => true,
  },
  props: {
    /** UnoCSS 图标类，如 'i-ion:search'（iconify 约定：i-{collection}:{name}） */
    icon: { type: String, default: '' },
    /** 按钮文字 */
    label: { type: String, default: '' },
    /** 激活态：发光高亮（如全屏时、选中态） */
    active: { type: Boolean, default: false },
    /** 右上角角标数值：传 0 或 null 不显示，>99 显示 99+ */
    badge: { type: [Number, String] as PropType<number | string | null>, default: null },
    /** 禁用态：不响应点击 */
    disabled: { type: Boolean, default: false },
    /** 原生 title（悬浮提示） */
    title: { type: String, default: '' },
    /** 纯图标模式：只显示图标，隐藏文字与胶囊描边/底色 */
    iconOnly: { type: Boolean, default: false },
    class: { type: [String, Object, Array] as PropType<ClassValue>, default: '' },
  },
  setup(props, { slots, emit }) {
    const badgeText = computed(() => {
      if (props.badge === null || props.badge === undefined || props.badge === 0 || props.badge === '') return null;
      const n = Number(props.badge);
      if (Number.isNaN(n)) return String(props.badge);
      return n > 99 ? '99+' : String(n);
    });

    const isDanger = computed(() => {
      const n = Number(props.badge);
      return !Number.isNaN(n) && n > 0;
    });

    const getClass = computed(() => {
      if (props.iconOnly) {
        return cn(
          'group relative inline-flex size-40px cursor-pointer select-none items-center justify-center rounded-full transition-all duration-200',
          props.active
            ? 'bg-cyan-500/25 text-cyan-200 shadow-[0_0_12px_rgba(71,152,247,0.4)]'
            : 'text-gray-300 hover:bg-white/10 hover:text-white',
          props.disabled && 'cursor-not-allowed opacity-50',
          props.class,
        );
      }
      const h = 'h-36px';
      return cn(
        'group relative inline-flex cursor-pointer select-none items-center gap-1.5 rounded-full',
        h,
        'px-3 text-14px whitespace-nowrap backdrop-blur transition-all duration-200',
        'border border-white/10 bg-white/6',
        props.active
          ? 'border-cyan-400/50 bg-cyan-500/20 text-white shadow-[0_0_16px_rgba(71,152,247,0.45)]'
          : 'text-gray-200 hover:border-white/25 hover:bg-white/12',
        props.disabled && 'cursor-not-allowed opacity-50',
        props.class,
      );
    });

    return () => {
      const iconColor = props.iconOnly
        ? 'text-current'
        : props.active
          ? 'text-cyan-200'
          : 'text-gray-300 group-hover:text-white';
      const iconNode = props.icon ? <span class={cn('shrink-0 size-20px', iconColor, props.icon)}></span> : null;

      return (
        <button
          type="button"
          class={getClass.value}
          title={props.title || undefined}
          disabled={props.disabled}
          onClick={(e: MouseEvent) => emit('click', e)}
        >
          {iconNode}
          {!props.iconOnly && props.label ? <span class="relative">{props.label}</span> : null}
          {slots.default?.()}
          {badgeText.value !== null && (
            <span
              class={cn(
                'absolute -top-1 -right-1 flex min-w-16px items-center justify-center rounded-full px-1 text-11px font-bold leading-16px',
                isDanger.value ? 'bg-red-500 text-white' : 'bg-gray-500 text-white',
              )}
            >
              {badgeText.value}
            </span>
          )}
        </button>
      );
    };
  },
});
