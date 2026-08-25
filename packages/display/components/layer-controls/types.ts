/** 「已打开图层 / 我的收藏」开关项 */
export interface LayerSwitchItem {
  key: string;
  label: string;
  on: boolean;
  starred: boolean;
}

/** 数据菜单分组下的子项 */
export interface LayerChild {
  label: string;
  checked: boolean;
}

/** 数据菜单分类：leaf 单项 / group 可展开分组 */
export interface LayerCategory {
  key: string;
  label: string;
  type: 'leaf' | 'group';
  expanded?: boolean;
  children?: LayerChild[];
}
