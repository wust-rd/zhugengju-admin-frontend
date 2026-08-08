import { setWorkerUrl } from 'maplibre-gl';
import maplibreGlWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';

/**
 * maplibre-gl v6 必须显式配置独立 worker（maplibre-gl-worker.mjs）。
 *
 * v6 起 GeoJSON/矢量图层解析移交独立 worker；未配置 worker URL 时，
 * raster（天地图）底图仍可渲染，但 geojson source 驱动的 fill/line 等
 * 矢量图层不会显示（maplibre-gl-js #8109，维护者确认根因即 worker 未正确加载）。
 * 必须在 new Map() 之前调用，模块级调用一次全局生效。
 */
setWorkerUrl(maplibreGlWorkerUrl);
