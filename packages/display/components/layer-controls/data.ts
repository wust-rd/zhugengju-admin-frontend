import type { LayerSwitchItem, LayerCategory } from './types';

/** 「已打开图层 / 我的收藏」开关项占位数据 */
export const createInitialLayers = (): LayerSwitchItem[] => [
  { key: 'jjz', label: '既有建筑改造', on: true, starred: true },
  { key: 'czc', label: '城中村改造', on: false, starred: false },
  { key: 'ljj', label: '老旧街区改造', on: true, starred: true },
  { key: 'ljx', label: '老旧小区改造', on: true, starred: false },
  { key: 'ljjc', label: '老旧厂区改造', on: true, starred: false },
];

/** 数据菜单分类占位数据；group 可展开子项，leaf 为单项 */
export const createInitialCategories = (): LayerCategory[] => [
  { key: 'wx', label: '卫星影像', type: 'leaf' },
  { key: 'xzh', label: '行政区划', type: 'leaf' },
  { key: 'gxd', label: '更新单元', type: 'leaf' },
  { key: 'kj', label: '国土空间规划', type: 'leaf' },
  {
    key: 'wg',
    label: '五改类型',
    type: 'group',
    expanded: true,
    children: [
      { label: '既有建筑改造', checked: true },
      { label: '老旧小区改造', checked: true },
      { label: '老旧厂区改造', checked: false },
      { label: '老旧街区改造', checked: true },
      { label: '城中村改造', checked: false },
    ],
  },
  { key: 'bm', label: '城市白膜', type: 'leaf' },
  { key: 'jm', label: '城市精模', type: 'leaf' },
];
