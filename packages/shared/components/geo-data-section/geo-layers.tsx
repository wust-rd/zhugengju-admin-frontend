import { defineComponent, watch } from 'vue';
import type { PropType } from 'vue';
import { useMap, useMapLayer } from '@jeesite/vmap';

/**
 * 地理数据只读渲染（VMap 插槽内的纯逻辑子组件）
 *
 * geoJson 字符串 → geojson source + fill/line/circle 三图层渲染，
 * 数据变化时重铺并自适应视野（fitBounds）。供 GeoJsonMap 使用。
 */

const SOURCE_ID = 'geo-data-section';

type Position = [number, number];

function emptyFeatureCollection() {
  return { type: 'FeatureCollection', features: [] };
}

/** 递归收集全部坐标，求 bbox */
function bboxOf(geoJson: Recordable): [[number, number], [number, number]] | undefined {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  function walk(node: unknown) {
    if (Array.isArray(node)) {
      if (node.length >= 2 && typeof node[0] === 'number' && typeof node[1] === 'number') {
        const [x, y] = node as Position;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      } else {
        node.forEach(walk);
      }
    } else if (node && typeof node === 'object') {
      Object.values(node as Recordable).forEach(walk);
    }
  }
  walk(geoJson);
  return Number.isFinite(minX)
    ? [
        [minX, minY],
        [maxX, maxY],
      ]
    : undefined;
}

export const GeoLayers = defineComponent({
  name: 'GeoLayers',
  props: {
    geoJson: { type: String as PropType<string | undefined>, default: undefined },
  },
  setup(props) {
    const { map, isLoaded } = useMap();

    useMapLayer(map, isLoaded, (mapInstance) => {
      mapInstance.addSource(SOURCE_ID, {
        type: 'geojson',
        data: emptyFeatureCollection() as never,
      });
      mapInstance.addLayer({
        id: `${SOURCE_ID}-fill`,
        type: 'fill',
        source: SOURCE_ID,
        paint: { 'fill-color': '#1677ff', 'fill-opacity': 0.15 },
      });
      mapInstance.addLayer({
        id: `${SOURCE_ID}-line`,
        type: 'line',
        source: SOURCE_ID,
        paint: { 'line-color': '#1677ff', 'line-width': 2 },
      });
      mapInstance.addLayer({
        id: `${SOURCE_ID}-point`,
        type: 'circle',
        source: SOURCE_ID,
        paint: { 'circle-radius': 4, 'circle-color': '#1677ff' },
      });

      function apply(data: string | undefined) {
        const source = mapInstance.getSource(SOURCE_ID) as { setData: (data: Recordable) => void } | undefined;
        if (!source) return;
        const fc = data ? (JSON.parse(data) as Recordable) : emptyFeatureCollection();
        source.setData(fc);
        const bbox = data ? bboxOf(fc) : undefined;
        if (bbox) {
          mapInstance.fitBounds(bbox as never, { padding: 24, maxZoom: 15, duration: 0 });
        }
      }

      apply(props.geoJson);
      watch(
        () => props.geoJson,
        (data) => apply(data),
      );

      return () => {
        for (const id of [`${SOURCE_ID}-point`, `${SOURCE_ID}-line`, `${SOURCE_ID}-fill`]) {
          if (mapInstance.getLayer(id)) mapInstance.removeLayer(id);
        }
        if (mapInstance.getSource(SOURCE_ID)) mapInstance.removeSource(SOURCE_ID);
      };
    });

    return () => null;
  },
});
