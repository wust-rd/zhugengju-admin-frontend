import { KZXG_KEY } from './kzxg-wms';
import type { LayerSwitchItem, LayerCategory } from './types';

/** 「已打开图层 / 我的收藏」开关项（真实图层，on 显隐 / opacity 透明度均与地图联动） */
export const createInitialLayers = (): LayerSwitchItem[] => [
  { key: KZXG_KEY, label: '控制性详细规划', on: true, starred: false, opacity: 0.9 },
];

/** 数据菜单分类（真实图层目录）；group 可展开子项，leaf 为单项 */
export const createInitialCategories = (): LayerCategory[] => [
  { key: KZXG_KEY, label: '控制性详细规划', type: 'leaf' },
];
