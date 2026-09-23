/**
 * 市住更局 —— 名城保护 · 优保推荐建筑接口层
 *
 * 对接后端 /a/urban-protection/recommend/...（WHFW_AQJD_EXCELLENT_TJ）。
 * photos 为 JSON 数组串 '[{name,url}]'，前端解析展示；tjsj 时间戳或字符串。
 */

import { defHttp } from '@jeesite/core/utils/http/axios';
import { useGlobSetting } from '@jeesite/core/hooks/setting';

const { adminPath } = useGlobSetting();
const BASE = adminPath + '/urban-protection/recommend';

/** 统一响应体 {code, msg, data}；code=200 成功 */
type Body<T> = { code: number; msg: string; data: T };

async function unwrap<T>(p: Promise<Body<T>>): Promise<T> {
  const res = await p;
  if (!res || typeof res.code !== 'number') {
    throw new Error('接口返回格式异常');
  }
  if (res.code !== 200) {
    throw new Error(res.msg || '请求失败');
  }
  return res.data;
}

/** 推荐建筑行 */
export type RecommendRow = {
  id: string;
  /** 建筑位置 */
  jzwz: string;
  /** 建筑名称 */
  jzmc: string;
  /** 推荐人姓名 */
  tjrxm: string;
  /** 手机号码 */
  sjhm: string;
  /** 推荐时间 */
  tjsj?: number | string | null;
  /** 推荐理由 */
  tjly: string;
  /** 照片 JSON 数组串 '[{name,url}]'（可能为空串） */
  photos: string;
};

/** 分页查询参数 */
export type RecommendPageQuery = {
  jzwz?: string;
  jzmc?: string;
  tjrxm?: string;
  sjhm?: string;
  pageNum?: number;
  pageSize?: number;
};

/** 分页查询：返回 {list, count}（count 对齐框架 BasicTable fetchSetting.totalField） */
export async function fetchRecommendPage(params: RecommendPageQuery) {
  const data = await unwrap<{ total: number; pageNum: number; pageSize: number; list: RecommendRow[] }>(
    defHttp.get({ url: BASE + '/list', params }),
  );
  return { list: data.list, count: data.total };
}

/** 详情 */
export function fetchRecommendDetail(id: string) {
  return unwrap<RecommendRow>(defHttp.get({ url: BASE + '/detail', params: { id } }));
}

/** 保存（新增/修改合一；建筑名称/推荐时间必填；tjsj 传时间戳） */
export function saveRecommend(data: Partial<RecommendRow>) {
  return unwrap<{ id: string }>(defHttp.postJson({ url: BASE + '/save', data }));
}

/** 逻辑删除 */
export function deleteRecommend(id: string) {
  return unwrap<null>(defHttp.post({ url: BASE + `/delete?id=${encodeURIComponent(id)}` }));
}

/** 解析照片 JSON 串 → {name,url}[]（空/坏数据返回 []） */
export function parseRecommendPhotos(photos: string | null | undefined): { name: string; url: string }[] {
  if (!photos) return [];
  try {
    const arr = JSON.parse(photos) as unknown;
    return Array.isArray(arr)
      ? (arr as { name?: string; url?: string }[])
          .filter((p) => !!p?.url)
          .map((p) => ({ name: p.name ?? '', url: p.url as string }))
      : [];
  } catch {
    return [];
  }
}
