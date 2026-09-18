/**
 * 武汉市界遮罩 —— 天地图底图配套
 *
 * 做法学自 one-map-public 的 wuhan-mask 组件：
 * - 遮罩 = 全球矩形 bbox（纬度 ±85，3857 投影 |lat|>85.06° 趋向 Infinity 会
 *   使多边形几何无效）减去整市多边形（turf.difference 差集），米色面盖住
 *   武汉以外区域——天地图是全国底图，大屏只关心武汉市域
 * - 市界轮廓线单独一层描边不填充，压在遮罩之上
 * - wuhan.json 为 13 区边界 FeatureCollection，turf.union 逐区合并为整市
 *   多边形（约 120ms）、turf.simplify 简化，结果模块级缓存只算一次
 * - GeoJSON 直接交给 MapLibre（内部自动 4326→3857），无需手动重投影
 * - 与组件版不同：这里作为 basemapStyle 静态样式的一部分（顶层 fill/line
 *   图层），仅叠加在天地图电子/遥感两组底图之上，其余底图（数公基/一张图
 *   为武汉市本地服务）不叠——通过 BASEMAP_OPTIONS 的 layerIds 成组显隐
 */
import { bboxPolygon, difference, simplify, union } from '@turf/turf';
import type { Feature, MultiPolygon, Polygon } from 'geojson';
import type { FillLayerSpecification, LineLayerSpecification } from 'maplibre-gl';
import wuhanGeo from '@jeesite/assets/data/wuhan.json';

/** 遮罩配色：米色面，盖住武汉以外区域 */
const MASK_FILL = '#f0f2f5';

// 市轮廓线配色（轮廓线图层暂不启用，恢复时连同 wuhanMaskLayers 的注释块一起放开）
// const OUTLINE_COLOR = '#d9d9d9';
// const OUTLINE_WIDTH = 2;

/**
 * 全球外接矩形（经纬度 bbox）。纬度限制在 ±85° 而非 ±90°，因为 EPSG:3857
 * 投影在 |lat|>85.06° 时坐标趋向 Infinity，导致多边形几何无效、无法渲染。
 */
const WORLD_BBOX = [-180, -85, 180, 85] as const;

/** 遮罩/市界图层 id（在 basemapStyle.layers 中，供天地图选项 layerIds 引用） */
export const WUHAN_MASK_LAYER_ID = 'basemap-wuhan-mask';
export const WUHAN_OUTLINE_LAYER_ID = 'basemap-wuhan-outline';

let cityOutlineCache: AreaFeature | null | undefined;
let maskCache: Feature | null | undefined;

type AreaFeature = Feature<Polygon | MultiPolygon>;

/** 将 wuhan.json 各区合并为整市多边形并简化（结果缓存，union 约 120ms 只算一次） */
function getCityOutline(): AreaFeature | null {
  if (cityOutlineCache === undefined) {
    const { features } = wuhanGeo as unknown as { features: AreaFeature[] };
    // turf v7 的多态签名会把返回 widen 成 AllGeoJSON，此处输入确定是面要素集合
    const merged = features.length ? (union({ type: 'FeatureCollection', features }) as AreaFeature | null) : null;
    cityOutlineCache = merged ? (simplify(merged, { tolerance: 0.001, highQuality: false }) as AreaFeature) : null;
  }
  return cityOutlineCache;
}

/** 生成遮罩几何：全球矩形 bbox 减去整市多边形（结果缓存） */
function getMaskGeometry(): Feature | null {
  if (maskCache === undefined) {
    const city = getCityOutline();
    // bboxPolygon 直接收 bbox 数组；turf.bbox 接收 GeoJSON 对象，勿混用
    const world = bboxPolygon([...WORLD_BBOX]);
    maskCache = city ? difference({ type: 'FeatureCollection', features: [world, city] }) : null;
  }
  return maskCache;
}

/** 遮罩面图层（米色盖住武汉以外区域），叠加在天地图底图之上 */
export function wuhanMaskLayers(): Array<FillLayerSpecification | LineLayerSpecification> {
  const mask = getMaskGeometry();
  const layers: Array<FillLayerSpecification | LineLayerSpecification> = [];
  if (mask) {
    layers.push({
      id: WUHAN_MASK_LAYER_ID,
      type: 'fill',
      source: 'basemap-wuhan-mask',
      paint: { 'fill-color': MASK_FILL, 'fill-opacity': 1 },
    });
  }
  // 市轮廓线（描市界不填充）暂不启用，需要时在 layers 里恢复
  // if (getCityOutline()) {
  //   layers.push({
  //     id: WUHAN_OUTLINE_LAYER_ID,
  //     type: 'line',
  //     source: 'basemap-wuhan-outline',
  //     paint: { 'line-color': OUTLINE_COLOR, 'line-width': OUTLINE_WIDTH },
  //   });
  // }
  return layers;
}

/**
 * 遮罩的 geojson source 定义（数据为模块级缓存的 turf 结果）。
 * 须挂到 basemapStyle.sources；无数据时返回空对象（遮罩静默缺失不报错）。
 */
export function wuhanMaskSources(): StyleSources {
  const mask = getMaskGeometry();
  const sources: StyleSources = {};
  if (mask) {
    sources['basemap-wuhan-mask'] = { type: 'geojson', data: mask as unknown as GeoJSON.Feature };
  }
  return sources;
}

interface StyleSources {
  [sourceId: string]: { type: 'geojson'; data: GeoJSON.Feature };
}
