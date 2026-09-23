/**
 * 市住更局 —— 名城保护 · 优保建筑巡查接口层
 *
 * 对接后端 /a/urban-protection/inspection/...。
 * 优保与拟优保巡查共用：scope=excellent（父建筑在册）/ proposed（父建筑拟优保）。
 */

import { defHttp } from '@jeesite/core/utils/http/axios';
import { useGlobSetting } from '@jeesite/core/hooks/setting';

const { adminPath } = useGlobSetting();
const BASE = adminPath + '/urban-protection/inspection';

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

/** 巡查记录行 */
export type InspectionRow = {
  id: string;
  parentId: string;
  qu: string;
  jzOldName: string;
  xcUserName: string;
  czTime?: number | string | null;
  xcTime?: number | string | null;
  /** 是否特别关注 */
  sfTbgz: boolean;
  type: string | null;
  /** 录入类型展示（PC / APP） */
  typeView: string;
  /** 是否上报 */
  sfSb: boolean;
  houseAddres: string;
  // 以下仅详情接口返回
  xcContent?: string;
  xcWt?: string;
  houseXz?: string;
  lat?: string;
  lng?: string;
  photos?: { fileName: string; url: string }[];
};

/** 巡查范围 */
export type InspectionScope = 'excellent' | 'proposed';

/** 分页查询参数 */
export type InspectionPageQuery = {
  scope?: InspectionScope;
  jzOldName?: string;
  xcUserName?: string;
  qu?: string;
  sfTbgz?: string;
  sfSb?: string;
  parentId?: string;
  begin?: string;
  end?: string;
  pageNum?: number;
  pageSize?: number;
};

/** 分页查询：返回 {list, count}（count 对齐框架 BasicTable fetchSetting.totalField） */
export async function fetchInspectionPage(params: InspectionPageQuery) {
  const data = await unwrap<{ total: number; pageNum: number; pageSize: number; list: InspectionRow[] }>(
    defHttp.get({ url: BASE + '/list', params }),
  );
  return { list: data.list, count: data.total };
}

/** 详情（含照片列表，MinIO URL 直出） */
export function fetchInspectionDetail(id: string) {
  return unwrap<InspectionRow>(defHttp.get({ url: BASE + '/detail', params: { id } }));
}

/** 修改特别关注（sfTbgz：'1' 关注 / '0' 取消） */
export function setInspectionAttention(id: string, sfTbgz: '0' | '1') {
  return unwrap<null>(
    defHttp.post({
      url: `${BASE}/attention?id=${encodeURIComponent(id)}&sfTbgz=${sfTbgz}`,
    }),
  );
}
