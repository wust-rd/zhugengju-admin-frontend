/** 天地图子域名列表（t0~t7，多域名并行请求，突破浏览器并发限制） */
const TIANDITU_SUBDOMAINS = ['0', '1', '2', '3', '4', '5', '6', '7'];

/**
 * 构建天地图瓦片 URL 数组（DataServer REST 接口，CGCS2000 经纬度 _c 系列，EPSG:4490）
 * layer 可选：vec_c（矢量）/ cva_c（矢量注记）/ img_c（影像）/ cia_c（影像注记）
 */
function tiandituTileUrls(layer: string): string[] {
  return TIANDITU_SUBDOMAINS.map(
    (s) =>
      `https://t${s}.tianditu.gov.cn/DataServer?T=${layer}&X={x}&Y={y}&L={z}&tk=${import.meta.env.VITE_TIANDITU_TOKEN}`,
  );
}

/** 天地图矢量底图（vec 矢量 + cva 注记） */
export const vecStyle: maplibregl.StyleSpecification = {
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

/** 天地图影像底图（img 影像 + cia 注记） */
export const imgStyle: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'tianditu-img': {
      type: 'raster',
      tiles: tiandituTileUrls('img_c'),
      tileSize: 256,
      minzoom: 2,
      maxzoom: 18,
    },
    'tianditu-cia': {
      type: 'raster',
      tiles: tiandituTileUrls('cia_c'),
      tileSize: 256,
      minzoom: 2,
      maxzoom: 18,
    },
  },
  layers: [
    { id: 'tianditu-img', type: 'raster', source: 'tianditu-img' },
    { id: 'tianditu-cia', type: 'raster', source: 'tianditu-cia' },
  ],
};

/** 对比地图初始视口（武汉） */
export const mapOptions: Partial<maplibregl.MapOptions> = {
  crs: 'EPSG:4490',
  center: [114.2761773, 30.5344542] as [number, number],
  zoom: 12,
  // ★ 大幅缩短拖拽惯性（deceleration 越大惯性越短）：
  //   Compare 的 syncMaps 按 move 事件每帧 jumpTo 同步，默认惯性（2500）会让松手后
  //   双图互相拽着飘 1~2 秒，且飘动期间拖另一侧会被弹回。调到 20000 后松手即停。
  dragPan: { deceleration: 20000 },
};
