/**
 * ifco —— 项目实施成效填报：Excel 导出（xlsx-js-style + file-saver 下载）
 *
 * 成效域无类目维度（用户定案），导出为单排表头的平铺表：
 *   指标名称 | 计量单位 | 代码 | 数量合计 | 各项目名称…；
 * 表体为成效指标全集（含「一、～八、」节标题行，仅名称列有值，其余空白）。
 * 双值行（数|面积）导出为一个文本单元格：纯数字以竖线拼接（无千分位），空侧留空。
 */
import type { WorkBook, WorkSheet } from 'xlsx-js-style';
import { saveAs } from 'file-saver';
import { saveWorkbook, finishBorderedSheet } from '../../shared/excel';
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
  /** 表头行（第 1 行）行高，单位 pt；不传默认 28 */
  headerRowHeight?: number;
};

/** 行组装：固定四列前缀 + 各项目列值（单单位/全量导出共用） */
function rowsOf(indicators: typeof EFFECT_INDICATORS, unitData: EffectUnitData): (string | number | undefined)[][] {
  const projects: ProjectColumn[] = unitData.projects;
  return indicators.map((item) => {
    const isSection = item.kind === 'section';
    return [
      item.name,
      isSection ? undefined : item.unit || undefined,
      item.code || undefined,
      isSection ? undefined : exportValue(rowTotal(item, unitData)),
      ...projects.map((project) => (isSection ? undefined : exportValue(cellValue(item, project)))),
    ];
  });
}

export async function exportEffectExcel({
  year,
  quarter,
  unitName,
  unitData,
  headerRowHeight,
}: ExportParams): Promise<void> {
  const projects: ProjectColumn[] = unitData.projects;

  // ── 组装 AOA（单排表头：固定四列 + 各项目名称） ─────────────────────
  const rows: (string | number | undefined)[][] = [
    ['指标名称', '计量单位', '代码', '数量合计', ...projects.map((project) => project.name)],
  ];
  rows.push(...rowsOf(EFFECT_INDICATORS, unitData));

  const worksheet: WorkSheet = finishBorderedSheet(
    rows,
    [],
    [{ wch: 42 }, { wch: 10 }, { wch: 8 }, { wch: 14 }, ...projects.map(() => ({ wch: 12 }))],
    { rowHeights: { 0: headerRowHeight ?? 100 } },
  );

  const workbook: WorkBook = {
    SheetNames: [`湖北省武汉市${year}年${quarterLabel(quarter)}项目成效情况`],
    Sheets: { [`湖北省武汉市${year}年${quarterLabel(quarter)}项目成效情况`]: worksheet },
  };
  await saveWorkbook(
    workbook,
    `${unitName ? `${unitName}：` : ''}湖北省武汉市${year}年${quarterLabel(quarter)}项目实施成效情况表.xlsx`,
  );
}

/**
 * 导出所有项目（仅超管/综合协调组）：单 sheet、全部单位项目列拼接
 *
 * 列顺序：固定四列（含数量合计）→ 按报送单位顺序拼接各单位项目列
 * （单位内带入列在前、本期新增在后 = 调用方给定顺序）；不体现单位维度，列头只有项目名。
 * 行 = 成效指标全集（节标题行/双值行口径同单单位导出）。
 */
export async function exportEffectAllProjectsExcel(params: {
  year: number;
  quarter: string;
  units: { unitCode: string; projects: ProjectColumn[] }[];
}): Promise<void> {
  const { year, quarter, units } = params;
  const projects = units.flatMap((unit) => unit.projects);

  const header: (string | number)[] = ['指标名称', '计量单位', '代码', '数量合计', ...projects.map((p) => p.name)];
  const allAsUnit: EffectUnitData = { projects };
  const dataRows: (string | number | undefined)[][] = rowsOf(EFFECT_INDICATORS, allAsUnit);

  const worksheet = finishBorderedSheet(
    [header, ...dataRows],
    [],
    [{ wch: 42 }, { wch: 10 }, { wch: 8 }, { wch: 14 }, ...projects.map(() => ({ wch: 12 }))],
  );

  const sheetName = `湖北省武汉市${year}年${quarterLabel(quarter)}项目实施成效情况表（全部项目）`;
  const workbook: WorkBook = { SheetNames: [sheetName], Sheets: { [sheetName]: worksheet } };
  await saveWorkbook(workbook, `${sheetName}.xlsx`);
}
