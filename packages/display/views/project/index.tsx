import { defineComponent, onMounted, onUnmounted, ref } from 'vue';
import './map.css';

/** 天地图 token（web/.env 配置） */
const TIANDITU_TOKEN = import.meta.env.VITE_TIANDITU_TOKEN;

/**
 * 天地图瓦片地址生成器（DataServer REST 接口，CGCS2000 经纬度 _c 系列，EPSG:4490）
 * 配合 Map 的 crs: 'EPSG:4490' 使用；layer 传 'vec_c'/'cva_c'
 */
function tiandituTiles(layer: string): string {
  return `https://t0.tianditu.gov.cn/DataServer?T=${layer}&X={x}&Y={y}&L={z}&tk=${TIANDITU_TOKEN}`;
}

/** 内容图片地址 */
const BASE_IMAGE_URL =
  'https://zhugengju-public.oss-cn-wuhan-lr.aliyuncs.com/%E9%A1%B9%E7%9B%AE%E5%AE%9E%E6%96%BD/%E9%A1%B9%E7%9B%AE%E5%9F%BA%E6%9C%AC%E4%BF%A1%E6%81%AFcontent.webp';
const RENOVATION_IMAGE_URL =
  'https://zhugengju-public.oss-cn-wuhan-lr.aliyuncs.com/%E9%A1%B9%E7%9B%AE%E5%AE%9E%E6%96%BD/%E9%A1%B9%E7%9B%AE%E6%94%B9%E9%80%A0%E6%83%85%E5%86%B5content.webp';

/** 天地图底图：矢量底图 + 中文注记叠加 */
const tiandituStyle: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'tianditu-vec': {
      type: 'raster',
      tiles: [tiandituTiles('vec_c')],
      tileSize: 256,
      maxzoom: 18,
    },
    'tianditu-cva': {
      type: 'raster',
      tiles: [tiandituTiles('cva_c')],
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
  name: 'DisplayProject',
  setup() {
    const activeTab = ref<'base' | 'renovation'>('base');
    const mapContainer = ref<HTMLDivElement | null>(null);
    const previewVisible = ref(false);
    let map: maplibregl.Map | null = null;

    onMounted(() => {
      if (!mapContainer.value) return;

      map = new maplibregl.Map({
        container: mapContainer.value,
        style: tiandituStyle,
        // 天地图 _c 系列瓦片为 CGCS2000 经纬度坐标系，地图 CRS 同步切换为 EPSG:4490
        crs: 'EPSG:4490',
        center: [116.391, 39.904],
        zoom: 11,
      });

      map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');
      map.addControl(new maplibregl.GeolocateControl({ trackUserLocation: true }), 'bottom-right');
      map.addControl(new maplibregl.FullscreenControl(), 'bottom-right');
      map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-right');
    });

    onUnmounted(() => {
      map?.remove();
      map = null;
    });

    return () => {
      const isBase = activeTab.value === 'base';

      return (
        <div class="relative h-full w-full">
          {/* 地图底层（与 scheme 一致的容器结构） */}
          <div
            ref={(el) => {
              mapContainer.value = el as HTMLDivElement | null;
            }}
            class="map-custom-controls h-full w-full"
          />

          {/* Tab 切换器 + 内容区（浮在地图上方右上角，宽度一致） */}
          <div class="absolute top-24px right-24px z-10 w-420px">
            <div class="flex h-52px rounded-full bg-[#1a3a5c] p-4px">
              <div
                class={
                  'flex h-full flex-1 cursor-pointer items-center justify-center rounded-full text-14px text-white transition-all duration-200 ' +
                  (isBase
                    ? 'bg-gradient-to-r from-[#0ea5e9]/20 to-[#0E83BD] font-500 shadow-lg'
                    : 'text-white/60 hover:text-white')
                }
                onClick={() => (activeTab.value = 'base')}
              >
                项目基本信息
              </div>
              <div
                class={
                  'flex h-full flex-1 cursor-pointer items-center justify-center rounded-full text-14px text-white transition-all duration-200 ' +
                  (!isBase
                    ? 'bg-gradient-to-r from-[#0ea5e9]/20 to-[#0E83BD] font-500 shadow-lg'
                    : 'text-white/60 hover:text-white')
                }
                onClick={() => (activeTab.value = 'renovation')}
              >
                项目改造情况
              </div>
            </div>

            {/* 内容区：与 tab 同宽，位于 tab 下方 */}
            <div class="scrollbar-none mt-6px max-h-[calc(100vh_-_246px)] overflow-y-auto">
              {isBase ? (
                <img
                  src={BASE_IMAGE_URL}
                  alt="项目基本信息"
                  class="w-full cursor-pointer rounded-xl"
                  // onClick={() => (previewVisible.value = true)}
                />
              ) : (
                <img
                  src={RENOVATION_IMAGE_URL}
                  alt="项目改造情况"
                  class="w-full cursor-pointer rounded-xl"
                  onClick={() => (previewVisible.value = true)}
                />
              )}
            </div>
          </div>

          {/* 图片预览 Modal：点击图片弹出，居中显示（长 776 宽 548） */}
          {previewVisible.value && (
            <div
              class="fixed inset-0 z-50 flex items-center justify-center"
              onClick={() => (previewVisible.value = false)}
            >
              <img
                src="https://zhugengju-public.oss-cn-wuhan-lr.aliyuncs.com/%E9%A1%B9%E7%9B%AE%E5%AE%9E%E6%96%BD/%E6%A1%86.webp"
                alt="图片预览"
                class="w-776px h-548px bg-cover"
              />
            </div>
          )}
        </div>
      );
    };
  },
});
