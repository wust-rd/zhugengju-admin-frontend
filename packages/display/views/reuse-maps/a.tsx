import { VMap } from '@jeesite/vmap';
import { defineComponent } from 'vue';
import { ReuseMapDemo } from './demo';
import { mapOptions, tiandituStyle } from './tianditu';

/**
 * ReuseMaps 演示路由 A：<VMap reuseMaps> 挂载，添加红色持久色点。
 * 切到 B 再切回：实例应被复用（不重建），A/B 的色点与视口都保留。
 */
export default defineComponent({
  name: 'DisplayReuseA',
  setup() {
    return () => (
      <div class="size-full relative">
        <VMap reuseMaps style={tiandituStyle} options={mapOptions}>
          <ReuseMapDemo name="A" lng={114.31} lat={30.55} color="#ff5f5f" />
        </VMap>
      </div>
    );
  },
});
