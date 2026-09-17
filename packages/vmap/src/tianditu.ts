import type { MapOptions, StyleSpecification } from 'maplibre-gl';

/**
 * 天地图（Tianditu）底图 preset —— 各大屏 overview 页共用
 *
 * 说明：
 *  - 瓦片走 DataServer REST 接口，使用 CGCS2000 经纬度（_c 系列，EPSG:4490），
 *    配合 Map 的 crs: 'EPSG:4490' 使用；layer 传 'vec_c'（矢量底图）/'cva_c'（中文注记）
 *  - token 取自 web/.env 的 VITE_TIANDITU_TOKEN（天地图需客户端出公网）
 */

/** 天地图子域名列表（t0~t7，多域名并行请求，突破浏览器并发限制） */
const TIANDITU_SUBDOMAINS = ['0', '1', '2', '3', '4', '5', '6', '7'];

/** 武汉市中心（大屏各 overview 页共用初始视口中心） */
export const WUHAN_CENTER: [number, number] = [114.2761773, 30.5344542];

/** 构建天地图瓦片 URL 数组（layer 传 DataServer 图层名：_c 经纬度系列如 'vec_c'/'cva_c'，
 * 或 _w 墨卡托系列如 'vec_w'/'img_w'——后者供 3857 地图共用，见 basemap/basemap.ts） */
export function tiandituTileUrls(layer: string): string[] {
  return TIANDITU_SUBDOMAINS.map(
    (s) =>
      `https://t${s}.tianditu.gov.cn/DataServer?T=${layer}&X={x}&Y={y}&L={z}&tk=${import.meta.env.VITE_TIANDITU_TOKEN}`,
  );
}

/** 天地图底图样式：矢量底图 vec_c + 中文注记 cva_c 叠加 */
export const tiandituStyle: StyleSpecification = {
  version: 8,
  sources: {
    'tianditu-vec': {
      type: 'raster',
      tiles: tiandituTileUrls('vec_c'),
      tileSize: 256,
      minzoom: 2,
      maxzoom: 18,
    },
    'tianditu-cva': {
      type: 'raster',
      tiles: tiandituTileUrls('cva_c'),
      tileSize: 256,
      minzoom: 2,
      maxzoom: 18,
    },
  },
  layers: [
    { id: 'tianditu-vec', type: 'raster', source: 'tianditu-vec' },
    { id: 'tianditu-cva', type: 'raster', source: 'tianditu-cva' },
  ],
};

/** 天地图常用构造选项（_c 系列瓦片为 CGCS2000 经纬度坐标系，CRS 切 EPSG:4490） */
export const tiandituMapOptions: Partial<MapOptions> = {
  crs: 'EPSG:4490',
  center: WUHAN_CENTER,
  zoom: 10,
};
