/**
 * 附件展示小工具（填报页各上传区块共用：实施方案 / 附件材料 等）
 *
 * 抽出共用的「按扩展名取图标颜色」「附件大小文案」，避免各区块重复实现。
 */

import type { UploadFile } from 'antdv-next';
import { match } from 'ts-pattern';

/** 附件图标颜色（按扩展名）：PDF 红 / Word 蓝 / Excel 绿 / 图纸橙 / 其他灰 */
export function fileColor(name: string): string {
  const ext = name.slice(name.lastIndexOf('.') + 1).toLowerCase();
  return match(ext)
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
