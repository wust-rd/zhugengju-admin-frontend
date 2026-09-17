import * as XLSX from 'xlsx';
/**
 * ifco —— 项目成效填报「导入」Excel 解析器（官方单排表头模板，唯一模板校验）
 *
 * 模板结构（与导出的成效表同构、与官方《项目成效情况表》一致）：
 *   行 1 = 固定四列表头（指标名称/计量单位/代码/数量合计）+ 项目名称（E 列起一列一项目）；
 *   行 2 起 = 指标行：A 名称（延续行可空）、C 代码（201~247），节标题行 C 为「——」；
 *   单元格值 = 数值；双值行（数|面积）为竖线串「1|96181」。
 *
 * 解析规则：
 * - 项目列 = 行 1 第 5 列（E）起名称非空的列；数量合计列（D）不解析（系统自动求和）；
 * - 指标行识别只看 C 列代码（A 列名称在延续行为空，不作依据）；代码须在系统字典内；
 * - 双值格「数|面积」拆为 a/b 两键（r226a/r226b，与保存项目列的扁平键同构），
 *   空槽不提交；纯数字格填 a 槽；
 * - 结构校验（表头四列不符/无有效项目列/全部列无数据）→ 整体拦截返回错误清单。
 */
import type { WorkBook } from 'xlsx';

/** 解析出的项目列 */
export type ImportedEffectProject = {
  name: string;
  values: Record<string, number>;
};

export type EffectImportParseResult = {
  projects: ImportedEffectProject[];
  errors: string[];
};

/** 代码 → 提交键定义（由调用方注入运行时字典：key=提交键、dual=双值行） */
export type EffectCodeDef = { key: string; dual: boolean };

/** 固定列数（指标名称/计量单位/代码/数量合计） */
const FIXED_COLS = 4;

export function createEffectImportParser(
  codeDefByCode: Map<string, EffectCodeDef>,
): (workbook: WorkBook) => EffectImportParseResult {
  return function parse(workbook: WorkBook): EffectImportParseResult {
    const errors: string[] = [];
    const projects: ImportedEffectProject[] = [];

    const sheetName = workbook.SheetNames[0];
    const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
    if (!sheet || !sheet['!ref']) {
      return { projects, errors: ['Excel 中没有工作表或工作表为空'] };
    }
    const rows: unknown[][] = (XLSX as any).utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });
    if (rows.length < 2) {
      errors.push('表格行数不足：表头 + 至少一行指标数据');
      return { projects, errors };
    }

    // ── 结构校验：固定四列 + 项目列识别 ────────────────────────────────
    const header = (rows[0] ?? []) as (string | null)[];
    const fixedLabels = ['指标名称', '计量单位', '代码', '数量合计'];
    for (let col = 0; col < FIXED_COLS; col += 1) {
      const cell = String(header[col] ?? '').trim();
      if (cell !== fixedLabels[col]) {
        errors.push(`表头第 ${col + 1} 列应为「${fixedLabels[col]}」，实际为「${cell || '空'}」——不是有效的导入模板`);
      }
    }
    if (errors.length) return { projects, errors };

    const projectCols: { col: number; name: string }[] = [];
    for (let col = FIXED_COLS; col < header.length; col += 1) {
      const name = String(header[col] ?? '').trim();
      if (name) projectCols.push({ col, name });
    }
    if (!projectCols.length) {
      errors.push('未找到有效项目列：表头第 5 列（E）起应有项目名称');
      return { projects, errors };
    }
    // 条目按列序预建（保证输出顺序 = 原表列序，与值出现的行序无关），无值列最后过滤
    const entries = projectCols.map(({ name }) => ({ name, values: {} }) as ImportedEffectProject);

    // ── 指标行读取（行 2 起：C 列代码 → 提交键；节标题行「——」跳过） ──
    for (let row = 1; row < rows.length; row += 1) {
      const code = cellText(rows, row, 2);
      if (!code || code === '——' || code === '--') continue;
      const def = codeDefByCode.get(code);
      if (!def) continue;
      for (const [index, { col }] of projectCols.entries()) {
        const raw = rows[row]?.[col];
        const cell = raw === null || raw === undefined ? '' : String(raw).trim();
        if (cell === '') continue;
        const entry = entries[index];
        if (def.dual) {
          // 双值格「数|面积」：拆 a/b 两槽，空槽不提交；纯数字视为 a 槽
          const [partA, partB] = cell.includes('|') ? cell.split('|') : [cell, ''];
          const numA = toNumber(partA);
          const numB = toNumber(partB);
          if (numA !== null) entry.values[`${def.key}a`] = numA;
          if (numB !== null) entry.values[`${def.key}b`] = numB;
        } else {
          const num = toNumber(cell);
          if (num !== null) entry.values[def.key] = num;
        }
      }
    }
    projects.push(...entries.filter((entry) => Object.keys(entry.values).length > 0));
    if (!projects.length) {
      errors.push('所有项目列均无数据（没有值的项目列不导入，请检查文件是否填入了数值）');
    }
    return { projects, errors };
  };
}

/** 单元格文本（null/undefined → ''） */
function cellText(rows: unknown[][], row: number, col: number): string {
  const value = rows[row]?.[col];
  return value === null || value === undefined ? '' : String(value).trim();
}

/** 数值化（去千分位与空白；非有限数值返回 null） */
function toNumber(raw: string): number | null {
  const cleaned = raw.replace(/[,，\s]/g, '');
  if (cleaned === '') return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}
