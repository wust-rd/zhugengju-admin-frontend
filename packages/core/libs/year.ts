import dayjs from 'dayjs';
import type { MenuItemType } from 'antdv-next';

/**
 * 生成最近 N 年的年份菜单项（含当前年，降序）
 *
 * 例：buildYearItems(2) → [{ key: '2026', label: '2026' }, { key: '2025', label: '2025' }]
 * 需要变更年数（如最近 4 年 / 最近 5 年）时只改 count 参数即可。
 */
export function buildYearItems(count = 2): MenuItemType[] {
  const currentYear = dayjs().year();
  return Array.from({ length: count }, (_, i) => {
    const year = currentYear - i;
    return {
      key: String(year),
      label: String(year),
    };
  });
}
