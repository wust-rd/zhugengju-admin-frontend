/**
 * MapLibre GL 桥接模块
 *
 * 背景：
 * - 项目使用超图定制版 maplibre-gl-enhance.js，由 web/index.html 全局加载，挂 window.maplibregl
 * - 其他依赖 maplibre-gl 的 npm 库会 import maplibregl from 'maplibre-gl'
 * - 本文件通过 Vite resolve.alias 将 'maplibre-gl' 重定向至此，桥接到全局 window.maplibregl
 *
 * 使用方式（自动，无需手动引用）：
 * - web/vite.config.ts 中 `resolve.alias: { 'maplibre-gl': '<本文件路径>' }`
 *
 * 注意：
 * - 本模块只导出值，类型在 packages/types/maplibre-gl-enhance.d.ts 中通过
 *   `declare module 'maplibre-gl' { export = maplibregl }` 提供
 */

const maplibregl = window.maplibregl;

// 默认导出 — 兼容 `import maplibregl from 'maplibre-gl'`（大多数库的用法）
export default maplibregl;

// 具名导出 — 兼容 `import { Map, Marker } from 'maplibre-gl'`
export const Map = maplibregl.Map;
export const Marker = maplibregl.Marker;
export const Popup = maplibregl.Popup;
export const LngLat = maplibregl.LngLat;
export const LngLatBounds = maplibregl.LngLatBounds;
export const NavigationControl = maplibregl.NavigationControl;
export const GeolocateControl = maplibregl.GeolocateControl;
export const AttributionControl = maplibregl.AttributionControl;
export const ScaleControl = maplibregl.ScaleControl;
export const FullscreenControl = maplibregl.FullscreenControl;
export const LogoControl = maplibregl.LogoControl;
export const TerrainControl = maplibregl.TerrainControl;
export const Point = maplibregl.Point;
export const MercatorCoordinate = maplibregl.MercatorCoordinate;
export const EdgeInsets = maplibregl.EdgeInsets;
export const CRS = maplibregl.CRS;
export const GeoJSONSource = maplibregl.GeoJSONSource;
export const ImageSource = maplibregl.ImageSource;
export const VideoSource = maplibregl.VideoSource;
export const CanvasSource = maplibregl.CanvasSource;
export const RasterTileSource = maplibregl.RasterTileSource;
export const VectorTileSource = maplibregl.VectorTileSource;
export const RasterDEMTileSource = maplibregl.RasterDEMTileSource;
export const Evented = maplibregl.Evented;
export const setRTLTextPlugin = maplibregl.setRTLTextPlugin;
export const getRTLTextPluginStatus = maplibregl.getRTLTextPluginStatus;
export const addProtocol = maplibregl.addProtocol;
export const removeProtocol = maplibregl.removeProtocol;
export const addSourceType = maplibregl.addSourceType;
export const setWorkerUrl = maplibregl.setWorkerUrl;
export const getWorkerUrl = maplibregl.getWorkerUrl;
export const getWorkerCount = maplibregl.getWorkerCount;
export const setWorkerCount = maplibregl.setWorkerCount;
export const importScriptInWorkers = maplibregl.importScriptInWorkers;
export const getVersion = maplibregl.getVersion;
export const prewarm = maplibregl.prewarm;
export const clearPrewarmedResources = maplibregl.clearPrewarmedResources;
export const setMaxParallelImageRequests = maplibregl.setMaxParallelImageRequests;
export const getMaxParallelImageRequests = maplibregl.getMaxParallelImageRequests;
export const config = maplibregl.config;
