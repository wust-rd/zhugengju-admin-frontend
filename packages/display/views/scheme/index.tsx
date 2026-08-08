import { computed, defineComponent, ref, watch } from 'vue';
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

/** 天地图子域名列表（t0~t7，多域名并行请求，突破浏览器并发限制） */
const TIANDITU_SUBDOMAINS = ['0', '1', '2', '3', '4', '5', '6', '7'];

/** 构建天地图瓦片 URL 数组（DataServer REST 接口，EPSG:3857，token 来自 web/.env） */
function tiandituTileUrls(layer: string): string[] {
  return TIANDITU_SUBDOMAINS.map(
    (s) =>
      `https://t${s}.tianditu.gov.cn/DataServer?T=${layer}&X={x}&Y={y}&L={z}&tk=${import.meta.env.VITE_TIANDITU_TOKEN}`,
  );
}

/** OSS 图片基础地址 */
const OSS_BASE = 'https://zhugengju-public.oss-cn-wuhan-lr.aliyuncs.com/片区策划/';

/** 抽屉 Tab 配置：label + 内容图片 + 弹窗预览图（preview 为空表示不可点击预览） */
const DRAWER_TABS = [
  { key: 'basic', label: '基本情况', image: `${OSS_BASE}基本情况.webp`, preview: '' },
  { key: 'physical', label: '体检情况', image: `${OSS_BASE}体检情况.webp`, preview: `${OSS_BASE}片区策划图册.webp` },
  { key: 'planning', label: '功能策划', image: `${OSS_BASE}功能策划.webp`, preview: `${OSS_BASE}片区策划图册.webp` },
  { key: 'project', label: '项目情况', image: `${OSS_BASE}项目情况.webp`, preview: `${OSS_BASE}片区项目清单.webp` },
  { key: 'evaluation', label: '实施后评估', image: `${OSS_BASE}实施后评估.webp`, preview: `${OSS_BASE}实施后评估-相册.webp` },
] as const;
type DrawerTabKey = (typeof DRAWER_TABS)[number]['key'];

/** 天地图底图：矢量底图 + 中文注记叠加 */
const tiandituStyle: StyleSpecification = {
  version: 8,
  sources: {
    'tianditu-vec': {
      type: 'raster',
      tiles: tiandituTileUrls('vec_w'),
      tileSize: 256,
      minzoom: 2,
      maxzoom: 18,
    },
    'tianditu-cva': {
      type: 'raster',
      tiles: tiandituTileUrls('cva_w'),
      tileSize: 256,
      minzoom: 2,
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
    const drawerRef = ref<HTMLDivElement | null>(null);
    /** 右侧抽屉（地图点击打开） */
    const drawerVisible = ref(false);
    const activeTab = ref<DrawerTabKey>('physical');
    const previewVisible = ref(false);
    /** 左侧抽屉收起后，显示左上角展开按钮 */
    const expandVisible = ref(false);
    /** 左侧抽屉收起前的原始宽度，展开动画恢复用 */
    let drawerWidth = 0;

    /** 当前 Tab 配置（含内容图与预览图），单一数据源派生，避免重复查找 */
    const activeTabConfig = computed(
      () => DRAWER_TABS.find((t) => t.key === activeTab.value) ?? DRAWER_TABS[0],
    );

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

    // 地图生命周期高内聚：容器挂载后初始化，组件卸载时自动清理
    watch(
      mapContainer,
      (el, _, onCleanup) => {
        if (!el) return;

        const map = new MapLibreMap({
          container: el,
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

        onCleanup(() => map.remove());
      },
      { immediate: true },
    );

    return () => (
      <>
        {/* 左侧抽屉：与地图平级，向左移动渐隐（motion-v 动画） */}
        <div
          ref={(el) => {
            drawerRef.value = el as HTMLDivElement | null;
          }}
          class="relative h-full"
        >
          <img
            src={`${OSS_BASE}片区策划-左侧抽屉.webp`}
            alt="左侧抽屉"
            class="h-full object-fill"
          />

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

          {/* 内容区：每个 tab 显示一张图片（有 preview 配置的 tab 可点击预览） */}
          <div class="scrollbar-none flex-1 overflow-y-auto">
            <img
              src={activeTabConfig.value.image}
              alt={activeTabConfig.value.label}
              class={'w-full rounded-lg ' + (activeTabConfig.value.preview ? 'cursor-pointer' : '')}
              onClick={() => {
                if (activeTabConfig.value.preview) {
                  previewVisible.value = true;
                }
              }}
            />
          </div>
        </div>

        {/* 预览 Modal：有 preview 配置的 tab 点击图片弹出 */}
        {previewVisible.value && activeTabConfig.value.preview && (
          <div
            class="fixed inset-0 z-[70] flex items-center justify-center bg-black/60"
            onClick={() => (previewVisible.value = false)}
          >
            <img
              src={activeTabConfig.value.preview}
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
