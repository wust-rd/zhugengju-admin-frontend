/**
 * 市住更局 —— 城市更新专家管理 · 个人档案 接口层（后端 modules/esp，jeesite-module-esp）
 *
 * 后端代码：api/web/uexp/UreExpertController（/a/ure/expert/*）与 UreDictController（/a/ure/dict/*）。
 * 响应协议：后端统一返回 {code, msg, data}（code=200 成功 / 400 业务错误 / 500 系统异常），
 * 与框架 defHttp 默认解包的 jeesite {result} 协议不同 —— 本层 unwrap() 统一处理（同 expert-pool.ts）。
 * 分页映射：后端 {total, pageNum, pageSize, list} → BasicTable fetchSetting {count, list}
 * （后端入参 pageNum/pageSize ← 表格 pageField pageNo/sizeField pageSize，在 api 函数内转换）。
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

/** 后端分页结构 */
type UrePage<T> = { total: number; pageNum: number; pageSize: number; list: T[] };
/** BasicTable fetchSetting 分页结构（totalField=count） */
type TablePage<T> = { count: number; list: T[] };

// ---------------- 类型 ----------------

/** 专家行（列表/详情/表单共用，对应后端 UreRows.expertRow） */
export type UreExpert = {
  id: string;
  code: string;
  name: string;
  gender: string;
  age: number;
  phone: string;
  field: string;
  title: string;
  org: string;
  orgType: string;
  /** 入库时间 yyyy-MM-dd */
  joinDate: string;
  selected: boolean;
  career?: string;
  reviewExperience?: string;
  /** 是否已绑定登录账号（保存时按手机号自动开通/换绑） */
  hasAccount?: boolean;
};

/** 下拉选项集合（值为中文标签，与后端 ure 字典表一致） */
export type UreDictOptions = {
  fields: string[];
  titles: string[];
  orgTypes: string[];
  genders: string[];
  reviewModes: string[];
  districts: string[];
};

/** 保存结果（accountCreated=true 表示本次自动开通了登录账号，手机号即登录名） */
export type UreExpertSaveResult = { id: string; code: string; name: string; accountCreated: boolean };

/** 删除结果（deletedEvalCount=级联逻辑删除的评价记录数；登录账号保留） */
export type UreExpertDeleteResult = { id: string; code: string; name: string; deletedEvalCount: number };

// ---------------- 1. 字典 ----------------

/** 1.1 下拉选项集合（fields/titles/orgTypes/genders/reviewModes/districts，值即中文标签） */
export async function ureDictOptions(): Promise<UreDictOptions> {
  return unwrap(await defHttp.get({ url: adminPath + '/ure/dict/options' }));
}

// ---------------- 2. 专家档案 ----------------

/** 2.1 分页查询（name/org 模糊、selected=yes|no 精确）——BasicTable api 直用
 *  注意：后端分页暂不支持按专业领域 field 过滤 */
export async function ureExpertPage(params: Recordable): Promise<TablePage<UreExpert>> {
  const { pageNo, pageSize, ...rest } = params ?? {};
  const data = unwrap<UrePage<UreExpert>>(
    await defHttp.get({
      url: adminPath + '/ure/expert/page',
      params: { ...rest, pageNum: pageNo, pageSize },
    }),
  );
  return { count: data.total, list: data.list };
}

/** 2.2 统计卡（total=入库专家总数 / senior=正高级工程师 / fieldCount=专业领域数量） */
export async function ureExpertStat(): Promise<{ total: number; senior: number; fieldCount: number }> {
  return unwrap(await defHttp.get({ url: adminPath + '/ure/expert/stat' }));
}

/** 2.3 专家详情（表单/详情页回显；id 空返回空骨架） */
export async function ureExpertForm(id: string): Promise<UreExpert> {
  return unwrap(await defHttp.get({ url: adminPath + '/ure/expert/form', params: { id } }));
}

/** 2.4 保存专家（新建/修改合一，id 空=新增；手机号即登录名，无同名账号自动开通并授予 urban_expert 角色） */
export async function ureExpertSave(data: Partial<UreExpert>): Promise<UreExpertSaveResult> {
  return unwrap(await defHttp.postJson({ url: adminPath + '/ure/expert/save', data }));
}

/** 2.5 删除专家（逻辑删除 + 级联逻辑删除其全部评价记录；登录账号保留） */
export async function ureExpertDelete(id: string): Promise<UreExpertDeleteResult> {
  return unwrap(await defHttp.post({ url: adminPath + '/ure/expert/delete', params: { id } }));
}

/** 2.6 当前登录账号 → 专家档案映射（非专家账号 expert 为 null；专家视角/组长判定用） */
export async function ureExpertMe(): Promise<{ userCode: string; userName: string; expert: UreExpert | null }> {
  return unwrap(await defHttp.get({ url: adminPath + '/ure/expert/me' }));
}
