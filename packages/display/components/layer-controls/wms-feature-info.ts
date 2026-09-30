/**
 * WMS GetFeatureInfo 通用点击查询（OGC 标准接口，任意 WMS 图层可复用）
 *
 * 对应 ArcGIS JS API WMSLayer 的点击 identify（getFeature）能力——MapLibre 的
 * raster 瓦片无要素（queryRenderedFeatures 查不到 raster 图层），点击查询改走
 * WMS 标准的 GetFeatureInfo：以点击点为中心构造 101px 小窗口、查询中心像素，
 * 窗口像素的地理尺寸随缩放自适应（约 2 个屏幕像素的点击容差），INFO_FORMAT=
 * application/json 由 GeoServer 返回 GeoJSON Feature 属性。
 *
 * 与 kzxg-wms.ts 的出图协议相互独立：出图走 ghsjwmts:// 协议合成瓦片，查询
 * 直接请求 WMS 端点（均经 /sgj 同源代理）。
 */

/** 查询配置：WMS 端点 + 查询图层名（图层管理器注册表按图层提供） */
export interface WmsFeatureQueryConfig {
  url: string;
  layers: string;
}

/** 查询到的单个要素（GetFeatureInfo 返回的 GeoJSON Feature，只取属性） */
export interface WmsQueriedFeature {
  properties: Record<string, unknown>;
}

/** 图层点击查询结果（LayerControls emit('wms-feature') 的 payload） */
export interface WmsFeaturePayload {
  /** 图层管理器数据项 key */
  key: string;
  /** 图层显示名 */
  label: string;
  /** 点击位置 [lng, lat] */
  lngLat: [number, number];
  /** 查询到的要素（可能多个叠压；空数组 = 该处无要素） */
  features: WmsQueriedFeature[];
}

/** 查询窗口边长（像素），点击点固定在中心像素 (50, 50) */
const WINDOW_PX = 101;
/** 点击容差（屏幕像素）：窗口单个像素覆盖约该宽度的地理范围 */
const TOLERANCE_PX = 2;
/** 单次查询最多返回的要素数 */
const FEATURE_COUNT = 5;

const D2R = Math.PI / 180;

/** Web 墨卡托 256 瓦片在指定纬度/缩放的屏幕分辨率（米/像素） */
function metersPerPixel(lat: number, zoom: number): number {
  return (156543.03392 * Math.cos(lat * D2R)) / 2 ** zoom;
}

/**
 * 查询点击位置处的 WMS 要素属性；无要素 / 请求失败返回 []。
 * VERSION=1.1.1 的 BBOX 为 lon,lat 顺序，X/Y 为窗口内像素坐标。
 */
export async function getWmsFeatureInfo(
  config: WmsFeatureQueryConfig,
  lngLat: [number, number],
  zoom: number,
): Promise<WmsQueriedFeature[]> {
  const [lng, lat] = lngLat;
  // 窗口地理跨度 = 窗口像素 × 容差像素的地理尺寸（经纬向同用 111320 米/度近似，城域尺度足够）
  const span = (WINDOW_PX * TOLERANCE_PX * metersPerPixel(lat, zoom)) / 111320;
  const bbox = `${lng - span / 2},${lat - span / 2},${lng + span / 2},${lat + span / 2}`;
  const url =
    `${config.url}?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetFeatureInfo` +
    `&LAYERS=${config.layers}&QUERY_LAYERS=${config.layers}&STYLES=` +
    `&FORMAT=image/png&INFO_FORMAT=application/json&FEATURE_COUNT=${FEATURE_COUNT}` +
    `&SRS=EPSG:4326&BBOX=${bbox}&WIDTH=${WINDOW_PX}&HEIGHT=${WINDOW_PX}&X=50&Y=50`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.features) ? (data.features as WmsQueriedFeature[]) : [];
  } catch {
    return [];
  }
}
