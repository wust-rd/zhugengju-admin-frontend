import { useMap } from '@jeesite/vmap';
import { defineComponent, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

// 模块级：统计本会话出现过的 MapLibre 实例数（验证 reuseMaps 是否真正复用实例）
// 复用同一实例 → seenInstances 命中 → 计数不变；重建实例 → 计数 +1
const seenInstances = new WeakSet<object>();
let createdInstanceCount = 0;

/**
 * ReuseMapDemo —— reuseMaps 演示组件（必须在 <VMap> 插槽内）：
 * 1. 显示"本会话已创建实例数"：路由 A ↔ B 来回切换时编号不变 = 实例被复用（未重建）；
 * 2. 通过 map.addLayer 直接向实例添加一个"持久图层"（不随组件卸载清理），
 *    来回切换后所有路由添加过的色点都还在 = 实例上的图层被保留。
 */
export const ReuseMapDemo = defineComponent({
  name: 'ReuseMapDemo',

  props: {
    /** 路由标识：'A' | 'B' */
    name: { type: String, required: true },
    /** 本路由持久色点的经纬度 */
    lng: { type: Number, required: true },
    lat: { type: Number, required: true },
    /** 色点颜色 */
    color: { type: String, required: true },
  },

  setup(props) {
    const router = useRouter();
    const { map, isLoaded } = useMap();
    const instanceNo = ref(0);

    // 每个路由一个独立图层 id，避免互相覆盖
    const layerId = `reuse-demo-${props.name}`;

    watch(
      [map, isLoaded],
      ([m, loaded]) => {
        if (!m || !loaded) return;

        // 实例计数：仅首次出现（新建实例）才 +1
        if (!seenInstances.has(m)) {
          seenInstances.add(m);
          createdInstanceCount += 1;
        }
        instanceNo.value = createdInstanceCount;

        // 向实例添加持久色点（组件卸载不清理：验证实例未销毁时图层保留）
        if (!m.getSource(layerId)) {
          m.addSource(layerId, {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: [
                {
                  type: 'Feature',
                  geometry: { type: 'Point', coordinates: [props.lng, props.lat] },
                  properties: {},
                },
              ],
            },
          });
          m.addLayer({
            id: layerId,
            type: 'circle',
            source: layerId,
            paint: {
              'circle-color': props.color,
              'circle-radius': 14,
              'circle-stroke-color': '#ffffff',
              'circle-stroke-width': 2,
            },
          });
        }
      },
      { immediate: true },
    );

    return () => (
      <div class="pointer-events-none absolute top-24px left-24px z-10 rounded-8px bg-slate-900/85 px-16px py-12px text-14px text-white shadow-lg">
        <p class="mb-4px">路由：Reuse {props.name}</p>
        <p class="mb-4px">
          本会话已创建实例：<span class="text-sky-300 font-bold">{instanceNo.value}</span> 次
        </p>
        <p class="mb-8px text-slate-300">
          来回切换：编号不变 = 实例复用，色点 / 视口保留
        </p>
        <button
          class="pointer-events-auto cursor-pointer rounded-6px bg-sky-500 px-12px py-6px text-14px text-white transition-colors hover:bg-sky-400"
          onClick={() => router.push(props.name === 'A' ? '/display/reuse/b' : '/display/reuse/a')}
        >
          切换到 Reuse {props.name === 'A' ? 'B' : 'A'}
        </button>
      </div>
    );
  },
});
