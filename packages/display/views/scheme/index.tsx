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

/** 抽屉顶部 Tab 项配置 */
const DRAWER_TABS = [
  { key: 'basic', label: '基本情况' },
  { key: 'physical', label: '体检情况' },
  { key: 'planning', label: '功能策划' },
  { key: 'project', label: '项目情况' },
  { key: 'evaluation', label: '实施后评估' },
] as const;
type DrawerTabKey = (typeof DRAWER_TABS)[number]['key'];

/** 各 tab 内容图片地址（暂时共用同一张，后续请分别替换） */
const TAB_IMAGE_URLS: Record<DrawerTabKey, string> = {
  basic:
    'https://zhugengju-public.oss-cn-wuhan-lr.aliyuncs.com/%E7%89%87%E5%8C%BA%E7%AD%96%E5%88%92/%E5%9F%BA%E6%9C%AC%E6%83%85%E5%86%B5.webp',
  physical:
    'https://zhugengju-public.oss-cn-wuhan-lr.aliyuncs.com/%E7%89%87%E5%8C%BA%E7%AD%96%E5%88%92/%E4%BD%93%E6%A3%80%E6%83%85%E5%86%B5.webp',
  planning:
    'https://zhugengju-public.oss-cn-wuhan-lr.aliyuncs.com/%E7%89%87%E5%8C%BA%E7%AD%96%E5%88%92/%E5%8A%9F%E8%83%BD%E7%AD%96%E5%88%92.webp',
  project:
    'https://zhugengju-public.oss-cn-wuhan-lr.aliyuncs.com/%E7%89%87%E5%8C%BA%E7%AD%96%E5%88%92/%E9%A1%B9%E7%9B%AE%E6%83%85%E5%86%B5.webp',
  evaluation:
    'https://zhugengju-public.oss-cn-wuhan-lr.aliyuncs.com/%E7%89%87%E5%8C%BA%E7%AD%96%E5%88%92/%E5%AE%9E%E6%96%BD%E5%90%8E%E8%AF%84%E4%BC%B0.webp',
};

/** 各 tab 弹窗预览图片地址（暂共用一张，后续请分别替换） */
const MODAL_IMAGE_URLS: Record<DrawerTabKey, string> = {
  basic: '',
  physical:
    'https://zhugengju-public.oss-cn-wuhan-lr.aliyuncs.com/%E7%89%87%E5%8C%BA%E7%AD%96%E5%88%92/%E7%89%87%E5%8C%BA%E7%AD%96%E5%88%92%E5%9B%BE%E5%86%8C.webp',
  planning:
    'https://zhugengju-public.oss-cn-wuhan-lr.aliyuncs.com/%E7%89%87%E5%8C%BA%E7%AD%96%E5%88%92/%E7%89%87%E5%8C%BA%E7%AD%96%E5%88%92%E5%9B%BE%E5%86%8C.webp',
  project:
    'https://zhugengju-public.oss-cn-wuhan-lr.aliyuncs.com/%E7%89%87%E5%8C%BA%E7%AD%96%E5%88%92/%E7%89%87%E5%8C%BA%E9%A1%B9%E7%9B%AE%E6%B8%85%E5%8D%95.webp',
  evaluation:
    'https://zhugengju-public.oss-cn-wuhan-lr.aliyuncs.com/%E7%89%87%E5%8C%BA%E7%AD%96%E5%88%92/%E5%AE%9E%E6%96%BD%E5%90%8E%E8%AF%84%E4%BC%B0-%E7%9B%B8%E5%86%8C.webp',
};

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
    const drawerVisible = ref(false);
    const clickPoint = ref<{ lng: number; lat: number; x: number; y: number } | null>(null);
    const activeTab = ref<DrawerTabKey>('physical');
    const previewVisible = ref(false);
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

      // 点击地图 → 右侧弹出 drawer
      map.on('click', (e) => {
        clickPoint.value = { lng: e.lngLat.lng, lat: e.lngLat.lat, x: e.point.x, y: e.point.y };
        drawerVisible.value = true;
      });
    });

    onUnmounted(() => {
      map?.remove();
      map = null;
    });

    return () => (
      <div class="relative h-full w-full">
        <div
          ref={(el) => {
            mapContainer.value = el as HTMLDivElement | null;
          }}
          class="map-custom-controls h-full w-full"
        />

        {/* 右侧 Drawer */}
        <div
          class={
            'fixed top-90px right-0 bottom-0 z-[60] flex w-420px flex-col bg-[#0f2b47] text-white shadow-2xl transition-transform duration-300 ' +
            (drawerVisible.value ? 'translate-x-0' : 'translate-x-full')
          }
        >
          {/* 顶部 Tab 切换器（5 等分胶囊样式，关闭按钮位于右侧） */}
          <div class="flex h-44px items-stretch bg-[#1a3a5c]">
            {DRAWER_TABS.map((tab) => (
              <div
                key={tab.key}
                class={
                  'flex flex-1 cursor-pointer items-center justify-center text-14px whitespace-nowrap transition-all duration-200 ' +
                  (activeTab.value === tab.key
                    ? 'border border-[#5fbfff]/60 bg-gradient-to-r from-[#0ea5e9]/20 to-[#0E83BD] font-500 text-white shadow-lg'
                    : 'border border-transparent text-white/60 hover:text-white')
                }
                onClick={() => (activeTab.value = tab.key)}
              >
                {tab.label}
              </div>
            ))}
          </div>

          {/* 内容区：每个 tab 显示一张图片（体检情况 / 功能策划可点击预览） */}
          <div class="scrollbar-none flex-1 overflow-y-auto">
            <img
              src={TAB_IMAGE_URLS[activeTab.value]}
              alt={DRAWER_TABS.find((t) => t.key === activeTab.value)?.label ?? '内容图片'}
              class={'w-full rounded-lg ' + (MODAL_IMAGE_URLS[activeTab.value] ? 'cursor-pointer' : '')}
              onClick={() => {
                if (MODAL_IMAGE_URLS[activeTab.value]) {
                  previewVisible.value = true;
                }
              }}
            />
          </div>
        </div>

        {/* 预览 Modal：体检情况 / 功能策划 点击图片弹出（图片 884×640） */}
        {previewVisible.value && MODAL_IMAGE_URLS[activeTab.value] && (
          <div
            class="fixed inset-0 z-[70] flex items-center justify-center bg-black/60"
            onClick={() => (previewVisible.value = false)}
          >
            <img
              src={MODAL_IMAGE_URLS[activeTab.value]}
              alt="图片预览"
              class="max-h-[90vh] w-884px rounded-xl object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </div>
    );
  },
});
