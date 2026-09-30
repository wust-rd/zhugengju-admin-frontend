/**
 * 规划数据·控制性详细规划 WMS 图层接入（ghsjwms:// 协议 + source/layer 定义）
 *
 * 服务：局方 ServiceAdapter 的 GeoServer WMS（与数公基底图同主机，统一走 /sgj
 * 同源代理去 Referer 鉴权，代理配置见 vmap src/basemap/sgj-gateway.ts 与
 * web/.env 的 VITE_PROXY）。图层 GHSJ_KZXXXGHSJ（规划数据_控制性详细规划数据），
 * 原始接法参考项目根目录「加载wms地图.html」（ArcGIS WMSLayer + EPSG:4490）。
 *
 * 为什么不直接用 raster + {bbox-epsg-3857} 模板（一张图遥感影像的接法）：
 * 该服务对 SRS=EPSG:3857 的 GetMap 虽返回 200，但内容恒为空白（不做服务端
 * 重投影渲染），仅 4326/4490 经纬度直出有效（已实测）；而超图 enhance 版
 * MapLibre 的 bbox 占位符只有 {bbox-epsg-3857}，且底图为 EPSG:3857 网格。
 * 故参照 vmap src/basemap/hbyzt-wmts-protocol.ts 的合成思路注册 ghsjwms://：
 *
 * 对每个 3857 瓦片，按其经纬度范围向 WMS 请求 4326 GetMap（2 倍采样提高
 * 清晰度），再条带重采样合成对齐 3857 网格的 256×256 PNG——经度方向两投影
 * 均线性，整幅一次映射；纬度方向 4326 线性、墨卡托非线性，竖切 STRIPS 条带
 * 逐段 drawImage（条带内线性近似，24 条带在中纬度误差 < 0.1px）。WMS 任意
 * bbox 出图，无需像 WMTS 版先拼马赛克。
 */
import { addProtocol } from 'maplibre-gl';
import type { LayerSpecification, RasterSourceSpecification } from 'maplibre-gl';

/** WMS 端点（/sgj 前缀代理到 10.34.4.103:8010，勿写内网绝对地址：局域网页面来源会被 DCI 鉴权 401） */
const WMS_URL = '/sgj/ServiceAdapter/MAP/GHSJ/da4dd42f59b24cd4b0b74f1e23985100/wms';

/** WMS 图层名（GetCapabilities：规划数据_控制性详细规划数据） */
const WMS_LAYER = 'GHSJ_KZXXXGHSJ';

/** 图层数据范围（GetCapabilities EX_GeographicBoundingBox，[west, south, east, north]）；范围外瓦片直接空白，不请求服务 */
const EXTENT = [113.95207977294922, 30.31393051147461, 114.59874725341797, 30.891433715820312] as const;

/** source / layer id（图层管理器与页面其他图层操作共用） */
export const KZXG_SOURCE_ID = 'kzxg-ghsj';
export const KZXG_LAYER_ID = 'kzxg-ghsj';

/** 图层管理器数据项 key（layers 开关项 / 数据菜单分类与地图图层对应关系） */
export const KZXG_KEY = 'kzxg';

const TILE = 256;
/** 服务端单边采样像素（2 倍超采样，重采样后线条更清晰） */
const SRC = 512;
/** 纬度方向条带数 */
const STRIPS = 24;

const R2D = 180 / Math.PI;
const D2R = Math.PI / 180;

/** 3857 瓦片 x 列号 → 西边界经度 */
function tile2lon(x: number, z: number): number {
  return (x / 2 ** z) * 360 - 180;
}

/** 3857 瓦片 y 行号 → 北边界纬度（y+1 为南边界） */
function tile2lat(y: number, z: number): number {
  return R2D * Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / 2 ** z)));
}

/** 纬度 → 墨卡托 Y（任意基准，只用于差值比例） */
function mercY(lat: number): number {
  return Math.log(Math.tan(Math.PI / 4 + (lat * D2R) / 2));
}

// ── 空白瓦片 Blob 单例（协议不能返回空值，须物化透明 PNG）──
let emptyTileBlob: Blob | null = null;

async function emptyTileData(): Promise<ArrayBuffer> {
  if (!emptyTileBlob) {
    const canvas = document.createElement('canvas');
    canvas.width = TILE;
    canvas.height = TILE;
    emptyTileBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  }
  // 每次取新副本：返回的 ArrayBuffer 可能被 MapLibre 转移（detach），不能复用
  return emptyTileBlob!.arrayBuffer();
}

/** 请求 4326 GetMap 并条带重采样，合成与 3857 瓦片对齐的 256×256 PNG；越界/失败返回空白瓦片 */
async function compose3857Tile(z: number, x: number, y: number, signal: AbortSignal): Promise<ArrayBuffer> {
  const lonW = tile2lon(x, z);
  const lonE = tile2lon(x + 1, z);
  const latN = tile2lat(y, z);
  const latS = tile2lat(y + 1, z);

  if (lonE < EXTENT[0] || lonW > EXTENT[2] || latS > EXTENT[3] || latN < EXTENT[1]) {
    return emptyTileData();
  }

  // 1.1.1 的 BBOX 为 lon,lat 顺序；TRANSPARENT 让图斑外区域透出底图
  const url =
    `${WMS_URL}?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=${WMS_LAYER}&STYLES=` +
    `&FORMAT=image/png&TRANSPARENT=TRUE&WIDTH=${SRC}&HEIGHT=${SRC}&SRS=EPSG:4326` +
    `&BBOX=${lonW},${latS},${lonE},${latN}`;

  let bmp: ImageBitmap;
  try {
    const res = await fetch(url, { signal });
    // 200 但非图（ServiceException XML 等）时 createImageBitmap 抛错，走同兜底
    bmp = await createImageBitmap(await res.blob());
  } catch {
    return emptyTileData();
  }

  // 条带采样：源图纬度线性（首行 latN、末行 latS），目标 y 按墨卡托比例
  const out = document.createElement('canvas');
  out.width = TILE;
  out.height = TILE;
  const ctx = out.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context 不可用');
  const mN = mercY(latN);
  const mS = mercY(latS);
  const toDestY = (lat: number) => ((mN - mercY(lat)) / (mN - mS)) * TILE;

  for (let s = 0; s < STRIPS; s++) {
    const sy0 = (s / STRIPS) * SRC;
    const sy1 = ((s + 1) / STRIPS) * SRC;
    const lat0 = latN - (sy0 / SRC) * (latN - latS);
    const lat1 = latN - (sy1 / SRC) * (latN - latS);
    ctx.drawImage(bmp, 0, sy0, SRC, sy1 - sy0, 0, toDestY(lat0), TILE, toDestY(lat1) - toDestY(lat0));
  }
  bmp.close();

  return await new Promise<ArrayBuffer>((resolve, reject) => {
    out.toBlob((blob) => (blob ? resolve(blob.arrayBuffer()) : reject(new Error('canvas toBlob 失败'))), 'image/png');
  });
}

/** raster source 定义（tiles 模板经 ghsjwms:// 协议出图） */
export const KZXG_SOURCE: RasterSourceSpecification = {
  type: 'raster',
  tiles: ['ghsjwms://kzxg/{z}/{x}/{y}'],
  tileSize: TILE,
  // z8 以下武汉只占瓦片一角、图斑缩成色尘；18 级之上服务细节有限，靠源图过采样撑
  minzoom: 8,
  maxzoom: 18,
};

/** raster layer 定义（叠加在底图之上；透明度让底图道路/注记微透） */
export const KZXG_LAYER: LayerSpecification = {
  id: KZXG_LAYER_ID,
  type: 'raster',
  source: KZXG_SOURCE_ID,
  paint: {
    'raster-opacity': 0.9,
  },
};

let registered = false;

/**
 * 注册 ghsjwms:// 协议（幂等）。本模块被引用即完成注册，保证任何使用
 * KZXG_SOURCE 的地图实例开始请求瓦片前协议已就绪（与 vmap basemap 的
 * ensurehbyztwmtsProtocol 同一模式）。
 */
export function ensureGhsjWmsProtocol(): void {
  if (registered) return;
  registered = true;
  addProtocol('ghsjwms', async (params, abortController) => {
    // ghsjwms://{layer}/{z}/{x}/{y} 展开后含 "://"，按 "/" 切分会多出空段，用正则取参
    const m = /^ghsjwms:\/\/kzxg\/(\d+)\/(\d+)\/(\d+)$/.exec(params.url);
    if (!m) throw new Error(`ghsjwms: 无法解析瓦片地址 ${params.url}`);
    const data = await compose3857Tile(Number(m[1]), Number(m[2]), Number(m[3]), abortController.signal);
    return { data };
  });
}

ensureGhsjWmsProtocol();
