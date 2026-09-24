/**
 * 片区更新后评估 —— 视图层共用工具
 *
 * 展示口径（与业务确认）：
 * - 「/」**只表示该格不可填写**（锁定），不是空值占位；
 * - 没数据的格子一律**留空**（输入框也不放占位符）；
 * - 「提升」不入库，= 更新后 - 更新前，两项都填了才算，否则留空。
 */

import type {
  EspPostEvalIndicatorValue,
  EspPostEvalSatisfactionValue,
} from '@jeesite/early-stage-planning/api/early-stage-planning/post-evaluation';
import { dateUtil } from '@jeesite/core/utils/dateUtil';

/** 评估年份选项：近 N 年（时间一律经 dayjs/dateUtil 取值，不用原生 Date） */
export function buildYearOptions(count = 5): { label: string; value: string }[] {
  const current = dateUtil().year();
  return Array.from({ length: count }, (_, index) => {
    const year = String(current - index);
    return { label: year, value: year };
  });
}

/** 当前年份（新增评估默认选中） */
export function currentYear(): string {
  return String(dateUtil().year());
}

/**
 * 片区批次选项（静态占位；后端审查字典 /a/esp/schemeReview/dict 含批次时再换成接口）
 */
export const BATCH_OPTIONS = ['第一批', '第二批', '第三批'].map((label) => ({ label, value: label }));

/** 不可填写的格子文案（斜杠 = 锁定，不是空值占位） */
export const LOCKED_TEXT = '/';

/** 维度筛选下拉的「全部」选项值 */
export const FILTER_ALL = 'all';

/**
 * 评估页入参：列表行带 id（编辑/查看），新增时只有片区 + 年份（无 id）
 */
export type PostEvalTarget = {
  /** 评估记录主键（新增时为空） */
  id?: string;
  /** 片区唯一号 */
  aUid: string;
  /** 片区名称（页头展示） */
  areaName: string;
  /** 评估年份 */
  evalYear: string;
};

/** 成效指标表的固定一级维度分组 */
export const INDICATOR_LV1_ORDER = ['项目进度', '直接经济效益', '间接经济效益', '社会效益'];

/** 成效指标对比 tab 右上角下拉可切换的三个维度（左侧固定显示「项目进度」） */
export const INDICATOR_CHART_DIMENSIONS = ['直接经济效益', '间接经济效益', '社会效益'];

/** 左侧固定雷达图对应的一级维度 */
export const INDICATOR_PROGRESS_LV1 = '项目进度';

/**
 * 「更新前」不填写的一级维度（这些指标的数据口径由系统出，本期只填「更新后」）
 *
 * 规则按一级维度整块生效：项目进度 6 条 + 直接经济效益 6 条（序号 1~12）。
 * 表现为三处：
 * 1. 指标表「更新前」列只读显示 "/"（不给输入框）；
 * 2. 指标表「提升」列不展示（没有更新前值，提升无口径）；
 * 3. 统计图只画「更新后」一个系列（evaluate.vue 传给 PostEvalRadar 的 hide-before）。
 * 后端不做拦截（业务口径：只是不想让人改）；若以后要按单个指标控制，
 * 改为读清单数据（ESP_DICT.remarks 追加一段标记）即可。
 */
export const BEFORE_LOCKED_LV1 = ['项目进度', '直接经济效益'];

/** 该一级维度的「更新前」是否锁定 */
export function isBeforeLocked(lv1: string): boolean {
  return BEFORE_LOCKED_LV1.includes(lv1);
}

/** 满意度分析 tab 的一级维度（四好） */
export const SATISFACTION_LV1_ORDER = ['好房子', '好小区', '好社区', '好城区'];

/** 满意度雷达图下拉「全部」选项值 */
export const SATISFACTION_ALL = 'all';

/** 提升 = 更新后 - 更新前（任一为空返回 null） */
export function deltaOf(before: number | null | undefined, after: number | null | undefined): number | null {
  if (before === null || before === undefined || after === null || after === undefined) return null;
  return Math.round((after - before) * 100) / 100;
}

/** 数值展示：空值留空，最多保留 3 位小数并去掉多余的 0 */
export function formatValue(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '';
  return String(Math.round(value * 1000) / 1000);
}

/** 提升展示：空值留空，正数带 + 号 */
export function formatDelta(value: number | null): string {
  if (value === null) return '';
  return value > 0 ? `+${value}` : String(value);
}

/**
 * 维度值去重（保持出现顺序，去掉空值）——筛选下拉选项用
 */
export function uniqDim(values: (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const list: string[] = [];
  for (const value of values) {
    const text = (value ?? '').trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    list.push(text);
  }
  return list;
}

/**
 * 同级相邻单元格合并跨度：相同 key 的连续行只在首行给 rowSpan，其余给 0（antd 合并写法）
 */
export function buildSpans<T>(rows: T[], keyOf: (row: T) => string): number[] {
  return rows.map((row, index) => {
    if (index > 0 && keyOf(rows[index - 1]) === keyOf(row)) return 0;
    let span = 1;
    for (let i = index + 1; i < rows.length && keyOf(rows[i]) === keyOf(row); i += 1) {
      span += 1;
    }
    return span;
  });
}

/** 分组均值（忽略未填写的行；无有效值返回 null），保留 1 位小数 */
export function groupAverage(values: (number | null | undefined)[]): number | null {
  const filled = values.filter((value): value is number => value !== null && value !== undefined && !Number.isNaN(value));
  if (!filled.length) return null;
  const sum = filled.reduce((acc, value) => acc + value, 0);
  return Math.round((sum / filled.length) * 10) / 10;
}

/** 成效指标行 → 雷达图数据（标签 = 指标项，值 = 更新前/更新后） */
export function indicatorSeries(rows: EspPostEvalIndicatorValue[]) {
  return {
    labels: rows.map((row) => row.name),
    before: rows.map((row) => row.beforeValue),
    after: rows.map((row) => row.afterValue),
  };
}

/** 满意度行 → 雷达图数据（标签 = 二级维度） */
export function satisfactionSeries(rows: EspPostEvalSatisfactionValue[]) {
  return {
    labels: rows.map((row) => row.lv2),
    before: rows.map((row) => row.beforeScore),
    after: rows.map((row) => row.afterScore),
  };
}

/** 取某一级维度下的指标行（保持清单顺序） */
export function indicatorsOfLv1(rows: EspPostEvalIndicatorValue[], lv1: string): EspPostEvalIndicatorValue[] {
  return rows.filter((row) => row.lv1 === lv1);
}

/** 取某一级维度下的满意度行；lv1 传 SATISFACTION_ALL 返回全部（保持清单顺序） */
export function satisfactionsOfLv1(rows: EspPostEvalSatisfactionValue[], lv1: string): EspPostEvalSatisfactionValue[] {
  if (lv1 === SATISFACTION_ALL) return rows;
  return rows.filter((row) => row.lv1 === lv1);
}
