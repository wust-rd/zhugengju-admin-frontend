/**
 * ifco —— 项目进展填报：Excel 导出（xlsx(SheetJS) 多 sheet + file-saver 下载）
 *
 * 复用项目既有的 Excel 方案（@jeesite/core 的 xlsx 依赖，同版本声明于本包），
 * 与 packages/core/components/Excel/src/Export2Excel.ts 同源，因需要多级合并表头
 * 而直接使用 utils.aoa_to_sheet + !merges/!cols。
 *
 * sheet 结构对齐填报页左侧 RadioGroup（一级类目页签）：
 *   Sheet「总览」   固定 3 列 + 合计 + 每个叶子类目一列小计（嵌套类目一级表头跨列包裹二级）；
 *   简单类目 sheet  固定 3 列 + 项目列 + 末列小计（类目名行 1 跨列）；
 *   嵌套类目 sheet（如「老旧街区、老旧厂区、城中村等更新改造」）
 *                  行 1 = 二级类目名（老旧街区更新改造/老旧厂区更新改造/城中村改造）
 *                  按各自「项目列 + 小计」跨列合并——二级类目包裹项目的形式；
 *                  行 2 = 各项目名 + 小计。
 *   固定 3 列（指标名称/计量单位/代码）在所有 sheet 纵向合并两行表头。
 * 数值直出含 0；样式走 xlsx-js-style 分支：全表细边框。
 */
import { utils, write } from 'xlsx-js-style';
import type { Range, WorkBook, WorkSheet } from 'xlsx-js-style';
import { saveAs } from 'file-saver';
import { finishBorderedSheet, fixedPlusUniformCols } from '../../shared/excel';
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

type ExportParams = {
  year: number;
  quarter: string;
  /** 报送单位名称（文件名后缀，如 江汉区局） */
  unitName?: string;
  periodData: PeriodFillData;
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

/** 未填与 0 置空(与页面展示一致:不补斜杠、不补 0)；r3 例外，数值直出含 0 */
function cellOut(item: IndicatorDef, value: number | string | undefined): number | string | undefined {
  if (item.key === NEW_START_KEY) {
    return Number(value ?? 0);
  }
  return value === 0 ? undefined : value;
}

/** 叶子区块布局：从 startCol 起排「项目列 + 小计」 */
function layoutLeaves(category: CategoryDef, periodData: PeriodFillData, startCol: number): LeafBlock[] {
  let nextCol = startCol;
  return (category.children ?? [category]).map((leaf) => {
    const projects = periodData[leaf.key]?.projects ?? [];
    const leafStart = nextCol;
    nextCol += projects.length + 1;
    return { key: leaf.key, label: leaf.label, projects, startCol: leafStart, endCol: nextCol - 1 };
  });
}

/** 指标数据行：固定 3 列（名称/单位/代码）+ 各单元格值 */
function indicatorRow(item: IndicatorDef, cells: (number | string | undefined)[]): (number | string | undefined)[] {
  return [item.name, item.unit || undefined, item.code || undefined, ...cells];
}

/** 固定列（指标名称/计量单位/代码）的两行纵向合并 */
const fixedColMerges: Range[] = [0, 1, 2].map((col) => ({ s: { r: 0, c: col }, e: { r: 1, c: col } }));

const fixedHeader = ['指标名称', '计量单位', '代码'];

export async function exportProgressFillExcel({ year, quarter, unitName, periodData }: ExportParams): Promise<void> {
  const sheets: { name: string; worksheet: WorkSheet }[] = [];

  // ── Sheet「总览」：固定 3 列 + 合计 + 每叶子一列小计（叶子顺序 = LEAF_CATEGORIES）──
  {
    let nextCol = 4;
    const catBlocks = DATA_CATEGORIES.map((category) => {
      const startCol = nextCol;
      const leaves = (category.children ?? [category]).map((leaf) => ({ key: leaf.key, startCol: nextCol++ }));
      return { category, leaves, startCol, endCol: nextCol - 1 };
    });
    const lastCol = Math.max(nextCol - 1, 3);

    const headerRow1: (string | number)[] = [...fixedHeader, '合计'];
    const headerRow2: (string | number)[] = ['', '', '', ''];
    // 合计列与固定 3 列一致，表头纵向合并两行
    const merges: Range[] = [...fixedColMerges, { s: { r: 0, c: 3 }, e: { r: 1, c: 3 } }];
    for (const block of catBlocks) {
      if (block.category.children?.length) {
        // 嵌套类目：行 1 一级类目跨列，行 2 二级类目名
        headerRow1[block.startCol] = block.category.label;
        block.leaves.forEach((leaf) => {
          headerRow2[leaf.startCol] = LEAF_CATEGORIES.find((candidate) => candidate.key === leaf.key)?.label ?? '';
        });
        merges.push({ s: { r: 0, c: block.startCol }, e: { r: 0, c: block.endCol } });
      } else {
        // 简单类目：一级类目名纵向合并两行
        headerRow1[block.startCol] = block.category.label;
        merges.push({ s: { r: 0, c: block.startCol }, e: { r: 1, c: block.startCol } });
      }
    }

    const rows: (string | number | undefined)[][] = [headerRow1, headerRow2];
    for (const item of INDICATORS) {
      const cells: (number | string | undefined)[] = [cellOut(item, grandTotal(item, periodData) as number)];
      for (const leaf of LEAF_CATEGORIES) {
        cells.push(cellOut(item, tabTotal(item, periodData[leaf.key]) as number));
      }
      rows.push(indicatorRow(item, cells));
    }
    sheets.push({
      name: '总览',
      worksheet: finishBorderedSheet(rows, merges, fixedPlusUniformCols(lastCol, [42, 10, 8], 12)),
    });
  }

  // ── 每个一级类目一个 sheet ──────────────────────────────────────────
  for (const category of DATA_CATEGORIES) {
    const leaves = layoutLeaves(category, periodData, 3);
    const lastCol = Math.max(leaves[leaves.length - 1]?.endCol ?? 2, 2);

    const headerRow1: (string | number)[] = [...fixedHeader];
    const headerRow2: (string | number)[] = ['', '', ''];
    const merges: Range[] = [...fixedColMerges];
    if (category.children?.length) {
      // 嵌套类目：行 1 = 二级类目名按「项目列 + 小计」跨列合并（包裹项目）
      for (const leaf of leaves) {
        headerRow1[leaf.startCol] = leaf.label;
        merges.push({ s: { r: 0, c: leaf.startCol }, e: { r: 0, c: leaf.endCol } });
        leaf.projects.forEach((project, index) => {
          headerRow2[leaf.startCol + index] = project.name;
        });
        headerRow2[leaf.endCol] = '小计';
      }
    } else {
      // 简单类目：行 1 = 类目名跨全部数据列
      const block = leaves[0];
      headerRow1[block.startCol] = category.label;
      merges.push({ s: { r: 0, c: block.startCol }, e: { r: 0, c: block.endCol } });
      block.projects.forEach((project, index) => {
        headerRow2[block.startCol + index] = project.name;
      });
      headerRow2[block.endCol] = '小计';
    }

    const rows: (string | number | undefined)[][] = [headerRow1, headerRow2];
    for (const item of INDICATORS) {
      const cells: (number | string | undefined)[] = [];
      for (const leaf of leaves) {
        for (const project of leaf.projects) {
          cells.push(cellOut(item, cellValue(item, project) as number));
        }
        cells.push(cellOut(item, tabTotal(item, periodData[leaf.key]) as number));
      }
      rows.push(indicatorRow(item, cells));
    }
    sheets.push({
      name: category.label,
      worksheet: finishBorderedSheet(rows, merges, fixedPlusUniformCols(lastCol, [42, 10, 8], 12)),
    });
  }

  const workbook: WorkBook = {
    SheetNames: sheets.map((sheet) => sheet.name),
    Sheets: Object.fromEntries(sheets.map((sheet) => [sheet.name, sheet.worksheet])),
  };
  const buffer = write(workbook, { bookType: 'xlsx', type: 'array' });
  saveAs(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `项目进展填报_${year}年${quarterLabel(quarter)}${unitName ? `_${unitName}` : ''}.xlsx`,
  );
}
