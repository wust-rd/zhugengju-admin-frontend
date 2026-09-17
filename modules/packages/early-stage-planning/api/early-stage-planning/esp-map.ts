/**
 * 市住更局 —— 图斑地图数据 接口层（后端模块 modules/esp，EspMapController）
 *
 * 接口文档：views/early-stage-planning/overview/接口文档-图斑地图数据(1).md（v1）
 * 响应协议：后端统一返回 {code, msg, data}（code=200 成功 / 400 业务错误 / 500 系统异常），
 * 与框架 defHttp 默认解包的 jeesite {result} 协议不同 —— 本层 unwrap() 统一处理
 * （同 expert-pool.ts 的做法）。
 *
 * data 数组元素 = GeoJSON 属性原名大写键 + 小写 geometry（WKT 文本，MULTIPOLYGON；
 * 2026-09 后端全链路统一切换 WKT，接口文档 v1 的 TopoJSON 描述已过时——前端
 * geometry-decode.ts 对两种格式均兼容）。最新后端另有 /esp/map/{areas,projects}/geojson
 * 直出 FeatureCollection 端点（geometry 已还原 + TTL 缓存），开发服务器尚未部署，
 * 部署后前端可切换以省去本地解码。
 * batch 精确匹配（第一批/第二批），不传=全量。
 */

import { defHttp } from '@jeesite/core/utils/http/axios';
import { useGlobSetting } from '@jeesite/core/hooks/setting';

const { adminPath } = useGlobSetting();

/** 统一解包 {code, msg, data}（兼容 jeesite result 协议透传） */
function unwrap<T = any>(body: any): T {
  if (body && typeof body === 'object' && Reflect.has(body, 'code')) {
    if (body.code === 200) return body.data as T;
    throw new Error(body.msg || '接口请求失败');
  }
  return body as T;
}

/**
 * 批次类型。「新增」= 方案填报新增待审查片区（库中 is_approve='2'，被后端
 * DAO 硬编码的 is_approve='1' 过滤，当前下发 0 行）——需求已写入接口文档，
 * 等后端在 EspMapDao 增加分支支持；支持前传该值按精确匹配规则返回空列表。
 */
export type EspBatch = '第一批' | '第二批' | '新增';

// ---------------- 类型（属性键为 GeoJSON 原名大写；仅列页面用到的字段，其余键运行时仍在） ----------------

/** 片区范围行（GET /a/esp/map/areas，约 182 行） */
export type EspMapAreaRow = {
  /** 批次：第一批/第二批 */
  BATCH: string;
  /** 合并后片区唯一号（PQ001…，唯一） */
  A_UID: string;
  /** 行政区（原文，存在「武汉经开区/东湖生态旅游风景区」等长写法） */
  DIST: string | null;
  /** 片区名称 */
  AREA_NAME: string | null;
  /** 功能定位中文名（标准字典，多个逗号分隔） */
  FUNC_TYPE_NAME: string | null;
  /** 功能定位编码（TOD/COD/SOD/EOD/IOD/HOD/POD，多个逗号分隔；无法识别为 null） */
  FUNC_TYPE_VALUE: string | null;
  /** 投资估算（亿元）——原文，个别为非数值文本（如「光电园…」），用前注意 parse */
  INV_BIL: number | string | null;
  /** 片区内项目数量 */
  PROJECT_CNT: number | null;
  /** 三色图颜色 green/yellow/red（仅第一批片区有值，2026-09-11 库表新增） */
  AREA_COLOR: string | null;
  /** 自包含 TopoJSON 原文（字符串） */
  geometry: string;
};

/** 项目图斑行（GET /a/esp/map/projects，约 529 行；右侧抽屉/项目图层联动的预留入口） */
export type EspMapProjectRow = {
  BATCH: string;
  P_UID: string;
  /** 所属片区唯一号（关联 EspMapAreaRow.A_UID） */
  A_UID: string | null;
  PJ_NAME: string | null;
  BODY: string | null;
  RESP: string | null;
  PROG: string | null;
  INV_2026: number | null;
  INV_2027: number | null;
  geometry: string;
};

// ---------------- 接口 ----------------

/** 片区范围查询：batch 精确过滤，不传=全量 */
export async function espMapAreas(batch?: EspBatch): Promise<EspMapAreaRow[]> {
  return unwrap(await defHttp.get({ url: adminPath + '/esp/map/areas', params: { batch } }));
}

/** 项目图斑查询：batch 精确过滤，不传=全量 */
export async function espMapProjects(batch?: EspBatch): Promise<EspMapProjectRow[]> {
  return unwrap(await defHttp.get({ url: adminPath + '/esp/map/projects', params: { batch } }));
}
