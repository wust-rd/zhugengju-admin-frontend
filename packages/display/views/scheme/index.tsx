import expandBtnImg from '@jeesite/assets/images/display/expand-btn.webp';
import { MapControls } from '@jeesite/display/components/map-controls';
import { animate } from 'motion-v';
import { computed, defineComponent, ref, shallowRef, watch } from 'vue';
/** 片区面（area）与知音地块（zhiyin）数据，?url 导入 + 运行时 fetch，不打进 bundle */
import { colors } from '@jeesite/core/libs/colors';
import { LayerControls } from '@jeesite/display/components/layer-controls';
import areaUrl from '@jeesite/display/data/area_merged_all.geojson?url';
import zhiyinUrl from '@jeesite/display/data/zhiyin.geojson?url';
import { RouterLink, useRouter } from 'vue-router';
import { cn } from '@jeesite/core/libs';
import { SchemeLeftDrawer } from './left-drawer';
import { RightDrawer } from './right-drawer';
import {
  AreaOverviewModal,
  defaultInfoValue,
  type AreaOverviewInfo,
  type AreaOverviewStat,
} from './area-overview-modal';

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

// 知音片区点击弹出的片区概况图（OSS 外链）
const PIANQU_IMG = `${OSS_BASE}/片区概况.webp`;

/** 片区面配色：第一批紫（violet-600）/ 第二批蓝（blue-500）；
 *  边框取同色系加深两档（violet-800 / blue-700），相邻片区面之间才分得清 */
const AREA_COLORS: Record<'第一批' | '第二批', { fill: string; line: string }> = {
  第一批: { fill: colors.violet[600], line: colors.violet[800] },
  第二批: { fill: colors.blue[500], line: colors.blue[700] },
};

/** BATCH 字段取值异常时的兜底色（正常数据只有第一批/第二批，用不到） */
const AREA_FALLBACK_COLOR = colors.stone[400];

/** 属性值 → 展示文本（空值统一显示「—」） */
const text = (v: unknown): string => String(v ?? '').trim() || '—';

/** 导向维度缩写（与左侧看板功能定位统计同一套口径） */
const FUNC_KEYS = ['TOD', 'EOD', 'IOD', 'SOD', 'COD', 'HOD'];

/** FUNC_TYPE 原文 → 命中的导向缩写数组（可多命中；未命中返回空数组，卡片不渲染胶囊） */
function funcBadges(funcType: unknown): string[] {
  const t = String(funcType ?? '').toUpperCase();
  return FUNC_KEYS.filter((k) => t.includes(k));
}

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
    const router = useRouter();

    /** Map 实例（供右下角自绘控件条 MapControls 使用） */
    const mapInstance = shallowRef<maplibregl.Map | null>(null);
    const mapContainer = ref<HTMLDivElement | null>(null);
    const drawerRef = ref<HTMLDivElement | null>(null);
    /** 右侧抽屉（地图点击打开） */
    const drawerVisible = ref(false);
    /** 地图上点中的片区要素属性（null = 未选中，右上角概况卡片不显示） */
    const activeArea = ref<Recordable | null>(null);
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
          center: [114.2761773, 30.5344542], // 数据范围中心（武汉）
          zoom: 11,
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

        // 点击地图：
        //  1) 命中知音地块 → 显示金字塔 Marker + 打开右侧图片抽屉
        //  2) 命中片区面 → 把该片区的属性交给右上角「片区概况」卡片展示；点空白处清空卡片
        map.on('click', (e) => {
          // queryRenderedFeatures 传不存在的图层 id 会抛错：图层是异步加载的，先判存在
          const hitZhiyin =
            map.getLayer('zhiyin-fill') && map.queryRenderedFeatures(e.point, { layers: ['zhiyin-fill'] }).length > 0;
          if (hitZhiyin) {
            showZhiyinMarker(e.lngLat);
            drawerVisible.value = true;
          } else {
            hideZhiyinMarker();
            drawerVisible.value = false;
          }

          const hitArea = map.getLayer('area-fills') && map.queryRenderedFeatures(e.point, { layers: ['area-fills'] });
          activeArea.value = (hitArea && hitArea[0] ? (hitArea[0].properties as Recordable) : null) ?? null;
        });

        // 片区面（area_merged_all）与知音地块（zhiyin）图层：样式加载完成后动态添加
        map.once('load', () => {
          // 片区面图层：从 area_merged_all.geojson 异步加载，按 BATCH 上色（第一批紫 / 第二批蓝）
          fetch(areaUrl)
            .then((res) => res.json())
            .then((data) => {
              if (disposed || map.getSource('area-faces')) return;
              map.addSource('area-faces', { type: 'geojson', data });

              // 面：fill 铺色（半透明，底图路网仍可见）
              map.addLayer({
                id: 'area-fills',
                type: 'fill',
                source: 'area-faces',
                paint: {
                  'fill-color': [
                    'match',
                    ['get', 'BATCH'],
                    '第一批',
                    AREA_COLORS.第一批.fill,
                    '第二批',
                    AREA_COLORS.第二批.fill,
                    AREA_FALLBACK_COLOR,
                  ],
                  'fill-opacity': 0.75,
                },
              });

              // 边框：同源 line 图层，同色系加深色描边（后添加 → 压在上一个 fill 之上）
              map.addLayer({
                id: 'area-outlines',
                type: 'line',
                source: 'area-faces',
                paint: {
                  'line-color': [
                    'match',
                    ['get', 'BATCH'],
                    '第一批',
                    AREA_COLORS.第一批.line,
                    '第二批',
                    AREA_COLORS.第二批.line,
                    AREA_FALLBACK_COLOR,
                  ],
                  'line-width': 1.5,
                },
              });
            })
            .catch(() => {});

          // 知音项目地块 fill 图层（红色）：从 zhiyin.geojson 异步加载；
          // 点击该面显示金字塔 Marker 并打开右侧抽屉（见上方 map.on('click') 的 zhiyin-fill 命中判断）
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
              // 两个 geojson 各自异步 fetch，完成顺序不确定；显式置顶，
              // 保证知音红面始终压在片区面之上（否则会被 0.75 透明度的片区面色盖住）
              map.moveLayer('zhiyin-fill');
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

    /** 概况卡片 · 顶部统计：片区名称 / 规模 / 所属批次（随点中的片区要素变化） */
    const areaStats = computed<AreaOverviewStat[]>(() => {
      const a = activeArea.value;
      if (!a) return [];
      const ha = Number(a.AREA_HA);
      return [
        { label: '片区名称', value: text(a.AREA_NAME) },
        { label: '片区规模', value: Number.isFinite(ha) && ha > 0 ? `${ha.toFixed(2)} 公顷` : '—' },
        { label: '所属批次', value: text(a.BATCH), tag: true },
      ];
    });

    /** 概况卡片 · 详细信息：区位 / 责任主体 / 实施时间 / 功能定位（随点中的片区要素变化） */
    const areaInfos = computed<AreaOverviewInfo[]>(() => {
      const a = activeArea.value;
      if (!a) return [];
      const start = text(a.START_DATE);
      const end = text(a.END_DATE);
      return [
        { label: '所在区位', value: text(a.DIST) },
        // { label: '责任主体', value: text(a.RESP_BODY) },
        // 四至范围：geojson 里暂无该字段（RANGE），有值就用值，没有则回退到组件内置的默认值
        { label: '四至范围', value: a.RANGE ? text(a.RANGE) : defaultInfoValue('四至范围') },
        { label: '实施时间', value: start === '—' && end === '—' ? '—' : `${start} 至 ${end}` },
        // FUNC_TYPE 原始文本较脏（含换行），展示前压掉空白；徽章取命中的导向缩写
        { label: '功能定位', value: text(a.FUNC_TYPE).replace(/\s+/g, ''), badges: funcBadges(a.FUNC_TYPE) },
      ];
    });

    return () => (
      <>
        {/* 左侧抽屉：与地图平级，向左移动渐隐（motion-v 动画）；
            面板内容为早期规划数据看板（SchemeLeftDrawer），头部收起按钮与下方热区都触发 hideDrawer */}
        <div
          ref={(el) => {
            drawerRef.value = el as HTMLDivElement | null;
          }}
          class="relative h-full shrink-0 overflow-hidden"
        >
          <SchemeLeftDrawer onToggle={hideDrawer} />

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

          {/* 片区概况卡片：点击地图上的片区面显示该片区信息（点地图空白处收起）
              卡片内展示的是 area_merged_all.geojson 的要素属性，改字段映射见 areaStats / areaInfos；
              「查看详情」跳到片区详情页（左大图 + 右真实抽屉） */}
          {activeArea.value && (
            <AreaOverviewModal
              stats={areaStats.value}
              infos={areaInfos.value}
              onDetail={() => router.push('/display/scheme/area-detail')}
            />
          )}

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

        {/* 右侧抽屉（真实组件）：常驻显示，占布局宽度、与左侧看板对称，
            不遮盖地图内容与右下角地图控件（RightDrawer 自身是 absolute right-0 top-0 + w-420px，
            所以用等尺寸的 relative 容器兜住它的尺寸） */}
        {/* <div class="relative h-full w-420px shrink-0">
          <RightDrawer />
        </div> */}

        {/* 知音片区保持原来那一套：点击地图上的知音红面弹出片区概况图抽屉
            （片区概况.webp，点击进入片区策划详情页）；显示时渐显，隐藏时淡出。
            注意：隐藏态只把 opacity 归零，元素本身仍在（fixed 320×800、z-50），
            必须同时加 pointer-events-none，否则这块透明区域会吃掉它下面所有点击
            （既会挡住右上角片区概况卡片，也会挡住地图那一片区域的交互） */}
        <div
          class={cn('fixed top-100px right-12px z-50 transition-[transform,opacity] duration-200', {
            'opacity-100': drawerVisible.value,
            'pointer-events-none opacity-0': !drawerVisible.value,
          })}
        >
          <RouterLink to="/display/scheme/detail">
            <img src={PIANQU_IMG} class="w-320px h-800px object-fill" />
          </RouterLink>
        </div>
      </>
    );
  },
});
