/**
 * 市住更局 —— 名城保护 · 简单带样式 Excel 导出（xlsx-js-style + file-saver）
 *
 * 报表类单表导出：AOA 组表 + 全表细边框 + 居中（表头行可换行），可选标题行（合并整行）
 * 与加粗行（如合计行）。复杂导出（冻结窗格/多排表头）仍走 ifco/shared/excel.ts 那套。
 */
import { utils, write } from 'xlsx-js-style';
import type { CellObject, WorkBook, WorkSheet } from 'xlsx-js-style';
import { saveAs } from 'file-saver';

const THIN = { style: 'thin', color: { rgb: '000000' } };
const BORDER = { top: THIN, bottom: THIN, left: THIN, right: THIN };
const CENTER = { vertical: 'center', horizontal: 'center' };
const HEADER_CENTER = { vertical: 'center', horizontal: 'center', wrapText: true };

export type SimpleSheetOptions = {
  /** 标题行文字（置于第 1 行并合并整行、加粗居中；不传则首行即表头） */
  title?: string;
  /** 加粗行（绝对行号，0 起，含标题行偏移） */
  boldRows?: number[];
  /** 各行行高（pt），按行号索引 */
  rowHeights?: Record<number, number>;
  /** 工作表名（默认「统计报表」） */
  sheetName?: string;
};

/**
 * 组表并下载：rows 为 AOA（含表头行；有 title 时首行是表头、标题由 options 提供）
 *
 * @param filename 含扩展名的下载文件名
 * @param rows     数据行（首行表头）
 * @param colWidths 每列宽度（{wch}）
 */
export function exportBorderedSheet(
  filename: string,
  rows: (string | number)[][],
  colWidths: { wch: number }[],
  options: SimpleSheetOptions = {},
): void {
  const sheet: WorkSheet = utils.aoa_to_sheet(rows);
  sheet['!cols'] = colWidths;
  if (options.title) {
    sheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: colWidths.length - 1 } }];
  }
  if (options.rowHeights) {
    sheet['!rows'] = Object.entries(options.rowHeights).map(([r, hpt]) => ({ r: Number(r), hpt }));
  }

  // 全范围补边框与对齐（未填值处补空单元格，保证边框完整）
  const range = utils.decode_range(sheet['!ref'] as string);
  const boldRows = options.boldRows ?? [];
  for (let r = range.s.r; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = utils.encode_cell({ r, c });
      if (!sheet[addr]) {
        sheet[addr] = { t: 's', v: '' } as CellObject;
      }
      const cell = sheet[addr] as CellObject;
      const isTitle = !!options.title && r === 0;
      const isHeader = r === (options.title ? 1 : 0);
      cell.s = {
        border: BORDER,
        alignment: isTitle ? CENTER : isHeader ? HEADER_CENTER : CENTER,
        font: isTitle ? { sz: 14, bold: true } : boldRows.includes(r) ? { bold: true } : undefined,
      };
    }
  }

  const workbook: WorkBook = utils.book_new();
  utils.book_append_sheet(workbook, sheet, options.sheetName ?? '统计报表');
  const buffer = write(workbook, { bookType: 'xlsx', type: 'array' });
  saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename);
}
