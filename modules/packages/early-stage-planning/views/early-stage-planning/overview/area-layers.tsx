/**
 * 更新片区地图图层（前期谋划 overview 右侧地图）：
 * 当前批次片区面（数据来自 esp 图斑接口，批次切换由父级重新加载后传入）。
 * 第一批紫 #773ceb / 第二批蓝 #3a86ec，两个 fill 图层按 BATCH 过滤，
 * 传入的 FeatureCollection 只含当前批次，另一图层自然无命中。
 * 必须在 <VMap> 插槽内使用 —— useMap() 依赖 VMap 注入的地图上下文。
 */
import { useMap } from '@jeesite/vmap';
import { defineComponent, onBeforeUnmount, type PropType } from 'vue';
import { watch } from 'vue';

const BATCH_COLOR: Record<string, string> = {
  第一批: '#773ceb',
  第二批: '#3a86ec',
};

const SOURCE_ID = 'esp-areas';
const LAYER_IDS = ['esp-areas-b1', 'esp-areas-b2'];

export const AreaLayers = defineComponent({
  name: 'EarlyStagePlanningAreaLayers',

  props: {
    /** 当前批次 FeatureCollection（父级按批次加载后传入；为 null 时不添加图层） */
    areas: { type: Object as PropType<Recordable | null>, default: null },
  },

  setup(props) {
    const { map, isLoaded } = useMap();

    /** 数据 / 地图任一就绪即同步：source 已存在（批次切换）仅 setData，
        否则补齐 source + 按批次两个 fill 图层（setStyle 换底图后亦会重加） */
    watch(
      [() => props.areas, map, isLoaded],
      ([areas, m, loaded]) => {
        if (!m || !loaded || !areas) return;
        const src = m.getSource(SOURCE_ID);
        if (src) {
          (src as maplibregl.GeoJSONSource).setData(areas as any);
          return;
        }
        m.addSource(SOURCE_ID, { type: 'geojson', data: areas as any });
        for (const [batch, color] of Object.entries(BATCH_COLOR)) {
          m.addLayer({
            id: batch === '第一批' ? LAYER_IDS[0] : LAYER_IDS[1],
            type: 'fill',
            source: SOURCE_ID,
            filter: ['==', ['get', 'BATCH'], batch],
            paint: { 'fill-color': color, 'fill-opacity': 0.35 },
          });
        }
      },
      { immediate: true, flush: 'post' },
    );

    // 卸载回收（getLayer/getSource 判空：setStyle 可能已移除）
    onBeforeUnmount(() => {
      const m = map.value;
      if (!m) return;
      for (const id of LAYER_IDS) {
        if (m.getLayer(id)) m.removeLayer(id);
      }
      if (m.getSource(SOURCE_ID)) m.removeSource(SOURCE_ID);
    });

    return () => null;
  },
});
