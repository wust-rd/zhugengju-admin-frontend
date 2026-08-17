import { defineComponent, onBeforeUnmount, ref, Teleport, watch, type PropType, type SlotsType } from 'vue';
import type { Offset, PositionAnchor } from 'maplibre-gl';
import { type ClassValue } from '@jeesite/core/libs';
import { useMap } from './composables/use-map';
import { usePopup } from './composables/use-popup';
import { VPopupShell } from './v-popup-shell';

/**
 * VMapPopup —— 地图级弹窗（popover）。
 *
 * 必须放在 <VMap> 插槽内（依赖 useMap() 注入地图实例），
 * 通过经纬度坐标直接 addTo 地图打开。
 *
 * 用法：
 * ```tsx
 * <VMap>
 *   <VMapPopup longitude={116.4} latitude={39.9} onClose={() => {}}>
 *     详细内容
 *   </VMapPopup>
 * </VMap>
 * ```
 */
export const VMapPopup = defineComponent({
  name: 'VMapPopup',

  props: {
    /** 经度坐标 */
    longitude: { type: Number, required: true },
    /** 纬度坐标 */
    latitude: { type: Number, required: true },
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
    const { map } = useMap();
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

    onBeforeUnmount(() => {
      if (leaveTimer) {
        clearTimeout(leaveTimer);
        leaveTimer = null;
      }
    });

    watch(
      map,
      (m) => {
        if (!m || popup.value) return;
        const p = create();
        p.setLngLat([props.longitude, props.latitude]);
        p.on('close', () => emit('close'));
        p.addTo(m);
      },
      { immediate: true },
    );

    watch(
      () => [props.longitude, props.latitude] as const,
      ([lng, lat]) => {
        const p = popup.value;
        if (!p?.isOpen()) return;
        if (p.getLngLat().lng !== lng || p.getLngLat().lat !== lat) {
          p.setLngLat([lng, lat]);
        }
      },
    );

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
