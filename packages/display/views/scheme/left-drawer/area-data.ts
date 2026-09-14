/**
 * 前期谋划 · 更新片区 geojson 数据加载与聚合（packages/display/data/area_merged_all.geojson）
 *
 * 182 个更新片区面（MultiPolygon），按 BATCH 分两批：第一批 80 / 第二批 102。
 * 本文件提供页面所需的三个视图：
 *  - loadAreas()：原始 FeatureCollection（地图 addSource 用）
 *  - districtInvest()：按行政/功能区聚合投资额（柱状图用，18 个区划全量）
 *  - areaGroups(batch)：按区划分组 → 片区行（FUNC_TYPE 解析成 TOD/EOD 等胶囊），批次下拉联动用
 */

import areaGeojsonUrl from '@jeesite/display/data/area_merged_all.geojson?url';
import type { XodItem } from '@jeesite/display/components/corner-panel/xod-row';

/** 片区属性（geojson properties 子集，页面用到的字段） */
type AreaProps = {
  BATCH: '第一批' | '第二批';
  /** 区划（行政区 + 功能区，共 18 个） */
  DIST: string;
  /** 片区名 */
  AREA_NAME: string;
  /** 功能导向原始文本（含 IOD/SOD/COD/EOD/TOD/HOD/POD 等字样，格式较脏） */
  FUNC_TYPE: string;
  /** 投资额（亿） */
  INV_BIL: number | string;
  /** 项目数 */
  PROJECT_CNT: number | string;
};

/** 原始 FeatureCollection（轻量类型；geojson 命名空间在本项目 tsconfig 不可用） */
type AreaCollection = {
  type: 'FeatureCollection';
  features: { type: 'Feature'; properties: AreaProps; geometry: unknown }[];
};

let cache: AreaCollection | null = null;

/** 区划写法归并（geojson 两批数据对同一功能区存在不同写法）：长写法并入短写法 */
const DIST_MERGE: Record<string, string> = {
  武汉经开区: '经开区',
  东湖生态旅游风景区: '东湖风景区',
};

/** 加载原始 geojson（fetch + 缓存，地图与看板共用一份数据） */
export async function loadAreas(): Promise<AreaCollection> {
  cache ??= (await (await fetch(areaGeojsonUrl)).json()) as AreaCollection;
  return cache;
}

/** 功能导向胶囊解析：从脏文本里提取命中的导向类型（大小写不敏感） */
const FUNC_FLAGS: { key: keyof Pick<XodItem, 'tod' | 'eod' | 'iod' | 'sod' | 'cod' | 'hod'>; word: string }[] = [
  { key: 'tod', word: 'TOD' },
  { key: 'eod', word: 'EOD' },
  { key: 'iod', word: 'IOD' },
  { key: 'sod', word: 'SOD' },
  { key: 'cod', word: 'COD' },
  { key: 'hod', word: 'HOD' },
];

/** 按区划聚合投资额（亿，保留 1 位小数），保持数据出现顺序（柱状图用；写法归并后 16 个区划） */
export function districtInvest(areas: AreaCollection, batch?: '第一批' | '第二批'): { name: string; value: number }[] {
  const sum = new Map<string, number>();
  for (const f of areas.features) {
    if (batch && f.properties.BATCH !== batch) continue;
    const dist = DIST_MERGE[f.properties.DIST] ?? f.properties.DIST;
    sum.set(dist, (sum.get(dist) ?? 0) + Number(f.properties.INV_BIL || 0));
  }
  return [...sum.entries()].map(([name, v]) => ({ name, value: Math.round(v * 10) / 10 }));
}

/** 按区划分组 → 片区行（FUNC_TYPE 解析胶囊；批次下拉联动传 batch；写法归并后同区分组） */
export function areaGroups(
  areas: AreaCollection,
  batch?: '第一批' | '第二批',
): { title: string; badgeValue: number; items: XodItem[] }[] {
  const byDist = new Map<string, XodItem[]>();
  for (const f of areas.features) {
    const p = f.properties;
    if (batch && p.BATCH !== batch) continue;
    const item: XodItem = { label: p.AREA_NAME };
    const text = (p.FUNC_TYPE || '').toUpperCase();
    for (const { key, word } of FUNC_FLAGS) {
      if (text.includes(word)) item[key] = true;
    }
    const dist = DIST_MERGE[p.DIST] ?? p.DIST;
    const list = byDist.get(dist) ?? [];
    list.push(item);
    byDist.set(dist, list);
  }
  return [...byDist.entries()].map(([title, items]) => ({ title, badgeValue: items.length, items }));
}

/** 批次选项（真实数量由数据统计） */
export async function batchOptions(): Promise<{ key: string; label: string; value: '第一批' | '第二批' }[]> {
  const areas = await loadAreas();
  const count = (b: '第一批' | '第二批') => areas.features.filter((f) => f.properties.BATCH === b).length;
  return [
    { key: '第一批', label: `第一批 ${count('第一批')}`, value: '第一批' },
    { key: '第二批', label: `第二批 ${count('第二批')}`, value: '第二批' },
  ];
}
