/**
 * @jeesite/vmap —— MapLibre 地图组件包（TSX）
 *
 * 提供 Vue 组件 <VMap>，封装超图定制版 MapLibre GL（maplibre-gl-enhance）：
 * - 原生 MapLibre 选项走 $attrs 透传（center/zoom/scrollZoom 等）
 * - 支持 v-model:viewport 受控视口
 * - 默认加载 Carto Positron 亮色底图，也可传自定义 style
 * - 配套 hooks：useMap / useMapLayer / usePopup
 *
 * 用法：
 * ```tsx
 * import { VMap } from '@jeesite/vmap';
 * <VMap class="h-[500px]" :center="[116.4, 39.9]" :zoom="10">
 *   (插槽内放 Marker/Route 等地图子组件)
 * </VMap>
 * ```
 *
 * 注意：依赖 maplibre-gl 全局脚本（web/index.html 加载 maplibre-gl-enhance.js），
 * 运行时经 Vite alias 桥接到 window.maplibregl。
 */
export { VMap } from './src/v-map';
export { VMapControls } from './src/v-map-controls';
export type { MapViewport, MapRef, MapArcDatum, MapArcEvent, MapArcLinePaint, MapArcLineLayout } from './src/types';
export { useMap } from './src/composables/use-map';
export { useMapLayer } from './src/composables/use-map-layer';
export { usePopup } from './src/composables/use-popup';
export { MapContextKey, MarkerContextKey, type MapContextValue, type MarkerContextValue } from './src/context';
