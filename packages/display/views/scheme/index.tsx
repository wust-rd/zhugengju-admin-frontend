import { defineComponent, onMounted, onUnmounted, ref } from 'vue';
import {
  Map as MapLibreMap,
  NavigationControl,
  GeolocateControl,
  FullscreenControl,
  ScaleControl,
  type StyleSpecification,
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './map.css';

/** 天地图 token（web/.env 配置） */
const TIANDITU_TOKEN = import.meta.env.VITE_TIANDITU_TOKEN;

/** 天地图 WMTS 瓦片地址生成器（layer: vec 矢量底图 / cva 中文注记） */
function tiandituTiles(layer: string): string {
  return `https://t0.tianditu.gov.cn/${layer}_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=${layer}&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=${TIANDITU_TOKEN}`;
}

/** 天地图底图：矢量底图 + 中文注记叠加 */
const tiandituStyle: StyleSpecification = {
  version: 8,
  sources: {
    'tianditu-vec': {
      type: 'raster',
      tiles: [tiandituTiles('vec')],
      tileSize: 256,
      maxzoom: 18,
    },
    'tianditu-cva': {
      type: 'raster',
      tiles: [tiandituTiles('cva')],
      tileSize: 256,
      maxzoom: 18,
    },
  },
  layers: [
    { id: 'tianditu-vec', type: 'raster', source: 'tianditu-vec' },
    { id: 'tianditu-cva', type: 'raster', source: 'tianditu-cva' },
  ],
};

export default defineComponent({
  name: 'DisplayScheme',
  setup() {
    const mapContainer = ref<HTMLDivElement | null>(null);
    let map: MapLibreMap | null = null;

    onMounted(() => {
      if (!mapContainer.value) return;

      map = new MapLibreMap({
        container: mapContainer.value,
        style: tiandituStyle,
        center: [116.391, 39.904], // 北京
        zoom: 11,
      });

      // 右下角控件（水平排列见 map.css）
      map.addControl(new NavigationControl({ visualizePitch: true }), 'bottom-right');
      map.addControl(new GeolocateControl({ trackUserLocation: true }), 'bottom-right');
      map.addControl(new FullscreenControl(), 'bottom-right');
      map.addControl(new ScaleControl({ unit: 'metric' }), 'bottom-right');
    });

    onUnmounted(() => {
      map?.remove();
      map = null;
    });

    return () => (
      <div
        ref={(el) => {
          mapContainer.value = el as HTMLDivElement | null;
        }}
        class="map-custom-controls h-full w-full"
      />
    );
  },
});
