import { colors } from '@jeesite/core/libs/colors';
import { useMap, useMapLayer } from '@jeesite/vmap';
import areaUrl from '@jeesite/display/data/area_merged_all.geojson?url';
import projectUrl from '@jeesite/display/data/project_merged_all.geojson?url';
import zhiyinUrl from '@jeesite/display/data/zhiyin.geojson?url';
import { defineComponent, onBeforeUnmount, watch, type PropType } from 'vue';
import type { SelectedPolygon } from './polygon-types';

/** OSS 图片基础地址 */
const OSS_BASE = 'https://zhugengju-public.oss-cn-wuhan-lr.aliyuncs.com/片区策划';

/** 知音片区金字塔图片（OSS 外链） */
const ZHIYIN_IMG = `${OSS_BASE}/金字塔.webp`;

/** 地图图层配色（图层 paint 与页面图例共用，改色只改这里） */
export const IFCO_LAYER_COLORS = {
  /** 项目地块 · 第一批（紫） */
  batch1: '#773ceb',
  /** 项目地块 · 第二批（蓝） */
  batch2: '#3a86ec',
  /** 项目地块 · 未知批次兜底色（紫罗兰） */
  batchFallback: '#A855F7',
  /** 知音项目地块（红） */
  zhiyin: '#ff2d2d',
  /** 选中高亮描边（琥珀金） */
  highlight: '#F59E0B',
};

/**
 * 地图内容组件（纯逻辑，不渲染 DOM）：
 * 必须在 <VMap> 插槽内使用 —— useMap() 依赖 VMap setup 中 provide 的地图上下文，
 * 祖先组件（如 DisplayIfco 页面根组件）inject 不到会直接抛错。
 */
export const IfcoMapLayers = defineComponent({
  name: 'IfcoMapLayers',

  props: {
    /** 当前选中面（null 清除）：联动 feature-state 选中高亮 */
    selected: { type: Object as PropType<SelectedPolygon | null>, default: null },
  },

  // ---- 输出约束 ----
  emits: {
    'update:drawer': (_visible: boolean) => true,
    select: (polygon: SelectedPolygon | null) => true,
  },

  setup(props, { emit }) {
    const { map, isLoaded } = useMap();

    /** 面类别 → source id（feature-state 高亮定位用） */
    const sourceIdOf = (kind: SelectedPolygon['kind']) => (kind === 'area' ? 'area-lines' : 'project-fills');

    /** 面 → 要素 id（source 以 promoteId 提升 A_UID / P_UID 为要素 id） */
    const featureIdOf = (polygon: SelectedPolygon): string => {
      const raw = polygon.kind === 'area' ? polygon.props.A_UID : polygon.props.P_UID;
      return raw == null ? '' : String(raw);
    };

    /** 选中变化 → 迁移 feature-state 高亮：清上一个、亮当前（source 未就绪时忽略） */
    watch(
      [() => props.selected, map, isLoaded],
      ([sel, m, loaded], prev) => {
        if (!m || !loaded) return;
        const prevSel = prev?.[0];
        if (prevSel && m.getSource(sourceIdOf(prevSel.kind))) {
          m.setFeatureState({ source: sourceIdOf(prevSel.kind), id: featureIdOf(prevSel) }, { selected: false });
        }
        if (sel && m.getSource(sourceIdOf(sel.kind))) {
          m.setFeatureState({ source: sourceIdOf(sel.kind), id: featureIdOf(sel) }, { selected: true });
        }
      },
      { flush: 'post' },
    );

    /** 组件卸载时置为 true，防止异步 fetch 完成后向已销毁的地图添加图层 */
    let disposed = false;

    /** 知音地块金字塔 Marker（单实例）：点击地块显示，点击其他处移除 */
    let zhiyinMarker: maplibregl.Marker | null = null;
    const hideZhiyinMarker = () => {
      zhiyinMarker?.remove();
      zhiyinMarker = null;
    };

    // VMap 加载完成后挂接交互与图层逻辑；卸载 / 换底图时自动清理
    useMapLayer(map, isLoaded, (m) => {
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
          .addTo(m);
      };

      // 点击地图：命中知音地块 → 显示金字塔 Marker + 片区抽屉；
      // 命中项目地块 / 片区范围面 → emit select（父级右侧弹详情卡片）；
      // 空白 → 清理并关闭。图层从上到下：zhiyin-fill > project-fills > area-lines，
      // queryRenderedFeatures 首个命中即最上层，项目地块与片区范围重叠时优先项目。
      const onClick = (e: maplibregl.MapMouseEvent) => {
        const zhiyinHit = m.queryRenderedFeatures(e.point, { layers: ['zhiyin-fill'] }).length > 0;
        if (zhiyinHit) {
          showZhiyinMarker(e.lngLat);
          emit('update:drawer', true);
          emit('select', null);
          return;
        }
        hideZhiyinMarker();
        emit('update:drawer', false);

        const polygonLayers = ['project-fills', 'area-lines'].filter((id) => m.getLayer(id));
        if (polygonLayers.length > 0) {
          const [hit] = m.queryRenderedFeatures(e.point, { layers: polygonLayers });
          if (hit) {
            emit('select', {
              kind: hit.layer.id === 'area-lines' ? 'area' : 'project',
              props: (hit.properties ?? {}) as Recordable,
            });
            return;
          }
        }
        emit('select', null);
      };
      m.on('click', onClick);

      // 片区范围线（浅灰 4px，选中变琥珀金加粗）：promoteId 把 A_UID 提升为要素 id 供 feature-state 定位
      fetch(areaUrl)
        .then((res) => res.json())
        .then((data) => {
          if (disposed || m.getSource('area-lines')) return;
          m.addSource('area-lines', { type: 'geojson', data, promoteId: 'A_UID' });
          m.addLayer({
            id: 'area-lines',
            type: 'line',
            source: 'area-lines',
            paint: {
              'line-color': ['case', ['boolean', ['feature-state', 'selected'], false], IFCO_LAYER_COLORS.highlight, colors.stone[400]],
              'line-width': ['case', ['boolean', ['feature-state', 'selected'], false], 6, 4],
            },
          });
        })
        .catch(() => {});

      // 项目地块 fill 图层（BATCH：第一批紫 / 第二批深蓝；选中加深）+ 琥珀金描边 line 图层（仅选中显示）
      // promoteId 把 P_UID 提升为要素 id 供 feature-state 定位
      fetch(projectUrl)
        .then((res) => res.json())
        .then((data) => {
          if (disposed || m.getSource('project-fills')) return;
          m.addSource('project-fills', { type: 'geojson', data, promoteId: 'P_UID' });
          m.addLayer({
            id: 'project-fills',
            type: 'fill',
            source: 'project-fills',
            paint: {
              'fill-color': ['match', ['get', 'BATCH'], '第一批', IFCO_LAYER_COLORS.batch1, '第二批', IFCO_LAYER_COLORS.batch2, IFCO_LAYER_COLORS.batchFallback],
              'fill-opacity': ['case', ['boolean', ['feature-state', 'selected'], false], 0.95, 0.8],
            },
          });
          m.addLayer({
            id: 'project-fills-outline',
            type: 'line',
            source: 'project-fills',
            paint: {
              'line-color': IFCO_LAYER_COLORS.highlight,
              'line-width': 3.5,
              'line-opacity': ['case', ['boolean', ['feature-state', 'selected'], false], 1, 0],
            },
          });
        })
        .catch(() => {});

      // 知音项目地块 fill 图层（红色）：从 zhiyin.geojson 异步加载
      fetch(zhiyinUrl)
        .then((res) => res.json())
        .then((data) => {
          if (disposed || m.getSource('zhiyin-fill')) return;
          m.addSource('zhiyin-fill', { type: 'geojson', data });
          m.addLayer({
            id: 'zhiyin-fill',
            type: 'fill',
            source: 'zhiyin-fill',
            paint: {
              'fill-color': IFCO_LAYER_COLORS.zhiyin,
              'fill-opacity': 0.6,
            },
          });
        })
        .catch(() => {});

      // 清理函数：换底图 / 卸载时回收本次 setup 注册的图层与监听器
      return () => {
        m.off('click', onClick);
        hideZhiyinMarker();
        ['area-lines', 'project-fills', 'project-fills-outline', 'zhiyin-fill'].forEach((id) => {
          try {
            if (m.getLayer(id)) m.removeLayer(id);
            if (m.getSource(id)) m.removeSource(id);
          } catch {
            // setStyle 已把图层 / 数据源移除掉了
          }
        });
      };
    });

    // 组件卸载：图层 / 地图实例由 useMapLayer 与 VMap 内部清理，这里只需兜底
    onBeforeUnmount(() => {
      disposed = true;
      hideZhiyinMarker();
    });

    return () => null;
  },
});
