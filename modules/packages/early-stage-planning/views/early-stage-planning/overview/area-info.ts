/**
 * 片区详情数据契约与共享加载层：图斑要素（地图接口）+ 策划方案填报表单
 *
 * - AreaInfo = { feature: AreaFeature; form: EspSchemeFill | null }：详情页右侧抽屉
 *   六 tab 的数据口径，feature 为图斑地图接口全字段 + 解码后 geometry，form 为
 *   填报表单全量（图片链接在 overviewImages / problemImages / atlas 等字段，
 *   url 为 MinIO 直链；null = 未填报或加载失败，不阻断页面）。
 * - loadSchemeFill(auid, name)：两跳拉填报表单（schemeFillPage 按名称模糊查 →
 *   a_uid（兼容 code）匹配拿 id → schemeFillForm 全量回显），按 auid Promise 级
 *   缓存（含 in-flight 去重，失败清缓存允许重试；未查到行 → null 静默）。
 *   看板概况卡片点开即预热缓存（area-overview-modal 取概况首图同源），
 *   从卡片进详情页命中缓存，不重复请求。
 */
import {
  schemeFillForm,
  schemeFillPage,
  type EspSchemeFill,
} from '@jeesite/early-stage-planning/api/early-stage-planning/scheme-declaration-review/scheme-fill';
import type { AreaFeature } from './area-data';

/** 详情页 / 抽屉 tab 的片区数据契约：图斑要素 + 填报表单（null=未填报或加载失败） */
export type AreaInfo = { feature: AreaFeature; form: EspSchemeFill | null };

/** 表单缓存（auid → in-flight/结果 Promise；失败清缓存允许重试） */
const cache = new Map<string, Promise<EspSchemeFill | null>>();

/** 拉片区填报表单：page 按名称模糊查 → a_uid（兼容 code）匹配拿 id → form 全量回显（含图片直链） */
export function loadSchemeFill(auid: string, name: string): Promise<EspSchemeFill | null> {
  let p = cache.get(auid);
  if (!p) {
    p = (async () => {
      const { list } = await schemeFillPage({ name, pageNo: 1, pageSize: 10 });
      const row = list.find((r) => r.aUid === auid || r.code === auid);
      return row ? schemeFillForm(row.id) : null;
    })();
    cache.set(auid, p);
    p.catch(() => cache.delete(auid));
  }
  return p;
}
