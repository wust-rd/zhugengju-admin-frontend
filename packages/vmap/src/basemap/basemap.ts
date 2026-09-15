import { ref } from 'vue';
import type { MapOptions, StyleSpecification } from 'maplibre-gl';
import sgjElectricImg from '@jeesite/assets/images/vmap/数公基电子地图.webp';
import sgjRemoteImg from '@jeesite/assets/images/vmap/数公基遥感影像.webp';
import yztElectricImg from '@jeesite/assets/images/vmap/一张图电子地图.webp';
import yztRemoteImg from '@jeesite/assets/images/vmap/一张图遥感影像.webp';
import { YZT_WMTS_TILES, ensureYztWmtsProtocol } from './yzt-wmts-protocol';
import { YZT_GATEWAY_BASE, YZT_TOKEN } from './yzt-gateway';

/**
 * 底图 preset —— 各大屏 overview 页共用
 *
 * 双平台四底图（数公基电子/数公基遥感/一张图电子/一张图遥感）：
 *  - 数公基：局方服务平台的 ArcGIS REST 缓存服务（ServiceAdapter 代理），
 *    Web Mercator / EPSG:3857、256px PNG、0~19 级，token 内置在路径中
 *  - 一张图：湖北省自然资源一张图 tip-gateway 外网代理（网关地址与 token 见
 *    yzt-gateway.ts）。接入遥感影像与矢量注记两项，均非标准 3857 XYZ 服务：
 *    - 遥感影像 wuhanyx：WMS 支持 SRS=EPSG:3857 服务端重投影，走 WMS GetMap
 *      + {bbox-epsg-3857} 模板（超图 enhance 版 MapLibre 支持该占位符，按每张
 *      瓦片的墨卡托范围展开）。其 WMTS 为自定义 EPSG:4326 剖分（非天地图标
 *      准网格）且 GetTile 行列校验异常，不可直接使用
 *    - 注记 cva_c：代理无 WMS 端点，WMTS 为标准天地图 EPSG:4490 剖分，与
 *      3857 网格不通用；经 yzt-wmts-protocol.ts 注册的 yztwmts:// 自定义协议
 *      在前端取 4490 源瓦片重采样合成 3857 对齐瓦片
 *    - 矢量底图 vec_c：与 cva_c 同构的 tdt WMTS（上游对当前 token 未授权
 *      401），与 cva 共用 yztwmts:// 合成协议接入——未授权期间取图失败该
 *      瓦片透明，选中「一张图电子地图」时底图空白、注记层正常，授权放开
 *      后无需改码自动恢复完整。「一张图遥感影像」= 影像 + 注记两图层成组
 *      叠加（遥感本身无注记，叠 cva 补字）
 *  - 地图坐标系为 MapLibre 默认的 EPSG:3857，CGCS2000 经纬度的 GeoJSON
 *    覆盖层可直接叠加
 */

// tdt 系列合成协议须在地图实例创建前注册；本模块被引用即完成注册（幂等）
ensureYztWmtsProtocol();

/** 数公基服务根地址（ServiceAdapter 代理）与路径 token */
const SGJ_SERVICE_BASE = 'http://10.34.4.103:8010/ServiceAdapter/MAP';
const SGJ_SERVICE_TOKEN = 'a06a981392ba400a8144171aa9fb8168';

/** 一张图武汉遥感影像 WMS 定义（代理路径段 + WMS 图层名，caps 中两层名等价） */
const YZT_YX = { proxy: '6e45ab3070445ae4ed88881370ae35cb/wuhanyx', wmsLayer: 'public.wuhanyx' } as const;

/** 武汉市中心（大屏各 overview 页共用初始视口中心） */
export const WUHAN_CENTER: [number, number] = [114.2761773, 30.5344542];

/** 构建 ArcGIS REST 瓦片模板（注意 ArcGIS 的路径顺序是 /{z}/{y}/{x}） */
function sgjTileUrls(service: string): string[] {
  return [`${SGJ_SERVICE_BASE}/${service}/${SGJ_SERVICE_TOKEN}/tile/{z}/{y}/{x}`];
}

/**
 * 构建一张图 WMS 瓦片模板（{bbox-epsg-3857} 由超图 enhance 版 MapLibre
 * 按瓦片墨卡托范围展开，服务端重投影，几何与 3857 地图精确对齐）。
 */
function yztWmsTileUrls(service: { proxy: string; wmsLayer: string }): string[] {
  return [
    `${YZT_GATEWAY_BASE}/${service.proxy}/wms?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap` +
      `&LAYERS=${service.wmsLayer}&STYLES=&FORMAT=image/png&WIDTH=256&HEIGHT=256` +
      `&SRS=EPSG:3857&BBOX={bbox-epsg-3857}&token=${YZT_TOKEN}`,
  ];
}

/** 底图样式：数公基电子地图（默认显示）+ 数公基遥感 / 一张图遥感（初始隐藏，由底图切换器控制互斥显隐） */
export const basemapStyle: StyleSpecification = {
  version: 8,
  sources: {
    'basemap-sgj-emap': {
      type: 'raster',
      tiles: sgjTileUrls('EMAP_WEB'),
      tileSize: 256,
      minzoom: 0,
      maxzoom: 19,
    },
    'basemap-sgj-yx': {
      type: 'raster',
      tiles: sgjTileUrls('YX_WEB'),
      tileSize: 256,
      minzoom: 0,
      maxzoom: 19,
    },
    'basemap-yzt-yx': {
      type: 'raster',
      tiles: yztWmsTileUrls(YZT_YX),
      tileSize: 256,
      minzoom: 0,
      maxzoom: 19,
    },
    'basemap-yzt-vec': {
      type: 'raster',
      // vec_c 与 cva_c 同构（tdt WMTS 4490 网格），共用 yztwmts:// 合成协议
      tiles: [YZT_WMTS_TILES.vec],
      tileSize: 256,
      minzoom: 0,
      maxzoom: 19,
    },
    'basemap-yzt-cva': {
      type: 'raster',
      tiles: [YZT_WMTS_TILES.cva],
      tileSize: 256,
      minzoom: 0,
      // cva WMTS 最高 19 级，之上由 MapLibre 过采样放大（注记文字可接受）
      maxzoom: 19,
    },
  },
  layers: [
    { id: 'basemap-sgj-emap', type: 'raster', source: 'basemap-sgj-emap' },
    { id: 'basemap-sgj-yx', type: 'raster', source: 'basemap-sgj-yx', layout: { visibility: 'none' } },
    { id: 'basemap-yzt-yx', type: 'raster', source: 'basemap-yzt-yx', layout: { visibility: 'none' } },
    // vec_c 与 cva_c 同构，经 yztwmts:// 协议取图；上游对当前 token 屏蔽
    // （401）期间该层透明——选中「一张图电子地图」时底图空白、注记正常
    { id: 'basemap-yzt-vec', type: 'raster', source: 'basemap-yzt-vec', layout: { visibility: 'none' } },
    // 注记必须叠在遥感之上
    { id: 'basemap-yzt-cva', type: 'raster', source: 'basemap-yzt-cva', layout: { visibility: 'none' } },
  ],
};

/** 底图常用构造选项（Web Mercator，MapLibre 默认 EPSG:3857，无需设置 crs） */
export const basemapMapOptions: Partial<MapOptions> = {
  center: WUHAN_CENTER,
  zoom: 10,
};

/** 底图切换面板单选项 */
export interface BasemapOption {
  /** 底图名（图片文件名去扩展名，作为 basemap 事件 payload） */
  name: string;
  /** 面板缩略图 */
  image: string;
  /** basemapStyle 中对应图层 id 列表（多图层成组互斥显隐，可跨选项共享如 cva；显隐以选中项的 layerIds 为准） */
  layerIds?: readonly string[];
}

/** 底图切换面板可选项 */
export const BASEMAP_OPTIONS: readonly BasemapOption[] = [
  { name: '数公基电子地图', image: sgjElectricImg, layerIds: ['basemap-sgj-emap'] },
  { name: '数公基遥感影像', image: sgjRemoteImg, layerIds: ['basemap-sgj-yx'] },
  // vec_c 上游屏蔽期间取图失败该瓦片透明：选中=注记叠在空白底图上，授权放开后自动恢复完整
  { name: '一张图电子地图', image: yztElectricImg, layerIds: ['basemap-yzt-vec', 'basemap-yzt-cva'] },
  { name: '一张图遥感影像', image: yztRemoteImg, layerIds: ['basemap-yzt-yx', 'basemap-yzt-cva'] },
];

/** 初始选中的底图名（对应 basemapStyle 中默认可见的 'basemap-sgj-emap' 图层） */
export const DEFAULT_BASEMAP_NAME = '数公基电子地图';

/**
 * 全局共享的底图选中态（模块级单例）：overview 页面来回切换时各 VMapControls
 * 实例卸载重建，但选中记忆不丢；新地图实例样式就绪后由 VMapControls 同步到图层。
 */
export const activeBasemap = ref(DEFAULT_BASEMAP_NAME);

/**
 * 选中底图：更新共享选中态，并把可见性**写回 basemapStyle 对象本身**。
 * 页面切换时 VMap 以该对象新建地图实例——预先写入的可见性让新地图从第一帧起
 * 就是正确底图，避免「先渲染默认底图再跳到已选底图」的闪烁
 * （对已存在的地图实例无效，实例上的切换由 VMapControls 的 applyBasemap 负责）。
 */
export function selectBasemap(name: string) {
  activeBasemap.value = name;
  // 与 applyBasemap 同口径：以选中项的 layerIds 为准统一写入——cva 为电子/遥感
  // 两选项共享图层，按选项逐个写会被未选中项覆盖
  const visibleIds = BASEMAP_OPTIONS.find((option) => option.name === name)?.layerIds;
  for (const layer of basemapStyle.layers) {
    const managed = BASEMAP_OPTIONS.some((option) => option.layerIds?.includes(layer.id));
    if (!managed) continue;
    layer.layout = { ...(layer.layout ?? {}), visibility: visibleIds?.includes(layer.id) ? 'visible' : 'none' };
  }
}
