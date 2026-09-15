/**
 * ifco —— 图斑地图数据：esp 模块图斑 geojson 接口层
 *
 * 契约来源：《接口文档-图斑地图数据.md》v2026-09-15 §3/§4
 * （zhugengju-admin-backend/modules/esp/docs）。
 * - geojson 端点直出 FeatureCollection（geometry 已由库中 WKT 经后端 JTS 还原为
 *   MultiPolygon 坐标），前端 addSource 直喂，无需任何解析；
 * - batch 精确过滤（第一批/第二批），不传=全量；无图斑的行后端已跳过；
 * - properties 为大写属性键全集（与 polygon-types.ts 一致），
 *   片区要素 id 用 A_UID、项目要素 id 用 P_UID（promoteId）。
 */

import { defHttp } from '@jeesite/core/utils/http/axios';
import { useGlobSetting } from '@jeesite/core/hooks/setting';
import { unwrap } from '../progress-fill';

const { adminPath } = useGlobSetting();
const BASE = adminPath + '/esp/map';

/** 片区范围 GeoJSON（约 182 要素） */
export function fetchAreaGeojson(batch?: string): Promise<GeoJSON.FeatureCollection> {
  return unwrap<GeoJSON.FeatureCollection>(
    defHttp.get({ url: BASE + '/areas/geojson', params: batch ? { batch } : undefined }),
  );
}

/** 项目图斑 GeoJSON（约 529 要素） */
export function fetchProjectGeojson(batch?: string): Promise<GeoJSON.FeatureCollection> {
  return unwrap<GeoJSON.FeatureCollection>(
    defHttp.get({ url: BASE + '/projects/geojson', params: batch ? { batch } : undefined }),
  );
}
