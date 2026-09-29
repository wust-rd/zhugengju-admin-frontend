/**
 * 市住更局 —— 城市体检 公共常量与 HTTP 工具（市级/区级共用）
 *
 * HTTP 约定（对齐已上线的 esp 模块模式，后端 modules/check）：
 *  - 响应协议：后端统一返回 {code, msg, data}（code=200 成功 / 400 业务错误 / 500 系统异常），
 *    与框架 defHttp 默认解包的 jeesite {result} 协议不同 —— unwrap() 统一处理：
 *    响应体含 code 字段 → code===200 返回 data，否则抛出 msg；
 *    不含 code 字段（后端未来切 jeesite 协议）→ 原样返回。
 *  - 分页映射：后端 {total, pageNum, pageSize, list} → BasicTable fetchSetting {count, list}
 *    （后端入参 pageNum/pageSize ← 表格 pageField pageNo/sizeField pageSize，在 api 函数内转换）。
 *  - URL 前缀：'/cityCheck/...'（后端 @RequestMapping("/cityCheck/...")，不带 adminPath，
 *    匿名放行；defHttp 自动拼 urlPrefix=/js。若拼上 adminPath=/a 后端会 404，已踩坑）。
 */

import { defHttp } from '@jeesite/core/utils/http/axios';

/** check 模块接口基址 */
export const CHECK_API = '/cityCheck';

/** 统一解包 {code, msg, data}（兼容 jeesite result 协议透传） */
export function unwrap<T = any>(body: any): T {
  if (body && typeof body === 'object' && Reflect.has(body, 'code')) {
    if (body.code === 200) return body.data as T;
    throw new Error(body.msg || '接口请求失败');
  }
  return body as T;
}

/** 后端分页结构 */
export type CheckPage<T> = { total: number; pageNum: number; pageSize: number; list: T[] };

/** BasicTable fetchSetting 分页结构（totalField=count） */
export type TablePage<T> = { count: number; list: T[] };

/**
 * GET 分页接口 → BasicTable api 直用函数：
 * 入参 pageNo/pageSize 转 pageNum/pageSize，返回 {count, list}
 */
export async function pageGet<T>(url: string, params: Recordable = {}): Promise<TablePage<T>> {
  const { pageNo, pageSize, ...rest } = params ?? {};
  const data = unwrap<CheckPage<T>>(
    await defHttp.get({ url, params: { ...rest, pageNum: pageNo, pageSize } }),
  );
  return { count: data.total, list: data.list };
}

/** 行政区划(武汉市行政区名) */
export const DISTRICTS = [
  '江岸区',
  '江汉区',
  '硚口区',
  '汉阳区',
  '武昌区',
  '青山区',
  '洪山区',
  '东西湖区',
  '蔡甸区',
  '江夏区',
  '黄陂区',
  '新洲区',
  '汉南区',
] as const;

/** 体检片区(武汉市街道名) */
export const SURVEY_AREAS = [
  '大智街道',
  '一元街道',
  '车站街道',
  '四唯街道',
  '永清街道',
  '西马街道',
  '球场街道',
  '劳动街道',
  '二七街道',
  '新村街道',
  '丹水池街道',
  '后湖街道',
  '塔子湖街道',
  '水果湖街道',
  '中南路街道',
] as const;

/** 功能定位 */
/** 功能定位(可多选,展示时拼接) */
export const FUNCTION_POSITIONS = ['TOD', 'COD', 'HOD', 'IOD', 'EOD'] as const;

/** 字符串常量数组 → Select options */
export function toOptions(arr: readonly string[]) {
  return arr.map((item) => ({ label: item, value: item }));
}
