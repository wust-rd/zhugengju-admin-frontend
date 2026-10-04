/**
 * 城市体检总览地图图层（右侧 VMap 插槽内逻辑组件，不渲染 DOM）：
 *  - 基础图层（一级维度绑定图斑）：单 geojson source + fill/line/circle 三个图层，
 *    $type 过滤分别渲染面/点；统一背景色（深蓝半透明面 + 蓝描边 + 蓝点），
 *    维度 tab 切换后 setData 并 fitBounds 到图层范围；
 *  - 指标叠加图层（问题图斑）：同结构 source + 青色高亮（发光点/线/面），
 *    左侧指标行点击叠加、再点取消、切 tab 清空。
 * 必须在 <VMap> 插槽内使用 —— useMap() 依赖 VMap 注入的地图上下文。
 */
import { useMap } from '@jeesite/vmap';
import { defineComponent, onBeforeUnmount, type PropType, watch } from 'vue';
import type { SpaceFeatureCollection } from '@jeesite/urban-health-check/api/urban-health-check/urban/space-map';

/** 基础图层统一背景色（深蓝系：半透明填充 + 亮蓝描边/点），透明度恒定不随叠加变化 */
const BASE_FILL_COLOR = '#2E6DA8';
const BASE_LINE_COLOR = '#4E9BD8';
const BASE_CIRCLE_COLOR = '#4E9BD8';
const BASE_FILL_OPACITY = 0.28;
const BASE_LINE_OPACITY = 0.65;
const BASE_CIRCLE_OPACITY = 0.75;

/**
 * 指标叠加高亮色：琥珀金（深蓝底图上对比最强的暖色，与 esp 选中高亮同色系）。
 * 点用 5px 实心 + 白描边（无模糊），保证后续加要素点击事件时好命中
 */
const OVERLAY_COLOR = '#F59E0B';

const BASE_SOURCE = 'uhc-space-base';
const BASE_FILL_LAYER = 'uhc-space-base-fill';
const BASE_LINE_LAYER = 'uhc-space-base-line';
const BASE_CIRCLE_LAYER = 'uhc-space-base-circle';

const OVERLAY_SOURCE = 'uhc-space-overlay';
const OVERLAY_FILL_LAYER = 'uhc-space-overlay-fill';
const OVERLAY_LINE_LAYER = 'uhc-space-overlay-line';
const OVERLAY_CIRCLE_LAYER = 'uhc-space-overlay-circle';

/** 图斑点击事件载荷（properties 含 attributes，父级弹详情窗） */
export type SpaceFeatureClick = {
  source: 'base' | 'overlay';
  properties: Record<string, unknown>;
};

/**
 * CityCheckMapLayers —— 城市体检空间图层
 *
 * props：
 * - base: 基础图层 FeatureCollection（null = 清空；变化仅 setData，不动视野——
 *   住房等全市域图层 fitBounds 会把地图拉太远，缩放交给用户手动控制）
 * - overlay: 指标叠加 FeatureCollection（null = 清空）
 *
 * emits：
 * - featureClick: 点击任意图斑（基础/叠加 × 点/线/面 6 个图层）时上抛属性，父级弹窗展示
 */
export const CityCheckMapLayers = defineComponent({
  name: 'CityCheckMapLayers',
  props: {
    /** 基础图层（一级维度图斑） */
    base: { type: Object as PropType<SpaceFeatureCollection | null>, default: null },
    /** 指标叠加图层（问题图斑） */
    overlay: { type: Object as PropType<SpaceFeatureCollection | null>, default: null },
  },
  emits: {
    featureClick: (payload: SpaceFeatureClick) => !!payload,
  },
  setup(props, { emit }) {
    const { map, isLoaded } = useMap();

    /** 已注册的委托监听（事件 × layerId × handler），卸载/setStyle 后统一注销防泄漏 */
    type LayerEventName = 'click' | 'mouseenter' | 'mouseleave';
    const clickHandlers: Array<[LayerEventName, string, (e: maplibregl.MapLayerMouseEvent) => void]> = [];

    function bindLayerClick(m: maplibregl.Map, layerId: string, source: 'base' | 'overlay') {
      const handler = (e: maplibregl.MapLayerMouseEvent) => {
        const feature = e.features?.[0];
        if (!feature) return;
        emit('featureClick', { source, properties: (feature.properties ?? {}) as Record<string, unknown> });
      };
      // 悬停手型提示可点
      const enter = () => (m.getCanvas().style.cursor = 'pointer');
      const leave = () => (m.getCanvas().style.cursor = '');
      clickHandlers.push(['click', layerId, handler]);
      clickHandlers.push(['mouseenter', layerId, enter as () => void as never]);
      clickHandlers.push(['mouseleave', layerId, leave as () => void as never]);
      m.on('click', layerId, handler);
      m.on('mouseenter', layerId, enter);
      m.on('mouseleave', layerId, leave);
    }

    function unbindLayerClicks(m: maplibregl.Map) {
      for (const [type, layerId, handler] of clickHandlers.splice(0)) {
        m.off(type, layerId, handler);
      }
    }

    /** source+layers 已存在 → setData 增量更新；不存在（首载/setStyle 换底图后）补齐 */
    function ensureBase(m: maplibregl.Map, data: SpaceFeatureCollection | null) {
      const empty = { type: 'geojson', data: { type: 'FeatureCollection', features: [] } } as maplibregl.SourceSpecification;
      if (!m.getSource(BASE_SOURCE)) {
        m.addSource(BASE_SOURCE, empty);
        m.addLayer({
          id: BASE_FILL_LAYER,
          type: 'fill',
          source: BASE_SOURCE,
          filter: ['==', '$type', 'Polygon'],
          paint: {
            'fill-color': BASE_FILL_COLOR,
            'fill-opacity': BASE_FILL_OPACITY,
          },
        });
        m.addLayer({
          id: BASE_LINE_LAYER,
          type: 'line',
          source: BASE_SOURCE,
          filter: ['==', '$type', 'Polygon'],
          paint: {
            'line-color': BASE_LINE_COLOR,
            'line-width': 1,
            'line-opacity': BASE_LINE_OPACITY,
          },
        });
        m.addLayer({
          id: BASE_CIRCLE_LAYER,
          type: 'circle',
          source: BASE_SOURCE,
          filter: ['==', '$type', 'Point'],
          paint: {
            // 楼栋点：加大到 4.5px 保证可点击（原 2.2px 太难点中）
            'circle-radius': 4.5,
            'circle-color': BASE_CIRCLE_COLOR,
            'circle-opacity': BASE_CIRCLE_OPACITY,
            'circle-stroke-width': 0.8,
            'circle-stroke-color': '#7FB8E8',
          },
        });
        // 图斑点击 → 上抛属性弹详情
        bindLayerClick(m, BASE_FILL_LAYER, 'base');
        bindLayerClick(m, BASE_LINE_LAYER, 'base');
        bindLayerClick(m, BASE_CIRCLE_LAYER, 'base');
      }
      (m.getSource(BASE_SOURCE) as maplibregl.GeoJSONSource).setData(
        (data ?? { type: 'FeatureCollection', features: [] }) as never,
      );
    }

    function ensureOverlay(m: maplibregl.Map, data: SpaceFeatureCollection | null) {
      const empty = { type: 'geojson', data: { type: 'FeatureCollection', features: [] } } as maplibregl.SourceSpecification;
      if (!m.getSource(OVERLAY_SOURCE)) {
        m.addSource(OVERLAY_SOURCE, empty);
        // 面高亮：琥珀金填充 + 实线描边
        m.addLayer({
          id: OVERLAY_FILL_LAYER,
          type: 'fill',
          source: OVERLAY_SOURCE,
          filter: ['==', '$type', 'Polygon'],
          paint: { 'fill-color': OVERLAY_COLOR, 'fill-opacity': 0.42 },
        });
        m.addLayer({
          id: OVERLAY_LINE_LAYER,
          type: 'line',
          source: OVERLAY_SOURCE,
          paint: {
            'line-color': OVERLAY_COLOR,
            'line-width': ['case', ['==', ['geometry-type'], 'LineString'], 3, 2],
            'line-opacity': 1,
          },
        });
        // 点高亮：5px 实心 + 白描边（不模糊，保证后续要素点击事件好命中）
        m.addLayer({
          id: OVERLAY_CIRCLE_LAYER,
          type: 'circle',
          source: OVERLAY_SOURCE,
          filter: ['==', '$type', 'Point'],
          paint: {
            'circle-radius': 5,
            'circle-color': OVERLAY_COLOR,
            'circle-opacity': 1,
            'circle-stroke-width': 1,
            'circle-stroke-color': '#FFFFFF',
          },
        });
        // 叠加图斑点击 → 上抛属性弹详情
        bindLayerClick(m, OVERLAY_FILL_LAYER, 'overlay');
        bindLayerClick(m, OVERLAY_LINE_LAYER, 'overlay');
        bindLayerClick(m, OVERLAY_CIRCLE_LAYER, 'overlay');
      }
      (m.getSource(OVERLAY_SOURCE) as maplibregl.GeoJSONSource).setData(
        (data ?? { type: 'FeatureCollection', features: [] }) as never,
      );
    }

    // 基础图层同步（只换数据不动视野；用户手动缩放/平移不受 tab 切换影响）
    watch(
      [() => props.base, map, isLoaded],
      ([base, m, loaded]) => {
        if (!m || !loaded) return;
        ensureBase(m, base);
      },
      { immediate: true },
    );

    // 叠加图层同步（在基础图层之上；背景图层不压暗，保持常态透明度）
    watch(
      [() => props.overlay, map, isLoaded],
      ([overlay, m, loaded]) => {
        if (!m || !loaded) return;
        ensureOverlay(m, overlay);
      },
      { immediate: true },
    );

    // 卸载兜底清理（先注销 map.on 委托监听防跨样式累积，再移除图层/数据源）
    onBeforeUnmount(() => {
      const m = map.value;
      if (!m) return;
      unbindLayerClicks(m);
      for (const layer of [OVERLAY_CIRCLE_LAYER, OVERLAY_LINE_LAYER, OVERLAY_FILL_LAYER, BASE_CIRCLE_LAYER, BASE_LINE_LAYER, BASE_FILL_LAYER]) {
        if (m.getLayer(layer)) m.removeLayer(layer);
      }
      for (const source of [OVERLAY_SOURCE, BASE_SOURCE]) {
        if (m.getSource(source)) m.removeSource(source);
      }
    });

    return () => null;
  },
});
