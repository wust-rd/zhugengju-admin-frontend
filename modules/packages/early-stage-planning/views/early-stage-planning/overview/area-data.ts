/**
 * 前期谋划 · 更新片区数据加载与聚合（数据源：后端 esp 图斑地图接口）
 *
 * 接口：GET /a/esp/map/areas?batch=第一批（全量约 182 行，分两批：第一批 80 / 第二批 102）。
 * 按批次请求 + 按批次缓存（含「全部」全量档），geometry 原文（WKT，geometry-decode.ts
 * 解码，兼容历史 TopoJSON 导入产物）还原为 MultiPolygon 后组装 FeatureCollection，供地图
 * addSource 与左侧看板共用。本文件提供页面所需的视图：
 *  - loadAreas(batch)：该批次 FeatureCollection（按批次缓存，切回不重复请求）
 *  - loadProjects(batch)：该批次项目图斑 FeatureCollection（地图放大层级/片区聚焦时展示）
 *  - districtAreaCount(areas)：按行政/功能区统计片区数量（柱状图用）
 *  - areaGroups(areas)：按区划分组 → 片区行（FUNC_TYPE_VALUE 解析成 TOD/EOD 等胶囊，含 auid）
 *  - progressItems(areas)：AREA_COLOR 三色图计数
 *  - bboxOf(features)：要素集包围盒（地图 fitBounds 用）
 */

import {
  espMapAreas,
  espMapProjects,
  type EspBatch,
  type EspMapAreaRow,
  type EspMapProjectRow,
} from '@jeesite/early-stage-planning/api/early-stage-planning/esp-map';
import type { XodFlag, XodItem } from '@jeesite/display/components/corner-panel/xod-row';
import type { ProgressItem } from './progress-chart';
import { decodeGeometry, type MultiPolygonGeometry } from './geometry-decode';

/** 通用图斑 FeatureCollection（properties 为接口行去掉 geometry 字符串 + FUNC_FIRST 派生属性） */
export type PolygonCollection<R> = {
  type: 'FeatureCollection';
  features: {
    type: 'Feature';
    /** 要素唯一号（片区 A_UID / 项目 P_UID） */
    id?: string;
    /** 派生属性：FUNC_TYPE_VALUE 首个编码小写（如 'cod'），无编码为 undefined —— 地图功能定位着色用 */
    properties: Omit<R, 'geometry'> & { FUNC_FIRST?: string };
    geometry: MultiPolygonGeometry;
  }[];
};

/** 片区 FeatureCollection */
export type AreaCollection = PolygonCollection<EspMapAreaRow>;

/** 项目图斑 FeatureCollection */
export type ProjectCollection = PolygonCollection<EspMapProjectRow>;

/** 批次选择 key（「全部」= 不传 batch 查全量，UI 概念，非接口参数） */
export type BatchKey = EspBatch | '全部';

/** 批次清单（下拉选项与加载入口共用；「新增」= 方案填报新增片区当前 0 片
 *  （后端 is_approve='2' 未下发，见 esp-map.ts 注释与接口文档）；全部为合并全量约 182 片） */
export const BATCHES: BatchKey[] = ['第一批', '第二批', '新增', '全部'];

/** 区划写法归并（接口两批数据对同一功能区存在不同写法）：长写法并入短写法 */
const DIST_MERGE: Record<string, string> = {
  武汉经开区: '经开区',
  东湖生态旅游风景区: '东湖风景区',
};

/** 图表点击筛选谓词（统计图选中值 → 要素命中判定）：
    district 按归并后区划名（= 柱状图类目名）；progress 按 AREA_COLOR（green/yellow/red）；
    func 按功能维度小写 key（cod/tod/…，FUNC_TYPE_VALUE 含该编码即命中） */
export function filterPredicate(
  tab: 'district' | 'progress' | 'func',
  filter: string,
): (f: AreaCollection['features'][number]) => boolean {
  if (tab === 'district') {
    return (f) => (DIST_MERGE[f.properties.DIST ?? ''] ?? f.properties.DIST ?? '') === filter;
  }
  if (tab === 'progress') {
    return (f) => f.properties.AREA_COLOR === filter;
  }
  return (f) => funcFlags(f.properties.FUNC_TYPE_VALUE)[filter as XodFlag] === true;
}

/** 接口行 → FeatureCollection（geometry 解码失败的行跳过并告警，不中断整批；
    片区/项目图斑共用，idOf 取行唯一号） */
function toCollection<R extends { geometry: string; FUNC_TYPE_VALUE?: string | null }>(
  rows: R[],
  idOf: (row: R) => string | undefined,
  rowLabel: string,
): PolygonCollection<R> {
  const features: PolygonCollection<R>['features'] = [];
  for (const row of rows) {
    try {
      const { geometry, ...props } = row;
      // 功能定位着色键：首个编码小写（无编码 undefined，地图 match 表达式走兜底灰）
      const funcFirst = String(row.FUNC_TYPE_VALUE ?? '')
        .split(',')[0]
        ?.trim()
        .toLowerCase();
      features.push({
        type: 'Feature',
        id: idOf(row),
        properties: { ...props, FUNC_FIRST: funcFirst || undefined },
        geometry: decodeGeometry(geometry),
      });
    } catch (e) {
      console.warn(`[esp-map] ${rowLabel} geometry 解析失败，已跳过`, e);
    }
  }
  return { type: 'FeatureCollection', features };
}

/** 批次缓存（含 in-flight 去重；失败清缓存允许重试） */
const cache = new Map<BatchKey, Promise<AreaCollection>>();

/** 加载某批次全部片区（「全部」不传 batch 查全量；接口请求 + geometry 解码 + 缓存；
    地图与看板共用一份数据） */
export function loadAreas(batch: BatchKey): Promise<AreaCollection> {
  let p = cache.get(batch);
  if (!p) {
    p = espMapAreas(batch === '全部' ? undefined : batch).then((rows) =>
      toCollection(rows, (r) => r.A_UID ?? undefined, '片区'),
    );
    cache.set(batch, p);
    p.catch(() => cache.delete(batch));
  }
  return p;
}

/** 项目图斑批次缓存 */
const projectCache = new Map<BatchKey, Promise<ProjectCollection>>();

/** 加载某批次项目图斑（全量约 529 行；缓存策略同 loadAreas。地图放大到项目层级、
    或左侧列表点击片区聚焦时展示，样式参考投融建运 project-fills） */
export function loadProjects(batch: BatchKey): Promise<ProjectCollection> {
  let p = projectCache.get(batch);
  if (!p) {
    p = espMapProjects(batch === '全部' ? undefined : batch).then((rows) =>
      toCollection(rows, (r) => r.P_UID ?? undefined, '项目'),
    );
    projectCache.set(batch, p);
    p.catch(() => projectCache.delete(batch));
  }
  return p;
}

/** 要素集 → [[minLng, minLat], [maxLng, maxLat]]（MultiPolygon 全环全点）；空集返回 null */
export function bboxOf(
  features: { geometry: { coordinates: number[][][][] } }[],
): [[number, number], [number, number]] | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const f of features) {
    for (const polygon of f.geometry.coordinates) {
      for (const ring of polygon) {
        for (const [x, y] of ring) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
  }
  return Number.isFinite(minX)
    ? [
        [minX, minY],
        [maxX, maxY],
      ]
    : null;
}

/** 按区划统计片区数量，保持数据出现顺序（柱状图用；写法归并后 16 个区划） */
export function districtAreaCount(areas: AreaCollection): { name: string; value: number }[] {
  const count = new Map<string, number>();
  for (const f of areas.features) {
    const dist = DIST_MERGE[f.properties.DIST ?? ''] ?? f.properties.DIST ?? '';
    count.set(dist, (count.get(dist) ?? 0) + 1);
  }
  return [...count.entries()].map(([name, value]) => ({ name, value }));
}

/** 功能定位胶囊解析：FUNC_TYPE_VALUE（如「TOD,COD」）逗号拆分映射到 XodItem 布尔位（POD 无胶囊位，忽略） */
const XOD_FLAGS: XodFlag[] = ['tod', 'eod', 'iod', 'sod', 'cod', 'hod'];

export function funcFlags(value: string | null): Partial<XodItem> {
  const item: Partial<XodItem> = {};
  for (const code of (value ?? '').split(',')) {
    const key = code.trim().toLowerCase() as XodFlag;
    if (XOD_FLAGS.includes(key)) item[key] = true;
  }
  return item;
}

/** 更新片区列表行：XodItem + 片区唯一号（列表点击 → 地图飞到该片区并聚焦其项目图斑） */
export type AreaRow = XodItem & { auid: string };

/** 按区划分组 → 片区行（FUNC_TYPE_VALUE 解析胶囊；写法归并后同区分组） */
export function areaGroups(areas: AreaCollection): { title: string; badgeValue: number; items: AreaRow[] }[] {
  const byDist = new Map<string, AreaRow[]>();
  for (const f of areas.features) {
    const p = f.properties;
    const item: AreaRow = { label: p.AREA_NAME ?? p.A_UID ?? '', auid: p.A_UID ?? '', ...funcFlags(p.FUNC_TYPE_VALUE) };
    const dist = DIST_MERGE[p.DIST ?? ''] ?? p.DIST ?? '';
    const list = byDist.get(dist) ?? [];
    list.push(item);
    byDist.set(dist, list);
  }
  return [...byDist.entries()].map(([title, items]) => ({ title, badgeValue: items.length, items }));
}

/** 三色图/地图推进情况着色色板（AREA_COLOR 字段口径：2026 年第二季度推进情况，仅第一批有值；
    key 同时是要素 AREA_COLOR 值与筛选值） */
export const PROGRESS_META: { key: ProgressColor; name: string; color: string }[] = [
  { key: 'green', name: '绿', color: '#2EE6A8' },
  { key: 'yellow', name: '黄', color: '#F5E334' },
  { key: 'red', name: '红', color: '#FB4A64' },
];

/** 推进情况颜色 key（none = 无 AREA_COLOR 值，第二批片区全量） */
type ProgressColor = 'green' | 'yellow' | 'red' | 'none';

/** 片区 → 推进情况颜色 key（库中 area_color 只有 green/yellow/red，其余归 none） */
function progressColorOf(f: AreaCollection['features'][number]): ProgressColor {
  const c = f.properties.AREA_COLOR;
  return c === 'green' || c === 'yellow' || c === 'red' ? c : 'none';
}

/** 三色图数据：AREA_COLOR 计数与占比（片数 / 批次总片数，四舍五入），只含绿/黄/红三段
    （无颜色片区不计入，第二批全量无标注时三段均为 0；未评定片区仅在分组列表体现） */
export function progressItems(areas: AreaCollection): ProgressItem[] {
  const counts = new Map<ProgressColor, number>([
    ['green', 0],
    ['yellow', 0],
    ['red', 0],
    ['none', 0],
  ]);
  for (const f of areas.features) {
    const key = progressColorOf(f);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const total = areas.features.length;
  return PROGRESS_META.map(({ key, name, color }) => ({
    key,
    name,
    color,
    count: counts.get(key) ?? 0,
    percent: total > 0 ? Math.round(((counts.get(key) ?? 0) / total) * 100) : 0,
  }));
}
