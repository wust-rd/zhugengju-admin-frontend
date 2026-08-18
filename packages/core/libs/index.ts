import { type ClassValue, clsx } from 'clsx';
import { unoMerge } from 'unocss-merge';

// 供各包统一复用，避免各包直接依赖 clsx
export { clsx };
export type { ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return unoMerge(clsx(inputs));
}

export { buildYearItems } from './year';
