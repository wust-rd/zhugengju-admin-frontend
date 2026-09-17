/**
 * ifco —— 项目成效统计：Excel 导出（xlsx-js-style + file-saver 下载）
 *
 * 单排表头的平铺表（成效域无类目维度）：
 *   指标名称 | 计量单位 | 代码 | 全武汉市 | 各报送单位列…；
 * 行 = 成效指标全集（含「一、～八、」节标题行，仅名称列有值，其余空白）；
 * 双值行（数|面积）导出为一个文本单元格：纯数字以竖线拼接（无千分位），空侧留空。
 * 文件名对齐官方口径：湖北省武汉市{年}年第{季}季度项目实施成效统计表。
 */
import type { WorkBook, WorkSheet } from 'xlsx-js-style';
import { saveWorkbook, finishBorderedSheet } from '../../shared/excel';
import { quarterLabel } from '@jeesite/ifco/api/ifco/common';
import type { EffectStatRow } from '@jeesite/ifco/api/ifco/effect-fill';

type ExportParams = {
  year: number;
  quarter: string;
  /** 可见报送单位（列顺序与页面一致） */
  units: { code: string; name: string }[];
  rows: EffectStatRow[];
};

/** 导出值：双值行纯数字竖线拼接（无千分位）；普通行未填与 0 置空 */
function exportValue(value: number | [number, number] | undefined): string | number | undefined {
  if (Array.isArray(value)) {
    const slot = (v: number) => (v === 0 ? '' : String(v));
    const text = `${slot(value[0])}|${slot(value[1])}`;
    return text === '|' ? undefined : text;
  }
  return value === 0 ? undefined : value;
}

export async function exportEffectStatExcel({ year, quarter, units, rows }: ExportParams): Promise<void> {
  const header: (string | number)[] = ['指标名称', '计量单位', '代码', '全武汉市', ...units.map((unit) => unit.name)];
  const dataRows: (string | number | undefined)[][] = rows.map((row) => {
    const isSection = row.kind === 'section';
    return [
      row.name,
      isSection ? undefined : row.unit || undefined,
      row.code || undefined,
      isSection ? undefined : exportValue(row.total),
      ...units.map((unit) => (isSection ? undefined : exportValue(row.units[unit.code]))),
    ];
  });

  const worksheet: WorkSheet = finishBorderedSheet(
    [header, ...dataRows],
    [],
    [{ wch: 42 }, { wch: 10 }, { wch: 8 }, { wch: 14 }, ...units.map(() => ({ wch: 14 }))],
  );

  const sheetName = `湖北省武汉市${year}年${quarterLabel(quarter)}项目实施成效统计表`;
  const workbook: WorkBook = { SheetNames: [sheetName], Sheets: { [sheetName]: worksheet } };
  await saveWorkbook(workbook, `${sheetName}.xlsx`);
}
