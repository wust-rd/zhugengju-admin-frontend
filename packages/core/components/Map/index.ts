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

// Additional utility
export { cn } from './src/cn';
