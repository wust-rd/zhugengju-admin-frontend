/**
 * 评估报告 PDF 导出：把报告正文容器截成 A4 多页 PDF
 *
 * 做法与评审管理的报告导出一致（jsPDF + html2canvas-pro），落盘统一走 file-saver；
 * 报告里的 echarts 图表是 canvas，html2canvas 能一并截进去。
 *
 * 额外做了**分页避让**：不再按固定像素硬切，而是在理想切页位置附近找一条"基本空白"的行
 * （文字行间隙 / 表格单元格留白 / 图表周围空白）再切，避免文字行、表格行被从中间切开。
 */
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { saveAs } from 'file-saver';

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 12;

/** 判定"基本空白"时允许的深色像素比例（表格竖线/边框这类极少量深色像素可忽略） */
const MAX_DARK_RATIO = 0.02;

/** 取可读的 2D 上下文（画布被跨域图片污染时返回 null → 退化为按固定高度切页） */
function getReadableContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
  try {
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.getImageData(0, 0, 1, 1); // 试读一个像素：污染画布会抛异常
    return ctx;
  } catch {
    return null;
  }
}

/** 某一行里深色像素占比（横向抽样，够用且快） */
function darkRatioOfRow(ctx: CanvasRenderingContext2D, y: number, width: number): number {
  const step = 8;
  const data = ctx.getImageData(0, y, width, 1).data;
  let dark = 0;
  let total = 0;
  for (let x = 0; x < width; x += step) {
    const i = x * 4;
    total += 1;
    if (data[i + 3] > 8 && (data[i] < 245 || data[i + 1] < 245 || data[i + 2] < 245)) {
      dark += 1;
    }
  }
  return total ? dark / total : 0;
}

/**
 * 在 idealY 附近找合适的切页线：由近及远，先往上找再往下找
 * （宁可这一页少放一点，也不要把一行字/一个表格行切两半）
 *
 * @returns 切页像素位置（找不到空白行时返回 idealY）
 */
function findPageBreakY(
  ctx: CanvasRenderingContext2D,
  canvasHeight: number,
  idealY: number,
  searchWindow: number,
  width: number,
): number {
  for (let distance = 0; distance <= searchWindow; distance += 1) {
    const candidates = distance === 0 ? [idealY] : [idealY - distance, idealY + distance];
    for (const y of candidates) {
      if (y <= 0 || y >= canvasHeight) continue;
      if (darkRatioOfRow(ctx, y, width) <= MAX_DARK_RATIO) return y;
    }
  }
  return idealY;
}

/**
 * 报告容器 → PDF 并触发下载
 *
 * @param el       报告正文容器（不含顶部操作条）
 * @param fileName 文件名（不带扩展名）
 */
export async function exportReportPdf(el: HTMLElement, fileName: string): Promise<void> {
  const canvas = await html2canvas(el, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false,
  });

  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const contentW = PAGE_W - MARGIN * 2;
  const contentH = PAGE_H - MARGIN * 2;
  const pagePx = canvas.width * (contentH / contentW);
  const ctx = getReadableContext(canvas);

  let offset = 0;
  let first = true;
  while (offset < canvas.height - 1) {
    const remaining = canvas.height - offset;
    let slicePx = Math.min(pagePx, remaining);

    // 后面还有内容时，在理想切页线附近找空白行（±12% 页高），避免切在文字/表格行中间
    if (ctx && slicePx < remaining) {
      const searchWindow = Math.round(pagePx * 0.12);
      const cutY = findPageBreakY(ctx, canvas.height, Math.round(offset + slicePx), searchWindow, canvas.width);
      if (cutY - offset > 50) {
        slicePx = cutY - offset;
      }
    }

    const page = document.createElement('canvas');
    page.width = canvas.width;
    page.height = Math.max(1, Math.round(slicePx));
    page.getContext('2d')!.drawImage(canvas, 0, -offset);
    if (!first) {
      pdf.addPage();
    }
    first = false;
    const sliceMm = (page.height / canvas.width) * contentW;
    pdf.addImage(page.toDataURL('image/jpeg', 0.92), 'JPEG', MARGIN, MARGIN, contentW, sliceMm);
    offset += slicePx;
  }

  const name = fileName.replace(/[\\/:*?"<>|]/g, '_').trim() || '评估报告';
  saveAs(pdf.output('blob'), `${name}.pdf`);
}
