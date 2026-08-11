import { onBeforeUnmount, watch, type Ref } from "vue";
import type { Map as MapLibreMap } from "maplibre-gl";

/**
 * 图层初始化函数：在 map 就绪后执行（如 addSource / addLayer / map.on 等）。
 * 可选返回一个清理函数（如 removeLayer / removeSource / map.off），
 * 用于在主题切换或组件卸载时回收本次 setup 注册的资源。
 */
export type LayerSetup = (map: MapLibreMap) => void | (() => void);

/**
 * 管理 `<Map>` 内自定义 MapLibre 图层的完整生命周期：
 *
 * - **首次加载**：等 map 完全加载（isLoaded 变 true）后调用一次 `setup`。
 * - **主题切换**：MapLibre 的 `setStyle` 会清空所有 layers/sources，但**不会**移除
 *   通过 `map.on(...)` 注册的委托事件监听器。因此本 composable 在样式被替换时先
 *   执行上一次 `setup` 返回的清理（借此注销陈旧监听器），待新样式加载完成后再
 *   重新调用 `setup`，避免监听器跨主题切换累积。
 * - **卸载**：组件卸载时执行清理。
 *
 * 注意：`setup` 内的清理逻辑（如 removeLayer / removeSource）应包裹在
 * try/catch 中或用 `map.getLayer` / `map.getSource` 判空守卫——因为执行清理时
 * `setStyle` 可能已经把对应图层/数据源移除掉了。
 */
export function useMapLayer(
  map: Ref<MapLibreMap | null>,
  isLoaded: Ref<boolean>,
  setup: LayerSetup,
) {
  // 当前 setup 的清理函数（尚未 setup 过则为 null）
  let cleanup: (() => void) | null = null;

  const teardown = () => {
    cleanup?.();
    cleanup = null;
  };

  // 响应 map / isLoaded 变化，立即执行一次，后续每次变化都重新评估：
  watch(
    [map, isLoaded],
    ([m, loaded]) => {
      // 1. 地图实例不存在（未注入 / 已销毁）→ 直接清理
      if (!m) {
        teardown();
        return;
      }
      if (loaded) {
        // 2. 已加载 → 尚未 setup 过才执行（cleanup 存在说明已 setup，避免重复）
        if (cleanup) return;
        const ret = setup(m);
        cleanup = typeof ret === "function" ? ret : null;
      } else {
        // 3. 样式被 setStyle 重置 → 先清理上一次 setup 注册的监听器 / 图层，
        //    待 isLoaded 再次为 true 时会重新执行 setup
        teardown();
      }
    },
    { immediate: true },
  );

  // 组件卸载时兜底清理
  onBeforeUnmount(teardown);
}
