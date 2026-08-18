import { Compare } from '@geoql/maplibre-gl-compare';
import '@geoql/maplibre-gl-compare/style.css';
import { VMap } from '@jeesite/vmap';
import { defineComponent, onBeforeUnmount, ref } from 'vue';
import { MapReadyBridge } from './bridge';
import { CompareLayers } from './layers';
import { imgStyle, mapOptions, vecStyle } from './tianditu';

/**
 * Compare 对比页 —— 基于 @geoql/maplibre-gl-compare 的滑动对比界面。
 *
 * 原理：两个 <VMap> 绝对定位叠加在同一个容器，Compare 控件通过 clipPath
 * 裁剪两个地图容器实现"左矢量 / 右影像"的滑动对比。
 *
 * 双图一致性：
 * - 相同图层：两个 VMap 各放一份 <CompareLayers />，向各自实例添加完全相同的业务图层；
 * - 相同移动控制：Compare 内置 syncMaps 双向同步 center/zoom/bearing/pitch，
 *   操作任一地图（拖拽 / 滚轮缩放 / 旋转），另一侧同步跟随。
 *
 * 地图就绪：两个 VMap 插槽内各放一个 <MapReadyBridge />，通过 useMap() 拿到
 * 各自地图实例并 emit('ready')，两个都就绪后创建 Compare。
 */
export default defineComponent({
  name: 'DisplayCompare',
  setup() {
    // Compare 控件挂载的容器（两个地图的共同父级，需 relative）
    const containerRef = ref<HTMLDivElement | null>(null);
    // 调试信息：显示 Compare 创建状态 / 容器尺寸
    const debug = ref('等待地图加载...');

    // 两个地图实例（由插槽内 MapReadyBridge 上报）
    const maps: { a?: maplibregl.Map; b?: maplibregl.Map } = {};
    let compare: Compare | null = null;

    const checkReady = () => {
      if (compare) return;
      if (!maps.a || !maps.b || !containerRef.value) {
        debug.value = `等待地图就绪：A=${!!maps.a} B=${!!maps.b}`;
        return;
      }
      // 尺寸守卫：容器需有宽高，否则 clipPath 全显、上层图盖住下层图
      const rect = containerRef.value.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        debug.value = `容器尺寸未就绪 ${Math.round(rect.width)}x${Math.round(rect.height)}`;
        requestAnimationFrame(checkReady);
        return;
      }

      compare = new Compare(maps.a, maps.b, containerRef.value, {
        mousemove: false,
        orientation: 'vertical',
        theme: 'system',
        swiperIcon: '↔️',
        swiperStyle: {
          width: '32px',
          height: '32px',
          padding: '12px',
        },
        lightColors: {
          swiperBackground:
            'radial-gradient(circle,rgba(2, 0, 36, 1) 0%, rgba(9, 9, 121, 1) 35%, rgba(0, 212, 255, 1) 100%)',
          swiperBorder: '#ffffff',
          lineBackground: '#ffffff',
        },
        darkColors: {
          swiperBackground: 'radial-gradient(circle, #1a1a2e 0%, #050609 100%)',
          swiperBorder: '#27292e',
          lineBackground: '#27292e',
        },
      });
      // 强制分割线到中间（防初始 bounds 异常导致位置错误）
      compare.setSlider(rect.width / 2);
      debug.value = `Compare 已创建：bounds=${Math.round(rect.width)}x${Math.round(rect.height)}`;
    };

    // 两个地图就绪回调（由插槽内 MapReadyBridge 触发）
    const handleReadyA = (m: maplibregl.Map) => {
      maps.a = m;
      checkReady();
    };
    const handleReadyB = (m: maplibregl.Map) => {
      maps.b = m;
      checkReady();
    };

    // 卸载时清理 Compare（移除监听器 / 分割线 / 恢复 clipPath）
    onBeforeUnmount(() => {
      compare?.remove();
      compare = null;
    });

    return () => (
      <div class="size-full relative">
        <div ref={containerRef} class="absolute inset-0">
          {/* 左：矢量底图 + 共享图层（VMap 容器直接兄弟，clip-path 裁剪区外不拦截事件，可拖拽） */}
          <VMap class="absolute inset-0" style={vecStyle} options={mapOptions}>
            <MapReadyBridge onReady={handleReadyA} />
            <CompareLayers />
          </VMap>
          {/* 右：影像底图 + 共享图层（Compare 以 mapB 为主，bounds / resize 取自 B） */}
          <VMap class="absolute inset-0" style={imgStyle} options={mapOptions}>
            <MapReadyBridge onReady={handleReadyB} />
            <CompareLayers />
          </VMap>
        </div>

        {/* 顶部说明 */}
        <div class="pointer-events-none absolute top-16px left-1/2 z-10 -translate-x-1/2 rounded-full bg-slate-900/80 px-16px py-6px text-14px text-white shadow-md">
          左右滑动对比：矢量 ↔ 影像（图层同步 · 视图同步）
        </div>
        <div class="pointer-events-none absolute top-16px left-16px z-10 rounded-6px bg-emerald-600/85 px-10px py-4px text-12px text-white shadow-md">
          矢量
        </div>
        <div class="pointer-events-none absolute top-16px right-16px z-10 rounded-6px bg-amber-600/85 px-10px py-4px text-12px text-white shadow-md">
          影像
        </div>
        {/* 调试面板：观察 Compare 创建状态 */}
        <div class="pointer-events-none absolute bottom-16px left-16px z-20 rounded-6px bg-black/70 px-10px py-4px text-12px text-white">
          {debug.value}
        </div>
      </div>
    );
  },
});
