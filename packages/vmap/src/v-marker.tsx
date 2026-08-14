import MapLibreGL, { type MarkerOptions } from 'maplibre-gl';
import {
  defineComponent,
  onBeforeUnmount,
  onMounted,
  provide,
  shallowRef,
  watch,
  watchEffect,
  type PropType,
  type SlotsType,
} from 'vue';
import { useMap } from './composables/use-map';
import { MarkerContextKey } from './context';

/**
 * VMarker —— 地图标注点。
 *
 * 仅显式声明几个 wrapper 专属 prop（longitude/latitude/draggable/offset/rotation/...），
 * 其余 MarkerOptions（anchor、color、scale、subpixelPositioning…）走 $attrs 透传 ——
 * 若不如此，它们会被 Vue 的 Boolean-prop 强制转换成 false。与 VMap 同一套处理思路。
 *
 * 用法：必须放在 <VMap> 插槽内（内部依赖 useMap() 注入地图实例）：
 * ```tsx
 * <VMap>
 *   <VMarker longitude={116.4} latitude={39.9}>
 *     <VMarkerContent><VMarkerLabel>北京</VMarkerLabel></VMarkerContent>
 *   </VMarker>
 * </VMap>
 * ```
 */
export const VMarker = defineComponent({
  name: 'VMarker',

  // 关闭 attrs 自动继承：$attrs 由 collectMarkerOptions 手动接管转发给 Marker 构造器
  inheritAttrs: false,

  props: {
    /** 经度坐标 */
    longitude: { type: Number, required: true },
    /** 纬度坐标 */
    latitude: { type: Number, required: true },
    /** 是否可拖拽（默认 false） */
    draggable: { type: Boolean, default: false },
    /** 标注相对其经纬度点的像素偏移 */
    offset: { type: Object as PropType<MarkerOptions['offset']> },
    /** 旋转角度（度） */
    rotation: { type: Number },
    /** 旋转对齐方式（"auto" | "map" | "viewport"） */
    rotationAlignment: { type: String as PropType<MarkerOptions['rotationAlignment']> },
    /** 俯仰对齐方式（"auto" | "map" | "viewport"） */
    pitchAlignment: { type: String as PropType<MarkerOptions['pitchAlignment']> },
  },

  emits: {
    click: (_e: MouseEvent) => true,
    mouseenter: (_e: MouseEvent) => true,
    mouseleave: (_e: MouseEvent) => true,
    dragstart: (_lngLat: { lng: number; lat: number }) => true,
    drag: (_lngLat: { lng: number; lat: number }) => true,
    dragend: (_lngLat: { lng: number; lat: number }) => true,
  },

  slots: {} as SlotsType<{
    default?: () => unknown;
  }>,

  setup(props, { emit, attrs, slots }) {
    const { map } = useMap();

    // ★ 底层 MapLibre Marker 实例。shallowRef：只追踪 .value 整体替换
    const markerRef = shallowRef<MapLibreGL.Marker | null>(null);

    // 注入 Marker 上下文，供 VMarkerContent / VMarkerLabel 子组件读取
    provide(MarkerContextKey, { marker: markerRef, map });

    // 卸载清理句柄（onMounted 里创建 Marker 后赋值，onBeforeUnmount 统一调用）
    let cleanupMarker: (() => void) | null = null;

    /**
     * 收集 Marker 构造选项：遍历 $attrs → 过滤 undefined / Vue 事件监听器 /
     * 保留键（class/style/element）。
     */
    const collectMarkerOptions = (): Partial<MarkerOptions> => {
      const out: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(attrs)) {
        if (value === undefined) continue;
        if (/^on[A-Z]/.test(key)) continue;
        if (key === 'class' || key === 'style' || key === 'element') continue;
        out[key] = value;
      }
      return out as Partial<MarkerOptions>;
    };

    onMounted(() => {
      const marker = new MapLibreGL.Marker({
        ...collectMarkerOptions(),
        element: document.createElement('div'),
        draggable: props.draggable,
        offset: props.offset,
        rotation: props.rotation,
        rotationAlignment: props.rotationAlignment,
        pitchAlignment: props.pitchAlignment,
      }).setLngLat([props.longitude, props.latitude]);

      const el = marker.getElement();
      const onClick = (e: MouseEvent) => emit('click', e);
      const onEnter = (e: MouseEvent) => emit('mouseenter', e);
      const onLeave = (e: MouseEvent) => emit('mouseleave', e);
      el.addEventListener('click', onClick);
      el.addEventListener('mouseenter', onEnter);
      el.addEventListener('mouseleave', onLeave);

      marker.on('dragstart', () => {
        const { lng, lat } = marker.getLngLat();
        emit('dragstart', { lng, lat });
      });
      marker.on('drag', () => {
        const { lng, lat } = marker.getLngLat();
        emit('drag', { lng, lat });
      });
      marker.on('dragend', () => {
        const { lng, lat } = marker.getLngLat();
        emit('dragend', { lng, lat });
      });

      // ★ 最后才 addTo + 赋值，避免 markerRef 先于监听器就绪
      if (map.value) marker.addTo(map.value);
      markerRef.value = marker;

      cleanupMarker = () => {
        el.removeEventListener('click', onClick);
        el.removeEventListener('mouseenter', onEnter);
        el.removeEventListener('mouseleave', onLeave);
        marker.remove();
        markerRef.value = null;
      };
    });

    onBeforeUnmount(() => {
      cleanupMarker?.();
    });

    // 迟到挂载：地图实例出现后再 addTo
    watch(map, (m) => {
      if (m && markerRef.value) markerRef.value.addTo(m);
    });

    // 响应式同步所有 marker prop。MapLibre 的 setter 幂等且廉价，无需手动 diff。
    watchEffect(() => {
      const marker = markerRef.value;
      if (!marker) return;
      marker.setLngLat([props.longitude, props.latitude]);
      marker.setDraggable(props.draggable);
      marker.setOffset(props.offset ?? [0, 0]);
      marker.setRotation(props.rotation ?? 0);
      marker.setRotationAlignment(props.rotationAlignment ?? 'auto');
      marker.setPitchAlignment(props.pitchAlignment ?? 'auto');
    });

    // 默认插槽：VMarkerContent / VMarkerLabel 等内容
    return () => slots.default?.();
  },
});
