/**
 * ifco —— 项目实施成效填报：Excel 导出（xlsx(SheetJS) 生成 + file-saver 下载）
 *
 * 成效填报无类目维度（用户定案），导出为单行表头的平铺表：
 *   指标名称 | 计量单位 | 代码 | 数量合计 | 各项目列…；
 * 表体为成效指标全集（含「一、～八、」节标题行，仅名称列有值，其余空白）。
 * 双值行（数|面积）导出为一个文本单元格：纯数字以竖线拼接（无千分位），空侧留空。
 * 复用项目既有方案（同 progress-fill/export-excel.ts）；样式走 xlsx-js-style 分支：全表细边框。
 */
import { utils, write } from 'xlsx-js-style';
import type { WorkBook, WorkSheet } from 'xlsx-js-style';
import { saveAs } from 'file-saver';
import { finishBorderedSheet } from '../../shared/excel';
import type { ProjectColumn } from '@jeesite/ifco/api/ifco/common';
import { quarterLabel } from '@jeesite/ifco/api/ifco/common';
import type { EffectUnitData } from '@jeesite/ifco/api/ifco/effect-fill';
import { EFFECT_INDICATORS, cellValue, rowTotal } from '@jeesite/ifco/api/ifco/effect-fill';

/** 导出值：双值行纯数字竖线拼接（无千分位）；普通行未填与 0 置空 */
function exportValue(value: number | string | [number, number] | undefined): string | number | undefined {
  if (Array.isArray(value)) {
    const slot = (v: number) => (v === 0 ? '' : String(v));
    const text = `${slot(value[0])}|${slot(value[1])}`;
    return text === '|' ? undefined : text;
  }
  return value === 0 ? undefined : value;
}

type ExportParams = {
  year: number;
  quarter: string;
  /** 报送单位名称（文件名后缀，如 江汉区局） */
  unitName?: string;
  unitData: EffectUnitData;
};

export async function exportEffectExcel({ year, quarter, unitName, unitData }: ExportParams): Promise<void> {
  const projects: ProjectColumn[] = unitData.projects;

  // ── 组装 AOA（1 行表头 + 指标全集含节标题行） ────────────────────────
  const rows: (string | number | undefined)[][] = [
    ['指标名称', '计量单位', '代码', '数量合计', ...projects.map((project) => project.name)],
  ];
  for (const item of EFFECT_INDICATORS) {
    const isSection = item.kind === 'section';
    const row: (string | number | undefined)[] = [
      item.name,
      isSection ? undefined : item.unit || undefined,
      item.code || undefined,
      isSection ? undefined : exportValue(rowTotal(item, unitData)),
    ];
    for (const project of projects) {
      row.push(isSection ? undefined : exportValue(cellValue(item, project)));
    }
    rows.push(row);
  }

  const worksheet: WorkSheet = finishBorderedSheet(
    rows,
    [],
    [{ wch: 42 }, { wch: 10 }, { wch: 8 }, { wch: 14 }, ...projects.map(() => ({ wch: 12 }))],
  );

  const workbook: WorkBook = {
    SheetNames: ['项目实施成效填报'],
    Sheets: { 项目实施成效填报: worksheet },
  };
  const buffer = write(workbook, { bookType: 'xlsx', type: 'array' });
  saveAs(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `项目实施成效填报_${year}年${quarterLabel(quarter)}${unitName ? `_${unitName}` : ''}.xlsx`,
  );
}
