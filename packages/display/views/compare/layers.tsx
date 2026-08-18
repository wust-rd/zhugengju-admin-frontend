import { colors } from '@jeesite/core/libs/colors';
import { useMap, useMapLayer } from '@jeesite/vmap';
import areaUrl from '@jeesite/display/data/area_merged_all.geojson?url';
import projectUrl from '@jeesite/display/data/project_merged_all.geojson?url';
import zhiyinUrl from '@jeesite/display/data/zhiyin.geojson?url';
import { defineComponent, onBeforeUnmount } from 'vue';

/**
 * CompareLayers —— compare 双图共享图层组件（必须在 <VMap> 插槽内）。
 *
 * 用法：在 compare 页面的两个 <VMap> 各放一份 <CompareLayers />，
 * 组件通过 useMap() 拿到"自己所在 VMap 的地图实例"，向各自实例添加完全相同的图层。
 * 于是左右对比时：底图不同（矢量 / 影像），业务图层完全一致。
 *
 * 图层 id 固定、getSource 判空 → 两个独立地图实例互不冲突，reuseMaps 复用时也不会重复添加。
 */
export const CompareLayers = defineComponent({
  name: 'CompareLayers',

  setup() {
    const { map, isLoaded } = useMap();

    /** 组件卸载置位，防止异步 fetch 完成后向已销毁的地图添加图层 */
    let disposed = false;

    // VMap 加载完成后向本实例添加业务图层；换底图 / 卸载时自动清理
    useMapLayer(map, isLoaded, (m) => {
      // 片区范围线（浅灰 4px）
      fetch(areaUrl)
        .then((res) => res.json())
        .then((data) => {
          if (disposed || m.getSource('compare-area-lines')) return;
          m.addSource('compare-area-lines', { type: 'geojson', data });
          m.addLayer({
            id: 'compare-area-lines',
            type: 'line',
            source: 'compare-area-lines',
            paint: {
              'line-color': colors.stone[400],
              'line-width': 4,
            },
          });
        })
        .catch(() => {});

      // 项目地块 fill 图层（第一批紫 / 第二批深蓝）
      fetch(projectUrl)
        .then((res) => res.json())
        .then((data) => {
          if (disposed || m.getSource('compare-project-fills')) return;
          m.addSource('compare-project-fills', { type: 'geojson', data });
          m.addLayer({
            id: 'compare-project-fills',
            type: 'fill',
            source: 'compare-project-fills',
            paint: {
              'fill-color': ['match', ['get', 'BATCH'], '第一批', '#773ceb', '第二批', '#3a86ec', '#A855F7'],
              'fill-opacity': 0.6,
            },
          });
        })
        .catch(() => {});

      // 知音项目地块 fill 图层（红色）
      fetch(zhiyinUrl)
        .then((res) => res.json())
        .then((data) => {
          if (disposed || m.getSource('compare-zhiyin-fill')) return;
          m.addSource('compare-zhiyin-fill', { type: 'geojson', data });
          m.addLayer({
            id: 'compare-zhiyin-fill',
            type: 'fill',
            source: 'compare-zhiyin-fill',
            paint: {
              'fill-color': '#ff2d2d',
              'fill-opacity': 0.5,
            },
          });
        })
        .catch(() => {});

      // 清理：换底图 / 组件卸载时回收本实例上的图层
      return () => {
        ['compare-area-lines', 'compare-project-fills', 'compare-zhiyin-fill'].forEach((id) => {
          try {
            if (m.getLayer(id)) m.removeLayer(id);
            if (m.getSource(id)) m.removeSource(id);
          } catch {
            // setStyle 已把图层 / 数据源移除
          }
        });
      };
    });

    onBeforeUnmount(() => {
      disposed = true;
    });

    // 纯逻辑组件，不渲染 DOM
    return () => null;
  },
});
