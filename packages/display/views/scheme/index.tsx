import { defineComponent, onMounted, onUnmounted, ref } from 'vue';
import { animate } from 'motion-v';
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
import expandBtnImg from '@jeesite/assets/images/display/expand-btn.webp';

/** 天地图 token（web/.env 配置） */
const TIANDITU_TOKEN = import.meta.env.VITE_TIANDITU_TOKEN;

/** 天地图 WMTS 瓦片地址生成器（EPSG:3857, layer: vec 矢量底图 / cva 中文注记） */
function tiandituTiles(layer: string): string {
  return `https://t0.tianditu.gov.cn/${layer}_c/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=${layer}&STYLE=default&TILEMATRIXSET=c&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=${TIANDITU_TOKEN}`;
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

/** 左侧抽屉内容图片地址 */
const LEFT_DRAWER_IMAGE_URL =
  'https://zhugengju-public.oss-cn-wuhan-lr.aliyuncs.com/%E7%89%87%E5%8C%BA%E7%AD%96%E5%88%92/%E7%89%87%E5%8C%BA%E7%AD%96%E5%88%92-%E5%B7%A6%E4%BE%A7%E6%8A%BD%E5%B1%89.webp';

/** 示例点位数据，后续请替换为真实数据源 */
const DEMO_POINTS_GEOJSON = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Point',
        coordinates: [114.2657064, 30.601046],
      },
    },
  ],
};

/** 示例 polygon 数据（蓝色区域），后续请替换为真实数据源 */
const DEMO_POLYGON_GEOJSON = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [114.26, 30.53],
            [114.36, 30.53],
            [114.36, 30.63],
            [114.26, 30.63],
            [114.26, 30.53],
          ],
        ],
      },
    },
  ],
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
      scheme: 'tms',
    },
    'tianditu-cva': {
      type: 'raster',
      tiles: [tiandituTiles('cva')],
      tileSize: 256,
      maxzoom: 18,
      scheme: 'tms',
    },
    'demo-polygon': {
      type: 'geojson',
      data: DEMO_POLYGON_GEOJSON,
    },
    'demo-points': {
      type: 'geojson',
      data: DEMO_POINTS_GEOJSON,
    },
  },
  layers: [
    { id: 'tianditu-vec', type: 'raster', source: 'tianditu-vec' },
    { id: 'tianditu-cva', type: 'raster', source: 'tianditu-cva' },
    {
      id: 'demo-points-circle',
      type: 'circle',
      source: 'demo-points',
      paint: {
        'circle-radius': 8,
        'circle-color': '#ef4444',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
      },
    },
    {
      id: 'demo-polygon-fill',
      type: 'fill',
      source: 'demo-polygon',
      paint: {
        'fill-color': '#3b82f6',
        'fill-opacity': 1,
      },
    },
    {
      id: 'demo-polygon-outline',
      type: 'line',
      source: 'demo-polygon',
      paint: {
        'line-color': '#1d4ed8',
        'line-width': 2,
      },
    },
  ],
};

export default defineComponent({
  name: 'DisplayScheme',
  setup() {
    const mapContainer = ref<HTMLDivElement | null>(null);
    const drawerRef = ref<HTMLDivElement | null>(null);
    /** 右侧抽屉（地图点击打开） */
    const drawerVisible = ref(false);
    const activeTab = ref<DrawerTabKey>('physical');
    const previewVisible = ref(false);
    /** 左侧抽屉收起后，显示左上角展开按钮 */
    const expandVisible = ref(false);
    /** 左侧抽屉收起前的原始宽度，展开动画恢复用 */
    let drawerWidth = 0;
    let map: MapLibreMap | null = null;

    /** 点击红色方块：左侧抽屉容器宽度收缩并渐隐，动画结束后彻底隐藏，并显示展开按钮 */
    const hideDrawer = () => {
      const el = drawerRef.value;
      if (!el) return;
      drawerWidth = el.offsetWidth;
      animate(
        el,
        { width: [drawerWidth, 0], opacity: [1, 0] },
        {
          duration: 0.3,
          ease: 'easeInOut',
          onComplete: () => {
            el.style.display = 'none';
            el.style.width = '';
            expandVisible.value = true;
          },
        },
      );
    };

    /** 点击展开按钮：抽屉宽度从 0 恢复到原宽，同时隐藏自身 */
    const showDrawer = () => {
      const el = drawerRef.value;
      if (!el) return;
      expandVisible.value = false;
      el.style.display = '';
      el.style.width = '0px';
      animate(
        el,
        { width: [0, drawerWidth], opacity: [0, 1] },
        {
          duration: 0.3,
          ease: 'easeInOut',
          onComplete: () => {
            el.style.width = '';
          },
        },
      );
    };

    onMounted(() => {
      if (!mapContainer.value) return;

      map = new MapLibreMap({
        container: mapContainer.value,
        style: tiandituStyle,
        center: [114.305, 30.593], // 武汉
        zoom: 11,
      });

      // 右下角控件（水平排列见 map.css）
      map.addControl(new NavigationControl({ visualizePitch: true }), 'bottom-right');
      map.addControl(new GeolocateControl({ trackUserLocation: true }), 'bottom-right');
      map.addControl(new FullscreenControl(), 'bottom-right');
      map.addControl(new ScaleControl({ unit: 'metric' }), 'bottom-right');

      // 点击地图 → 右侧弹出 drawer
      map.on('click', () => {
        drawerVisible.value = true;
      });
    });

    onUnmounted(() => {
      map?.remove();
      map = null;
    });

    return () => (
      <>
        {/* 左侧抽屉：与地图平级，向左移动渐隐（motion-v 动画） */}
        <div
          ref={(el) => {
            drawerRef.value = el as HTMLDivElement | null;
          }}
          class="relative h-full"
        >
          <img src={LEFT_DRAWER_IMAGE_URL} alt="左侧抽屉" class="h-full object-fill" />

          <div
            class="absolute bg-transparent top-36px right-24px size-40px z-100 cursor-pointer"
            onClick={hideDrawer}
          />
        </div>

        <div class="size-full relative">
          <div
            ref={(el) => {
              mapContainer.value = el as HTMLDivElement | null;
            }}
            class="map-custom-controls h-full w-full relative"
          />

          {expandVisible.value && (
            <img
              src={expandBtnImg}
              alt=""
              class="absolute top-32px left-32px size-40px z-50 cursor-pointer"
              onClick={showDrawer}
            />
          )}
        </div>

        {/* 右侧 Drawer：地图点击打开，Tab 切换内容 */}
        <div
          class={
            'fixed top-88px right-0 bottom-0 z-[60] flex w-420px flex-col bg-[#0f2b47] text-white shadow-2xl transition-transform duration-300 ' +
            (drawerVisible.value ? 'translate-x-0' : 'translate-x-full')
          }
        >
          {/* 顶部 Tab 切换器（5 等分胶囊样式） */}
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

        {/* 预览 Modal：体检情况 / 功能策划 点击图片弹出 */}
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
      </>
    );
  },
});
