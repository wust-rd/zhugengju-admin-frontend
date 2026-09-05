/**
 * ifco —— 项目进展填报：Excel 导出（xlsx(SheetJS) 生成 + file-saver 下载）
 *
 * 复用项目既有的 Excel 方案（@jeesite/core 的 xlsx 依赖，同版本声明于本包），
 * 与 packages/core/components/Excel/src/Export2Excel.ts 同源，因需要多级合并表头
 * 而直接使用 utils.aoa_to_sheet + !merges/!cols。
 *
 * 表头结构对齐原 Excel（三行表头）：
 *   行 1  一级类目跨列（简单类目与行 2 纵向合并）；
 *   行 2  嵌套类目（老旧街区、老旧厂区、城中村等更新改造）的二级跨列；
 *   行 3  各项目名 + 每个叶子类目一列「小计」（= 填报页该类目合计列）；
 *   左侧固定 4 列（指标名称 / 计量单位 / 代码 / 总计）纵向合并三行，总计列在最左。
 * 数值单元格统一千分位格式（z='#,##0'）；xlsx 社区版不支持字体/填充样式，
 * 汇总行不加粗、无冻结窗格（如需可后端模板导出替代）。
 */
import { utils, write } from 'xlsx';
import type { Range, WorkBook, WorkSheet } from 'xlsx';
import { saveAs } from 'file-saver';
import type { CategoryDef, PeriodFillData, ProjectColumn } from '@jeesite/ifco/api/ifco/progress-fill';
import {
  DATA_CATEGORIES,
  INDICATORS,
  cellValue,
  grandTotal,
  quarterLabel,
  tabTotal,
} from '@jeesite/ifco/api/ifco/progress-fill';

type ExportParams = {
  year: number;
  quarter: string;
  periodData: PeriodFillData;
};

/** 叶子类目的列区块：项目列若干 + 末列小计 */
type LeafBlock = {
  key: string;
  label: string;
  projects: ProjectColumn[];
  startCol: number;
  endCol: number;
};

/** 一级类目的列区块 */
type CatBlock = {
  category: CategoryDef;
  leaves: LeafBlock[];
  startCol: number;
  endCol: number;
};

export async function exportProgressFillExcel({ year, quarter, periodData }: ExportParams): Promise<void> {
  // ── 列布局：0~3 固定（指标名称/计量单位/代码/总计），其后每个一级类目一组 ──
  let nextCol = 4;
  const catBlocks: CatBlock[] = DATA_CATEGORIES.map((category) => {
    const startCol = nextCol;
    const leaves = (category.children ?? [category]).map((leaf) => {
      const projects = periodData[leaf.key]?.projects ?? [];
      const leafStart = nextCol;
      nextCol += projects.length + 1; // 项目列 + 小计
      return { key: leaf.key, label: leaf.label, projects, startCol: leafStart, endCol: nextCol - 1 };
    });
    return { category, leaves, startCol, endCol: nextCol - 1 };
  });
  const lastCol = Math.max(nextCol - 1, 3);

  // ── 组装 AOA（3 行表头 + 23 行指标） ────────────────────────────────
  const rows: (string | number | undefined)[][] = [];
  const headerRow1: (string | number)[] = ['指标名称', '计量单位', '代码', '总计'];
  const headerRow2: (string | number)[] = ['', '', '', ''];
  const headerRow3: (string | number)[] = ['', '', '', ''];
  for (const block of catBlocks) {
    headerRow1[block.startCol] = block.category.label;
    for (const leaf of block.leaves) {
      if (block.category.children?.length) {
        headerRow2[leaf.startCol] = leaf.label;
      }
      leaf.projects.forEach((project, index) => {
        headerRow3[leaf.startCol + index] = project.name;
      });
      headerRow3[leaf.endCol] = '小计';
    }
  }
  rows.push(headerRow1, headerRow2, headerRow3);

  /** 未填与 0 置空(与页面展示一致:不补斜杠、不补 0) */
  const blankZero = (value: number | string | undefined) => (value === 0 ? undefined : value);
  for (const item of INDICATORS) {
    const row: (string | number | undefined)[] = [
      item.name,
      item.unit || undefined,
      item.code || undefined,
      blankZero(grandTotal(item, periodData)),
    ];
    for (const block of catBlocks) {
      for (const leaf of block.leaves) {
        for (const project of leaf.projects) {
          row.push(blankZero(cellValue(item, project)));
        }
        row.push(blankZero(tabTotal(item, periodData[leaf.key])));
      }
    }
    rows.push(row);
  }

  const worksheet: WorkSheet = utils.aoa_to_sheet(rows);

  // ── 合并单元格：固定 4 列纵向合并三行；类目按一级/二级跨列合并 ────────
  const merges: Range[] = [];
  for (let col = 0; col < 4; col += 1) {
    merges.push({ s: { r: 0, c: col }, e: { r: 2, c: col } });
  }
  for (const block of catBlocks) {
    if (block.category.children?.length) {
      merges.push({ s: { r: 0, c: block.startCol }, e: { r: 0, c: block.endCol } });
      for (const leaf of block.leaves) {
        merges.push({ s: { r: 1, c: leaf.startCol }, e: { r: 1, c: leaf.endCol } });
      }
    } else {
      merges.push({ s: { r: 0, c: block.startCol }, e: { r: 1, c: block.endCol } });
    }
  }
  worksheet['!merges'] = merges;

  // ── 列宽 ────────────────────────────────────────────────────────────
  worksheet['!cols'] = Array.from({ length: lastCol + 1 }, (_, col) => {
    if (col === 0) return { wch: 42 };
    if (col === 1) return { wch: 10 };
    if (col === 2) return { wch: 8 };
    if (col === 3) return { wch: 14 };
    return { wch: 12 };
  });

  // ── 数值单元格千分位 ────────────────────────────────────────────────
  const range = utils.decode_range(worksheet['!ref'] ?? 'A1');
  for (let r = 3; r <= range.e.r; r += 1) {
    for (let c = 0; c <= range.e.c; c += 1) {
      const cell = worksheet[utils.encode_cell({ r, c })];
      if (cell && cell.t === 'n') {
        cell.z = '#,##0';
      }
    }
  }

  const workbook: WorkBook = {
    SheetNames: ['项目进展填报'],
    Sheets: { 项目进展填报: worksheet },
  };
  const buffer = write(workbook, { bookType: 'xlsx', type: 'array' });
  saveAs(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `项目进展填报_${year}年${quarterLabel(quarter)}.xlsx`,
  );
}
