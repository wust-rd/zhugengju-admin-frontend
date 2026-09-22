/*
  ifco —— 片区三色图附件导出（tricolor-panel「一键导出附件」）· docx 真文档

  版式照 2026-09-21 附件模板：附件 → 居中两行标题（全市"五改四好"城市更新片区 /
  {year}年第{q}季度推进情况"三色图"）→ 单列六行表（绿/黄/红分色表头行 + 片区
  名单行：行政区+片区名称、顿号隔开，按片区编号排序）→ 备注行。
  百分比 = 该色片区数 / 三色片区总数（已评估；未评估片区不进表）。
  评估周期：季度面板值（YYYY-Q）优先，未选时由调用方取数据最新评估周期（YYYY-MM）。
*/
import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx';
import { saveAs } from 'file-saver';
import type { AreaTricolorItem, TriColorStatus } from '@jeesite/ifco/api/ifco/impl-progress';

/** 分色表头底纹（浅色底黑字） */
const COLOR_FILL: Record<Exclude<TriColorStatus, ''>, string> = {
  绿色: 'C6EFCE',
  黄色: 'FFEB9C',
  红色: 'FFC7CE',
};

/** 单元格内边距与表框（政务口径黑色细框） */
const CELL_MARGINS = { top: 80, bottom: 80, left: 120, right: 120 };
const BORDER = { style: BorderStyle.SINGLE, size: 4, color: '000000' };

/** 评估周期 → 年/季度（period 为季度面板值 YYYY-Q 或数据周期 YYYY-MM，月换算季度） */
function parsePeriod(period: string): { year: string; quarter: number } {
  const [year, tail] = period.split('-');
  return { year, quarter: tail.length > 1 ? Math.ceil(Number(tail) / 3) : Number(tail) };
}

/** 分色表头行（绿/黄/红 + 百分比，居中加粗底纹） */
function labelRow(text: string, fill: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        shading: { fill },
        margins: CELL_MARGINS,
        verticalAlign: VerticalAlign.CENTER,
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text, bold: true })],
          }),
        ],
      }),
    ],
  });
}

/** 片区名单行（行政区+片区名称、顿号隔开） */
function listRow(text: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        margins: CELL_MARGINS,
        children: [new Paragraph({ children: [new TextRun({ text })] })],
      }),
    ],
  });
}

/**
 * 导出三色图附件 docx。areas 须已按片区编号排序（导出前调用方排好），
 * 百分比按已评估片区占比计算（四舍五入取整）。
 */
export async function exportTricolorDocx(areas: AreaTricolorItem[], period: string): Promise<void> {
  const { year, quarter } = parsePeriod(period);
  const evaluated = areas.filter((item) => item.triColor !== '');
  const percent = (count: number) => (evaluated.length ? Math.round((count / evaluated.length) * 100) : 0);
  const listText = (color: Exclude<TriColorStatus, ''>) =>
    areas
      .filter((item) => item.triColor === color)
      .map((item) => `${item.district}${item.areaName}`)
      .join('、');

  const rows: TableRow[] = [];
  for (const color of ['绿色', '黄色', '红色'] as const) {
    rows.push(
      labelRow(`${color}（${percent(evaluated.filter((i) => i.triColor === color).length)}%）`, COLOR_FILL[color]),
    );
    rows.push(listRow(listText(color)));
  }

  const periodText = `${year}年第${quarter}季度`;
  const children = [
    new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: '附件' })] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 120 },
      children: [new TextRun({ text: '全市“五改四好”城市更新片区', bold: true, size: 32 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [new TextRun({ text: `${periodText}推进情况“三色图”`, bold: true, size: 32 })],
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: BORDER,
        bottom: BORDER,
        left: BORDER,
        right: BORDER,
        insideHorizontal: BORDER,
        insideVertical: BORDER,
      },
      rows,
    }),
    new Paragraph({
      spacing: { before: 120 },
      children: [new TextRun({ text: `备注：以${periodText}巡查情况为依据，排名不分先后。` })],
    }),
  ];

  const doc = new Document({
    styles: { default: { document: { run: { font: 'Microsoft YaHei', size: 21 } } } },
    sections: [{ children }],
  });
  saveAs(await Packer.toBlob(doc), `全市“五改四好”城市更新片区${periodText}推进情况“三色图”.docx`);
}
