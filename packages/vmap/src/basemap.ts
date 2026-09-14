import { ref } from 'vue';
import type { MapOptions, StyleSpecification } from 'maplibre-gl';
import sgjElectricImg from '@jeesite/assets/images/vmap/数公基电子地图.webp';
import sgjRemoteImg from '@jeesite/assets/images/vmap/数公基遥感影像.webp';
import yztElectricImg from '@jeesite/assets/images/vmap/一张图电子地图.webp';
import yztRemoteImg from '@jeesite/assets/images/vmap/一张图遥感影像.webp';

/**
 * 数公基底图 preset —— 各大屏 overview 页共用（替代原天地图 EPSG:4490 方案）
 *
 * 说明：
 *  - 数公基：局方服务平台的 ArcGIS REST 缓存服务（ServiceAdapter 代理），
 *    Web Mercator / EPSG:3857、256px PNG、0~19 级，token 内置在路径中
 *  - 一张图：湖北省自然资源一张图 tip-gateway 内网代理。其 WMTS 只有 CGCS2000
 *    经纬度网格矩阵（topLeft -180/90，如 public.wuhanyx_Matrix_0/1/2），与地图的
 *    EPSG:3857 网格不兼容；但 WMS 实测支持 SRS=EPSG:3857 服务端重投影（caps 虽只
 *    声明 4326，已用武汉 bbox 返回真影像 + 域外 bbox 返回空图对照验证），故走
 *    WMS GetMap + {bbox-epsg-3857} 模板。
 *    ⚠ 各图层可用性：遥感影像（public.wuhanyx）✅ 实测可用；vec_c 资源对当前
 *    token 未授权（401，需局方开授权）；cva_c 代理无 WMS 端点（404，WMTS 又只有
 *    4326 网格）——「一张图电子地图」= vec + cva 两图层，拿到授权/端点前选中为空白。
 *  - 地图坐标系为 MapLibre 默认的 EPSG:3857（不再设置 crs: 'EPSG:4490'），
 *    CGCS2000 经纬度的 GeoJSON 覆盖层可直接叠加
 */

/** 数公基服务根地址（ServiceAdapter 代理）与路径 token */
const SGJ_SERVICE_BASE = 'http://10.34.4.103:8010/ServiceAdapter/MAP';
const SGJ_SERVICE_TOKEN = 'a06a981392ba400a8144171aa9fb8168';

/** 一张图网关根地址（湖北省自然资源一张图 tip-gateway 内网代理）与 token */
const YZT_GATEWAY_BASE = 'http://10.13.31.129:8086/hubei-onemap/tip-gateway/proxy';
const YZT_TOKEN = 'tip-token-c07d0ecb6b78e8f7d776d0d88ed61b21';

/** 一张图 WMS 服务定义（代理路径段 + WMS 图层名） */
const YZT_SERVICES = {
  /** 矢量电子底图（⚠ 代理对当前 token 未授权，401） */
  vec: { proxy: '1044e59cc34ebea1a88e97f08bc39197/vec_c', wmsLayer: 'public.vec_c' },
  /** 矢量电子底图的中文注记，叠加在 vec 之上（⚠ 代理无 WMS 端点，404） */
  cva: { proxy: '181923f734561b5948b071044bc68f30/cva_c', wmsLayer: 'public.cva' },
  /** 武汉遥感影像（✅ 实测可用） */
  yx: { proxy: '6e45ab3070445ae4ed88881370ae35cb/wuhanyx', wmsLayer: 'public.wuhanyx' },
} as const;

/** 武汉市中心（大屏各 overview 页共用初始视口中心） */
export const WUHAN_CENTER: [number, number] = [114.2761773, 30.5344542];

/** 构建 ArcGIS REST 瓦片模板（注意 ArcGIS 的路径顺序是 /{z}/{y}/{x}） */
function sgjTileUrls(service: string): string[] {
  return [`${SGJ_SERVICE_BASE}/${service}/${SGJ_SERVICE_TOKEN}/tile/{z}/{y}/{x}`];
}

/**
 * 构建一张图 WMS 瓦片模板（{bbox-epsg-3857} 由 MapLibre 按瓦片墨卡托范围展开，
 * 服务端重投影，几何与 3857 地图精确对齐）。
 */
function yztWmsTileUrls(service: (typeof YZT_SERVICES)[keyof typeof YZT_SERVICES]): string[] {
  return [
    `${YZT_GATEWAY_BASE}/${service.proxy}/wms?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap` +
      `&LAYERS=${service.wmsLayer}&STYLES=&FORMAT=image/png&WIDTH=256&HEIGHT=256` +
      `&SRS=EPSG:3857&BBOX={bbox-epsg-3857}&token=${YZT_TOKEN}`,
  ];
}

/** 数公基底图样式：电子地图（默认显示）+ 遥感影像（初始隐藏，由底图切换器控制互斥显隐） */
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
    'basemap-yzt-vec': {
      type: 'raster',
      tiles: yztWmsTileUrls(YZT_SERVICES.vec),
      tileSize: 256,
      minzoom: 0,
      maxzoom: 19,
    },
    'basemap-yzt-cva': {
      type: 'raster',
      tiles: yztWmsTileUrls(YZT_SERVICES.cva),
      tileSize: 256,
      minzoom: 0,
      maxzoom: 19,
    },
    'basemap-yzt-yx': {
      type: 'raster',
      tiles: yztWmsTileUrls(YZT_SERVICES.yx),
      tileSize: 256,
      minzoom: 0,
      maxzoom: 19,
    },
  },
  layers: [
    { id: 'basemap-sgj-emap', type: 'raster', source: 'basemap-sgj-emap' },
    { id: 'basemap-sgj-yx', type: 'raster', source: 'basemap-sgj-yx', layout: { visibility: 'none' } },
    { id: 'basemap-yzt-yx', type: 'raster', source: 'basemap-yzt-yx', layout: { visibility: 'none' } },
    { id: 'basemap-yzt-vec', type: 'raster', source: 'basemap-yzt-vec', layout: { visibility: 'none' } },
    // 注记必须叠在对应底图之上
    { id: 'basemap-yzt-cva', type: 'raster', source: 'basemap-yzt-cva', layout: { visibility: 'none' } },
  ],
};

/** 数公基底图常用构造选项（Web Mercator，MapLibre 默认 EPSG:3857，无需设置 crs） */
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
  /** basemapStyle 中对应图层 id 列表（多图层成组互斥显隐，如一张图电子地图=底图+注记） */
  layerIds?: readonly string[];
}

/** 底图切换面板可选项 */
export const BASEMAP_OPTIONS: readonly BasemapOption[] = [
  { name: '数公基电子地图', image: sgjElectricImg, layerIds: ['basemap-sgj-emap'] },
  { name: '数公基遥感影像', image: sgjRemoteImg, layerIds: ['basemap-sgj-yx'] },
  { name: '一张图电子地图', image: yztElectricImg, layerIds: ['basemap-yzt-vec', 'basemap-yzt-cva'] },
  { name: '一张图遥感影像', image: yztRemoteImg, layerIds: ['basemap-yzt-yx'] },
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
  for (const layer of basemapStyle.layers) {
    const owner = BASEMAP_OPTIONS.find((option) => option.layerIds?.includes(layer.id));
    if (owner) {
      layer.layout = { ...(layer.layout ?? {}), visibility: owner.name === name ? 'visible' : 'none' };
    }
  }
}
