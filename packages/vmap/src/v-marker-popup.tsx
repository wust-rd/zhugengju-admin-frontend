import { defineComponent, inject, onBeforeUnmount, ref, Teleport, watch, type PropType, type SlotsType } from 'vue';
import type { Offset, PositionAnchor } from 'maplibre-gl';
import { type ClassValue } from '@jeesite/core/libs';
import { MarkerContextKey } from './context';
import { usePopup } from './composables/use-popup';
import { VPopupShell } from './v-popup-shell';

/**
 * VMarkerPopup —— 标注内嵌弹窗（popover）。
 *
 * 必须放在 <VMarker> 插槽内（依赖 MarkerContextKey 注入 marker / map），
 * 通过 marker.setPopup() 挂载到标注上。
 *
 * 用法：
 * ```tsx
 * <VMarker longitude={116.4} latitude={39.9}>
 *   <VMarkerPopup>详细内容</VMarkerPopup>
 * </VMarker>
 * ```
 */
export const VMarkerPopup = defineComponent({
  name: 'VMarkerPopup',

  props: {
    /** 追加到 popup 容器的 CSS 类（进入动画类），默认 Animate.css fade-in-down 300ms */
    class: {
      type: [String, Object, Array] as PropType<ClassValue>,
      default: 'animated animated-duration-300ms fade-in-down-sm',
    },
    /** 关闭时切换的离场动画类，默认轻位移淡出（上 20px，300ms）；置空字符串可关闭离场动画（立即移除） */
    leaveClass: {
      type: [String, Object, Array] as PropType<ClassValue>,
      default: 'animated animated-duration-300ms fade-out-up-sm',
    },
    /** 离场动画时长（ms）：先播放 leaveClass 动画，结束后再真正移除 popup。默认 300ms，与 animated-duration-300ms 匹配 */
    leaveMs: { type: Number, default: 300 },
    /** 是否渲染右上角关闭按钮（由 VPopupShell 渲染） */
    closeButton: { type: Boolean as PropType<boolean>, default: false },
    /** 点击地图其他区域是否关闭（MapLibre PopupOptions.closeOnClick） */
    closeOnClick: { type: Boolean as PropType<boolean> },
    /** 地图移动时是否关闭（MapLibre PopupOptions.closeOnMove） */
    closeOnMove: { type: Boolean as PropType<boolean> },
    /** 打开后是否聚焦首个可聚焦元素（MapLibre PopupOptions.focusAfterOpen） */
    focusAfterOpen: { type: Boolean as PropType<boolean> },
    /** 气泡定位锚点（MapLibre PopupOptions.anchor） */
    anchor: { type: String as PropType<PositionAnchor> },
    /** 像素偏移，默认 16 */
    offset: { type: [Number, Object] as PropType<Offset>, default: 16 },
    /** 最大宽度，默认 'none'（自适应内容） */
    maxWidth: { type: String as PropType<string> },
    /** 是否允许亚像素定位（MapLibre PopupOptions.subpixelPositioning） */
    subpixelPositioning: { type: Boolean as PropType<boolean> },
  },

  emits: {
    close: () => true,
  },

  slots: {} as SlotsType<{
    default?: () => unknown;
  }>,

  setup(props, { emit, slots }) {
    const ctx = inject(MarkerContextKey, null);
    if (!ctx) {
      throw new Error('VMarkerPopup must be used within a VMarker component');
    }

    const { container, popup, create } = usePopup(() => props);

    /** 是否正在播放离场动画（class 切换为 leaveClass，且延迟移除 popup） */
    const leaving = ref(false);
    let leaveTimer: ReturnType<typeof setTimeout> | null = null;

    /**
     * 关闭入口：点击 ✕ 时触发。
     * 若配置了 leaveClass：先切离场动画类，动画播完再 popup.remove()（remove 时触发 close 事件）；
     * 否则与旧行为一致：立即移除。
     */
    const handleClose = () => {
      if (leaving.value) return;
      if (props.leaveClass) {
        leaving.value = true;
        leaveTimer = setTimeout(() => {
          leaveTimer = null;
          popup.value?.remove();
          leaving.value = false;
        }, props.leaveMs);
      } else {
        popup.value?.remove();
      }
    };

    watch(
      () => [ctx.marker.value, ctx.map.value] as const,
      ([marker, map]) => {
        if (!marker || !map || popup.value) return;
        const p = create();
        p.on('close', () => emit('close'));
        marker.setPopup(p);
      },
      { immediate: true },
    );

    onBeforeUnmount(() => {
      if (leaveTimer) {
        clearTimeout(leaveTimer);
        leaveTimer = null;
      }
      ctx.marker.value?.setPopup(null);
    });

    return () => (
      <Teleport to={container}>
        <VPopupShell
          variant="popover"
          closeButton={props.closeButton}
          class={leaving.value ? props.leaveClass : props.class}
          onClose={handleClose}
        >
          {slots.default?.()}
        </VPopupShell>
      </Teleport>
    );
  },
});
