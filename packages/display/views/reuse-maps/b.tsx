import { VMap } from '@jeesite/vmap';
import { defineComponent } from 'vue';
import { ReuseMapDemo } from './demo';
import { mapOptions, tiandituStyle } from './tianditu';

/**
 * ReuseMaps 演示路由 B：<VMap reuseMaps> 挂载，添加蓝色持久色点。
 * 复用 A 卸载时回收的地图实例（不重建），保留 A 添加的色点与视口。
 */
export default defineComponent({
  name: 'DisplayReuseB',
  setup() {
    return () => (
      <div class="size-full relative">
        <VMap reuseMaps style={tiandituStyle} options={mapOptions}>
          <ReuseMapDemo name="B" lng={114.24} lat={30.52} color="#3a86ec" />
        </VMap>
      </div>
    );
  },
});
