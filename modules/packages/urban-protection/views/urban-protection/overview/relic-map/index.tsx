import { cn } from '@jeesite/core/libs';
import { DisplayPageLayout } from '@jeesite/display/components/page-layout';
import { useMap, useMapLayer, VMap, VMapControls, VMarker, VMarkerContent } from '@jeesite/vmap';
import { computed, defineComponent, onBeforeUnmount, onMounted, ref, shallowRef, watch, type PropType } from 'vue';
import {
  RELIC_CATEGORIES,
  RELIC_LEVELS,
  loadRelics,
  relicLevelOf,
  type Relic,
} from '@jeesite/urban-protection/api/urban-protection/relic';
import { RelicCard } from './relic-card';
import { useAppStore } from '@jeesite/core/store/modules/app';

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

/** 各级别点位尺寸（国家级最大、市级最小，一眼可分） */
const LEVEL_DOT_SIZE: Record<string, string> = {
  [RELIC_LEVELS[0].value]: 'size-20px',
  [RELIC_LEVELS[1].value]: 'size-15px',
};
const DEFAULT_DOT_SIZE = 'size-12px';

/**
 * 地图逻辑子组件（纯逻辑，不渲染 DOM）：
 * 必须在 <VMap> 插槽内使用 —— useMap() 依赖 VMap 注入的地图上下文。
 * - 数据就绪后首次 fitBounds 到全部文物坐标范围；
 * - 点击地图空白处 → 通知父级关闭文物信息卡片。
 */
const RelicMapLogic = defineComponent({
  name: 'RelicMapLogic',

  props: {
    relics: { type: Array as PropType<Relic[]>, default: () => [] },
  },

  emits: {
    mapClick: () => true,
  },

  setup(props, { emit }) {
    const { map, isLoaded } = useMap();

    /** 仅在数据首次就绪时缩放到数据范围，此后不再打断用户交互 */
    let fitted = false;

    // 点击地图空白处：关闭右侧信息卡片。
    // Marker / 控件是地图容器内的 DOM，click 会冒泡到容器再触发 map click，
    // 需按事件源过滤，否则点击文物点位会先选中、又被这里立即关闭。
    useMapLayer(map, isLoaded, (m) => {
      const onClick = (e: maplibregl.MapMouseEvent) => {
        const target = e.originalEvent.target as Element | null;
        if (target?.closest?.('.maplibregl-marker, .maplibregl-ctrl')) return;
        emit('mapClick');
      };
      m.on('click', onClick);
      return () => m.off('click', onClick);
    });

    // 数据 / 地图任一就绪即尝试 fitBounds（两个都是异步完成，先后不定）
    watch(
      [() => props.relics, map, isLoaded],
      () => {
        if (fitted || props.relics.length === 0) return;
        const m = map.value;
        if (!m || !isLoaded.value) return;
        fitted = true;

        let minLng = Infinity;
        let maxLng = -Infinity;
        let minLat = Infinity;
        let maxLat = -Infinity;
        for (const { lng, lat } of props.relics) {
          if (lng < minLng) minLng = lng;
          if (lng > maxLng) maxLng = lng;
          if (lat < minLat) minLat = lat;
          if (lat > maxLat) maxLat = lat;
        }
        m.fitBounds(
          [
            [minLng, minLat],
            [maxLng, maxLat],
          ],
          { padding: 80, duration: 0 },
        );
      },
      { immediate: true },
    );

    return () => null;
  },
});

export default defineComponent({
  name: 'ViewsUrbanProtectionRelicMap',

  setup() {
    const appStore = useAppStore();
    // 沉浸式全屏：进入时隐藏顶部标签栏、去掉内容区 padding，让页面占据整个屏幕（保留侧边菜单）
    appStore.setImmersive(true);
    // 离开时恢复，避免影响其它页面
    onBeforeUnmount(() => {
      appStore.setImmersive(false);
    });

    /** 文物清单（本地 JSON 加载，接入接口后替换 loadRelics 即可） */
    const relics = shallowRef<Relic[]>([]);
    onMounted(async () => {
      relics.value = await loadRelics();
    });

    // ---- 筛选（'all' 表示不过滤） ----
    const levelKey = ref('all');
    const categoryKey = ref('all');
    const levelItems = [
      { key: 'all', label: '全部级别' },
      ...RELIC_LEVELS.map((l) => ({ key: l.value, label: l.label })),
    ];
    const categoryItems = [{ key: 'all', label: '全部分类' }, ...RELIC_CATEGORIES.map((c) => ({ key: c, label: c }))];

    /** 筛选后的文物点位（只影响地图 Marker 与图例计数） */
    const filteredRelics = computed(() =>
      relics.value.filter(
        (r) =>
          (levelKey.value === 'all' || r.level === levelKey.value) &&
          (categoryKey.value === 'all' || r.category === categoryKey.value),
      ),
    );

    /** 当前选中文物：点击地图点位设置，展示右侧信息卡片 */
    const selected = shallowRef<Relic | null>(null);

    /** 天地图原生构造选项（_c 系列瓦片为 CGCS2000 经纬度坐标系，CRS 切 EPSG:4490） */
    const mapOptions: Partial<maplibregl.MapOptions> = {
      crs: 'EPSG:4490',
      center: [114.35, 30.61] as [number, number], // 初始中心（数据就绪后 fitBounds 到全量范围）
      zoom: 9,
    };

    /** 图例各级别计数（随筛选联动） */
    const legendRows = computed(() =>
      RELIC_LEVELS.map((level) => ({
        ...level,
        count: filteredRelics.value.filter((r) => r.level === level.value).length,
      })),
    );

    return () => (
      <div class="relative flex size-full overflow-hidden">
        {/* 地图：VMap 组件内部创建/销毁 MapLibre 实例，crs/center/zoom 走 options prop */}
        <VMap style={tiandituStyle} options={mapOptions}>
          <VMapControls class="absolute right-24px bottom-24px z-10" />

          <RelicMapLogic relics={relics.value} onMapClick={() => (selected.value = null)} />

          {/* 文物点位：级别决定颜色与尺寸，悬停显示名称，点击弹出右侧信息卡片 */}
          {filteredRelics.value.map((relic) => {
            const level = relicLevelOf(relic.level);
            return (
              <VMarker
                key={relic.id}
                longitude={relic.lng}
                latitude={relic.lat}
                onClick={() => {
                  selected.value = relic;
                }}
              >
                <VMarkerContent>
                  <div class="group relative">
                    <div
                      class={cn(
                        'rd-full border-2 border-white/90 transition-transform group-hover:scale-125',
                        LEVEL_DOT_SIZE[relic.level] ?? DEFAULT_DOT_SIZE,
                      )}
                      style={{ background: level.color, boxShadow: `0 0 8px ${level.color}99` }}
                    />

                    <div class="pointer-events-none absolute left-1/2 top-full mt-4px -translate-x-1/2 rd-4px bg-[#0f2b47]/90 px-8px py-2px text-12px whitespace-nowrap text-white opacity-0 transition-opacity group-hover:opacity-100">
                      {relic.name}
                    </div>
                  </div>
                </VMarkerContent>
              </VMarker>
            );
          })}
        </VMap>

        {/* 图例：级别颜色 + 当前筛选计数 */}
        <div class="absolute bottom-24px left-24px z-10 min-w-150px rd-8px border border-cyan-900 bg-[#0f2b47]/85 px-14px py-10px backdrop-blur">
          <div class="text-12px text-white/45">文物分布</div>

          <div class="mt-8px space-y-6px">
            {legendRows.value.map((row) => (
              <div class="flex items-center text-13px">
                <div class="size-8px rd-full" style={{ background: row.color }} />
                <div class="ml-8px text-white/70">{row.label}文物保护单位</div>
                <div class="ml-auto font-500 text-white">{row.count}</div>
              </div>
            ))}
          </div>

          <div class="mt-8px flex items-center justify-between border-t border-white/10 pt-8px text-13px">
            <span class="text-white/45">当前筛选</span>
            <span class="font-500 text-white">{filteredRelics.value.length} 处</span>
          </div>
        </div>
        {/* 右侧文物信息卡片：点击地图点位弹出，点击空白处/关闭按钮收起 */}
        <RelicCard relic={selected.value} onClose={() => (selected.value = null)} />
      </div>
    );
  },
});
