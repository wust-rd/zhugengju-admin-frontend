/**
 * 策划方案填报 接口层（后端模块 modules/esp，方案填报 v2026-09-15+）
 *
 * 接口文档：zhugengju-admin-backend/modules/esp/docs/接口文档-方案填报.md
 * 响应协议：后端统一返回 {code, msg, data}（code=200 成功 / 400 业务错误 / 500 系统异常），
 * 与框架 defHttp 默认解包的 jeesite {result} 协议不同 —— 本层 unwrap() 统一处理
 * （同 expert-pool.ts 约定）。
 * 存储口径（按后端来；2026-09-15 起矢量改用 WKT，弃 TopoJSON）：
 *  - 七个文件位 + 概况图片/图册/实施方案 = 文件对象数组 [{name, url, objectKey, size}]
 *    （上传走 POST /a/esp/file/upload，响应键 fileName 由本层归一为 name）；
 *  - 片区范围线 scopeLine / 项目矢量图斑 mapSpot = WKT 字符串
 *    （MULTIPOLYGON 文本，后端 JTS 生成、坐标无损，与 geometry 列存量格式一致），
 *    本层提供 WKT ↔ GeoJSON 互转工具（手写解析，无第三方依赖）。
 */

import { defHttp } from '@jeesite/core/utils/http/axios';
import { useGlobSetting } from '@jeesite/core/hooks/setting';

const { adminPath, urlPrefix } = useGlobSetting();

/**
 * uploadFile 直走 axios 实例，不经过 beforeRequestHook 的 joinPrefix（get/postJson 才加
 * urlPrefix），dev 代理只认 urlPrefix（/js）前缀 —— 上传类 URL 须自带前缀才能到后端
 */
const uploadUrl = (path: string) => `${urlPrefix}${adminPath}${path}`;

/** 统一解包 {code, msg, data}（兼容 jeesite result 协议透传） */
function unwrap<T = any>(body: any): T {
  if (body && typeof body === 'object' && Reflect.has(body, 'code')) {
    if (body.code === 200) return body.data as T;
    throw new Error(body.msg || '接口请求失败');
  }
  return body as T;
}

/** 后端分页结构 */
type EspPage<T> = { total: number; pageNum: number; pageSize: number; list: T[] };
/** BasicTable fetchSetting 分页结构（totalField=count） */
type TablePage<T> = { count: number; list: T[] };

// ---------------- 类型 ----------------

/** 文件对象（后端统一附件口径；上传响应的 fileName 已归一为 name） */
export type EspSchemeFile = { name: string; url?: string; objectKey?: string; size?: number };

/** 片区项目行（projects 数组元素；id 为后端生成，保存时前端剥离） */
export type EspSchemeProject = {
  id?: string;
  name?: string;
  /** 改造类别：既有建筑改造/老旧小区改造/老旧街区改造/老旧厂区改造/城中村改造（2026-09-16 去除「其他」） */
  category?: string;
  implOrg?: string;
  investEstimate?: number | null;
  fundSources?: string[];
  yearInvest?: number | null;
  startDate?: string;
  endDate?: string;
  content?: string;
  planFiles?: EspSchemeFile[];
  /** 项目矢量图斑（WKT 字符串，MULTIPOLYGON） */
  mapSpot?: string | null;
};

/** 片区城市设计条目（cityDesigns 数组元素；type 六类枚举不可重复） */
export type EspCityDesign = {
  /** 类别：人居环境/产业发展/历史文化保护/基础设施建设/生态环境整治/交通影响评价 */
  type: string;
  /** 主要内容（≤300 字） */
  content: string;
  /** 设计图片（文件对象数组，多张） */
  images: EspSchemeFile[];
};

/** 完整 Scheme（详情回显与保存请求共用；保存时 id 空串=新增） */
export type EspSchemeFill = {
  id?: string;
  code?: string;
  aUid?: string;
  /** 1=已批准存量片区 / 2=新增填报片区（后端维护，前端只读） */
  isApprove?: string;
  name?: string;
  batch?: string;
  district?: string;
  areaHa?: number | null;
  startTime?: string;
  /** 起止时间-止（2026-09-16 新增；表单起止区间经 fieldMapToTime 与 startTime 组合） */
  endTime?: string;
  overallOrg?: string;
  overview?: string;
  overviewImages?: EspSchemeFile[];
  scopeDesc?: string;
  /** 片区范围线（WKT 字符串，MULTIPOLYGON） */
  scopeLine?: string | null;
  problemList?: string[];
  opportunityList?: string[];
  demandList?: string[];
  /** 总体目标（2026-09-16 新增，≤200 字） */
  overallGoal?: string;
  funcTypes?: string[];
  funcPlan?: string;
  atlas?: EspSchemeFile[];
  /** 片区城市设计（2026-09-16 新增，六类 tab，type 不可重复） */
  cityDesigns?: EspCityDesign[];
  /** 片区规划调整-调整内容（2026-09-16 新增，≤300 字） */
  adjustContent?: string;
  /** 片区规划调整-调整前图纸（单文件对象，null=未传） */
  adjustBeforeFile?: EspSchemeFile | null;
  /** 片区规划调整-调整后图纸（单文件对象，null=未传） */
  adjustAfterFile?: EspSchemeFile | null;
  projects?: EspSchemeProject[];
  invest?: number | null;
  /** { 来源名: 金额|null }，键存在即选中 */
  fundSources?: Record<string, number | null>;
  schemePlanFiles?: EspSchemeFile[];
  chartFiles?: EspSchemeFile[];
  healthReportFiles?: EspSchemeFile[];
  approvalFiles?: EspSchemeFile[];
  otherFiles?: EspSchemeFile[];
  reportOrg?: string;
  reportTime?: string;
};

/** 列表行（page 接口） */
export type EspSchemeListRow = {
  id: string;
  code: string;
  aUid: string;
  isApprove: string;
  name: string;
  district: string;
  areaHa: number | null;
  funcTypes: string[];
  batch: string;
  invest: number | null;
  reportTime: string | null;
  reportOrg: string | null;
};

/** 矢量解析的源坐标系（type 入参；返回 wkt/bbox 始终为 WGS84） */
export type EspCoordType = 'CGCS_WH_2000' | 'WGS84';

/** 矢量解析结果（parseVector；后端 JTS 生成，坐标无损） */
export type EspParseVectorResult = {
  /** WKT 文本（MULTIPOLYGON，WGS84；确认后随表单原样存入 scopeLine / mapSpot） */
  wkt: string;
  bbox: number[];
  featureCount: number;
  sourceFormat: 'dwg' | 'dxf' | 'shp' | 'geojson';
  reprojected: boolean;
  /** 回显入参 type */
  sourceCrs: string;
};

/** 保存响应 */
export type EspSchemeSaveResult = {
  id: string;
  code: string;
  aUid: string;
  name: string;
  isApprove: string;
  reportTime: string;
};

// ---------------- 1. 列表 / 详情 / 保存 / 删除 ----------------

/** 1.1 分页查询（Tab 按 isApprove=1已批准/2待审查 分开查询）—— BasicTable api 直用 */
export async function schemeFillPage(
  params: Recordable & { isApprove?: '1' | '2' },
): Promise<TablePage<EspSchemeListRow>> {
  const { pageNo, pageSize, ...rest } = params ?? {};
  const data = unwrap<EspPage<EspSchemeListRow>>(
    await defHttp.get({
      url: adminPath + '/esp/schemeFill/page',
      params: { ...rest, pageNum: pageNo, pageSize },
    }),
  );
  return { count: data.total, list: data.list };
}

/** 1.2 详情（填报页回显；id 空返回新增空骨架） */
export async function schemeFillForm(id: string): Promise<EspSchemeFill> {
  return unwrap(await defHttp.get({ url: adminPath + '/esp/schemeFill/form', params: { id } }));
}

/** 1.3 保存（新增/编辑统一，全量提交；id 空串=新增） */
export async function schemeFillSave(data: EspSchemeFill): Promise<EspSchemeSaveResult> {
  return unwrap(await defHttp.postJson({ url: adminPath + '/esp/schemeFill/save', data }));
}

/** 1.4 删除（仅 isApprove=2 新增填报片区；存量已批准片区后端拒绝） */
export async function schemeFillDelete(id: string): Promise<{ id: string; aUid: string; name: string }> {
  return unwrap(await defHttp.post({ url: adminPath + '/esp/schemeFill/delete', params: { id } }));
}

// ---------------- 2. 文件上传 / 矢量解析 ----------------

/**
 * uploadFile 直走 axios 实例（不经过 transformRequestHook 解包），resolve 的是完整
 * AxiosResponse —— .data 才是后端 {code, msg, data} body（同 policy.ts 的处理）
 */
async function uploadBody<T>(file: File, path: string, data?: Recordable): Promise<T> {
  const res = await defHttp.uploadFile({ url: uploadUrl(path) }, { file, name: 'files', data });
  return unwrap<T>((res as Recordable)?.data);
}

/** 2.1 单文件上传（MinIO 永久直链；多选由调用方逐文件调用） */
export async function espFileUpload(file: File): Promise<EspSchemeFile> {
  const uploaded = await uploadBody<{ fileName: string; url: string; objectKey: string; size: number }[]>(
    file,
    '/esp/file/upload',
  );
  const [first] = uploaded ?? [];
  if (!first) {
    throw new Error('上传失败：未返回文件信息');
  }
  // 响应键 fileName 归一为保存契约的 name
  return { name: first.fileName, url: first.url, objectKey: first.objectKey, size: first.size };
}

/**
 * 2.2 矢量解析（dwg/dxf/shp/geojson → WKT，不落库）
 *
 * @param type 源坐标系：CGCS_WH_2000（武汉2000，默认）/ WGS84；返回 wkt/bbox 始终为 WGS84
 */
export async function schemeFillParseVector(
  file: File,
  type: EspCoordType = 'CGCS_WH_2000',
): Promise<EspParseVectorResult> {
  return uploadBody<EspParseVectorResult>(file, '/esp/schemeFill/parseVector', { type });
}

// ---------------- 3. WKT ↔ GeoJSON 互转（存储 ↔ 展示） ----------------

/**
 * 存储 WKT 字符串 → 展示 GeoJSON FeatureCollection 字符串（地图渲染/编辑用）
 *
 * 支持后端产出的 MULTIPOLYGON（兼容单 POLYGON）；空/不合法返回 undefined
 * （按无数据处理，不阻断表单）。
 */
export function wktToGeoJson(wkt: string | null | undefined): string | undefined {
  const coordinates = parseWkt(wkt);
  if (!coordinates) return undefined;
  return JSON.stringify({
    type: 'FeatureCollection',
    features: [{ type: 'Feature', properties: {}, geometry: { type: 'MultiPolygon', coordinates } }],
  });
}

/**
 * 展示 GeoJSON 字符串 → 存储 WKT 字符串（MULTIPOLYGON）
 *
 * 提取全部 Polygon/MultiPolygon 要素合并为一个 MultiPolygon 后序列化；
 * 坐标直接以 JS 数值最短往返表示输出（无损）。无面要素返回 undefined（清空存储值）。
 */
export function geoJsonToWkt(geoJson: string | null | undefined): string | undefined {
  if (!geoJson) return undefined;
  const multi = toMultiPolygon(JSON.parse(geoJson) as Recordable);
  if (!multi) return undefined;
  const polygons = multi.coordinates
    .map((polygon) => `(${polygon.map((ring) => `(${ring.map(([x, y]) => `${x} ${y}`).join(', ')})`).join(', ')})`)
    .join(', ');
  return `MULTIPOLYGON (${polygons})`;
}

/** WKT（MULTIPOLYGON / POLYGON）→ 嵌套坐标 [面][环][点 x,y]；空/不合法返回 undefined */
function parseWkt(wkt: string | null | undefined): number[][][][] | undefined {
  if (!wkt) return undefined;
  const text = wkt.trim();
  const isMulti = /^MULTIPOLYGON/i.test(text);
  if (!isMulti && !/^POLYGON/i.test(text)) return undefined;
  const start = text.indexOf('(');
  const end = text.lastIndexOf(')');
  if (start < 0 || end <= start) return undefined; // EMPTY / 残缺
  // 剥掉最外层括号：MULTIPOLYGON 得面列表（每面带括号），POLYGON 得环列表（每环带括号）
  const outer = text.slice(start + 1, end);
  const polygonBodies = isMulti ? splitTopLevel(outer).map(stripParens) : [outer];
  const polygons: number[][][][] = [];
  for (const polygonBody of polygonBodies) {
    const rings: number[][][] = [];
    for (const ringBody of splitTopLevel(polygonBody).map(stripParens)) {
      const ring: number[][] = [];
      for (const pointText of ringBody.split(',')) {
        const [x, y] = pointText.trim().split(/\s+/).map(Number);
        if (Number.isFinite(x) && Number.isFinite(y)) ring.push([x, y]);
      }
      if (ring.length >= 3) rings.push(ring);
    }
    if (rings.length) polygons.push(rings);
  }
  return polygons.length ? polygons : undefined;
}

/** 按括号深度切分顶层逗号片段（保留各片段原文，含括号） */
function splitTopLevel(body: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of body) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

/** 剥掉首尾成对括号（无括号原样返回） */
function stripParens(s: string): string {
  return s.startsWith('(') && s.endsWith(')') ? s.slice(1, -1).trim() : s;
}

/** GeoJSON（FeatureCollection / Feature / 裸几何）→ 单个 MultiPolygon（无面要素返回 undefined） */
function toMultiPolygon(root: Recordable): { type: 'MultiPolygon'; coordinates: number[][][][] } | undefined {
  const polygons: number[][][][] = [];
  const pushGeometry = (geometry: unknown) => {
    if (!geometry || typeof geometry !== 'object') return;
    const g = geometry as Recordable;
    const coords = g.coordinates;
    // Polygon coordinates = 单个多边形；MultiPolygon coordinates = 多边形数组展开
    if (g.type === 'Polygon' && Array.isArray(coords)) {
      polygons.push(coords as number[][][]);
    } else if (g.type === 'MultiPolygon' && Array.isArray(coords)) {
      polygons.push(...(coords as number[][][][]));
    }
  };
  if (Array.isArray(root?.features)) {
    root.features.forEach((f: Recordable) => pushGeometry(f?.geometry));
  } else if (root?.type === 'Feature') {
    pushGeometry(root.geometry);
  } else {
    pushGeometry(root);
  }
  return polygons.length ? { type: 'MultiPolygon', coordinates: polygons } : undefined;
}
