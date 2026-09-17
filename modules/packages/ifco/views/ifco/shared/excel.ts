/**
 * ifco 导出共用 —— 带样式工作表构建（xlsx-js-style 分支，三个导出文件共用）
 *
 * SheetJS 社区版写 xlsx 不支持单元格样式，导出统一走 xlsx-js-style：
 * aoa 组表 + 合并单元格 + 列宽 + 全表细边框；未填的值在 AOA 中没有单元格对象，
 * 补空字符串单元格让边框完整覆盖（合并区域的隐藏格同理）。
 *
 * 冻结窗格（xlsx-js-style 未内置 pane 写出）：finishBorderedSheet 把冻结信息登记到
 * 模块级 WeakMap，saveWorkbook 生成文件后用 fflate 解包 xlsx、向各 sheet XML 的
 * <sheetView> 注入 <pane> 再重新打包下载；默认冻结第一行 + 第一列。
 *
 * 对齐口径（对齐官方表）：
 * - 第一行（表头）：垂直 + 水平居中，允许自动换行（长项目名折行）；
 * - 第一列（指标名称）除表头行外：垂直居中 + 水平居左；
 * - 其余全部单元格：垂直 + 水平居中。
 */
import { utils, write } from 'xlsx-js-style';
import type { CellObject, Range, RowInfo, WorkBook, WorkSheet } from 'xlsx-js-style';
import { saveAs } from 'file-saver';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';

/** 全表细边框样式（四边 thin 黑线） */
const THIN = { style: 'thin', color: { rgb: '000000' } };

/** 第一列表体（非首行）：垂直居中 + 水平居左（长指标名左对齐易读） */
const FIRST_COL_BODY_ALIGNMENT = { vertical: 'center', horizontal: 'left' } as const;

/** 其余单元格：垂直 + 水平居中；表头行（第 1 行）额外允许自动换行（长项目名折行显示） */
const CENTER_ALIGNMENT = { vertical: 'center', horizontal: 'center' } as const;
const HEADER_ALIGNMENT = { vertical: 'center', horizontal: 'center', wrapText: true } as const;

export type SheetStyleOptions = {
  /** 各行行高（pt），按行号索引；只给需要定高的行设置，如 { 0: 30 } = 表头行 30pt */
  rowHeights?: Record<number, number>;
  /**
   * 冻结窗格：x = 冻结的列数（左侧 x 列），y = 冻结的行数（顶部 y 行）。
   * 不传默认 { x: 1, y: 1 }（冻结第一行 + 第一列）。
   */
  freeze?: { x: number; y: number };
};

/**
 * 组装带边框与对齐的工作表：AOA 行 + 合并规则 + 列宽数组
 *
 * @param rows  数据行（首行为表头行，由调用方拼好）
 * @param merges 合并单元格规则
 * @param colWidths 每列宽度（{wch}，长度须覆盖最后一列）
 * @param options 行高/冻结窗格等可选样式（默认冻结第一行 + 第一列）
 */
export function finishBorderedSheet(
  rows: (string | number | undefined)[][],
  merges: Range[],
  colWidths: { wch: number }[],
  options?: SheetStyleOptions,
): WorkSheet {
  const worksheet = utils.aoa_to_sheet(rows);
  worksheet['!merges'] = merges;
  worksheet['!cols'] = colWidths;
  const freeze = options?.freeze ?? { x: 1, y: 1 };
  if (freeze.x > 0 || freeze.y > 0) {
    FREEZE_BY_SHEET.set(worksheet, { xSplit: freeze.x, ySplit: freeze.y });
  }
  if (options?.rowHeights) {
    const rowInfos: RowInfo[] = [];
    for (const [row, hpt] of Object.entries(options.rowHeights)) {
      rowInfos[Number(row)] = { hpt };
    }
    worksheet['!rows'] = rowInfos;
  }
  const area = utils.decode_range(worksheet['!ref']!);
  for (let row = area.s.r; row <= area.e.r; row += 1) {
    for (let col = area.s.c; col <= area.e.c; col += 1) {
      const address = utils.encode_cell({ r: row, c: col });
      const cell = ((worksheet[address] as CellObject | undefined) ?? { t: 's', v: '' }) as CellObject;
      cell.s = {
        ...(cell.s ?? {}),
        border: { top: THIN, bottom: THIN, left: THIN, right: THIN },
        alignment: row === 0 ? HEADER_ALIGNMENT : col === 0 ? FIRST_COL_BODY_ALIGNMENT : CENTER_ALIGNMENT,
      };
      worksheet[address] = cell;
    }
  }
  return worksheet;
}

/** 生成"前几列固定宽度 + 其余同宽"的列宽数组 */
export function fixedPlusUniformCols(lastCol: number, fixed: number[], rest: number): { wch: number }[] {
  return Array.from({ length: lastCol + 1 }, (_, col) => ({
    wch: fixed[col] ?? rest,
  }));
}

/** 列号 → Excel 列名（0→A, 1→B, 26→AA） */
function colName(col: number): string {
  let name = '';
  let n = col;
  while (n >= 0) {
    name = String.fromCharCode((n % 26) + 65) + name;
    n = Math.floor(n / 26) - 1;
  }
  return name;
}

/** 各工作表的冻结信息（finishBorderedSheet 登记，saveWorkbook 消费） */
const FREEZE_BY_SHEET = new WeakMap<WorkSheet, { xSplit: number; ySplit: number }>();

/**
 * 生成 xlsx 并下载（含冻结窗格注入）。
 *
 * xlsx-js-style 写不出 <pane>（其 sheetView 只支持 workbookViewId/rightToLeft），
 * 所以：write 出包 → fflate 解包 → 按工作表名定位 sheetN.xml → 向 <sheetView>
 * 注入 <pane xSplit ySplit state="frozen"/> → 重新打包 → saveAs。
 */
export async function saveWorkbook(workbook: WorkBook, filename: string): Promise<void> {
  const buffer = write(workbook, { bookType: 'xlsx', type: 'array' });
  const files = unzipSync(new Uint8Array(buffer));

  // 工作表名 → rId → sheetN.xml 路径
  const workbookXml = strFromU8(files['xl/workbook.xml']);
  const relsXml = strFromU8(files['xl/_rels/workbook.xml.rels']);
  const targetByRid = new Map<string, string>();
  for (const match of relsXml.matchAll(/<Relationship\b[^>]*\/>/g)) {
    const tag = match[0];
    const id = tag.match(/Id="([^"]+)"/)?.[1];
    const target = tag.match(/Target="([^"]+)"/)?.[1];
    if (id && target?.startsWith('worksheets/')) {
      targetByRid.set(id, `xl/${target}`);
    }
  }

  for (const [index, sheetName] of workbook.SheetNames.entries()) {
    const sheet = workbook.Sheets[sheetName];
    const freeze = FREEZE_BY_SHEET.get(sheet);
    if (!freeze) continue;
    // workbook.xml 里第 index 个 <sheet> 对应本表（顺序一致）
    const sheetTags = [...workbookXml.matchAll(/<sheet\b[^>]*\/>/g)].map((m) => m[0]);
    const tag = sheetTags[index];
    const rid = tag?.match(/r:id="([^"]+)"/)?.[1];
    const path = rid ? targetByRid.get(rid) : undefined;
    if (!path || !files[path]) continue;

    const topLeft = `${colName(freeze.xSplit)}${freeze.ySplit + 1}`;
    const pane = `<pane xSplit="${freeze.xSplit}" ySplit="${freeze.ySplit}" topLeftCell="${topLeft}" activePane="bottomRight" state="frozen"/><selection pane="bottomRight" activeCell="${topLeft}" sqref="${topLeft}"/>`;
    const xml = strFromU8(files[path]);
    const patched = xml.replace(
      /<sheetView\b([^>]*?)\/>/,
      (_all, attrs: string) => `<sheetView${attrs}>${pane}</sheetView>`,
    );
    if (patched !== xml) {
      files[path] = strToU8(patched);
    }
  }

  const zipped = zipSync(files, { level: 6 });
  saveAs(new Blob([zipped as unknown as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename);
}
