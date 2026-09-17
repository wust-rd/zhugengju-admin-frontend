/**
 * 更新片区地图图层（前期谋划 overview 右侧地图）：
 * 单 geojson source + 单 fill 图层，fill-color 用 match 表达式按着色维度取色——
 *  - district：按 BATCH（第一批紫 / 第二批蓝，兜底灰）
 *  - progress：按 AREA_COLOR（绿/黄/红，未标注灰）
 *  - func：按 FUNC_FIRST 派生属性（首个功能编码，统计图同色板，无编码灰）
 * 数据（父级筛选后要素）或维度变化 → setData / setPaintProperty 增量更新；
 * 左下角渲染当前维度图例。必须在 <VMap> 插槽内使用 —— useMap() 依赖 VMap 注入的地图上下文。
 */
import { useMap } from '@jeesite/vmap';
import { computed, defineComponent, onBeforeUnmount, type PropType } from 'vue';
import { watch } from 'vue';
import { colors } from '@jeesite/core/libs/colors';
import { FUNC_COLORS } from './func-type-chart';
import { PROGRESS_META } from './area-data';

/** 着色维度（与左侧三个统计 tab 一一对应） */
export type ColorBy = 'district' | 'progress' | 'func';

/** 兜底灰：批次异常 / 三色未标注 / 无功能编码 */
const GRAY = '#8B9CB0';

/** 行政区划维度：批次双色（图层与图例共用） */
const DISTRICT_COLOR: Record<string, string> = {
  第一批: colors.purple[600],
  第二批: colors.cyan[600],
};

/** 图例项 */
type LegendItem = { color: string; label: string };

/** 维度 → fill-color 的 match 表达式 + 图例项（键序即图例序） */
function schemeOf(colorBy: ColorBy): { expr: unknown[]; legend: LegendItem[] } {
  if (colorBy === 'district') {
    const entries = Object.entries(DISTRICT_COLOR);
    return {
      expr: ['match', ['get', 'BATCH'], ...entries.flat(), GRAY],
      legend: entries.map(([label, color]) => ({ color, label })),
    };
  }
  if (colorBy === 'progress') {
    return {
      expr: ['match', ['get', 'AREA_COLOR'], ...PROGRESS_META.map((m) => [m.key, m.color]).flat(), GRAY],
      legend: [...PROGRESS_META.map((m) => ({ color: m.color, label: m.name })), { color: GRAY, label: '未评定' }],
    };
  }
  const entries = Object.entries(FUNC_COLORS);
  return {
    expr: ['match', ['get', 'FUNC_FIRST'], ...entries.map(([k, v]) => [k, v.color]).flat(), GRAY],
    legend: entries.map(([k, v]) => ({ color: v.color, label: k === 'other' ? '其他' : k.toUpperCase() })),
  };
}

const SOURCE_ID = 'esp-areas';
const LAYER_ID = 'esp-areas-fill';

export const AreaLayers = defineComponent({
  name: 'EarlyStagePlanningAreaLayers',

  props: {
    /** 当前批次（筛选后）FeatureCollection；为 null 时不添加图层 */
    areas: { type: Object as PropType<Recordable | null>, default: null },
    /** 着色维度（district 按 BATCH / progress 按 AREA_COLOR / func 按首个功能编码） */
    colorBy: { type: String as PropType<ColorBy>, default: 'district' },
    /** 地图飞行令牌：父级图表筛选设置/取消时递增，变化后 fitBounds 到当前要素范围 */
    fitToken: { type: Number, default: 0 },
  },

  setup(props) {
    const { map, isLoaded } = useMap();

    /** 图例随维度切换 */
    const legend = computed<LegendItem[]>(() => schemeOf(props.colorBy).legend);

    /** 要素集 → [[minLng, minLat], [maxLng, maxLat]]（MultiPolygon 全环全点） */
    function bboxOf(
      features: { geometry: { coordinates: number[][][][] } }[],
    ): [[number, number], [number, number]] | null {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const f of features) {
        for (const polygon of f.geometry.coordinates) {
          for (const ring of polygon) {
            for (const [x, y] of ring) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }
      }
      return Number.isFinite(minX)
        ? [
            [minX, minY],
            [maxX, maxY],
          ]
        : null;
    }

    /** 数据 / 维度 / 地图任一就绪即同步：source+layer 已存在时 setData + setPaintProperty
        增量更新，否则补齐（setStyle 换底图后亦会重加）；fitToken 变化（图表筛选设置/取消）
        后飞行到当前要素刚好铺满视口（取消筛选即对称飞回全量范围；空命中不飞） */
    let lastFitToken = 0;
    watch(
      [() => props.areas, () => props.colorBy, () => props.fitToken, map, isLoaded],
      ([areas, colorBy, , m, loaded]) => {
        if (!m || !loaded || !areas) return;
        const { expr } = schemeOf(colorBy);
        if (m.getSource(SOURCE_ID)) {
          (m.getSource(SOURCE_ID) as maplibregl.GeoJSONSource).setData(areas as any);
          if (m.getLayer(LAYER_ID)) m.setPaintProperty(LAYER_ID, 'fill-color', expr as never);
        } else {
          m.addSource(SOURCE_ID, { type: 'geojson', data: areas as any });
          m.addLayer({
            id: LAYER_ID,
            type: 'fill',
            source: SOURCE_ID,
            paint: { 'fill-color': expr as never, 'fill-opacity': 0.35 },
          });
        }
        if (props.fitToken !== lastFitToken) {
          lastFitToken = props.fitToken;
          const features = (areas as { features?: { geometry: { coordinates: number[][][][] } }[] }).features ?? [];
          const bbox = bboxOf(features);
          // maxZoom 防止单个小图斑过度放大
          if (bbox) m.fitBounds(bbox, { padding: 60, duration: 800, maxZoom: 15 });
        }
      },
      { immediate: true, flush: 'post' },
    );

    // 卸载回收（getLayer/getSource 判空：setStyle 可能已移除）
    onBeforeUnmount(() => {
      const m = map.value;
      if (!m) return;
      if (m.getLayer(LAYER_ID)) m.removeLayer(LAYER_ID);
      if (m.getSource(SOURCE_ID)) m.removeSource(SOURCE_ID);
    });

    return () => (
      // 左下角图例：当前维度的色块 + 名称；pointer-events-none 不挡地图拖拽
      <div class="absolute left-16px bottom-16px z-10 rd-8px bg-black/55 px-12px py-8px flex flex-wrap gap-x-14px gap-y-6px max-w-280px pointer-events-none">
        {legend.value.map((item) => (
          <div key={item.label} class="flex items-center gap-6px">
            <div class="w-14px h-8px rd-2px shrink-0" style={{ background: item.color }} />
            <span class="text-12px text-white/85 whitespace-nowrap">{item.label}</span>
          </div>
        ))}
      </div>
    );
  },
});
