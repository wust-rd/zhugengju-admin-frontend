/**
 * 更新片区地图图层（前期谋划 overview 右侧地图）：
 *  - 片区面：单 geojson source + 单 fill 图层，fill-color 用 match 表达式按着色维度取色——
 *    district 按 BATCH（第一批紫 / 第二批蓝）/ progress 按 AREA_COLOR（绿黄红）/
 *    func 按 FUNC_FIRST 派生属性（首个功能编码，统计图同色板），异常兜底灰
 *  - 片区高亮：点选片区（概况面板打开时）feature-state selected —— 填充变琥珀金
 *    （透明度 0.35→0.5）+ 6px 金色描边，颜色与方式同投融建运 ifco 地图
 *  - 片区范围线：常显边界线（stone 色 1px，同 ifco area-lines），画在填充之上、选中描边之下
 *  - 项目图斑：放大到 PROJECT_MINZOOM（13 级）自动显示视口内项目面，样式参考投融建运
 *    project-fills（按批次 紫/青，透明度 0.8）；左侧列表点击片区聚焦时飞到该片并放大越过
 *    该层级，项目按 minzoom 自然出现（不强制改图层层级/过滤）
 * 数据（父级筛选后要素）或维度变化 → setData / setPaintProperty / setFilter 增量更新；
 * 左下角渲染当前维度图例。必须在 <VMap> 插槽内使用 —— useMap() 依赖 VMap 注入的地图上下文。
 */
import { useMap } from '@jeesite/vmap';
import { computed, defineComponent, onBeforeUnmount, onMounted, type PropType } from 'vue';
import { watch } from 'vue';
import { colors } from '@jeesite/core/libs/colors';
import { FUNC_COLORS } from './func-type-chart';
import { bboxOf, PROGRESS_META } from './area-data';

/** 着色维度（与左侧三个统计 tab 一一对应） */
export type ColorBy = 'district' | 'progress' | 'func';

/** 片区聚焦（左侧列表点击）：飞到该片区 bbox，飞行目标层级夹取越过项目显示层级 */
export type FocusArea = { auid: string; bbox: [[number, number], [number, number]] };

/** 兜底灰：批次异常 / 三色未标注 / 无功能编码 */
const GRAY = '#8B9CB0';

/** 项目图斑自动显示的最小层级（街道/片区尺度） */
const PROJECT_MINZOOM = 13;

/** 聚焦飞行的层级上限（小片区不至于贴脸）与越过项目层级的余量 */
const FOCUS_ZOOM_MAX = 16.5;

/** 片区选中高亮色（琥珀金）与选中面透明度 —— 与投融建运 ifco 地图一致 */
const HIGHLIGHT_COLOR = '#F59E0B';
const FILL_OPACITY = 0.35;
const FILL_OPACITY_SELECTED = 0.5;

/** 行政区划维度：批次双色（图层与图例共用）；项目图斑同色板（参考投融建运） */
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
/** 片区范围线（常显边界线，同投融建运 area-lines） */
const LINE_LAYER_ID = 'esp-areas-line';
/** 片区选中描边（线图层，与 fill 共用 areas source；显隐由 feature-state selected 驱动） */
const HIGHLIGHT_LAYER_ID = 'esp-areas-highlight';
const PROJECT_SOURCE_ID = 'esp-projects';
const PROJECT_LAYER_ID = 'esp-projects-fill';

/** 片区面选中态 paint 表达式（feature-state selected，方式与投融建运一致）：
    选中 → 填充变琥珀金 + 描边显示；未选中 → 维度配色 + 描边透明。
    注意：base（维度 match 表达式）必须整体嵌套为 case 的 fallback，不能展开（...base） */
function fillColorExpr(base: unknown[]): unknown[] {
  return ['case', ['boolean', ['feature-state', 'selected'], false], HIGHLIGHT_COLOR, base];
}
const FILL_OPACITY_EXPR = [
  'case',
  ['boolean', ['feature-state', 'selected'], false],
  FILL_OPACITY_SELECTED,
  FILL_OPACITY,
];
const OUTLINE_OPACITY_EXPR = ['case', ['boolean', ['feature-state', 'selected'], false], 1, 0];

export const AreaLayers = defineComponent({
  name: 'EarlyStagePlanningAreaLayers',

  props: {
    /** 当前批次（筛选后）FeatureCollection；为 null 时不添加图层 */
    areas: { type: Object as PropType<Recordable | null>, default: null },
    /** 着色维度（district 按 BATCH / progress 按 AREA_COLOR / func 按首个功能编码） */
    colorBy: { type: String as PropType<ColorBy>, default: 'district' },
    /** 地图飞行令牌：父级图表筛选设置/取消时递增，变化后 fitBounds 到当前要素范围 */
    fitToken: { type: Number, default: 0 },
    /** 项目图斑（当前批次、已按片区筛选裁剪；null = 未加载不添加图层） */
    projects: { type: Object as PropType<Recordable | null>, default: null },
    /** 片区聚焦（列表点击）：飞到 bbox 并放大越过项目显示层级；null = 取消聚焦 */
    focus: { type: Object as PropType<FocusArea | null>, default: null },
    /** 点选高亮的片区 A_UID（概况面板打开时描边；null = 无高亮） */
    highlight: { type: String as PropType<string | null>, default: null },
  },

  emits: {
    /** 点击片区面：传出该片区 A_UID（父级弹片区概况面板）；点地图空白传出 null（收起面板） */
    pick: (auid: string | null) => auid === null || typeof auid === 'string',
  },

  setup(props, { emit }) {
    const { map, isLoaded } = useMap();

    /** 图例随维度切换 */
    const legend = computed<LegendItem[]>(() => schemeOf(props.colorBy).legend);

    /** 片区面点击 → pick(A_UID)；地图空白点击 → pick(null)。实例可能因主题切换被重建，
        按实例记忆幂等重绑 */
    let boundPickInst: unknown = null;
    function bindPick() {
      const m = map.value;
      if (!m || boundPickInst === m) return;
      boundPickInst = m;
      m.on('click', LAYER_ID, (e: maplibregl.MapMouseEvent & { features?: { properties: Recordable }[] }) => {
        const auid = e.features?.[0]?.properties?.A_UID;
        emit('pick', auid ? String(auid) : null);
      });
      m.on('click', (e: maplibregl.MapMouseEvent) => {
        // 空白点击（无命中要素）收起面板；点到要素的点击由上面的图层回调处理，不会重复
        const hit = m.queryRenderedFeatures(e.point, { layers: [LAYER_ID, PROJECT_LAYER_ID] });
        if (hit.length === 0) emit('pick', null);
      });
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
          if (m.getLayer(LAYER_ID)) m.setPaintProperty(LAYER_ID, 'fill-color', fillColorExpr(expr) as never);
        } else {
          // promoteId 把 A_UID 提升为要素 id（同投融建运）——GeoJSON 源的字符串 id
          // 必须经 promoteId 才能被 feature-state 定位，fill / line 图层共享状态
          m.addSource(SOURCE_ID, { type: 'geojson', data: areas as any, promoteId: 'A_UID' });
          m.addLayer({
            id: LAYER_ID,
            type: 'fill',
            source: SOURCE_ID,
            paint: {
              'fill-color': fillColorExpr(expr) as never,
              'fill-opacity': FILL_OPACITY_EXPR as never,
            },
          });
          // 片区范围线（常显边界线，同投融建运 area-lines：stone 色 1px，画在填充之上）
          m.addLayer({
            id: LINE_LAYER_ID,
            type: 'line',
            source: SOURCE_ID,
            paint: { 'line-color': colors.stone[400], 'line-width': 1 },
          });
          // 选中描边（加在范围线之上；显隐由 feature-state selected 驱动，同投融建运）
          m.addLayer({
            id: HIGHLIGHT_LAYER_ID,
            type: 'line',
            source: SOURCE_ID,
            paint: {
              'line-color': HIGHLIGHT_COLOR,
              'line-width': 6,
              'line-opacity': OUTLINE_OPACITY_EXPR as never,
            },
          });
        }
        // setData 可能重置 feature-state，当前有选中时重应用
        if (props.highlight) m.setFeatureState({ source: SOURCE_ID, id: props.highlight }, { selected: true });
        if (props.fitToken !== lastFitToken) {
          lastFitToken = props.fitToken;
          const features = (areas as { features?: { geometry: { coordinates: number[][][][] } }[] }).features ?? [];
          const bbox = bboxOf(features);
          // maxZoom 防止单个小图斑过度放大
          if (bbox) m.fitBounds(bbox, { padding: 60, duration: 800, maxZoom: 15 });
        }
        bindPick();
      },
      { immediate: true, flush: 'post' },
    );

    /** 项目图斑：数据就绪即补齐 source + fill 图层（画在片区面之上），已存在则 setData。
        显示完全由 minzoom 控制——聚焦飞行放大越过该层级后自然出现，无需改图层状态 */
    watch(
      [() => props.projects, map, isLoaded],
      ([projects, m, loaded]) => {
        if (!m || !loaded || !projects) return;
        if (m.getSource(PROJECT_SOURCE_ID)) {
          (m.getSource(PROJECT_SOURCE_ID) as maplibregl.GeoJSONSource).setData(projects as any);
        } else {
          m.addSource(PROJECT_SOURCE_ID, { type: 'geojson', data: projects as any });
          m.addLayer({
            id: PROJECT_LAYER_ID,
            type: 'fill',
            source: PROJECT_SOURCE_ID,
            // 放大到片区/街道尺度才显示，避免全市视角下图斑过密
            minzoom: PROJECT_MINZOOM,
            paint: {
              'fill-color': [
                'match',
                ['get', 'BATCH'],
                ...Object.entries(DISTRICT_COLOR).flat(),
                colors.violet[500],
              ] as never,
              'fill-opacity': 0.8,
            },
          });
        }
      },
      { immediate: true, flush: 'post' },
    );

    /** 片区聚焦（列表点击）：飞到片区范围，目标层级下限越过项目显示层级（大片区也保证
        飞到位后项目出现）、上限防小片区贴脸；取消聚焦不动视口（用户自行缩回） */
    let lastFocus: FocusArea | null | undefined;
    watch(
      [() => props.focus, map, isLoaded],
      ([focus, m, loaded]) => {
        if (!m || !loaded || focus === lastFocus) return;
        lastFocus = focus as FocusArea | null;
        if (!focus) return;
        const cam = m.cameraForBounds(focus.bbox, { padding: 80 });
        if (!cam?.center || cam.zoom == null) return;
        const zoom = Math.min(Math.max(cam.zoom, PROJECT_MINZOOM + 0.2), FOCUS_ZOOM_MAX);
        m.flyTo({ center: cam.center, zoom, duration: 900 });
      },
      { immediate: true, flush: 'post' },
    );

    /** 点选高亮（feature-state 方式，同投融建运）：概况面板打开/切换片区时把该要素置为
        selected（填充变琥珀金 + 描边显示），关闭时清除上一个要素的状态 */
    let lastHighlight: string | null = null;
    watch(
      [() => props.highlight, map, isLoaded],
      ([auid, m, loaded]) => {
        if (!m || !loaded || !m.getSource(SOURCE_ID)) return;
        if (lastHighlight && lastHighlight !== auid) {
          m.setFeatureState({ source: SOURCE_ID, id: lastHighlight }, { selected: false });
        }
        if (auid) m.setFeatureState({ source: SOURCE_ID, id: auid }, { selected: true });
        lastHighlight = auid;
      },
      { immediate: true, flush: 'post' },
    );

    // 卸载回收（getLayer/getSource 判空：setStyle 可能已移除）
    onMounted(bindPick);
    onBeforeUnmount(() => {
      const m = map.value;
      if (!m) return;
      for (const id of [PROJECT_LAYER_ID, HIGHLIGHT_LAYER_ID, LINE_LAYER_ID, LAYER_ID]) {
        if (m.getLayer(id)) m.removeLayer(id);
      }
      for (const id of [PROJECT_SOURCE_ID, SOURCE_ID]) {
        if (m.getSource(id)) m.removeSource(id);
      }
    });

    return () => (
      // 左下角图例：当前维度的色块 + 名称（样式参考投融建运：标题 + 纵向列表）；
      // pointer-events-none 不挡地图拖拽
      <div class="absolute bottom-24px left-32px z-10 rd-8px border border-cyan-900 bg-[#0f2b47]/85 px-14px py-10px backdrop-blur pointer-events-none">
        <div class="text-14px text-white/45">图例</div>

        <div class="mt-8px space-y-6px">
          {legend.value.map((item) => (
            <div key={item.label} class="flex items-center text-12px">
              <div class="h-10px w-14px rd-2px shrink-0" style={{ background: item.color }} />
              <div class="ml-8px text-white/70 whitespace-nowrap">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    );
  },
});
