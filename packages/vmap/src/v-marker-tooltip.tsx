import { defineComponent, inject, onBeforeUnmount, Teleport, watch, type PropType, type SlotsType } from 'vue';
import type { Offset, PositionAnchor } from 'maplibre-gl';
import { MarkerContextKey } from './context';
import { usePopup } from './composables/use-popup';
import { VPopupShell } from './v-popup-shell';

/**
 * VMarkerTooltip —— 标注悬停提示气泡。
 *
 * 必须放在 <VMarker> 插槽内（依赖 MarkerContextKey 注入 marker / map）。
 * 鼠标移入 marker 时在其上方弹出 tooltip，移出时关闭。
 *
 * 用法：
 * ```tsx
 * <VMarker longitude={116.4} latitude={39.9}>
 *   <VMarkerTooltip>北京</VMarkerTooltip>
 * </VMarker>
 * ```
 */
export const VMarkerTooltip = defineComponent({
  name: 'VMarkerTooltip',

  props: {
    /** 追加到 tooltip 容器的 CSS 类 */
    class: { type: String as PropType<string>, default: '' },
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

  slots: {} as SlotsType<{
    default?: () => unknown;
  }>,

  setup(props, { slots }) {
    const ctx = inject(MarkerContextKey, null);
    if (!ctx) {
      throw new Error('VMarkerTooltip must be used within a VMarker component');
    }

    const { container, create } = usePopup(() => props);

    let cleanup: (() => void) | null = null;

    watch(
      () => [ctx.marker.value, ctx.map.value] as const,
      ([marker, map]) => {
        if (!marker || !map || cleanup) return;

        const tooltip = create({ closeOnClick: true });

        const onEnter = () => {
          tooltip.setLngLat(marker.getLngLat()).addTo(map);
        };
        const onLeave = () => tooltip.remove();

        const el = marker.getElement();
        el.addEventListener('mouseenter', onEnter);
        el.addEventListener('mouseleave', onLeave);

        cleanup = () => {
          el.removeEventListener('mouseenter', onEnter);
          el.removeEventListener('mouseleave', onLeave);
          tooltip.remove();
        };
      },
      { immediate: true },
    );

    onBeforeUnmount(() => {
      cleanup?.();
      cleanup = null;
    });

    return () => (
      <Teleport to={container}>
        <VPopupShell variant="tooltip" class={props.class}>
          {slots.default?.()}
        </VPopupShell>
      </Teleport>
    );
  },
});
