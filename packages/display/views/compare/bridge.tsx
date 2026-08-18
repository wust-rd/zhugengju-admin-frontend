import { useMap } from '@jeesite/vmap';
import { defineComponent, watch } from 'vue';

/**
 * MapReadyBridge —— 地图就绪桥接组件（放在 <VMap> 插槽内，纯逻辑不渲染 DOM）。
 *
 * 通过 useMap() 拿到所在 VMap 的地图实例，等地图加载完成（isLoaded）后 emit('ready', map)。
 * 相比"用 ref + expose 从组件外部拿 map"，插槽内 useMap 是 VMap 验证过的机制，简单可靠。
 *
 * 用法：
 * ```tsx
 * <VMap>
 *   <MapReadyBridge onReady={handleMapReady} />
 * </VMap>
 * ```
 */
export const MapReadyBridge = defineComponent({
  name: 'MapReadyBridge',

  emits: {
    ready: (_map: maplibregl.Map) => true,
  },

  setup(_props, { emit }) {
    const { map, isLoaded } = useMap();

    // 插槽内容在 mapInstance 非空后才渲染，所以 map 一定可用；
    // isLoaded 变化（异步加载完成）会再次触发本 watch，就绪后上报一次
    watch(
      [map, isLoaded],
      ([m, loaded]) => {
        if (m && loaded) emit('ready', m as maplibregl.Map);
      },
      { immediate: true },
    );

    return () => null;
  },
});
