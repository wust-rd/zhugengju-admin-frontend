/**
 * 面板展示区 · 项目情况地图视图
 *
 * 复用总览看板的 VMap（天地图底图）+ AreaLayers：当前片区单要素图斑
 * （批次配色 + 琥珀选中高亮 + 范围线，同总览口径）+ 片区内项目图斑
 * （loadProjects 批次缓存按 A_UID 裁剪，放大到项目层级自动显示带名称）+ 左下角图例。
 * 进视图即飞到片区范围铺满视口；右上角「回到片区」按钮拖走/缩放后飞回。
 */
import { computed, defineComponent, ref, shallowRef, watch, type PropType } from 'vue';
import { VMap, VMapControls, basemapStyle, basemapMapOptions } from '@jeesite/vmap';
import { loadProjects, type AreaCollection, type AreaFeature, type ProjectCollection } from '../area-data';
import { AreaLayers } from '../area-layers';

export const PanelMapView = defineComponent({
  name: 'EarlyStagePlanningPanelMapView',

  props: {
    /** 当前片区要素（properties + geometry） */
    feature: { type: Object as PropType<AreaFeature>, required: true },
  },

  setup(props) {
    /** 地图数据：当前片区单要素 FeatureCollection */
    const areaCollection = computed<AreaCollection>(() => ({
      type: 'FeatureCollection',
      features: [props.feature],
    }));

    /** 当前片区 A_UID（图斑高亮） */
    const areaAuid = computed(() => props.feature.properties.A_UID ?? null);

    /** 片区内项目图斑（批次缓存按 A_UID 裁剪；失败静默不影响底图/片区面） */
    const areaProjects = shallowRef<ProjectCollection | null>(null);
    watch(
      () => props.feature.properties.A_UID,
      (auid) => {
        if (!auid) {
          areaProjects.value = null;
          return;
        }
        loadProjects('全部')
          .then((fc) => {
            areaProjects.value = { ...fc, features: fc.features.filter((f) => f.properties.A_UID === auid) };
          })
          .catch(() => {});
      },
      { immediate: true },
    );

    /** 地图飞行令牌：初始 1（数据就绪即飞到片区范围），「回到片区」递增再飞 */
    const fitToken = ref(1);

    return () => (
      <VMap reuseMaps style={basemapStyle} options={basemapMapOptions}>
        <VMapControls class="absolute right-24px bottom-24px z-10" />

        <AreaLayers
          areas={areaCollection.value}
          colorBy="district"
          fitToken={fitToken.value}
          projects={areaProjects.value}
          highlight={areaAuid.value}
        />

        {/* 回到片区：飞回并铺满视口 */}
        <div
          class="absolute right-24px top-24px z-10 flex cursor-pointer items-center gap-6px rd-full b-1 b-solid b-white/15 bg-black/40 px-14px py-8px text-14px text-white backdrop-blur-sm transition-all duration-150 hover-bg-black/60"
          onClick={() => (fitToken.value += 1)}
        >
          <div class="i-ri-focus-3-line size-16px" />
          回到片区
        </div>
      </VMap>
    );
  },
});
