/**
 * 片区行数据的展示格式化（片区概况面板 area-overview-modal / 片区详情页 area-detail 共用，
 * 避免两处各写一份口径后漂移）
 */

/** 数值文本兜底（null/空 → '—'） */
export const dash = (v: string | number | null | undefined) => (v == null || v === '' ? '—' : String(v));

/** 面积格式化：公顷数值 → 保留 2 位小数带单位 */
export function fmtAreaHa(v: number | string | null | undefined): string {
  if (v == null || v === '') return '—';
  const n = Number(v);
  return Number.isFinite(n) ? `${n.toFixed(2)} 公顷` : String(v);
}
