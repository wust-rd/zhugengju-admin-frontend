/**
 * 附件展示小工具（填报页各上传区块共用：实施方案 / 附件材料 等）
 *
 * 抽出共用的「按扩展名取图标颜色」「附件大小文案」「下载附件」，避免各区块重复实现。
 */

import type { UploadFile } from 'antdv-next';
import { match } from 'ts-pattern';

/** 文件扩展名（小写；无扩展名返回空串） */
function fileExt(name: string): string {
  const i = name.lastIndexOf('.');
  return i < 0 ? '' : name.slice(i + 1).toLowerCase();
}

/** 附件图标颜色（按扩展名）：PDF 红 / Word 蓝 / Excel 绿 / 图纸橙 / 其他灰 */
export function fileColor(name: string): string {
  return match(fileExt(name))
    .with('pdf', () => '#F5455C')
    .with('doc', 'docx', () => '#3A8EF6')
    .with('xls', 'xlsx', () => '#2AB69B')
    .with('dwg', 'shp', 'json', () => '#F7A832')
    .otherwise(() => '#8A94A6');
}

/** 附件大小文案（初始回填只有文件名、拿不到 size 时返回空串） */
export function fileSizeText(f: UploadFile): string {
  const size = f.size ?? (f.originFileObj as unknown as { size?: number } | undefined)?.size;
  if (!size) return '';
  return size < 1024 * 1024 ? `${(size / 1024).toFixed(1)} KB` : `${(size / 1024 / 1024).toFixed(2)} MB`;
}

/**
 * 下载附件（所有已上传文件通用，直链来自 MinIO 上传回填/回显）
 *
 * fetch 直链转 blob 后以 a[download] 落盘：文件名保真，pdf/图片等可预览类型也强制
 * 走下载而非浏览器打开；跨域直链缺 CORS 头等 fetch 失败时回退新窗打开直链（浏览器
 * 按类型预览或下载），保证任何部署形态下入口可用。
 */
export async function downloadEspFile(file: { name: string; url?: string }): Promise<void> {
  const { name, url } = file;
  if (!url) return;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(String(res.status));
    const href = URL.createObjectURL(await res.blob());
    const a = Object.assign(document.createElement('a'), { href, download: name });
    document.body.appendChild(a);
    a.click();
    a.remove();
    // 延迟回收：个别浏览器立即 revoke 会中断未开始的下载
    setTimeout(() => URL.revokeObjectURL(href));
  } catch {
    window.open(url, '_blank', 'noopener');
  }
}
