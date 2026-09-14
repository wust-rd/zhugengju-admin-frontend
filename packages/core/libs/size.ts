import type { ClassValue } from 'clsx';

/** 从 class 中解析出的 UnoCSS 尺寸 */
export interface SizeFromClass {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
}

/** parseSizeFromClass 返回结果：尺寸 + 剔除尺寸类后的剩余 class */
export interface SizeParseResult {
  size: SizeFromClass;
  rest: ClassValue;
}

/**
 * 从 class（字符串 / 数组 / 对象）中解析 UnoCSS 尺寸工具类：
 * - w-102px / h-42px / rd-42px：px 转数字（与 props 数字=px 语义一致）
 * - w-50% / h-1.5rem / rd-100%：% / rem / em 保留字符串透传
 * - w-100（无单位）：按数字 px 处理
 * - w-full / w-1/2 等非数值类：不解析，保留在 rest 中透传给组件
 *
 * 返回 { size, rest }：
 * - size.width/height/radius：供组件做 SVG 计算或容器尺寸
 * - rest：剔除 w-*、h-*、rd-* 尺寸类后的剩余 class，可直接合并到根节点
 *
 * 语义与组件 props 对齐：数字 = px，字符串 = 透传 CSS 值。
 */
export function parseSizeFromClass(classValue: ClassValue): SizeParseResult {
  const tokens: string[] = [];
  const collect = (v: ClassValue): void => {
    if (typeof v === 'string') tokens.push(...v.trim().split(/\s+/).filter(Boolean));
    else if (Array.isArray(v)) v.forEach(collect);
    else if (v && typeof v === 'object') {
      for (const [key, on] of Object.entries(v)) if (on) tokens.push(key);
    }
  };
  collect(classValue);

  const size: SizeFromClass = {};
  const rest: string[] = [];

  const toValue = (raw: string): number | string => {
    const m = raw.match(/^(\d+(?:\.\d+)?)(px|rem|em|%)$/);
    if (!m) return Number(raw); // 无单位按数字（px 语义）
    return m[2] === 'px' ? Number(m[1]) : `${m[1]}${m[2]}`;
  };

  for (const token of tokens) {
    const m = token.match(/^(w|h|rd)-(.+)$/);
    if (!m) {
      rest.push(token);
      continue;
    }
    const [, kind, raw] = m;
    if (!/^\d+(?:\.\d+)?(px|rem|em|%)?$/.test(raw)) {
      rest.push(token); // w-full、w-1/2 等非数值类：忽略解析，保留给组件透传
      continue;
    }
    const value = toValue(raw);
    if (kind === 'w' && size.width === undefined) size.width = value;
    else if (kind === 'h' && size.height === undefined) size.height = value;
    else if (kind === 'rd' && size.radius === undefined) size.radius = value;
  }
  return { size, rest };
}
