import { colors } from '@jeesite/core/libs/colors';
import { useMap, useMapLayer } from '@jeesite/vmap';
import areaUrl from '@jeesite/display/data/area_merged_all.geojson?url';
import projectUrl from '@jeesite/display/data/project_merged_all.geojson?url';
import zhiyinUrl from '@jeesite/display/data/zhiyin.geojson?url';
import { defineComponent, onBeforeUnmount, watch, type PropType } from 'vue';
import type { AreaPolygonProps, ProjectPolygonProps, SelectedPolygon } from './polygon-types';
import { setIfcoPolygonData, type IfcoAreaItem, type IfcoProjectItem } from './polygon-store';

/** OSS 图片基础地址 */
const OSS_BASE = 'https://zhugengju-public.oss-cn-wuhan-lr.aliyuncs.com/片区策划';

/** 知音片区金字塔图片（OSS 外链） */
const ZHIYIN_IMG = `${OSS_BASE}/金字塔.webp`;

/** 地图图层配色（图层 paint 与页面图例共用，改色只改这里） */
export const IFCO_LAYER_COLORS = {
  /** 片区范围面 · 第一批（浅紫，选中变琥珀金加深） */
  areaBatch1: colors.purple[300],
  /** 片区范围面 · 第二批（浅蓝，选中变琥珀金加深） */
  areaBatch2: colors.blue[300],
  /** 片区范围面 · 未知批次兜底色（浅黄） */
  areaFill: colors.yellow[200],
  /** 项目地块 · 第一批（紫） */
  batch1: colors.purple[600],
  /** 项目地块 · 第二批（蓝） */
  batch2: colors.blue[600],
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

    /** 面类别 → source id（feature-state 高亮定位用；片区 fill / line 两图层共享 areas 数据源） */
    const sourceIdOf = (kind: SelectedPolygon['kind']) => (kind === 'area' ? 'areas' : 'project-fills');

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
      // 空白 → 清理并关闭。图层从上到下：zhiyin-fill > project-fills > area-lines > area-fills，
      // queryRenderedFeatures 首个命中即最上层，项目地块与片区面重叠时优先项目。
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

        const polygonLayers = ['project-fills', 'area-fills', 'area-lines'].filter((id) => m.getLayer(id));
        if (polygonLayers.length > 0) {
          const [hit] = m.queryRenderedFeatures(e.point, { layers: polygonLayers });
          if (hit) {
            emit('select', {
              kind: hit.layer.id === 'project-fills' ? 'project' : 'area',
              props: (hit.properties ?? {}) as Recordable,
            });
            return;
          }
        }
        emit('select', null);
      };
      m.on('click', onClick);

      // 片区 + 项目 + 知音三份数据一次拉齐后按固定层级挂图层：
      // area-fills（按批次浅紫/浅蓝面，最底）→ area-lines（片区边界线）→ project-fills / outline（项目面）→ zhiyin-fill（最上）。
      // 同时写入轻量索引（polygon-store），供详情卡片做片区内项目下拉与页签联动。
      Promise.all([
        fetch(areaUrl).then((res) => res.json()),
        fetch(projectUrl).then((res) => res.json()),
        fetch(zhiyinUrl).then((res) => res.json()),
      ])
        .then(([areaData, projectData, zhiyinData]) => {
          if (disposed || m.getSource('areas')) return;

          // 片区范围：按批次浅紫/浅蓝半透明面（第一批 purple[100] / 第二批 blue[100] / 未知批次浅黄兜底，
          // 选中变琥珀金加深）+ 边界线（浅灰，选中琥珀金加粗）。
          // promoteId 把 A_UID 提升为要素 id，fill / line 两图层共享同一份 feature-state。
          m.addSource('areas', { type: 'geojson', data: areaData, promoteId: 'A_UID' });
          m.addLayer({
            id: 'area-fills',
            type: 'fill',
            source: 'areas',
            paint: {
              'fill-color': [
                'case',
                ['boolean', ['feature-state', 'selected'], false],
                IFCO_LAYER_COLORS.highlight,
                [
                  'match',
                  ['get', 'BATCH'],
                  '第一批',
                  IFCO_LAYER_COLORS.areaBatch1,
                  '第二批',
                  IFCO_LAYER_COLORS.areaBatch2,
                  IFCO_LAYER_COLORS.areaFill,
                ],
              ],
              'fill-opacity': ['case', ['boolean', ['feature-state', 'selected'], false], 0.5, 0.3],
            },
          });
          m.addLayer({
            id: 'area-lines',
            type: 'line',
            source: 'areas',
            paint: {
              'line-color': [
                'case',
                ['boolean', ['feature-state', 'selected'], false],
                IFCO_LAYER_COLORS.highlight,
                colors.stone[400],
              ],
              'line-width': ['case', ['boolean', ['feature-state', 'selected'], false], 6, 4],
            },
          });

          // 项目地块 fill 图层（BATCH：第一批紫 / 第二批深蓝；选中加深）+ 琥珀金描边 line 图层（仅选中显示）
          // promoteId 把 P_UID 提升为要素 id 供 feature-state 定位
          m.addSource('project-fills', { type: 'geojson', data: projectData, promoteId: 'P_UID' });
          m.addLayer({
            id: 'project-fills',
            type: 'fill',
            source: 'project-fills',
            paint: {
              'fill-color': [
                'match',
                ['get', 'BATCH'],
                '第一批',
                IFCO_LAYER_COLORS.batch1,
                '第二批',
                IFCO_LAYER_COLORS.batch2,
                IFCO_LAYER_COLORS.batchFallback,
              ],
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

          // 知音项目地块 fill 图层（红色）
          m.addSource('zhiyin-fill', { type: 'geojson', data: zhiyinData });
          m.addLayer({
            id: 'zhiyin-fill',
            type: 'fill',
            source: 'zhiyin-fill',
            paint: {
              'fill-color': IFCO_LAYER_COLORS.zhiyin,
              'fill-opacity': 0.6,
            },
          });

          // 轻量索引：片区按 A_UID；项目下拉名取 GIS_NAME / PJ_NAME 兜底顺序号，按片区内顺序号 P_SEQ 排序
          const areaItems: IfcoAreaItem[] = ((areaData.features ?? []) as Recordable[]).map((f) => ({
            uid: String(f.properties?.A_UID ?? ''),
            props: (f.properties ?? {}) as AreaPolygonProps,
          }));
          const projectItems: IfcoProjectItem[] = ((projectData.features ?? []) as Recordable[])
            .map((f) => {
              const props = (f.properties ?? {}) as ProjectPolygonProps;
              const name = String(props.GIS_NAME || props.PJ_NAME || '').trim();
              return {
                uid: String(props.P_UID ?? ''),
                aUid: String(props.A_UID ?? ''),
                label: name || `项目${props.P_SEQ ?? ''}`,
                props,
              };
            })
            .sort((a, b) => (Number(a.props.P_SEQ) || 0) - (Number(b.props.P_SEQ) || 0));
          setIfcoPolygonData(areaItems, projectItems);
        })
        .catch(() => {});

      // 清理函数：换底图 / 卸载时回收本次 setup 注册的图层与监听器
      return () => {
        m.off('click', onClick);
        hideZhiyinMarker();
        ['area-fills', 'area-lines', 'project-fills', 'project-fills-outline', 'zhiyin-fill'].forEach((id) => {
          try {
            if (m.getLayer(id)) m.removeLayer(id);
          } catch {
            // setStyle 已把图层移除掉了
          }
        });
        ['areas', 'project-fills', 'zhiyin-fill'].forEach((id) => {
          try {
            if (m.getSource(id)) m.removeSource(id);
          } catch {
            // setStyle 已把数据源移除掉了
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
