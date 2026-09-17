/**
 * ifco —— 项目进展填报：Excel 导出（xlsx-js-style 单 sheet + file-saver 下载）
 *
 * 表头对齐官方《项目实施进展情况表》（三排表头，经开区附件 1-1 同构）：
 *   行 1 = 固定四列标签（指标名称/计量单位/代码/合计，纵向合并行 1~2）
 *          + 一级类目跨列（简单类目直接跨行 1~2 合并整个区块）；
 *   行 2 = 二级类目（嵌套类目，跨各自「项目列 + 小计」）；
 *   行 3 = 项目名称 + 每叶子一列「小计」（固定四列该行留空）。
 * 单 sheet：全部类目按页签顺序横向排列（既有建筑改造利用 → … → 城市历史文化保护传承），
 * 每叶子「项目列 + 小计」，行 4 起为指标全集；冻结前三行 + 第一列。
 * 「导出所有项目」同构：各单位项目按报送单位顺序拼入同一布局（后端 allProjects 一次拉全）。
 * 文件名 = sheet 名：{单位}：湖北省武汉市{年}年第{季}季度项目实施进展情况表。
 * 数值直出含 0（r3）；样式走共用层（细边框/居中/表头换行/冻结窗格）。
 */
import type { Range, WorkBook, WorkSheet } from 'xlsx-js-style';
import { saveWorkbook, finishBorderedSheet, fixedPlusUniformCols } from '../../shared/excel';
import type { CategoryDef, IndicatorDef, PeriodFillData, ProjectColumn } from '@jeesite/ifco/api/ifco/progress-fill';
import {
  DATA_CATEGORIES,
  INDICATORS,
  LEAF_CATEGORIES,
  cellValue,
  grandTotal,
  quarterLabel,
  tabTotal,
} from '@jeesite/ifco/api/ifco/progress-fill';

/** 单位导出参数（页面已加载的整包 periodData） */
export type ProgressExportParams = {
  year: number;
  quarter: string;
  unitName?: string;
  periodData: PeriodFillData;
};

/** 全量导出参数（后端 allProjects 一次返回：按报送单位顺序的各单位 periodData） */
export type ProgressAllExportParams = {
  year: number;
  quarter: string;
  /** 各单位整包数据（报表单位顺序）；数量合计列 = 各单位合计之和 */
  units: { unitName: string; periodData: PeriodFillData }[];
};

/** 其中：本年新开工（开关型指标，数值直出含 0） */
const NEW_START_KEY = 'r3';

/** 叶子类目的列区块（项目列若干 + 末列小计） */
type LeafBlock = {
  key: string;
  label: string;
  projects: ProjectColumn[];
  startCol: number;
  endCol: number;
};

/** 未填与 0 置空(与页面展示一致)；r3 例外，数值直出含 0 */
function cellOut(item: IndicatorDef, value: number | string | undefined): number | string | undefined {
  if (item.key === NEW_START_KEY) {
    return Number(value ?? 0);
  }
  return value === 0 ? undefined : value;
}

/** 叶子区块布局：从 startCol 起排「项目列 + 小计」 */
function layoutLeaves(
  category: CategoryDef,
  periodData: PeriodFillData,
  startCol: number,
): LeafBlock[] {
  let nextCol = startCol;
  return (category.children ?? [category]).map((leaf) => {
    const projects = periodData[leaf.key]?.projects ?? [];
    const leafStart = nextCol;
    nextCol += projects.length + 1;
    return { key: leaf.key, label: leaf.label, projects, startCol: leafStart, endCol: nextCol - 1 };
  });
}

/** 指标数据行：固定四列前缀（名称/单位/代码/合计）+ 各单元格值 */
function indicatorRow(
  item: IndicatorDef,
  summary: number | string | undefined,
  cells: (number | string | undefined)[],
): (number | string | undefined)[] {
  return [item.name, item.unit || undefined, item.code || undefined, summary, ...cells];
}

/** 固定四列（指标名称/计量单位/代码/合计）行 1~2 纵向合并 */
const fixedColMerges: Range[] = [0, 1, 2, 3].map((col) => ({ s: { r: 0, c: col }, e: { r: 1, c: col } }));

const fixedHeader = ['指标名称', '计量单位', '代码', '合计'];

/** 指标在若干叶子上的小计之和 */
function sumOfLeaves(item: IndicatorDef, periodData: PeriodFillData, leafKeys: string[]): number | string | undefined {
  if (item.kind === 'text') return undefined;
  let sum = 0;
  for (const key of leafKeys) {
    const value = tabTotal(item, periodData[key]);
    if (typeof value === 'number') sum += value;
  }
  return cellOut(item, sum);
}

/**
 * 单 sheet 工作表组装（单单位 / 全量导出共用）：
 * 全部类目按页签顺序横排，每叶子「项目列 + 小计」；三行表头；冻结前三行 + 第一列。
 */
function buildSingleSheet(periodData: PeriodFillData): WorkSheet {
  // ── 列布局：固定四列 + 全部叶子按类目页签顺序「项目列 + 小计」 ──────
  const blocks: { category: CategoryDef; leaves: LeafBlock[]; startCol: number; endCol: number }[] = [];
  let nextCol = 4;
  for (const category of DATA_CATEGORIES) {
    const startCol = nextCol;
    const leaves = layoutLeaves(category, periodData, nextCol);
    nextCol = leaves.length ? leaves[leaves.length - 1].endCol + 1 : startCol;
    blocks.push({ category, leaves, startCol, endCol: nextCol - 1 });
  }
  const lastCol = Math.max(nextCol - 1, 3);

  // ── 三行表头 ─────────────────────────────────────────────────────────
  const headerRow1: (string | number)[] = [...fixedHeader];
  const headerRow2: (string | number)[] = ['', '', '', ''];
  const headerRow3: (string | number)[] = ['', '', '', ''];
  const merges: Range[] = [...fixedColMerges];
  for (const block of blocks) {
    if (block.category.children?.length) {
      // 嵌套类目：行 1 一级跨列，行 2 二级，行 3 项目名 + 小计
      headerRow1[block.startCol] = block.category.label;
      merges.push({ s: { r: 0, c: block.startCol }, e: { r: 0, c: block.endCol } });
      for (const leaf of block.leaves) {
        headerRow2[leaf.startCol] = leaf.label;
        merges.push({ s: { r: 1, c: leaf.startCol }, e: { r: 1, c: leaf.endCol } });
      }
    } else {
      // 简单类目：类目名跨列合并行 1~2
      headerRow1[block.startCol] = block.category.label;
      merges.push({ s: { r: 0, c: block.startCol }, e: { r: 1, c: block.endCol } });
    }
    for (const leaf of block.leaves) {
      leaf.projects.forEach((project, index) => {
        headerRow3[leaf.startCol + index] = project.name;
      });
      headerRow3[leaf.endCol] = '小计';
    }
  }

  // ── 指标行 ───────────────────────────────────────────────────────────
  const leafKeys = LEAF_CATEGORIES.map((leaf) => leaf.key);
  const rows: (string | string | number | undefined)[][] = [headerRow1, headerRow2, headerRow3];
  for (const item of INDICATORS) {
    const cells: (number | string | undefined)[] = [];
    for (const block of blocks) {
      for (const leaf of block.leaves) {
        for (const project of leaf.projects) {
          cells.push(cellOut(item, cellValue(item, project) as number));
        }
        cells.push(cellOut(item, tabTotal(item, periodData[leaf.key]) as number));
      }
    }
    rows.push(indicatorRow(item, sumOfLeaves(item, periodData, leafKeys), cells));
  }

  return finishBorderedSheet(rows, merges, fixedPlusUniformCols(lastCol, [42, 10, 8, 14], 12), {
    freeze: { x: 1, y: 3 },
  });
}

/** 单位导出：当前页面整包数据 → 单 sheet */
export async function exportProgressFillExcel({ year, quarter, unitName, periodData }: ProgressExportParams): Promise<void> {
  const sheetName = `湖北省武汉市${year}年${quarterLabel(quarter)}项目实施进展情况`;
  const workbook: WorkBook = { SheetNames: [sheetName], Sheets: { [sheetName]: buildSingleSheet(periodData) } };
  await saveWorkbook(workbook, `${unitName ? `${unitName}：` : ''}${sheetName}表.xlsx`);
}

/** 导出所有项目：各单位整包按报送单位顺序合并 → 单 sheet（数量合计 = 各单位合计之和） */
export async function exportProgressAllProjectsExcel({ year, quarter, units }: ProgressAllExportParams): Promise<void> {
  // 各单位 periodData 同叶子 key 合并（项目列顺序 = 报送单位顺序依次追加）
  const merged: PeriodFillData = {};
  for (const unit of units) {
    for (const leaf of LEAF_CATEGORIES) {
      const tab = unit.periodData[leaf.key];
      if (!tab?.projects.length) continue;
      const target = (merged[leaf.key] ??= { projects: [], totals: {} }) as { projects: ProjectColumn[]; totals: Record<string, number> };
      target.projects.push(...tab.projects);
      target.totals ??= {};
      for (const [key, value] of Object.entries(tab.totals ?? {})) {
        if (typeof value === 'number') target.totals[key] = (target.totals[key] ?? 0) + value;
      }
    }
  }
  const sheetName = `湖北省武汉市${year}年${quarterLabel(quarter)}项目实施进展情况表（全部项目）`;
  const workbook: WorkBook = { SheetNames: [sheetName], Sheets: { [sheetName]: buildSingleSheet(merged) } };
  await saveWorkbook(workbook, `${sheetName}.xlsx`);
}
