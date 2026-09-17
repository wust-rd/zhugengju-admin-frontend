import * as XLSX from 'xlsx';
/**
 * ifco —— 项目进展填报「导入」Excel 解析器（官方三行表头模板，唯一模板校验）
 *
 * 模板结构（与导出的 buildSingleSheet 同构、与官方《项目实施进展情况表》一致）：
 *   行 1 = 固定四列标签（指标名称/计量单位/代码/合计，行 1~2 纵向合并）+ 一级类目跨列；
 *   行 2 = 二级类目（嵌套类目）；
 *   行 3 = 项目名称 + 每叶子一列「小计」；
 *   行 4 起 = 指标全集（固定列 A=名称、C=代码，数值从对应列读）。
 *
 * 解析规则：
 * - 占位跳过：第 3 行为空或 XX/XX项目/……/项目/小计 的列不解析（样例占位无数据）；
 * - 项目列归属：从 !merges 反查该列所在的一级（行1）/二级（行2）合并块 → 叶子类目 key；
 * - 指标值：固定列 C 的代码（101~121）→ 指标 key 映射；项目总投资与来源说明两行官方模板
 *   代码列为空，按固定列 A 的指标名称匹配；行 4 起逐行读数值（来源说明按文本读）；
 * - 结构校验：三行表头不齐/固定四列缺失/无有效项目列/无 !merges → 整体拦截返回错误清单。
 */
import type { WorkBook } from 'xlsx';

/** 解析出的项目列 */
export type ImportedProject = {
  leafKey: string;
  name: string;
  values: Record<string, number | string>;
};

export type ImportParseResult = {
  projects: ImportedProject[];
  leafKeys: Set<string>;
  errors: string[];
};

/** 样例占位文案（第 3 行命中即跳过该列） */
const PLACEHOLDER_NAMES = new Set(['小计', '……', 'xx', 'xx项目', '项目', '']);

/** 固定列数（指标名称/计量单位/代码/合计） */
const FIXED_COLS = 4;

/** 代码 → 指标 key（r2~r21=101~120、r23=121；与种子数据一致） */
const CODE_TO_KEY: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (let code = 101; code <= 120; code += 1) map[String(code)] = `r${code - 99}`;
  map['121'] = 'r23';
  return map;
})();

/** 无代码行 → 指标 key（官方模板中项目总投资与来源说明两行的代码列为空，按指标名称匹配） */
const NAME_TO_KEY: Record<string, string> = {
  项目总投资: 'r1',
  其他本年实际到位资金的来源: 'r22',
};

/** 文本型指标（单元格按文本读取，不做数值化） */
const TEXT_KEYS = new Set(['r22']);

/** 类目标签 → 叶子 key（由调用方注入运行时字典，避免此处依赖异步加载） */
export function createImportParser(leafByLabel: Map<string, string>): (workbook: WorkBook) => ImportParseResult {
  return function parse(workbook: WorkBook): ImportParseResult {
    const errors: string[] = [];
    const projects: ImportedProject[] = [];
    const leafKeys = new Set<string>();

    const sheetName = workbook.SheetNames[0];
    const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
    if (!sheet || !sheet['!ref']) {
      return { projects, leafKeys, errors: ['Excel 中没有工作表或工作表为空'] };
    }
    const rows: unknown[][] = (XLSX as any).utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });
    if (rows.length < 4) {
      errors.push('表格行数不足：三行表头 + 至少一行指标数据，当前不足 4 行');
      return { projects, leafKeys, errors };
    }

    // ── 结构校验：固定四列 ────────────────────────────────────────────
    const row1 = (rows[0] ?? []) as (string | null)[];
    const fixedLabels = ['指标名称', '计量单位', '代码', '合计'];
    for (let col = 0; col < FIXED_COLS; col += 1) {
      const cell = String(row1[col] ?? '').trim();
      if (cell !== fixedLabels[col]) {
        errors.push(
          `表头第 1 行第 ${col + 1} 列应为「${fixedLabels[col]}」，实际为「${cell || '空'}」——不是有效的导入模板`,
        );
      }
    }
    if (errors.length) return { projects, leafKeys, errors };

    // ── 列 → 叶子类目归属（反查行 1/行 2 合并块标签） ──────────────────
    const merges = (sheet['!merges'] ?? []) as { s: { r: number; c: number }; e: { r: number; c: number } }[];
    if (!merges.length) {
      errors.push('模板缺少合并单元格（类目表头应为一/二级跨列合并）——不是有效的导入模板');
      return { projects, leafKeys, errors };
    }
    /** 列 → 该列所在行 2 合并块的起始列文本（二级类目名）；简单类目回退行 1 */
    const leafLabelByCol = new Map<number, string>();
    for (const merge of merges) {
      if (merge.s.r === 1 && merge.e.r === 1) {
        for (let col = merge.s.c; col <= merge.e.c; col += 1) {
          const label = cellText(rows, 1, merge.s.c);
          if (label) leafLabelByCol.set(col, label);
        }
      } else if (merge.s.r === 0 && merge.e.r === 1) {
        // 简单类目：行 1~2 纵向合并
        const label = cellText(rows, 0, merge.s.c);
        if (label) {
          for (let col = merge.s.c; col <= merge.e.c; col += 1) leafLabelByCol.set(col, label);
        }
      }
    }

    // ── 行 3 项目列识别（占位跳过） ──────────────────────────────────
    const row3 = (rows[2] ?? []) as (string | null)[];
    const projectCols: { col: number; name: string; leafKey: string }[] = [];
    for (let col = FIXED_COLS; col < row3.length; col += 1) {
      const name = String(row3[col] ?? '').trim();
      if (PLACEHOLDER_NAMES.has(name.toLowerCase()) || PLACEHOLDER_NAMES.has(name)) continue;
      const leafLabel = leafLabelByCol.get(col);
      if (!leafLabel) {
        errors.push(`第 3 行「${name}」所在列无法归属类目（行 1/行 2 无对应合并块）`);
        continue;
      }
      const leafKey = leafByLabel.get(leafLabel);
      if (!leafKey) {
        errors.push(`类目「${leafLabel}」在系统中不存在，请确认模板版本`);
        continue;
      }
      projectCols.push({ col, name, leafKey });
    }
    if (!projectCols.length && !errors.length) {
      errors.push('未找到有效项目列：第 3 行全部为占位（XX/……/小计）或空');
      return { projects, leafKeys, errors };
    }
    if (errors.length) return { projects, leafKeys, errors };
    // 条目按列序预建（保证输出顺序 = 原表列序，与值出现的行序无关），无值列最后过滤
    const entries = projectCols.map(({ name, leafKey }) => ({ leafKey, name, values: {} }) as ImportedProject);

    // ── 指标行读取（行 4 起：C 列代码 → key） ────────────────────────
    for (let row = 3; row < rows.length; row += 1) {
      const code = String(cellText(rows, row, 2)).trim();
      const rowLabel = String(cellText(rows, row, 0)).trim();
      const key = code ? CODE_TO_KEY[code] : NAME_TO_KEY[rowLabel];
      if (!key) continue;
      const asText = TEXT_KEYS.has(key);
      for (const [index, { col, leafKey }] of projectCols.entries()) {
        const value = asText ? cellTextAt(rows, row, col) : cellValueAt(rows, row, col);
        if (value === null) continue;
        entries[index].values[key] = value;
        leafKeys.add(leafKey);
      }
    }
    projects.push(...entries.filter((entry) => Object.keys(entry.values).length > 0));
    if (!projects.length) {
      errors.push('所有项目列均无数据（占位列没有值不导入，请检查文件是否填入了数值）');
    }
    return { projects, leafKeys, errors };
  };
}

/** 单元格文本（null → ''） */
function cellText(rows: unknown[][], row: number, col: number): string {
  const value = rows[row]?.[col];
  return value === null || value === undefined ? '' : String(value).trim();
}

/** 单元格数值（非数字返回 null；字符串数字转数值） */
function cellValueAt(rows: unknown[][], row: number, col: number): number | null {
  const value = rows[row]?.[col];
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const num = Number(String(value).replace(/[,，\s]/g, ''));
  return Number.isFinite(num) && String(value).trim() !== '' ? num : null;
}

/** 单元格文本（文本型指标用；空串/空白返回 null） */
function cellTextAt(rows: unknown[][], row: number, col: number): string | null {
  const value = rows[row]?.[col];
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text === '' ? null : text;
}
