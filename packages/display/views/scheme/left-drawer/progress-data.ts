/**
 * 前期谋划 · 推进情况 tab 演示数据（暂无接口数据，先用假数据展示，后端就绪后替换）
 *
 * 推进情况 tab 内容：
 *  - 片区推进情况三色图（ProgressChart）：绿/黄/红 三段占比与片数
 *  - 更新片区列表：与「行政区划」tab 同一个列表组件，仅数据口径不同（这里按推进情况分组）
 */

import type { CollapseGroupItem } from '@jeesite/display/components/collapse-groups';
import type { XodItem } from '@jeesite/display/components/corner-panel/xod-row';
import type { ProgressItem } from './progress-chart';

/** 三色图数据（假数据：绿=推进良好 / 黄=推进中 / 红=滞后） */
export const PROGRESS_ITEMS: ProgressItem[] = [
  { key: 'green', name: '绿', percent: 32, count: 26, color: '#2EE6A8' },
  { key: 'yellow', name: '黄', percent: 41, count: 33, color: '#F5E334' },
  { key: 'red', name: '红', percent: 19, count: 15, color: '#FB4A64' },
];

/** 推进情况 · 更新片区列表假数据（按区划分组，随批次不同而不同） */
const PROGRESS_GROUPS: Record<'第一批' | '第二批', CollapseGroupItem<XodItem>[]> = {
  第一批: [
    {
      title: '江岸区',
      badgeValue: 3,
      items: [
        { label: '西马片', tod: true, cod: true },
        { label: '花桥片', sod: true },
        { label: '二七片', tod: true, iod: true },
      ],
    },
    {
      title: '江汉区',
      badgeValue: 2,
      items: [
        { label: '常青片', eod: true },
        { label: '唐家墩片', cod: true },
      ],
    },
    {
      title: '硚口区',
      badgeValue: 2,
      items: [
        { label: '汉水桥片', hod: true },
        { label: '宗关片', sod: true, eod: true },
      ],
    },
    {
      title: '汉阳区',
      badgeValue: 2,
      items: [
        { label: '四新片', tod: true },
        { label: '洲头片', iod: true },
      ],
    },
    {
      title: '武昌区',
      badgeValue: 2,
      items: [
        { label: '杨园片', tod: true, cod: true },
        { label: '徐东片', eod: true },
      ],
    },
  ],
  第二批: [
    {
      title: '江岸区',
      badgeValue: 2,
      items: [
        { label: '后湖片', tod: true, eod: true },
        { label: '谌家矶片', iod: true },
      ],
    },
    {
      title: '江汉区',
      badgeValue: 2,
      items: [
        { label: '姑嫂树片', sod: true },
        { label: '万松片', cod: true, hod: true },
      ],
    },
    {
      title: '青山区',
      badgeValue: 2,
      items: [
        { label: '青山镇片', hod: true, tod: true },
        { label: '工人村片', sod: true },
      ],
    },
    {
      title: '洪山区',
      badgeValue: 2,
      items: [
        { label: '白沙洲片', tod: true },
        { label: '青菱片', eod: true, sod: true },
      ],
    },
    {
      title: '蔡甸区',
      badgeValue: 1,
      items: [{ label: '中法生态城片', iod: true, eod: true }],
    },
    {
      title: '东湖风景区',
      badgeValue: 1,
      items: [{ label: '落雁片', eod: true }],
    },
  ],
};

/** 取推进情况 tab 的更新片区列表数据（按批次） */
export function progressGroups(batch: '第一批' | '第二批'): CollapseGroupItem<XodItem>[] {
  return PROGRESS_GROUPS[batch] ?? PROGRESS_GROUPS['第一批'];
}
