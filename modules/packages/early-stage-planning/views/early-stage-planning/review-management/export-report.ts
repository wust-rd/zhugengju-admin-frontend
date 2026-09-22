/**
 * 评估报告导出：把当前报告页截成 PDF，再与评审材料/评估附件打成 zip（fflate）。
 */
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { zipSync } from 'fflate';
import { saveAs } from 'file-saver';
import type { EspSchemeFile } from '@jeesite/early-stage-planning/api/early-stage-planning/scheme-declaration-review/scheme-fill';

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 12;

function safeName(name: string): string {
  const text = name.replace(/[\\/:*?"<>|]/g, '_').trim();
  return text || '未命名文件';
}

function uniquePath(path: string, used: Set<string>): string {
  if (!used.has(path)) {
    used.add(path);
    return path;
  }
  const dot = path.lastIndexOf('.');
  const stem = dot > 0 ? path.slice(0, dot) : path;
  const ext = dot > 0 ? path.slice(dot) : '';
  let index = 2;
  let next = `${stem}(${index})${ext}`;
  while (used.has(next)) {
    index += 1;
    next = `${stem}(${index})${ext}`;
  }
  used.add(next);
  return next;
}

async function captureToPdfBytes(el: HTMLElement): Promise<Uint8Array> {
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
  let offset = 0;
  let first = true;
  while (offset < canvas.height - 1) {
    const slicePx = Math.min(pagePx, canvas.height - offset);
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
    offset += page.height;
  }
  const output = pdf.output('arraybuffer');
  return new Uint8Array(output);
}

async function fetchFileBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`下载失败（${res.status}）`);
  }
  return new Uint8Array(await res.arrayBuffer());
}

/**
 * 生成评估报告 PDF，并与附件打包下载。
 *
 * @returns 未能打进压缩包的附件名（网络失败等）
 */
export async function exportReviewReportZip(options: {
  paper: HTMLElement;
  projectName: string;
  files: EspSchemeFile[];
}): Promise<string[]> {
  const used = new Set<string>();
  const entries: Record<string, Uint8Array> = {};
  entries[uniquePath('项目评估报告.pdf', used)] = await captureToPdfBytes(options.paper);

  const failed: string[] = [];
  for (const file of options.files) {
    const label = file.name || '附件';
    if (!file.url) {
      failed.push(label);
      continue;
    }
    try {
      const bytes = await fetchFileBytes(file.url);
      const path = uniquePath(`评审材料/${safeName(label)}`, used);
      entries[path] = bytes;
    } catch {
      failed.push(label);
    }
  }

  const zipped = zipSync(entries, { level: 6 });
  const zipName = `${safeName(options.projectName || '评估报告')}-评估报告.zip`;
  saveAs(new Blob([zipped as unknown as BlobPart], { type: 'application/zip' }), zipName);
  return failed;
}
