import { ref } from 'vue';
import type { LayerSpecification, MapOptions, StyleSpecification } from 'maplibre-gl';
import sgjElectricImg from '@jeesite/assets/images/vmap/数公基电子地图.webp';
import sgjRemoteImg from '@jeesite/assets/images/vmap/数公基遥感影像.webp';
import tdtElectricImg from '@jeesite/assets/images/vmap/天地图电子地图.png';
import tdtRemoteImg from '@jeesite/assets/images/vmap/天地图遥感影像.png';
import yztElectricImg from '@jeesite/assets/images/vmap/一张图电子地图.webp';
import yztRemoteImg from '@jeesite/assets/images/vmap/一张图遥感影像.webp';
import { tiandituTileUrls } from '../tianditu';
import { YZT_WMTS_TILES, ensurehbyztwmtsProtocol } from './hbyzt-wmts-protocol';
import { YZT_GATEWAY_BASE, YZT_TOKEN } from './hbyzt-gateway';
import { WUHAN_MASK_LAYER_ID, wuhanMaskLayers, wuhanMaskSources } from './wuhan-mask';
import { SGJ_SERVICE_BASE, SGJ_SERVICE_TOKEN } from './sgj-gateway';

/**
 * 底图 preset —— 各大屏 overview 页共用
 *
 * 三平台六底图（天地图电子/天地图遥感/数公基电子/数公基遥感/一张图电子/一张图遥感）：
 *  - 天地图：官方公共在线底图（token 见 web/.env 的 VITE_TIANDITU_TOKEN，需客户端
 *    出公网）。DataServer REST **_w 系列**（Web Mercator，与本地图 3857 一致，勿用
 *    _c 经纬度系列）：电子 = vec_w + cva_w 注记、遥感 = img_w + cia_w 注记，
 *    复用 ../tianditu 的 tiandituTileUrls 构造器；**默认选中「天地图电子地图」**。
 *    全国底图叠武汉市界遮罩（wuhan-mask.ts，米色盖住市外区域 + 市界描线）
 *  - 数公基：局方服务平台的 ArcGIS REST 缓存服务（ServiceAdapter），
 *    Web Mercator / EPSG:3857、256px PNG、0~19 级，token 内置在路径中；
 *    DCI 鉴权按 Referer 来源放行，统一走 /sgj 同源代理（dev vite / 生产
 *    nginx，转发时去 Referer，详见 sgj-gateway.ts）
 *  - 一张图：湖北省自然资源一张图 tip-gateway 外网代理（网关地址与 token 见
 *    hbyzt-gateway.ts）。接入遥感影像与矢量注记两项，均非标准 3857 XYZ 服务：
 *    - 遥感影像 wuhanyx：WMS 支持 SRS=EPSG:3857 服务端重投影，走 WMS GetMap
 *      + {bbox-epsg-3857} 模板（超图 enhance 版 MapLibre 支持该占位符，按每张
 *      瓦片的墨卡托范围展开）。其 WMTS 为自定义 EPSG:4326 剖分（非天地图标
 *      准网格）且 GetTile 行列校验异常，不可直接使用
 *    - 注记 cva_c：代理无 WMS 端点，WMTS 为标准天地图 EPSG:4490 剖分，与
 *      3857 网格不通用；经 hbyzt-wmts-protocol.ts 注册的 yztwmts:// 自定义协议
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
ensurehbyztwmtsProtocol();

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

/** 底图样式：天地图电子地图（默认显示）+ 其余五底图（初始隐藏，由底图切换器控制互斥显隐） */
export const basemapStyle: StyleSpecification = {
  version: 8,
  // symbol 图层文字的字形来源：web/public/fonts 自托管 PBF（Noto Sans Regular，仅放非汉字
  // 字符的 range 文件——汉字/谚文/假名由引擎 localIdeographFontFamily 本地绘制不走该服务）；
  // BASE_URL 前缀兼容 tomcat 子路径（/vuePath）部署
  glyphs: `${import.meta.env.BASE_URL}fonts/{fontstack}/{range}.pbf`,
  sources: {
    // 天地图 _w 系列（3857）；min/maxzoom 与 ../tianditu 的 _c 定义保持一致（z2~18，之上过采样）
    'basemap-tdt-vec': {
      type: 'raster',
      tiles: tiandituTileUrls('vec_w'),
      tileSize: 256,
      minzoom: 2,
      maxzoom: 18,
    },
    'basemap-tdt-cva': {
      type: 'raster',
      tiles: tiandituTileUrls('cva_w'),
      tileSize: 256,
      minzoom: 2,
      maxzoom: 18,
    },
    'basemap-tdt-img': {
      type: 'raster',
      tiles: tiandituTileUrls('img_w'),
      tileSize: 256,
      minzoom: 2,
      maxzoom: 18,
    },
    'basemap-tdt-cia': {
      type: 'raster',
      tiles: tiandituTileUrls('cia_w'),
      tileSize: 256,
      minzoom: 2,
      maxzoom: 18,
    },
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
    // 武汉市界遮罩 + 市界轮廓线（turf 在模块加载时算好，仅天地图两组底图显示）
    ...wuhanMaskSources(),
  },
  layers: [
    // 天地图电子地图（默认）：矢量底图 + 中文注记 + 武汉市界遮罩
    { id: 'basemap-tdt-vec', type: 'raster', source: 'basemap-tdt-vec' },
    { id: 'basemap-tdt-cva', type: 'raster', source: 'basemap-tdt-cva' },
    // 天地图遥感影像：影像底图 + 影像注记 + 遮罩（注记必须叠在影像之上，遮罩盖市外）
    { id: 'basemap-tdt-img', type: 'raster', source: 'basemap-tdt-img', layout: { visibility: 'none' } },
    { id: 'basemap-tdt-cia', type: 'raster', source: 'basemap-tdt-cia', layout: { visibility: 'none' } },
    // 遮罩在天地图两组底图之上、其余平台底图（本地服务）之下；默认显示
    // （天地图电子为默认底图），跟随天地图选项显隐由 selectBasemap/applyBasemap 管理
    ...wuhanMaskLayers().map((layer): LayerSpecification =>
      layer.id === WUHAN_MASK_LAYER_ID ? layer : { ...layer, layout: { visibility: 'none' as const } },
    ),
    { id: 'basemap-sgj-emap', type: 'raster', source: 'basemap-sgj-emap', layout: { visibility: 'none' } },
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
  // 天地图为全国底图，成组叠武汉市界遮罩（遮罩/描线跟随显隐）
  {
    name: '天地图电子地图',
    image: tdtElectricImg,
    layerIds: ['basemap-tdt-vec', 'basemap-tdt-cva', WUHAN_MASK_LAYER_ID],
  },
  {
    name: '天地图遥感影像',
    image: tdtRemoteImg,
    layerIds: ['basemap-tdt-img', 'basemap-tdt-cia', WUHAN_MASK_LAYER_ID],
  },
];

/** 初始选中的底图名（对应 basemapStyle 中默认可见的 'basemap-tdt-vec' + 'basemap-tdt-cva' 图层） */
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
