/**
 * 市住更局 —— 名城保护 · 名城范围线（面域）数据模型与加载器
 *
 * 三类范围面（数据来自本目录 data/ 下三个 geojson，经 `?url` 导入 + 运行时 fetch）：
 *  - 历史城区（historic-urban-area）：武昌古城 / 汉口近代 / 汉阳古城，名称在 Layer 字段；
 *  - 历史文化名村（historic-village）：黄陂大余湾村核心保护范围 + 建设控制地带，名称在 MC 字段；
 *  - 历史文化街区（historic-block）：昙华林 / 江汉路及中山大道等 10 片，名称在「名称」字段。
 *
 * 三类数据字段名与面积单位（MJ 有 km²/m²/万m² 三种）不一致，这里统一归一化到
 * CityScopeFeatureProps：面积一律取 Shape_Area（m²），名称拆出「基础名 + 保护范围类型」。
 * 坐标为 CGCS2000 经纬度，与地图 crs: EPSG:4490 一致，可直接作为 geojson source 数据。
 */
import historicUrbanAreaUrl from './data/historic-urban-area.geojson?url';
import historicVillageUrl from './data/historic-village.geojson?url';
import historicBlockUrl from './data/historic-block.geojson?url';

/** 范围线类别（同时作为图层/图例/卡片的区分键） */
export type CityScopeKind = 'historicUrbanArea' | 'historicVillage' | 'historicBlock';

/** 图层定义（配色与 id 地图图层 / 图例 / 卡片共用） */
export type CityScopeLayerDef = {
  kind: CityScopeKind;
  /** 图例 / 卡片展示名 */
  label: string;
  /** 面填充色 */
  color: string;
  /** 描边色 */
  lineColor: string;
  /** MapLibre source id（fill/line 图层 id 由 cityScopeFillLayerId 等派生） */
  sourceId: string;
  /** geojson 资源地址（`?url` 导入） */
  url: string;
};

export const CITY_SCOPE_LAYERS: CityScopeLayerDef[] = [
  {
    kind: 'historicUrbanArea',
    label: '历史城区',
    color: '#FB923C',
    lineColor: '#F97316',
    sourceId: 'city-scope-historic-urban-area',
    url: historicUrbanAreaUrl,
  },
  {
    kind: 'historicVillage',
    label: '历史文化名村',
    color: '#4ADE80',
    lineColor: '#22C55E',
    sourceId: 'city-scope-historic-village',
    url: historicVillageUrl,
  },
  {
    kind: 'historicBlock',
    label: '历史文化街区',
    color: '#A78BFA',
    lineColor: '#8B5CF6',
    sourceId: 'city-scope-historic-block',
    url: historicBlockUrl,
  },
];

/** 类别 → 图层定义 */
export function cityScopeLayerDefOf(kind: CityScopeKind): CityScopeLayerDef {
  const def = CITY_SCOPE_LAYERS.find((l) => l.kind === kind);
  if (!def) throw new Error(`unknown city scope kind: ${kind}`);
  return def;
}

/** fill / line 图层 id（点击查询、显隐控制、空白点击判定都用它） */
export const cityScopeFillLayerId = (sourceId: string) => `${sourceId}-fill`;
export const cityScopeLineLayerId = (sourceId: string) => `${sourceId}-line`;

/** 归一化后的要素属性（写入 GeoJSON properties，点击查询后直接读它渲染卡片） */
export type CityScopeFeatureProps = {
  kind: CityScopeKind;
  /** 要素编号（1 起，与 feature.id 一致；feature-state 选中高亮定位用） */
  fid: number;
  /** 基础名（去掉「核心保护范围 / 建设控制地带」后缀，如「昙华林」） */
  name: string;
  /** 数据原始名称（如「昙华林核心保护范围」） */
  fullName: string;
  /** 保护范围类型（核心保护范围 / 建设控制地带，城区无此级为空） */
  scope: string;
  /** 所属区县（仅名村数据带 XZQMC，其余为空） */
  district: string;
  /** 面积（m²，统一取 Shape_Area） */
  areaM2: number;
  /** 界线周长（m，Shape_Leng；Shape_Le_1/2 为其重复副本不取） */
  perimeterM: number;
  /** 标识码（仅名村数据带 BSM，其余为空） */
  code: string;
  /** 备注（名村为「国家级,历史文化名村」，街区为类别，城区为空） */
  note: string;
};

/** 面积展示：≥1km² 用 km²，≥1 万 m² 用 万 m²，其余用 m² */
export function formatArea(m2: number): string {
  if (!Number.isFinite(m2) || m2 <= 0) return '—';
  if (m2 >= 1e6) return `${(m2 / 1e6).toFixed(2)} km²`;
  if (m2 >= 1e4) return `${(m2 / 1e4).toFixed(2)} 万 m²`;
  return `${m2.toFixed(0)} m²`;
}

/** 周长展示：≥1km 用 km，其余用 m */
export function formatPerimeter(m: number): string {
  if (!Number.isFinite(m) || m <= 0) return '—';
  if (m >= 1000) return `${(m / 1000).toFixed(2)} km`;
  return `${m.toFixed(0)} m`;
}

// ---- 轻量 GeoJSON 类型（GeoJSON 命名空间在本项目 tsconfig 环境不可用，自定义最小集） ----

export type CityScopeGeometry = {
  type: 'Polygon' | 'MultiPolygon';
  coordinates: unknown;
};

export type CityScopeFeature = {
  type: 'Feature';
  /** 顺序编号（自 1 起，便于调试） */
  id?: number;
  properties: CityScopeFeatureProps;
  geometry: CityScopeGeometry;
};

export type CityScopeFeatureCollection = {
  type: 'FeatureCollection';
  features: CityScopeFeature[];
};

/** 一类范围线：图层定义 + 归一化数据 + 面域经纬度范围 [minLng, minLat, maxLng, maxLat] */
export type CityScopeLayerData = {
  def: CityScopeLayerDef;
  fc: CityScopeFeatureCollection;
  bounds: [number, number, number, number] | null;
};

/** 原始要素（字段三类各异，统一按 Record 读） */
type ScopeRawFeature = {
  type?: string;
  properties?: Record<string, unknown> | null;
  geometry?: { type?: string; coordinates?: unknown } | null;
};

/** 名称后缀 → 保护范围类型（街区/名村的名称以二者之一结尾） */
const SCOPE_SUFFIX = /(核心保护范围|建设控制地带)$/;

/** 三类数据的原始名称取值字段不同 */
const NAME_FIELD: Record<CityScopeKind, string> = {
  historicUrbanArea: 'Layer',
  historicVillage: 'MC',
  historicBlock: '名称',
};

/** 归一化单个要素属性（面积单位不一，统一取 Shape_Area 即 m²；fid 由集合层按序号补齐） */
function normalizeProps(kind: CityScopeKind, raw: Record<string, unknown>): Omit<CityScopeFeatureProps, 'fid'> {
  const def = cityScopeLayerDefOf(kind);
  const fullName = String(raw[NAME_FIELD[kind]] ?? '').trim() || def.label;
  const suffix = SCOPE_SUFFIX.exec(fullName);

  let note = '';
  if (kind === 'historicVillage') note = String(raw['BZ'] ?? '').trim();
  if (kind === 'historicBlock') note = String(raw['类别'] ?? '').trim();

  return {
    kind,
    name: suffix ? fullName.slice(0, suffix.index) : fullName,
    fullName,
    scope: suffix ? suffix[1] : '',
    district: String(raw['XZQMC'] ?? '').trim(),
    areaM2: Number(raw['Shape_Area'] ?? 0) || 0,
    perimeterM: Number(raw['Shape_Leng'] ?? 0) || 0,
    code: String(raw['BSM'] ?? '').trim(),
    note,
  };
}

/** 遍历（多）面坐标，收缩经纬度范围 */
function extendBounds(
  bounds: { minLng: number; minLat: number; maxLng: number; maxLat: number },
  coords: unknown,
): void {
  if (!Array.isArray(coords) || coords.length === 0) return;
  if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
    const [lng, lat] = coords as number[];
    bounds.minLng = Math.min(bounds.minLng, lng);
    bounds.maxLng = Math.max(bounds.maxLng, lng);
    bounds.minLat = Math.min(bounds.minLat, lat);
    bounds.maxLat = Math.max(bounds.maxLat, lat);
    return;
  }
  for (const c of coords) extendBounds(bounds, c);
}

/** 归一化一类原始 FeatureCollection */
function normalizeCollection(
  def: CityScopeLayerDef,
  raw: { features?: ScopeRawFeature[] },
): CityScopeLayerData {
  const bounds = { minLng: Infinity, minLat: Infinity, maxLng: -Infinity, maxLat: -Infinity };

  const fc: CityScopeFeatureCollection = {
    type: 'FeatureCollection',
    features: (raw.features ?? [])
      .filter((f) => f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon')
      .map((f, i) => {
        extendBounds(bounds, f.geometry?.coordinates);
        return {
          type: 'Feature' as const,
          id: i + 1,
          properties: { ...normalizeProps(def.kind, f.properties ?? {}), fid: i + 1 },
          geometry: { type: f.geometry!.type as 'Polygon' | 'MultiPolygon', coordinates: f.geometry!.coordinates },
        };
      }),
  };

  return {
    def,
    fc,
    bounds:
      Number.isFinite(bounds.minLng) && Number.isFinite(bounds.minLat)
        ? [bounds.minLng, bounds.minLat, bounds.maxLng, bounds.maxLat]
        : null,
  };
}

/** 已加载缓存（范围线为只读展示数据，无本地 CRUD，缓存可安全复用） */
const cache = new Map<CityScopeKind, CityScopeLayerData>();

/**
 * 加载三类范围线（并行 fetch + 归一化）。
 * 单个文件加载失败不影响其它类（返回空 features），整页地图仍可用。
 */
export async function loadCityScopeLayers(): Promise<CityScopeLayerData[]> {
  return Promise.all(
    CITY_SCOPE_LAYERS.map(async (def) => {
      if (cache.has(def.kind)) return cache.get(def.kind)!;
      try {
        const raw = await (await fetch(def.url)).json();
        const data = normalizeCollection(def, raw ?? {});
        cache.set(def.kind, data);
        return data;
      } catch {
        // 加载失败给空集合，地图其余功能不受影响
        const empty: CityScopeLayerData = { def, fc: { type: 'FeatureCollection', features: [] }, bounds: null };
        cache.set(def.kind, empty);
        return empty;
      }
    }),
  );
}
