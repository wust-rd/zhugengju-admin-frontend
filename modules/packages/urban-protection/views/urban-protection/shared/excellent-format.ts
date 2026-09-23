/**
 * 市住更局 —— 名城保护 · 优保建筑展示口径（页面共用）
 *
 * 后端已把 '1.0' 形态数值列归一化为 '1'，这里只做标签映射与时间格式化。
 */

/** 保护等级选项（PROTECTLEVE：1=一级 2=二级） */
export const PROTECT_LEVEL_OPTIONS = [
  { label: '一级', value: '1' },
  { label: '二级', value: '2' },
];

/** 保护等级值 → 标签 */
export function protectLevelLabel(value: string | null | undefined): string {
  return PROTECT_LEVEL_OPTIONS.find((item) => item.value === value)?.label ?? '';
}

/** 公布批次值 → 「第N批」 */
export function batchLabel(value: string | null | undefined): string {
  return value ? `第${toCnBatch(value)}批` : '';
}

/** 批次数字转中文（1~14） */
function toCnBatch(value: string): string {
  const digits = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二', '十三', '十四'];
  const num = Number(value);
  if (!Number.isNaN(num) && num >= 0 && num < digits.length) {
    return digits[num];
  }
  return value;
}

/** 时间戳/字符串 → 'YYYY-MM-DD'（无值返回空串） */
export function fmtDate(value: number | string | Date | null | undefined): string {
  return format(value, false);
}

/** 时间戳/字符串 → 'YYYY-MM-DD HH:mm'（无值返回空串） */
export function fmtDateTime(value: number | string | Date | null | undefined): string {
  return format(value, true);
}

function format(value: number | string | Date | null | undefined, withTime: boolean): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  if (!withTime) {
    return `${y}-${m}-${d}`;
  }
  const hh = `${date.getHours()}`.padStart(2, '0');
  const mm = `${date.getMinutes()}`.padStart(2, '0');
  return `${y}-${m}-${d} ${hh}:${mm}`;
}
