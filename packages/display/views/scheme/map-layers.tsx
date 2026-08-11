import { colors } from '@jeesite/core/libs/colors';
import { useMap, useMapLayer } from '@jeesite/vmap';
import areaUrl from '@jeesite/display/data/area_merged_all.geojson?url';
import projectUrl from '@jeesite/display/data/project_merged_all.geojson?url';
import zhiyinUrl from '@jeesite/display/data/zhiyin.geojson?url';
import { defineComponent, onBeforeUnmount } from 'vue';

/** OSS 图片基础地址 */
const OSS_BASE = 'https://zhugengju-public.oss-cn-wuhan-lr.aliyuncs.com/片区策划';

/** 知音片区金字塔图片（OSS 外链） */
const ZHIYIN_IMG = `${OSS_BASE}/金字塔.webp`;

/**
 * 地图内容组件（纯逻辑，不渲染 DOM）：
 * 必须在 <VMap> 插槽内使用 —— useMap() 依赖 VMap setup 中 provide 的地图上下文，
 * 祖先组件（如 DisplayScheme 页面根组件）inject 不到会直接抛错。
 */
export const SchemeMapLayers = defineComponent({
  name: 'SchemeMapLayers',

  // ---- 输出约束 ----
  emits: {
    'update:drawer': (_visible: boolean) => true,
  },

  setup(_props, { emit }) {
    const { map, isLoaded } = useMap();

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

      // 点击地图：命中知音地块 → 显示金字塔 Marker；否则移除 Marker 并打开右侧抽屉
      const onClick = (e: maplibregl.MapMouseEvent) => {
        const hit = m.queryRenderedFeatures(e.point, { layers: ['zhiyin-fill'] }).length > 0;
        if (hit) {
          showZhiyinMarker(e.lngLat);
          emit('update:drawer', true);
          return;
        }
        hideZhiyinMarker();
        emit('update:drawer', false);
      };
      m.on('click', onClick);

      // 片区多边形 fill 图层（品红）：样式加载完成后动态添加
      // 范围线 line 图层（浅灰 3px）：从 area_merged_all.geojson 异步加载
      fetch(areaUrl)
        .then((res) => res.json())
        .then((data) => {
          if (disposed || m.getSource('area-lines')) return;
          m.addSource('area-lines', { type: 'geojson', data });
          m.addLayer({
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
          if (disposed || m.getSource('project-fills')) return;
          m.addSource('project-fills', { type: 'geojson', data });
          m.addLayer({
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
          if (disposed || m.getSource('zhiyin-fill')) return;
          m.addSource('zhiyin-fill', { type: 'geojson', data });
          m.addLayer({
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

      // 清理函数：换底图 / 卸载时回收本次 setup 注册的图层与监听器
      return () => {
        m.off('click', onClick);
        hideZhiyinMarker();
        ['area-lines', 'project-fills', 'zhiyin-fill'].forEach((id) => {
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
