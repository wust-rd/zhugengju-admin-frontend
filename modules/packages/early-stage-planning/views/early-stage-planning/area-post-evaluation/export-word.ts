/**
 * 评估报告 Word 导出：docx 库生成**真 .docx**（图片内嵌进包内 media，文字可继续编辑）
 *
 * 为什么不用 MHTML(.doc)：MHTML 图片部件靠 `Content-Location` 链接解析，在 WPS Writer
 * （本机就装了，对 MHTML 部件支持不完整）和 Word「受保护的视图」（拦截 file:// 引用）下
 * 都会变成红叉「无法显示该图片」；真 .docx 把图片作为 media 部件内嵌，无任何链接解析，
 * Word 2007+ / WPS / 受保护视图全部稳定。做法与 scheme-fill 的 form-export.ts 一致（仓库惯例）。
 *
 * 结构与版式（与页面报告同口径，单位 half-point = 0.5pt）：
 * - 主标题黑体 16pt 居中 / 章节标题黑体 14pt / 正文宋体 12pt（小四）首行缩进 2 字符 /
 *   元信息、图注表注、表格宋体 10.5pt（五号）；
 * - A4 纵向，边距上下 18mm、左右 16mm；
 * - 统计图两两一行（无边框表格布局），每图宽 310px（≈232pt，两图 + 间隙恰好铺满版心）；
 * - 表1/表2 按数据重建（0.5pt 黑色框线、表头灰底），一级/二级维度列合并单元格（rowSpan）。
 *
 * 数据与图表来源：
 * - 文本/表格行由 report.vue 组装（表格行构造器 buildIndicatorTableData / buildSatisfactionTableData
 *   在本文件，列结构与 indicator-table.vue / satisfaction-table.vue 保持一致）；
 * - 图表从报告容器的 echarts 根节点（[_echarts_instance_]）序列化 SVG 后光栅化成 PNG 内嵌
 *   （本项目 echarts 是 SVGRenderer 无 canvas；getDataURL 在 SVG 渲染器下返回 svg 串而非 PNG，
 *   docx 的 ImageRun 只吃真位图，详见 chartToPng 注释）。
 */
import {
  AlignmentType,
  BorderStyle,
  Document,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
  convertMillimetersToTwip,
} from 'docx';
import { saveAs } from 'file-saver';
import type {
  EspPostEvalIndicatorValue,
  EspPostEvalSatisfactionValue,
} from '@jeesite/early-stage-planning/api/early-stage-planning/post-evaluation';
import {
  LOCKED_TEXT,
  buildSpans,
  deltaOf,
  formatDelta,
  formatValue,
  isBeforeLocked,
} from './shared';

/** 统计图在 Word 里的宽度（px@96dpi ≈ 232pt，两图 + 间隙铺满 A4 版心） */
const CHART_IMG_W = 310;

/** 字号（half-point）：正文 12pt（小四）、图注/表格/元信息 10.5pt（五号） */
const SIZE_BODY = 24;
const SIZE_SMALL = 21;

/** 表格边框：0.5pt 黑实线（size 单位 1/8 pt） */
const TABLE_BORDER = { style: BorderStyle.SINGLE, size: 4, color: '000000' };

/** 无边框（统计图排版表格用） */
const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };

/** 表格单元格内边距（twip） */
const CELL_MARGIN = { top: 40, bottom: 40, left: 80, right: 80 };

/** Word 表格数据（report.vue 之外的表格构造也走这套结构） */
export interface WordTableData {
  caption: string;
  header: string[];
  /** rowSpan = 0 表示该格被上方单元格合并覆盖（跳过不生成），与 antd 表格口径一致 */
  rows: { text: string; rowSpan?: number }[][];
}

/** 报告的一个章节：标题 + 正文 +（可选）统计图组 +（可选）表格 */
export interface WordSectionData {
  heading: string;
  text: string;
  /** 本节图表图注，顺序 = 页面 DOM 顺序（用于与 echarts 实例顺序配对） */
  chartCaptions?: string[];
  table?: WordTableData;
}

/** 报告导出数据（report.vue 组装；图表 PNG 由本模块从 DOM 实例提取） */
export interface ReportWordPayload {
  title: string;
  /** 元信息行（已剔空、带标签），导出为一行居中 */
  metaItems: string[];
  sections: WordSectionData[];
}

/** 文件名安全化 */
function safeName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '_').trim() || '评估报告';
}

/** 表1 行数据（列结构与 indicator-table.vue 一致：一级/二级维度按同值合并，锁定维度更新前显示「/」） */
export function buildIndicatorTableData(rows: EspPostEvalIndicatorValue[]): WordTableData {
  const lv1Spans = buildSpans(rows, (row) => row.lv1 ?? '');
  const lv2Spans = buildSpans(rows, (row) => `${row.lv1 ?? ''}|${row.lv2 ?? ''}`);
  return {
    caption: '表1 片区更新后评估成效指标对比表',
    header: ['一级维度', '二级维度', '序号', '指标项', '单位', '更新前', '更新后', '提升'],
    rows: rows.map((row, index) => [
      { text: row.lv1 ?? '', rowSpan: lv1Spans[index] },
      { text: row.lv2 ?? '', rowSpan: lv2Spans[index] },
      { text: row.seqNo === null || row.seqNo === undefined ? '' : String(row.seqNo) },
      { text: row.name ?? '' },
      { text: row.unit ?? '' },
      { text: isBeforeLocked(row.lv1) ? LOCKED_TEXT : formatValue(row.beforeValue) },
      { text: formatValue(row.afterValue) },
      {
        text: isBeforeLocked(row.lv1) ? '' : formatDelta(deltaOf(row.beforeValue, row.afterValue)),
      },
    ]),
  };
}

/** 表2 行数据（列结构与 satisfaction-table.vue 一致：一级维度按同值合并） */
export function buildSatisfactionTableData(rows: EspPostEvalSatisfactionValue[]): WordTableData {
  const lv1Spans = buildSpans(rows, (row) => row.lv1 ?? '');
  return {
    caption: '表2 片区更新后评估满意度分析表',
    header: ['一级维度', '二级维度', '更新前满意度（%）', '更新后满意度（%）', '提升'],
    rows: rows.map((row, index) => [
      { text: row.lv1 ?? '', rowSpan: lv1Spans[index] },
      { text: row.lv2 ?? '' },
      { text: formatValue(row.beforeScore) },
      { text: formatValue(row.afterScore) },
      { text: formatDelta(deltaOf(row.beforeScore, row.afterScore)) },
    ]),
  };
}

/**
 * 单个 echarts 图表根节点 → PNG dataURL（手动光栅化）
 *
 * ⚠️ 不能用 `chart.getDataURL({ type: 'png' })`：本项目 echarts 是 SVGRenderer，
 * 它返回的是 `data:image/svg+xml` 的 URL 编码串（无视 type 参数），docx 的 ImageRun
 * 只接受真位图。做法：序列化 svg → Image 解码 → 以 pixelRatio 倍画到 canvas → toDataURL。
 * 失败返回 undefined（跳过该图）。
 */
async function chartToPng(
  chartRoot: HTMLElement,
  pixelRatio = 2,
): Promise<{ dataUrl: string; width: number; height: number } | undefined> {
  const svg = chartRoot.querySelector('svg');
  if (!svg) return undefined;
  const width = Number(svg.getAttribute('width')) || chartRoot.clientWidth || 550;
  const height = Number(svg.getAttribute('height')) || chartRoot.clientHeight || 320;
  try {
    const xml = new XMLSerializer().serializeToString(svg);
    const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('svg decode failed'));
      el.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * pixelRatio));
    canvas.height = Math.max(1, Math.round(height * pixelRatio));
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return { dataUrl: canvas.toDataURL('image/png'), width, height };
  } catch {
    return undefined;
  }
}

/** 报告容器里的全部 echarts 图表 → PNG，按 DOM 顺序（并发光栅化） */
async function collectChartPngs(el: HTMLElement): Promise<{ dataUrl: string; width: number; height: number }[]> {
  const roots = Array.from(el.querySelectorAll('[_echarts_instance_]')) as HTMLElement[];
  const pngs = await Promise.all(roots.map((root) => chartToPng(root)));
  return pngs.filter((png): png is { dataUrl: string; width: number; height: number } => !!png);
}

/** 图注段落（居中、加粗、五号） */
function captionParagraph(text: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 60, after: 160 },
    children: [new TextRun({ text, bold: true, size: SIZE_SMALL })],
  });
}

/** 数据表格：表头灰底加粗、0.5pt 框线、单元格水平垂直居中，rowSpan 纵向合并 */
function dataTable(table: WordTableData): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: TABLE_BORDER,
      bottom: TABLE_BORDER,
      left: TABLE_BORDER,
      right: TABLE_BORDER,
      insideHorizontal: TABLE_BORDER,
      insideVertical: TABLE_BORDER,
    },
    rows: [
      new TableRow({
        tableHeader: true,
        children: table.header.map(
          (text) =>
            new TableCell({
              shading: { fill: 'F2F2F2' },
              verticalAlign: VerticalAlign.CENTER,
              margins: CELL_MARGIN,
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text, bold: true, size: SIZE_SMALL })],
                }),
              ],
            }),
        ),
      }),
      ...table.rows.map(
        (cells) =>
          new TableRow({
            children: cells
              .filter((cell) => (cell.rowSpan ?? 1) > 0)
              .map(
                (cell) =>
                  new TableCell({
                    rowSpan: (cell.rowSpan ?? 1) > 1 ? cell.rowSpan : undefined,
                    verticalAlign: VerticalAlign.CENTER,
                    margins: CELL_MARGIN,
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: cell.text, size: SIZE_SMALL })],
                      }),
                    ],
                  }),
              ),
          }),
      ),
    ],
  });
}

/** 统计图组：两两一行的无边框表格，每格 = 图（居中）+ 图注；奇数张末格补空 */
function chartGrid(
  charts: { dataUrl: string; width: number; height: number; caption: string }[],
): Table {
  const rows: TableRow[] = [];
  for (let i = 0; i < charts.length; i += 2) {
    const pair: ({ dataUrl: string; width: number; height: number; caption: string } | undefined)[] =
      charts.slice(i, i + 2);
    while (pair.length < 2) pair.push(undefined);
    rows.push(
      new TableRow({
        children: pair.map(
          (chart) =>
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              borders: {
                top: NO_BORDER,
                bottom: NO_BORDER,
                left: NO_BORDER,
                right: NO_BORDER,
              },
              children: [
                chart
                  ? new Paragraph({
                      alignment: AlignmentType.CENTER,
                      spacing: { before: 120 },
                      children: [
                        new ImageRun({
                          type: 'png',
                          data: chart.dataUrl,
                          transformation: {
                            width: CHART_IMG_W,
                            height: Math.round((CHART_IMG_W * chart.height) / chart.width),
                          },
                        }),
                      ],
                    })
                  : new Paragraph({ children: [] }),
                chart
                  ? new Paragraph({
                      alignment: AlignmentType.CENTER,
                      spacing: { after: 120 },
                      children: [new TextRun({ text: chart.caption, bold: true, size: SIZE_SMALL })],
                    })
                  : new Paragraph({ children: [] }),
              ],
            }),
        ),
      }),
    );
  }
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: NO_BORDER,
      bottom: NO_BORDER,
      left: NO_BORDER,
      right: NO_BORDER,
      insideHorizontal: NO_BORDER,
      insideVertical: NO_BORDER,
    },
    rows,
  });
}

/**
 * 报告 → .docx 并触发下载
 *
 * @param el       报告正文容器（只用于取 echarts 图表实例）
 * @param payload  报告数据（标题/元信息/章节正文/表格；见 ReportWordPayload）
 * @param fileName 文件名（不带扩展名）
 */
export async function exportReportWord(
  el: HTMLElement,
  payload: ReportWordPayload,
  fileName: string,
): Promise<void> {
  const pngs = await collectChartPngs(el);
  let chartCursor = 0;

  const children: Array<Paragraph | Table> = [
    // 主标题（黑体 16pt 居中）
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: payload.title, bold: true, size: 32, font: '黑体' })],
    }),
  ];

  // 元信息行（五号居中，全角空格分隔）
  if (payload.metaItems.length) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new TextRun({ text: payload.metaItems.join('　'), size: SIZE_SMALL })],
      }),
    );
  }

  for (const section of payload.sections) {
    // 章节标题（黑体 14pt）
    children.push(
      new Paragraph({
        spacing: { before: 240, after: 120 },
        children: [new TextRun({ text: section.heading, bold: true, size: 28, font: '黑体' })],
      }),
    );

    // 正文（宋体 12pt，首行缩进 2 字符 = 480 twip，1.5 倍行距）
    if (section.text) {
      children.push(
        new Paragraph({
          indent: { firstLine: 480 },
          spacing: { after: 120, line: 360 },
          children: [new TextRun({ text: section.text, size: SIZE_BODY })],
        }),
      );
    }

    // 统计图组（图注与 DOM 里的图表实例按顺序配对；实例缺失时跳过该图并告警）
    const sectionCharts = (section.chartCaptions ?? [])
      .map((caption) => {
        const png = pngs[chartCursor++];
        if (!png) {
          console.warn(`[export-word] 图表实例缺失，跳过：${caption}`);
          return undefined;
        }
        return { ...png, caption };
      })
      .filter((chart): chart is { dataUrl: string; width: number; height: number; caption: string } => !!chart);
    if (sectionCharts.length) {
      children.push(chartGrid(sectionCharts));
    }

    // 表格（表注 + 数据表）
    if (section.table) {
      children.push(captionParagraph(section.table.caption));
      children.push(dataTable(section.table));
    }
  }

  const doc = new Document({
    styles: { default: { document: { run: { font: '宋体', size: SIZE_BODY } } } },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: convertMillimetersToTwip(210),
              height: convertMillimetersToTwip(297),
            },
            margin: {
              top: convertMillimetersToTwip(18),
              bottom: convertMillimetersToTwip(18),
              left: convertMillimetersToTwip(16),
              right: convertMillimetersToTwip(16),
            },
          },
        },
        children,
      },
    ],
  });

  saveAs(await Packer.toBlob(doc), `${safeName(fileName)}.docx`);
}
