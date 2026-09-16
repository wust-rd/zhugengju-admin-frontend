/**
 * 前期谋划 · 更新片区数据加载与聚合（数据源：后端 esp 图斑地图接口）
 *
 * 接口：GET /a/esp/map/areas?batch=第一批（约 182 行，分两批：第一批 80 / 第二批 102）。
 * 按批次请求 + 按批次缓存，geometry 原文（WKT，geometry-decode.ts 解码，兼容历史
 * TopoJSON 导入产物）还原为 MultiPolygon 后组装 FeatureCollection，供地图
 * addSource 与左侧看板共用。本文件提供页面所需的视图：
 *  - loadAreas(batch)：该批次 FeatureCollection（按批次缓存，切回不重复请求）
 *  - districtAreaCount(areas)：按行政/功能区统计片区数量（柱状图用）
 *  - areaGroups(areas)：按区划分组 → 片区行（FUNC_TYPE_VALUE 解析成 TOD/EOD 等胶囊）
 */

import {
  espMapAreas,
  type EspBatch,
  type EspMapAreaRow,
} from '@jeesite/early-stage-planning/api/early-stage-planning/esp-map';
import type { XodFlag, XodItem } from '@jeesite/display/components/corner-panel/xod-row';
import { decodeGeometry, type MultiPolygonGeometry } from './geometry-decode';

/** 片区 FeatureCollection（properties 为接口行去掉 geometry 字符串后的原文属性） */
export type AreaCollection = {
  type: 'FeatureCollection';
  features: {
    type: 'Feature';
    /** 片区唯一号（A_UID，地图点击联动用） */
    id?: string;
    properties: Omit<EspMapAreaRow, 'geometry'>;
    geometry: MultiPolygonGeometry;
  }[];
};

/** 批次清单（key 即接口 batch 参数值；下拉选项与加载入口共用） */
export const BATCHES: EspBatch[] = ['第一批', '第二批'];

/** 区划写法归并（接口两批数据对同一功能区存在不同写法）：长写法并入短写法 */
const DIST_MERGE: Record<string, string> = {
  武汉经开区: '经开区',
  东湖生态旅游风景区: '东湖风景区',
};

/** 接口行 → FeatureCollection（geometry 解码失败的行跳过并告警，不中断整批） */
function toCollection(rows: EspMapAreaRow[]): AreaCollection {
  const features: AreaCollection['features'] = [];
  for (const row of rows) {
    try {
      const { geometry, ...props } = row;
      features.push({ type: 'Feature', id: row.A_UID, properties: props, geometry: decodeGeometry(geometry) });
    } catch (e) {
      console.warn(`[esp-map] 片区 ${row?.A_UID} geometry 解析失败，已跳过`, e);
    }
  }
  return { type: 'FeatureCollection', features };
}

/** 批次缓存（含 in-flight 去重；失败清缓存允许重试） */
const cache = new Map<EspBatch, Promise<AreaCollection>>();

/** 加载某批次全部片区（接口请求 + TopoJSON 解码 + 缓存；地图与看板共用一份数据） */
export function loadAreas(batch: EspBatch): Promise<AreaCollection> {
  let p = cache.get(batch);
  if (!p) {
    p = espMapAreas(batch).then(toCollection);
    cache.set(batch, p);
    p.catch(() => cache.delete(batch));
  }
  return p;
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

function funcFlags(value: string | null): Partial<XodItem> {
  const item: Partial<XodItem> = {};
  for (const code of (value ?? '').split(',')) {
    const key = code.trim().toLowerCase() as XodFlag;
    if (XOD_FLAGS.includes(key)) item[key] = true;
  }
  return item;
}

/** 按区划分组 → 片区行（FUNC_TYPE_VALUE 解析胶囊；写法归并后同区分组） */
export function areaGroups(areas: AreaCollection): { title: string; badgeValue: number; items: XodItem[] }[] {
  const byDist = new Map<string, XodItem[]>();
  for (const f of areas.features) {
    const p = f.properties;
    const item: XodItem = { label: p.AREA_NAME ?? p.A_UID, ...funcFlags(p.FUNC_TYPE_VALUE) };
    const dist = DIST_MERGE[p.DIST ?? ''] ?? p.DIST ?? '';
    const list = byDist.get(dist) ?? [];
    list.push(item);
    byDist.set(dist, list);
  }
  return [...byDist.entries()].map(([title, items]) => ({ title, badgeValue: items.length, items }));
}
