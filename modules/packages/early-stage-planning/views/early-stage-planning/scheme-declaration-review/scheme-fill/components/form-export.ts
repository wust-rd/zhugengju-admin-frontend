/*
  填报页导出（form.vue 右上角「导出」下拉）· PDF + Word 双格式

  数据源统一：文字取各区块 expose 的 exportRows()（[标签, 值]，含项目/城市设计分组），
  图片/地图按区块 id 从活动 DOM 提取（提取阶段置 pdfExporting 展开多 tab 面板）：
   - 图片：上传缩略图 src → fetch dataURL；
   - 地图：maplibre 画布 toDataURL 快照（preserveDrawingBuffer 已开）。

  PDF：数据重排「打印版式」（离屏 794px = A4@96dpi：两列字段表 + 缩略图网格 +
  地图整幅），逐区块截图后**流式拼页**——区块在页内接排（页尾留白只留 GAP），
  放不下按剩余高度切片续页，切片避让图片/地图/组标题行（不跨页）。

  Word：docx 库生成真 .docx——标题段落 + 每区块一张字段表（组标题行跨列底纹），
  缩略图内联成段（Word 中可直接选中复制），地图按页宽等比嵌入。
*/
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { nextTick } from 'vue';
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
  WidthType,
} from 'docx';
import { saveAs } from 'file-saver';
import { pdfExporting } from './pdf-export-state';

/** A4 纵向内容区（mm）：210×297，四边 10mm 页边距 */
const PAGE_MARGIN = 10;
const CONTENT_W = 210 - PAGE_MARGIN * 2;
const CONTENT_H = 297 - PAGE_MARGIN * 2;
/** 截图清晰度倍率（2 于 96dpi 屏约 192dpi） */
const CAPTURE_SCALE = 2;
/** 切片最小高度占可用高度比例：避让后低于此比例退回直切（防空页/无进展） */
const MIN_SLICE_RATIO = 0.08;
/** 打印版式页宽（px，A4@96dpi） */
const DOC_WIDTH = 794;
/** 区块接排间隙（mm） */
const GAP_MM = 2;
/** 区块在页尾切片的首片最小高度（mm）：更小则整块挪到下一页，避免页尾碎条 */
const MIN_TAIL_CHUNK_MM = 25;
/** Word：正文图片最大宽（px @96dpi）与缩略图边长 */
const DOCX_IMG_MAX_W = 450;
const DOCX_THUMB = 110;

/** 区块元数据（form.vue 组装文字行；图片/地图由本模块按 id 从 DOM 提取） */
export type PdfSectionMeta = { id: string; title: string; rows: [string, string][] };

/** 提取完成后的区块数据（PDF 版式与 Word 文档共用） */
type SectionData = PdfSectionMeta & { images: string[]; maps: string[] };

/** 打印版式样式（作用在离屏文档根 .pdf-doc 上） */
const DOC_CSS = `
.pdf-doc { position: fixed; left: -10000px; top: 0; width: ${DOC_WIDTH}px; background: #fff;
  font: 13px/1.7 system-ui, 'Microsoft YaHei', sans-serif; color: #333; }
.pdf-head { padding: 18px 28px 14px; border-bottom: 2px solid #1677ff; margin-bottom: 6px; }
.pdf-head h1 { margin: 0; font-size: 20px; font-weight: 600; color: #1f2329; }
.pdf-head .pdf-meta { margin-top: 4px; font-size: 12px; color: #888; }
.pdf-sec { padding: 6px 28px 10px; }
.pdf-sec h2 { display: flex; align-items: center; gap: 8px; margin: 6px 0 10px;
  font-size: 15px; font-weight: 600; color: #1f2329; }
.pdf-sec h2 i { width: 4px; height: 15px; border-radius: 2px; background: #1677ff; }
.pdf-row { display: flex; border-bottom: 1px solid #f0f0f0; padding: 3px 0; }
.pdf-row .k { flex: 0 0 170px; color: #777; }
.pdf-row .v { flex: 1; min-width: 0; word-break: break-all; white-space: pre-wrap; }
.pdf-group { font-weight: 600; background: #f5f8ff; border-bottom: 1px solid #e6eefc;
  padding: 4px 0; margin-top: 6px; }
.pdf-imgs { display: flex; flex-wrap: wrap; gap: 8px; padding: 8px 0 2px; }
.pdf-img { width: 130px; height: 130px; border-radius: 4px; background-size: cover;
  background-position: center; border: 1px solid #eee; }
.pdf-map { width: 100%; border: 1px solid #e5e7eb; border-radius: 4px; margin-top: 8px; display: block; }
`;

/** escape 文本，防注入打印文档 */
function esc(text: string): string {
  return text.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]!);
}

/** 单个区块的 PDF 版式 HTML（字段表 + 图片网格 + 地图） */
function sectionHtml(sec: SectionData): string {
  const rows = sec.rows
    .map(([label, value]) =>
      value === '' && /[：:]$/.test(label)
        ? `<div class="pdf-row pdf-group"><div class="k"></div><div class="v">${esc(label)}</div></div>`
        : `<div class="pdf-row"><div class="k">${esc(label.replace(/^[　\s]+/, ''))}</div><div class="v">${esc(value) || '—'}</div></div>`,
    )
    .join('');
  const imgs = sec.images.length
    ? `<div class="pdf-imgs">${sec.images.map((src) => `<div class="pdf-img" style="background-image:url(${src})"></div>`).join('')}</div>`
    : '';
  const mapTags = sec.maps.map((src) => `<img class="pdf-map" src="${src}" alt="地图"/>`).join('');
  return `<section class="pdf-sec" id="pdf-${sec.id}">
    <h2><i></i>${esc(sec.title)}</h2>
    ${rows}${imgs}${mapTags}
  </section>`;
}

/** url → dataURL（fetch blob；失败返回 undefined 跳过该图） */
async function toDataUrl(url: string): Promise<string | undefined> {
  try {
    const blob = await (await fetch(url, { mode: 'cors' })).blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return undefined;
  }
}

/** 从活动表单 DOM 提取一个区块的图片 src 与地图快照（须在 pdfExporting 展开态） */
async function extractAssets(sectionId: string): Promise<{ images: string[]; maps: string[] }> {
  const el = document.getElementById(sectionId);
  if (!el) {
    return { images: [], maps: [] };
  }
  // 地图：活 WebGL 画布直接快照（preserveDrawingBuffer 已开）
  const maps = [...el.querySelectorAll<HTMLCanvasElement>('canvas.maplibregl-canvas')]
    .map((canvas) => (canvas.width ? canvas.toDataURL('image/png') : ''))
    .filter(Boolean);
  // 图片：上传缩略卡的 img（去重保持顺序）
  const srcs = [
    ...new Set(
      [...el.querySelectorAll<HTMLImageElement>('.ant-upload-list-item-container img, img')]
        .map((img) => img.currentSrc || img.src)
        .filter((src) => /^https?:/.test(src)),
    ),
  ];
  const images = (await Promise.all(srcs.map(toDataUrl))).filter((src): src is string => !!src);
  return { images, maps };
}

/**
 * 统一取数入口：展开多 tab 面板（隐藏面板的图片/地图才可提取）→ 逐区块提取资产。
 * 调用方在回调里消费数据，结束后自动收起。
 */
async function withSectionData(metas: PdfSectionMeta[], fn: (sections: SectionData[]) => Promise<void>): Promise<void> {
  pdfExporting.value = true;
  try {
    await nextTick();
    await nextTick();
    const sections: SectionData[] = [];
    for (const meta of metas) {
      const { images, maps } = await extractAssets(meta.id);
      sections.push({ ...meta, images, maps });
    }
    await fn(sections);
  } finally {
    pdfExporting.value = false;
  }
}

// ---------------- PDF（打印版式 + 流式分页） ----------------

/** 收集元素内「不可切断」的 CSS 区间（缩略图/地图/组标题行），供避让切片 */
function noCutZones(block: HTMLElement): Array<{ top: number; bottom: number }> {
  const base = block.getBoundingClientRect();
  const zones: Array<{ top: number; bottom: number }> = [];
  block.querySelectorAll<HTMLElement>('.pdf-img, .pdf-map, .pdf-group').forEach((el) => {
    const rect = el.getBoundingClientRect();
    if (rect.height > 0) {
      zones.push({ top: rect.top - base.top, bottom: rect.bottom - base.top });
    }
  });
  return zones;
}

/** 切片结束位置（画布 px）：边界落进不可切断区间 → 上移到区间顶；过短退回直切 */
function sliceEnd(
  startPx: number,
  fullPx: number,
  ratio: number,
  zones: Array<{ top: number; bottom: number }>,
): number {
  const boundaryCss = fullPx / ratio;
  let adjusted = boundaryCss;
  for (const zone of zones) {
    if (zone.top < adjusted && zone.bottom > adjusted) {
      adjusted = Math.min(adjusted, zone.top);
    }
  }
  const adjustedPx = Math.round(adjusted * ratio);
  if (adjustedPx < fullPx && adjustedPx - startPx > (fullPx - startPx) * MIN_SLICE_RATIO) {
    return adjustedPx;
  }
  return fullPx;
}

/** canvas 像素高 → 毫米（等比：宽铺满内容宽） */
function pxToMm(px: number, canvasWidth: number): number {
  return (px / canvasWidth) * CONTENT_W;
}

/** 区块 canvas 切片绘制到当前页 yMm 处（页面翻转由调用方循环管理，这里只落图） */
function placeSlice(pdf: jsPDF, canvas: HTMLCanvasElement, from: number, to: number, yMm: number): void {
  const slicePx = to - from;
  const page = document.createElement('canvas');
  page.width = canvas.width;
  page.height = slicePx;
  page.getContext('2d')!.drawImage(canvas, 0, -from);
  pdf.addImage(page.toDataURL('image/jpeg', 0.92), 'JPEG', PAGE_MARGIN, yMm, CONTENT_W, pxToMm(slicePx, canvas.width));
}

/** 导出 PDF：打印版式截图，区块流式接排（页尾放不下按剩余高度切片续页） */
export async function exportFormPdf(metas: PdfSectionMeta[], headerTitle: string, filename: string): Promise<void> {
  await withSectionData(metas, async (sections) => {
    const style = document.createElement('style');
    style.textContent = DOC_CSS;
    document.head.append(style);
    const doc = document.createElement('div');
    doc.className = 'pdf-doc';
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    try {
      doc.innerHTML =
        `<div class="pdf-head"><h1>${esc(headerTitle)}</h1><div class="pdf-meta">导出时间：${date}</div></div>` +
        sections.map(sectionHtml).join('');
      document.body.append(doc);
      await nextTick();

      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      /** 页内游标（mm，绝对坐标，页顶为 PAGE_MARGIN）；已放置内容量（空页判断用） */
      let yMm = PAGE_MARGIN;
      let placedAny = false;

      for (const block of [...doc.querySelectorAll<HTMLElement>('.pdf-head, .pdf-sec')]) {
        const zones = noCutZones(block);
        const canvas = await html2canvas(block, {
          scale: CAPTURE_SCALE,
          backgroundColor: '#ffffff',
          useCORS: true,
          logging: false,
        });
        if (!canvas.width || !canvas.height) continue;
        const ratio = canvas.width / block.getBoundingClientRect().width;
        const totalMm = pxToMm(canvas.height, canvas.width);

        // 整块放得下本页剩余空间：直接接排（首块过高同样走切分，防止单块溢出页面）
        if (yMm - PAGE_MARGIN + totalMm <= CONTENT_H + 0.5) {
          placeSlice(pdf, canvas, 0, canvas.height, yMm);
          placedAny = true;
          yMm += totalMm + GAP_MM;
          continue;
        }

        // 放不下：先切一片填满本页剩余（避让不可切断元素），其余片从新页顶续排
        let from = 0;
        let firstSlice = true;
        while (from < canvas.height) {
          // 统一按「当前页剩余高度」计算（片后若页满已翻页，yMm=页顶 → 剩余=整页）
          const availMm = PAGE_MARGIN + CONTENT_H - yMm;
          if (availMm <= MIN_TAIL_CHUNK_MM) {
            pdf.addPage();
            yMm = PAGE_MARGIN;
            continue;
          }
          const availPx = (availMm / CONTENT_W) * canvas.width;
          const candidate = Math.min(from + availPx, canvas.height);
          const end = candidate < canvas.height ? sliceEnd(from, candidate, ratio, zones) : candidate;
          // 尚未放置的整块在页尾只切得出碎条（避让让位导致）：整块挪到新页重排。
          // yMm 在页顶时不再挪（否则同样结果反复换页死循环），页顶必须落图保进展
          if (firstSlice && from === 0 && yMm > PAGE_MARGIN && pxToMm(end - from, canvas.width) < MIN_TAIL_CHUNK_MM) {
            pdf.addPage();
            yMm = PAGE_MARGIN;
            continue;
          }
          const chunkMm = pxToMm(end - from, canvas.width);
          placeSlice(pdf, canvas, from, end, yMm);
          placedAny = true;
          from = end;
          firstSlice = false;
          yMm += chunkMm + GAP_MM;
          // 本片恰好填满页面且区块还有剩余：翻页续排（避免下一片落到页外）
          if (from < canvas.height && yMm >= PAGE_MARGIN + CONTENT_H - 0.5) {
            pdf.addPage();
            yMm = PAGE_MARGIN;
          }
        }
      }

      if (!placedAny) {
        throw new Error('未生成任何内容');
      }
      pdf.save(filename);
    } finally {
      doc.remove();
      style.remove();
    }
  });
}

// ---------------- Word（docx 真文档） ----------------

/**
 * 图片规整为「真 JPEG」dataURL（canvas 重绘，最长边限 maxSide）：
 * 源文件的真实字节可能与扩展名/响应 MIME 不符（PNG 改名 .jpg、webp 等——浏览器
 * <img> 按内容嗅探照常显示，Word 严格校验字节与声明类型，对不上即「无法显示该图片」）。
 * 重编码后字节恒为 JPEG，与 ImageRun 声明的 type 一致；解码失败返回 undefined 跳过。
 */
async function toJpegDataUrl(
  dataUrl: string,
  maxSide = 1200,
): Promise<{ url: string; w: number; h: number } | undefined> {
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('decode failed'));
      el.src = dataUrl;
    });
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (!w || !h) {
      return undefined;
    }
    const scale = Math.min(1, maxSide / Math.max(w, h));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return { url: canvas.toDataURL('image/jpeg', 0.85), w, h };
  } catch {
    return undefined;
  }
}

/** dataURL → 图片原始尺寸（加载解码；失败给缩略图兜底尺寸） */
function imageSize(dataUrl: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth || DOCX_THUMB, h: img.naturalHeight || DOCX_THUMB });
    img.onerror = () => resolve({ w: DOCX_THUMB, h: DOCX_THUMB });
    img.src = dataUrl;
  });
}

/** 等比缩放至限定框内 */
function fitSize(w: number, h: number, maxW: number, maxH: number): { width: number; height: number } {
  const scale = Math.min(maxW / w, maxH / h, 1);
  return { width: Math.round(w * scale), height: Math.round(h * scale) };
}

/** 区块字段表（label/value 两列；组标题行跨列底纹） */
function sectionTable(sec: SectionData): Table {
  const thin = { style: BorderStyle.SINGLE, size: 1, color: 'E8E8E8' };
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: thin, bottom: thin, left: thin, right: thin, insideHorizontal: thin, insideVertical: thin },
    rows: sec.rows.map(([label, value]) => {
      const cleanLabel = label.replace(/^[　\s]+/, '');
      if (value === '' && /[：:]$/.test(cleanLabel)) {
        return new TableRow({
          children: [
            new TableCell({
              columnSpan: 2,
              shading: { fill: 'EAF2FF' },
              margins: { top: 40, bottom: 40, left: 80, right: 80 },
              children: [new Paragraph({ children: [new TextRun({ text: cleanLabel, bold: true })] })],
            }),
          ],
        });
      }
      return new TableRow({
        children: [
          new TableCell({
            width: { size: 24, type: WidthType.PERCENTAGE },
            margins: { top: 40, bottom: 40, left: 80, right: 80 },
            children: [new Paragraph({ children: [new TextRun({ text: cleanLabel, color: '777777' })] })],
          }),
          new TableCell({
            width: { size: 76, type: WidthType.PERCENTAGE },
            margins: { top: 40, bottom: 40, left: 80, right: 80 },
            children: [new Paragraph({ children: [new TextRun({ text: value || '—' })] })],
          }),
        ],
      });
    }),
  });
}

/** 导出 Word：docx 真文档（标题/字段表/缩略图内联/地图整幅），图片可直接复制 */
export async function exportFormDocx(metas: PdfSectionMeta[], headerTitle: string, filename: string): Promise<void> {
  await withSectionData(metas, async (sections) => {
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const children: Array<Paragraph | Table> = [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
        children: [new TextRun({ text: headerTitle, bold: true, size: 36 })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
        children: [new TextRun({ text: `导出时间：${date}`, color: '888888', size: 18 })],
      }),
    ];

    for (const sec of sections) {
      children.push(
        new Paragraph({
          spacing: { before: 240, after: 120 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '1677FF' } },
          children: [new TextRun({ text: sec.title, bold: true, size: 26, color: '1F4E79' })],
        }),
      );
      // 空 rows 不能建表（docx Table 空行数组抛 Invalid array length），渲染占位段落
      if (sec.rows.length) {
        children.push(sectionTable(sec));
      } else {
        children.push(new Paragraph({ children: [new TextRun({ text: '（无内容）', color: '999999' })] }));
      }

      // 缩略图：canvas 重编码为真 JPEG（防源文件字节/类型不符被 Word 拒显，如 PNG 改名
      // .jpg）后内联成段（自然换行，Word 中可整图选中复制），段间空串分隔；
      // dataURL 字符串直传 docx（其内部官方转换路径处理二进制）
      if (sec.images.length) {
        const runs = (
          await Promise.all(
            sec.images.map(async (dataUrl) => {
              const jpeg = await toJpegDataUrl(dataUrl);
              if (!jpeg) {
                return undefined;
              }
              return new ImageRun({
                type: 'jpg',
                data: jpeg.url,
                transformation: fitSize(jpeg.w, jpeg.h, DOCX_THUMB, DOCX_THUMB),
              });
            }),
          )
        )
          .filter((run): run is ImageRun => !!run)
          .flatMap((run, i) => (i === 0 ? [run] : [new TextRun({ text: '  ' }), run]));
        if (runs.length) {
          children.push(new Paragraph({ spacing: { before: 120 }, children: runs }));
        }
      }

      // 地图：canvas 快照恒为真 PNG，dataURL 直传；页宽等比、居中
      for (const dataUrl of sec.maps) {
        const { w, h } = await imageSize(dataUrl);
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 120 },
            children: [
              new ImageRun({
                type: 'png',
                data: dataUrl,
                transformation: fitSize(w, h, DOCX_IMG_MAX_W, DOCX_IMG_MAX_W),
              }),
            ],
          }),
        );
      }
    }

    const doc = new Document({
      styles: { default: { document: { run: { font: 'Microsoft YaHei', size: 21 } } } },
      sections: [{ children }],
    });
    saveAs(await Packer.toBlob(doc), filename);
  });
}
