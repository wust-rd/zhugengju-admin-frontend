import { shallowRef } from 'vue';
import type { AreaPolygonProps, ProjectPolygonProps } from './polygon-types';

/**
 * 片区 / 项目轻量索引（polygon-card 与 map-layers 共享）。
 *
 * map-layers 加载 geojson 挂图层时填充；polygon-card 据此完成
 * 「片区内项目下拉」与「页签切换片区 / 项目」的联动取数。
 * 模块级单例：换底图重建图层不重置，重复填充直接覆盖。
 */

/** 片区条目（uid = A_UID） */
export type IfcoAreaItem = {
  uid: string;
  props: AreaPolygonProps;
};

/** 项目条目（uid = P_UID；aUid = 所属片区 A_UID；label = 下拉显示名） */
export type IfcoProjectItem = {
  uid: string;
  aUid: string;
  label: string;
  props: ProjectPolygonProps;
};

/** 全部片区（按 A_UID 索引定位） */
export const ifcoAreas = shallowRef<IfcoAreaItem[]>([]);

/** 全部项目（下拉与切换用，按片区内顺序号排序） */
export const ifcoProjects = shallowRef<IfcoProjectItem[]>([]);

/** map-layers 加载完成后写入索引 */
export function setIfcoPolygonData(areas: IfcoAreaItem[], projects: IfcoProjectItem[]): void {
  ifcoAreas.value = areas;
  ifcoProjects.value = projects;
}
