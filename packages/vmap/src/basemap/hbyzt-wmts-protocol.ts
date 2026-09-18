/**
 * 一张图 tdt 系列 WMTS（4490 网格）瓦片合成协议（hbyztwmts://{service}/{z}/{x}/{y}）
 *
 * 背景：
 * - vec_c / cva_c 为同构的 tdt WMTS 服务：代理无 WMS 端点（/wms 404，/wmts
 *   路径带 WMS 参数 GetMap 返 400），网格为天地图 EPSG:4490 剖分：左上角
 *   (90°N, 180°W)、L 级 = 2^L 列 × 2^(L-1) 行（caps：L10=1024×512、
 *   L19=524288×262144），与地图的 EPSG:3857 墨卡托剖分行号不通用，不能直接
 *   按 {z}/{x}/{y} 模板引用
 * - 通过 MapLibre addProtocol 注册 hbyztwmts:// 协议：对每个 3857 瓦片，按其
 *   经纬度范围取同级别的 4490 源瓦片（1 列 × 1~2 行），重采样合成一张与
 *   3857 瓦片精确对齐的 256×256 PNG
 *
 * 合成流水线（两步）：
 * 1. 拼马赛克——把源瓦片按 4490 全局像素坐标拼到一张大 Canvas；
 * 2. 条带采样——经度方向两种网格均线性，整幅一次映射；纬度方向 4490 线性、
 *    墨卡托非线性，把源竖切成 STRIPS 条带逐段 drawImage（条带内按线性
 *    近似，24 条带在中纬度误差 < 0.1 像素）。采样矩形由投影直接算出，
 *    源瓦片间的裁剪拼合由马赛克 Canvas 天然完成
 *
 * 优化：
 * - 源瓦片 LRU 缓存：4490 行高约为 3857 瓦片两倍，纵向相邻目标瓦片常共享
 *   同一张源瓦片，缓存解码结果避免重复请求与解码
 * - 空白瓦片 Blob 单例：无有效源瓦片时（超出覆盖范围 / vec 上游 401 屏蔽）
 *   直接物化返回，零合成开销；每次 arrayBuffer() 取新副本防转移失效
 * - 源瓦片数上限保护：超出上限说明覆盖计算异常（低 zoom / 高纬），返回空白
 * - 源瓦片取图失败仅该块缺失（透明），不失败整张瓦片——透明底叠加层适用；
 *   vec_c 授权放开后无需改码自动出图
 * - 服务端对越界行列不报错、直接返回空白图，网格参数以 caps 为准
 */
import { addProtocol } from '../maplibre-gl-shim';
import { YZT_CVA_PROXY, YZT_VEC_PROXY, YZT_GATEWAY_BASE, YZT_TOKEN } from './hbyzt-gateway';

/** 协议支持的 tdt 服务（URL 段名 → 代理路径段 + WMTS 图层名） */
const SERVICES = {
  cva: { proxy: YZT_CVA_PROXY, layer: 'cva' },
  vec: { proxy: YZT_VEC_PROXY, layer: 'vec' },
} as const;

type ServiceName = keyof typeof SERVICES;

const TILE = 256;
const STRIPS = 24;
/** 源瓦片 LRU 缓存容量（256×256 解码位图约 256KB/张） */
const CACHE_MAX = 32;
/** 单张目标瓦片允许拉取的源瓦片数上限（正常 ≤ 1 列 × 2 行） */
const MAX_SOURCE_TILES = 12;

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

/** 纬度 → 墨卡托 Y（ln(tan(π/4+φ/2))，任意基准，只用于差值比例） */
function mercY(lat: number): number {
  return Math.log(Math.tan(Math.PI / 4 + (lat * D2R) / 2));
}

// ── 源瓦片 LRU 缓存：Map 按插入序，命中时 delete+set 移到末尾，满时淘汰首位 ──
const tileCache = new Map<string, ImageBitmap>();

function cacheGet(url: string): ImageBitmap | undefined {
  const bmp = tileCache.get(url);
  if (bmp) {
    tileCache.delete(url);
    tileCache.set(url, bmp);
  }
  return bmp;
}

function cacheSet(url: string, bmp: ImageBitmap): void {
  if (tileCache.size >= CACHE_MAX) {
    const oldest = tileCache.keys().next().value;
    if (oldest !== undefined) tileCache.delete(oldest);
  }
  tileCache.set(url, bmp);
}

// ── 空白瓦片 Blob 单例 ──
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

/** 取一张 4490 源瓦片（带 LRU 缓存）；失败返回 null（该块缺失，不影响其余部分） */
async function fetchSourceTile(
  service: (typeof SERVICES)[ServiceName],
  level: number,
  row: number,
  col: number,
  signal: AbortSignal,
): Promise<ImageBitmap | null> {
  const url =
    `${YZT_GATEWAY_BASE}/${service.proxy}/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0` +
    `&LAYER=${service.layer}&STYLE=default&FORMAT=tiles&TILEMATRIXSET=c` +
    `&TILEMATRIX=${level}&TILEROW=${row}&TILECOL=${col}&token=${YZT_TOKEN}`;
  const cached = cacheGet(url);
  if (cached) return cached;
  try {
    const res = await fetch(url, { signal });
    if (!res.ok) return null;
    const bmp = await createImageBitmap(await res.blob());
    cacheSet(url, bmp);
    return bmp;
  } catch {
    return null;
  }
}

/** 把 3857 瓦片 (z, x, y) 对应的 4490 源瓦片合成到 256×256 PNG */
async function compose3857Tile(
  service: (typeof SERVICES)[ServiceName],
  z: number,
  x: number,
  y: number,
  signal: AbortSignal,
): Promise<ArrayBuffer> {
  const lonW = tile2lon(x, z);
  const lonE = tile2lon(x + 1, z);
  const latN = tile2lat(y, z);
  const latS = tile2lat(y + 1, z);

  // 天地图 4490 剖分：L 级 = 2^L 列 × 2^(L-1) 行，列号与 3857 同级瓦片完全
  // 一致且等宽（每瓦片 1 列），行方向 4490 瓦片约为 3857 瓦片的两倍高（1~2 行）。
  // WMTS 级别从 1 起，z=0 显示瓦片用 1 级源合成
  const level = Math.max(z, 1);
  const dLon = 360 / 2 ** level;
  const dLat = 180 / 2 ** (level - 1);
  // -1e-9 容差：两种网格经度边界精确对齐，浮点恰好落在整数边界时须取左闭区间
  const col0 = Math.floor((lonW + 180) / dLon);
  const col1 = Math.floor((lonE + 180 - 1e-9) / dLon);
  const row0 = Math.floor((90 - latN) / dLat);
  const row1 = Math.floor((90 - latS - 1e-9) / dLat);

  if ((col1 - col0 + 1) * (row1 - row0 + 1) > MAX_SOURCE_TILES) {
    return emptyTileData();
  }

  // 覆盖本瓦片的源瓦片矩阵，并行取图；失败的瓦片在马赛克上留透明洞
  const rowList = Array.from({ length: row1 - row0 + 1 }, (_, i) => row0 + i);
  const colList = Array.from({ length: col1 - col0 + 1 }, (_, i) => col0 + i);
  const grid = await Promise.all(
    rowList.map(async (r) => await Promise.all(colList.map((c) => fetchSourceTile(service, level, r, c, signal)))),
  );
  if (grid.every((row) => row.every((bmp) => bmp === null))) {
    return emptyTileData();
  }

  // 第一步：源瓦片按 4490 全局像素坐标拼成马赛克（局部原点 = (col0, row0)）
  const mosaic = document.createElement('canvas');
  mosaic.width = colList.length * TILE;
  mosaic.height = rowList.length * TILE;
  const mctx = mosaic.getContext('2d');
  if (!mctx) throw new Error('canvas 2d context 不可用');
  rowList.forEach((r, i) => {
    colList.forEach((c, j) => {
      const bmp = grid[i][j];
      if (bmp) mctx.drawImage(bmp, (c - col0) * TILE, (r - row0) * TILE);
    });
  });

  // 第二步：条带采样。全局源像素坐标 ↔ 经纬度：
  //   gX(lon) = (lon+180)/dLon*TILE（线性，目标整幅宽一次映射）
  //   gY(lat) = (90-lat)/dLat*TILE（条带内线性近似）
  const out = document.createElement('canvas');
  out.width = TILE;
  out.height = TILE;
  const ctx = out.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context 不可用');

  const mN = mercY(latN);
  const mS = mercY(latS);
  const toDestY = (lat: number) => ((mN - mercY(lat)) / (mN - mS)) * TILE;
  const gX0 = ((lonW + 180) / dLon) * TILE;
  const gX1 = ((lonE + 180) / dLon) * TILE;
  const gYN = ((90 - latN) / dLat) * TILE;
  const gYS = ((90 - latS) / dLat) * TILE;
  const originX = col0 * TILE;
  const originY = row0 * TILE;

  for (let s = 0; s < STRIPS; s++) {
    const sy0 = gYN + ((gYS - gYN) * s) / STRIPS;
    const sy1 = gYN + ((gYS - gYN) * (s + 1)) / STRIPS;
    const lat0 = 90 - (sy0 / TILE) * dLat;
    const lat1 = 90 - (sy1 / TILE) * dLat;
    const dy0 = toDestY(lat0);
    const dy1 = toDestY(lat1);
    ctx.drawImage(mosaic, gX0 - originX, sy0 - originY, gX1 - gX0, sy1 - sy0, 0, dy0, TILE, dy1 - dy0);
  }

  return await new Promise<ArrayBuffer>((resolve, reject) => {
    out.toBlob((blob) => (blob ? resolve(blob.arrayBuffer()) : reject(new Error('canvas toBlob 失败'))), 'image/png');
  });
}

/** basemap 中 tdt 系列 source 的 tiles 模板（{z}/{x}/{y} 由 MapLibre 替换后进入本协议） */
export const YZT_WMTS_TILES: Record<ServiceName, string> = {
  cva: 'hbyztwmts://cva/{z}/{x}/{y}',
  vec: 'hbyztwmts://vec/{z}/{x}/{y}',
};

let registered = false;

/**
 * 注册 hbyztwmts:// 协议（幂等）。在 basemap.ts 模块顶层调用，保证任何引用
 * basemapStyle 的地图实例创建前协议已就绪。
 */
export function ensurehbyztwmtsProtocol(): void {
  if (registered) return;
  registered = true;
  addProtocol('hbyztwmts', async (params, abortController) => {
    // 注意 hbyztwmts://{service}/{z}/{x}/{y} 展开后含 "://"，按 "/" 切分会多出
    // 空段，须用正则取参
    const m = /^hbyztwmts:\/\/(cva|vec)\/(\d+)\/(\d+)\/(\d+)$/.exec(params.url);
    if (!m) throw new Error(`hbyztwmts: 无法解析瓦片地址 ${params.url}`);
    const data = await compose3857Tile(
      SERVICES[m[1] as ServiceName],
      Number(m[2]),
      Number(m[3]),
      Number(m[4]),
      abortController.signal,
    );
    return { data };
  });
}
