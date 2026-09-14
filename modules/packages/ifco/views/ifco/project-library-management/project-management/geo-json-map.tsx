import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import { VMap, VMapControls, basemapStyle, basemapMapOptions } from '@jeesite/vmap';
import { GeoLayers } from './geo-layers';

/**
 * ifco —— 在库项目管理 · 地理数据地图（只读渲染）
 *
 * 天地图底图 + GeoJSON 图层（fill/line/circle），数据变化自适应视野。
 * 抽屉内展示与编辑弹窗外的预览共用本组件。
 */
export const GeoJsonMap = defineComponent({
  name: 'IfcoProjectLibraryGeoJsonMap',
  props: {
    geoJson: { type: String as PropType<string | undefined>, default: undefined },
    height: { type: String, default: '280px' },
  },
  setup(props) {
    return () => (
      <div style={{ height: props.height }} class="w-full overflow-hidden rd-4px">
        <VMap style={basemapStyle} options={basemapMapOptions}>
          <VMapControls />
          <GeoLayers geoJson={props.geoJson} />
        </VMap>
      </div>
    );
  },
});
