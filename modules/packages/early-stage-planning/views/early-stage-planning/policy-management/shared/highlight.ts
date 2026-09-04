/**
 * 市住更局 —— 政策检索 命中词高亮工具
 *
 * 将文本按命中词切分为 高亮/非高亮 片段(替代 v-html 的安全做法),
 * 语义模式取长度≥2 的前 8 个词,关键字模式取全部词(对齐原型 highlight 规则)。
 */

export interface HighlightSegment {
  text: string;
  hit: boolean;
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 查询词 → 命中词列表 */
export function extractTerms(query: string, semantic: boolean): string[] {
  const list = (query || '').split(/\s+/).filter(Boolean);
  return semantic ? list.filter((t) => t.length >= 2).slice(0, 8) : list;
}

/** 文本按命中词切分为 高亮/非高亮 片段 */
export function segments(text: string, terms: string[]): HighlightSegment[] {
  const raw = text || '';
  if (!terms.length) return [{ text: raw, hit: false }];
  const sorted = [...terms].sort((a, b) => b.length - a.length);
  const re = new RegExp(`(${sorted.map(escapeRegExp).join('|')})`, 'gi');
  const out: HighlightSegment[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(raw))) {
    if (match.index > last) out.push({ text: raw.slice(last, match.index), hit: false });
    out.push({ text: match[0], hit: true });
    last = match.index + match[0].length;
  }
  if (last < raw.length) out.push({ text: raw.slice(last), hit: false });
  return out.length ? out : [{ text: raw, hit: false }];
}
