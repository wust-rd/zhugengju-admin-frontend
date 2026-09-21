/**
 * 市住更局 —— 三师库管理 接口层（后端模块 modules/esp，jeesite-module-esp）
 *
 * 接口文档：views/early-stage-planning/expert-pool-management/接口文档-三师库管理.md（v1）
 * 响应协议：后端统一返回 {code, msg, data}（code=200 成功 / 400 业务错误 / 500 系统异常），
 * 与框架 defHttp 默认解包的 jeesite {result} 协议不同 —— 本层 unwrap() 统一处理：
 *  - 响应体含 code 字段 → code===200 返回 data，否则抛出 msg；
 *  - 不含 code 字段（后端未来切 jeesite 协议）→ 原样返回。
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
type EspPage<T> = { total: number; pageNum: number; pageSize: number; list: T[] };
/** BasicTable fetchSetting 分页结构（totalField=count） */
type TablePage<T> = { count: number; list: T[] };

// ---------------- 类型 ----------------

/** 专家行（列表/表单/抽取卡片/考评列表共用） */
export type EspExpert = {
  id: string;
  name: string;
  gender: string;
  age: number;
  phone: string;
  idCard: string;
  field: string;
  title: string;
  org: string;
  orgType: string;
  joinDate: string;
  selected: boolean;
  career: string;
  reviewExperience: string;
};

/** 三师角色 key（planner/architect/assessor） */
export type EspRole = 'planner' | 'architect' | 'assessor';

/** 字典选项集合 */
export type EspDictOptions = {
  fields: string[];
  titles: string[];
  orgTypes: string[];
  genders: string[];
};

/** 片区选项（ESP_MAP_AREA：key=area_name，value=a_uid） */
export type EspArea = { key: string; value: string; areaCode: string; areaName: string };

/** 抽取结果（每角色一名专家，候选不足为 null） */
export type EspDrawResult = {
  districtCode: string;
  districtName: string;
  poolSize: number;
  planner: EspExpert | null;
  architect: EspExpert | null;
  assessor: EspExpert | null;
};

/** 分配记录行 */
export type EspDrawRecord = {
  id: string;
  districtCode: string;
  districtName: string;
  drawFields: string;
  drawCount: number;
  plannerId: string | null;
  plannerName: string | null;
  architectId: string | null;
  architectName: string | null;
  assessorId: string | null;
  assessorName: string | null;
  drawDate: string;
  assignFlag: boolean;
  createByName: string;
  createDate: string;
};

/** 分配记录详情（含三角色完整专家行） */
export type EspDrawRecordDetail = EspDrawRecord & {
  planner: EspExpert | null;
  architect: EspExpert | null;
  assessor: EspExpert | null;
};

/** 排名行（三维度 Top5 共用） */
export type EspRankRow = { expertId: string; name: string; org: string; avgScore: number; count: number };

/** 考评列表专家行（专家行 + 三维度平均分聚合） */
export type EspEvalExpertRow = EspExpert & {
  avgActivity: number;
  avgCoverage: number;
  avgEfficiency: number;
  evalCount: number;
};

/** 评价记录行 */
export type EspEvalRecord = {
  id: string;
  expertId: string;
  activityStars: number;
  activityScore: number;
  coverageStars: number;
  coverageScore: number;
  efficiencyStars: number;
  efficiencyScore: number;
  time: string;
  evaluator: string;
  org: string;
  comment: string;
};

// ---------------- 1. 字典 ----------------

/** 1.1 下拉选项集合（fields/titles/orgTypes/genders，值即中文标签） */
export async function espDictOptions(): Promise<EspDictOptions> {
  return unwrap(await defHttp.get({ url: adminPath + '/esp/dict/options' }));
}

/** 1.2 抽取片区下拉（ESP_MAP_AREA：key=area_name，value=a_uid） */
export async function espDictAreas(): Promise<EspArea[]> {
  return unwrap(await defHttp.get({ url: adminPath + '/esp/dict/areas' })) ?? [];
}

// ---------------- 2. 三师信息管理 ----------------

/** 2.1 分页查询（name/org 模糊、selected=yes|no 精确）——BasicTable api 直用 */
export async function espExpertPage(params: Recordable): Promise<TablePage<EspExpert>> {
  const { pageNo, pageSize, ...rest } = params ?? {};
  const data = unwrap<EspPage<EspExpert>>(
    await defHttp.get({
      url: adminPath + '/esp/expert/page',
      params: { ...rest, pageNum: pageNo, pageSize },
    }),
  );
  return { count: data.total, list: data.list };
}

/** 2.2 统计卡（total/senior/selected） */
export async function espExpertStat(): Promise<{ total: number; senior: number; selected: number }> {
  return unwrap(await defHttp.get({ url: adminPath + '/esp/expert/stat' }));
}

/** 2.3 专家详情（表单回显；id 空返回空骨架） */
export async function espExpertForm(id: string): Promise<EspExpert> {
  return unwrap(await defHttp.get({ url: adminPath + '/esp/expert/form', params: { id } }));
}

/** 2.4 保存专家（id 空=新增） */
export async function espExpertSave(data: Partial<EspExpert>): Promise<{ id: string; name: string }> {
  return unwrap(await defHttp.postJson({ url: adminPath + '/esp/expert/save', data }));
}

/** 2.5 删除专家（级联逻辑删除评价记录） */
export async function espExpertDelete(id: string): Promise<{ id: string; name: string; deletedEvalCount: number }> {
  return unwrap(await defHttp.post({ url: adminPath + '/esp/expert/delete', params: { id } }));
}

// ---------------- 3. 随机分配三师 ----------------

/** 3.1 随机抽取（服务端随机，不落库；按 规划师→建筑师→评估师 各取一名） */
export async function espDrawDraw(data: {
  districtCode: string;
  fields: string[];
  roles: EspRole[];
  avoidDrawn?: boolean;
  excludeIds?: string[];
}): Promise<EspDrawResult> {
  return unwrap(await defHttp.postJson({ url: adminPath + '/esp/draw/draw', data }));
}

/** 3.2 单角色随机更换 */
export async function espDrawReplace(data: {
  fields: string[];
  role: EspRole;
  avoidDrawn?: boolean;
  excludeIds: string[];
}): Promise<{ role: EspRole; expert: EspExpert }> {
  return unwrap(await defHttp.postJson({ url: adminPath + '/esp/draw/replace', data }));
}

/** 3.3 确认选用（落分配记录 + 专家置已入选；assignFlag=true 标记「指定人员」方式） */
export async function espDrawConfirm(data: {
  districtCode: string;
  fields: string[];
  plannerId: string | null;
  architectId: string | null;
  assessorId: string | null;
  assignFlag?: boolean;
}): Promise<{ recordId: string; drawCount: number; expertIds: string[]; overwrite?: boolean }> {
  return unwrap(await defHttp.postJson({ url: adminPath + '/esp/draw/confirm', data }));
}

/** 3.4 分配记录分页 —— BasicTable api 直用 */
export async function espDrawRecords(params: Recordable): Promise<TablePage<EspDrawRecord>> {
  const { pageNo, pageSize, ...rest } = params ?? {};
  const data = unwrap<EspPage<EspDrawRecord>>(
    await defHttp.get({
      url: adminPath + '/esp/draw/records',
      params: { ...rest, pageNum: pageNo, pageSize },
    }),
  );
  return { count: data.total, list: data.list };
}

/** 3.5 分配记录详情（详情弹窗） */
export async function espDrawRecordDetail(id: string): Promise<EspDrawRecordDetail> {
  return unwrap(await defHttp.get({ url: adminPath + '/esp/draw/record', params: { id } }));
}

/** 3.6 按片区查询最近一条分配记录（选择片区后回显已抽专家；无记录返回 null） */
export async function espDrawLatest(districtCode: string): Promise<EspDrawRecordDetail | null> {
  return unwrap(await defHttp.get({ url: adminPath + '/esp/draw/latest', params: { districtCode } }));
}

// ---------------- 4. 考评分析 ----------------

/** 4.1 三维度 Top5 排名 */
export async function espEvaluationRank(): Promise<{
  activity: EspRankRow[];
  coverage: EspRankRow[];
  efficiency: EspRankRow[];
}> {
  return unwrap(await defHttp.get({ url: adminPath + '/esp/evaluation/rank' }));
}

/** 4.2 已入选专家列表（整包返回，含三维度平均分聚合；name 模糊） */
export async function espEvaluationList(name?: string): Promise<EspEvalExpertRow[]> {
  return unwrap(await defHttp.get({ url: adminPath + '/esp/evaluation/list', params: { name } }));
}

/** 4.3 历史评价分页 —— BasicTable api 直用 */
export async function espEvaluationPage(params: Recordable): Promise<TablePage<EspEvalRecord>> {
  const { pageNo, pageSize, ...rest } = params ?? {};
  const data = unwrap<EspPage<EspEvalRecord>>(
    await defHttp.get({
      url: adminPath + '/esp/evaluation/page',
      params: { ...rest, pageNum: pageNo, pageSize },
    }),
  );
  return { count: data.total, list: data.list };
}

/** 4.4 新增评价（评价人/单位取当前登录用户快照，后端回填） */
export async function espEvaluationSave(data: {
  expertId: string;
  activityStars: number;
  coverageStars: number;
  efficiencyStars: number;
  time?: string;
  comment?: string;
}): Promise<{ id: string; expertId: string; expertName: string }> {
  return unwrap(await defHttp.postJson({ url: adminPath + '/esp/evaluation/save', data }));
}

/** 4.5 删除评价 */
export async function espEvaluationDelete(id: string): Promise<{ id: string; expertId: string }> {
  return unwrap(await defHttp.post({ url: adminPath + '/esp/evaluation/delete', params: { id } }));
}
