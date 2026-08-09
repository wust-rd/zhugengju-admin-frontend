/**
 * Map component exports — based on @geoql/v-maplibre,
 * adapted for project's custom maplibre-gl-enhance.js (window.maplibregl).
 *
 * Uses maplibre-gl-shim (Vite alias: maplibre-gl → window.maplibregl)
 * No npm maplibre-gl required.
 *
 * Usage:
 *   import { Map, MapMarker, MapControls } from '@jeesite/core/components/Map';
 */

// Re-export everything from the source index
export * from './src/index';

// Additional utility（复用全局 cn，避免 Map 内两套实现并存）
export { cn } from '@jeesite/core/libs';
