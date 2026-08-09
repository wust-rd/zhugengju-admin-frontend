import expandBtnImg from '@jeesite/assets/images/display/expand-btn.webp';
import { MapControls } from '@jeesite/display/components/map-controls';
import { animate } from 'motion-v';
import { defineComponent, ref, watch } from 'vue';
/** 真实范围线（area）与项目地块（project）数据，?url 导入 + 运行时 fetch，不打进 bundle */
import { colors } from '@jeesite/core/libs/colors';
import { LayerControls } from '@jeesite/display/components/layer-controls';
import areaUrl from '@jeesite/display/data/area_merged_all.geojson?url';
import projectUrl from '@jeesite/display/data/project_merged_all.geojson?url';
import zhiyinUrl from '@jeesite/display/data/zhiyin.geojson?url';
import { RouterLink } from 'vue-router';
import { cn } from '@jeesite/core/libs';

/** 天地图子域名列表（t0~t7，多域名并行请求，突破浏览器并发限制） */
const TIANDITU_SUBDOMAINS = ['0', '1', '2', '3', '4', '5', '6', '7'];

/**
 * 构建天地图瓦片 URL 数组（DataServer REST 接口，CGCS2000 经纬度 _c 系列，EPSG:4490）
 * 配合 Map 的 crs: 'EPSG:4490' 使用；layer 传 'vec_c'/'cva_c'
 */
function tiandituTileUrls(layer: string): string[] {
  return TIANDITU_SUBDOMAINS.map(
    (s) =>
      `https://t${s}.tianditu.gov.cn/DataServer?T=${layer}&X={x}&Y={y}&L={z}&tk=${import.meta.env.VITE_TIANDITU_TOKEN}`,
  );
}

/** OSS 图片基础地址 */
const OSS_BASE = 'https://zhugengju-public.oss-cn-wuhan-lr.aliyuncs.com/片区策划';

/** 知音片区金字塔图片（OSS 外链） */
const ZHIYIN_IMG = `${OSS_BASE}/金字塔.webp`;

// 片区概况
const PIANQU_IMG = `${OSS_BASE}/片区概况.webp`;

/** 天地图底图：矢量底图 + 中文注记叠加 */
const tiandituStyle: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'tianditu-vec': {
      type: 'raster',
      tiles: tiandituTileUrls('vec_c'),
      tileSize: 256,
      minzoom: 2,
      maxzoom: 18,
    },
    'tianditu-cva': {
      type: 'raster',
      tiles: tiandituTileUrls('cva_c'),
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
    /** Map 实例（供右下角自绘控件条 MapControls 使用） */
    const mapInstance = ref<maplibregl.Map | null>(null);
    const mapContainer = ref<HTMLDivElement | null>(null);
    const drawerRef = ref<HTMLDivElement | null>(null);
    /** 右侧抽屉（地图点击打开） */
    const drawerVisible = ref(false);
    const previewVisible = ref(false);
    /** 项目 tab 三个按钮点击后弹出的图片地址 */
    const projectPreviewSrc = ref('');
    /** 左侧抽屉收起后，显示左上角展开按钮 */
    const expandVisible = ref(false);
    /** 左侧抽屉收起前的原始宽度，展开动画恢复用 */
    let drawerWidth = 0;

    /** 关闭预览弹窗 */
    const closePreview = () => {
      previewVisible.value = false;
      projectPreviewSrc.value = '';
    };

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

        // 组件卸载时置为 true，防止异步 fetch 完成后向已销毁的地图添加图层
        let disposed = false;

        const map = new maplibregl.Map({
          container: el,
          style: tiandituStyle,
          // 天地图 _c 系列瓦片为 CGCS2000 经纬度坐标系，地图 CRS 同步切换为 EPSG:4490
          crs: 'EPSG:4490',
          center: [114.386, 30.73], // 数据范围中心（武汉）
          zoom: 10,
        });
        mapInstance.value = map;

        // 右下角由自绘控件条 MapControls 接管（罗盘 / 2D-3D / 缩放），官方导航控件不再添加
        // 比例尺保留，放左下角
        map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');

        // 知音地块金字塔 Marker（单实例）：点击地块显示，点击其他处移除
        let zhiyinMarker: maplibregl.Marker | null = null;
        const hideZhiyinMarker = () => {
          zhiyinMarker?.remove();
          zhiyinMarker = null;
        };
        const showZhiyinMarker = (lngLat: maplibregl.LngLat) => {
          hideZhiyinMarker();
          const el = document.createElement('div');
          el.className = 'cursor-pointer';
          el.innerHTML = `
            <img class="block w-365px h-260px object-cover" src="${ZHIYIN_IMG}" alt="知音片区" />
          `;
          el.addEventListener('click', () => hideZhiyinMarker());
          zhiyinMarker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
            .setLngLat(lngLat)
            .setOffset([160, 0])
            .addTo(map);
        };

        // 点击地图：命中知音地块 → 显示金字塔 Marker；否则移除 Marker 并打开右侧抽屉
        map.on('click', (e) => {
          const hit = map.queryRenderedFeatures(e.point, { layers: ['zhiyin-fill'] }).length > 0;
          if (hit) {
            showZhiyinMarker(e.lngLat);
            drawerVisible.value = true;
            return;
          }
          hideZhiyinMarker();
          drawerVisible.value = false;
        });

        // 片区多边形 fill 图层（品红）：样式加载完成后动态添加
        map.once('load', () => {
          // 范围线 line 图层（浅灰 3px）：从 area_merged_all.geojson 异步加载
          fetch(areaUrl)
            .then((res) => res.json())
            .then((data) => {
              if (disposed || map.getSource('area-lines')) return;
              map.addSource('area-lines', { type: 'geojson', data });
              map.addLayer({
                id: 'area-lines',
                type: 'line',
                source: 'area-lines',
                paint: {
                  'line-color': colors.stone[400],
                  'line-width': 4,
                },
              });
            })
            .catch(() => {});

          // 项目地块 fill 图层（BATCH：第一批紫 / 第二批深蓝）：从 project_merged_all.geojson 异步加载
          fetch(projectUrl)
            .then((res) => res.json())
            .then((data) => {
              if (disposed || map.getSource('project-fills')) return;
              map.addSource('project-fills', { type: 'geojson', data });
              map.addLayer({
                id: 'project-fills',
                type: 'fill',
                source: 'project-fills',
                paint: {
                  'fill-color': ['match', ['get', 'BATCH'], '第一批', '#773ceb', '第二批', '#3a86ec', '#A855F7'],
                  'fill-opacity': 0.8,
                },
              });
            })
            .catch(() => {});

          // 知音项目地块 fill 图层（红色）：从 zhiyin.geojson 异步加载
          fetch(zhiyinUrl)
            .then((res) => res.json())
            .then((data) => {
              if (disposed || map.getSource('zhiyin-fill')) return;
              map.addSource('zhiyin-fill', { type: 'geojson', data });
              map.addLayer({
                id: 'zhiyin-fill',
                type: 'fill',
                source: 'zhiyin-fill',
                paint: {
                  'fill-color': '#ff2d2d',
                  'fill-opacity': 0.6,
                },
              });
            })
            .catch(() => {});
        });

        onCleanup(() => {
          hideZhiyinMarker();
          disposed = true;
          mapInstance.value = null;
          map.remove();
        });
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
          <img src={`${OSS_BASE}/片区策划-左侧抽屉.webp`} alt="左侧抽屉" class="h-full object-fill" />

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

          {/* 地图控件条：右下角（罗盘重置方位 / 2D-3D 切换 / 缩放） */}
          <div class="absolute right-24px bottom-24px z-10">
            <MapControls map={mapInstance.value} />
          </div>

          {expandVisible.value && (
            <img
              src={expandBtnImg}
              alt=""
              class="absolute top-32px left-32px size-40px z-50 cursor-pointer"
              onClick={showDrawer}
            />
          )}

          {/* 图层管理器：左上角胶囊按钮，left 随左侧抽屉展开状态切换（组件已提取） */}
          <LayerControls
            class={{
              'left-80px': expandVisible.value,
              'left-32px': !expandVisible.value,
            }}
          />
        </div>

        {/* 右侧 Drawer：地图点击打开，Tab 切换内容；显示时从右往左平移渐显，隐藏时向右移出并淡出 */}
        <div
          class={cn('fixed top-100px right-12px z-50 transition-[transform,opacity] duration-200', {
            'opacity-100': drawerVisible.value,
            'opacity-0': !drawerVisible.value,
          })}
        >
          <RouterLink to="scheme/detail">
            <img src={PIANQU_IMG} class="w-320px h-800px object-fill" />
          </RouterLink>
        </div>
      </>
    );
  },
});
