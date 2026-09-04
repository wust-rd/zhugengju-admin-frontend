/**
 * 市住更局 —— 政策库(政策管理) 接口层
 *
 * 后端为 kd_server(FastAPI,服务地址经 vite proxy 以 /policy_api 前缀代理,
 * 见 web/.env.development VITE_PROXY),接口协议与 JeeSite {result} 协议不同,
 * 故逐请求关闭 /js 前缀(joinPrefix)与响应转换(isTransformResponse),直接取 FastAPI JSON。
 * 后端字段为 snake_case,本层统一映射为前端 camelCase(Policy 实体),
 * 页面不感知后端字段命名;*Label 字段为后端字典翻译结果,展示优先用之。
 */

import { defHttp } from '@jeesite/core/utils/http/axios';

/** kd_server 基础路径(dev 经 /policy_api 代理到 http://10.13.31.147:8001) */
export const POLICY_API = '/policy_api/api/v1';

/** FastAPI 原始协议请求选项:不加 /js 前缀、不做 result 协议转换 */
const RAW = { joinPrefix: false, isTransformResponse: false, errorMessageMode: 'message' } as const;

/** 政策版本变更记录 实体 */
export interface PolicyVersion {
  fileVersion?: string; // 文件版本(V1.0、V2.0…)
  changeDate?: string; // 变更日期(yyyy-MM-dd)
  changeDept?: string; // 变更部门
  operator?: string; // 操作人
}

/** 政策 实体(后端 snake_case 已映射) */
export interface Policy {
  id?: string;
  code?: string; // 业务编码(= 后端 policy_id,详情跳转用)
  title?: string; // 标题
  docNo?: string; // 文号
  policyLevel?: string; // 政策层级编码
  policyLevelLabel?: string; // 政策层级显示名
  policyType?: string; // 政策类型编码
  policyTypeLabel?: string; // 政策类型显示名
  businessArea?: string; // 业务领域编码
  businessAreaLabel?: string; // 业务领域显示名
  timeStatus?: string; // 时效状态编码(effective/expiring/abolished)
  timeStatusLabel?: string; // 时效状态显示名
  submitStatus?: string; // 提交状态编码(pending/submitted)
  submitStatusLabel?: string; // 提交状态显示名
  sourceOrg?: string; // 发布单位
  publishDate?: string; // 发布日期(yyyy-MM-dd)
  abolishDate?: string; // 废止时间(yyyy-MM-dd)
  keywords?: string; // 关键词标签(多个用分号分隔)
  areaTags?: string; // 适用片区/项目类型标签(多个用分号分隔)
  phaseTags?: string; // 适用阶段标签(多个用分号分隔)
  fileName?: string; // 上传文件名
  fileId?: string; // 文件 ID
  fileUrl?: string; // 文件地址
  versions?: PolicyVersion[]; // 版本变更记录
  snippet?: string; // 检索片段(统一查询/语义匹配结果展示用)
  matchScore?: number; // 语义相似度(百分比数字,如 92.4 表示 92.4%)
  remarks?: string;
}

/** 字典项({label,value} Select 结构) */
export interface PolicyDictItem {
  label: string;
  value: string;
}

/** 列表统计口径 */
export interface PolicyStats {
  total: number;
  effective: number;
  expiring: number;
  abolished: number;
}

/** 分类导航计数:{维度编码:{字典编码:数量}} */
export type PolicyNavCounts = Record<string, Record<string, number>>;

/** 列表查询参数(前端命名,接口层转 snake_case) */
export interface PolicyListParams {
  title?: string;
  docNo?: string;
  sourceOrg?: string;
  submitStatus?: string;
  policyLevel?: string;
  policyType?: string;
  businessArea?: string;
  timeStatus?: string;
  page?: number;
  pageSize?: number;
}

/** 检索命中(片段 + 所属政策) */
export interface SnippetHit {
  chunkId?: string;
  snippet?: string;
  score?: number;
  policy: Policy;
}

/** 时效状态 Tag 配色(对齐原型:现行绿/到期橙/废止红) */
export const TIME_STATUS_COLOR: Record<string, string> = {
  effective: 'success',
  expiring: 'warning',
  abolished: 'error',
};

/** 提交状态 Tag 配色(对齐原型:已提交绿/待提交红) */
export const SUBMIT_STATUS_COLOR: Record<string, string> = {
  submitted: 'success',
  pending: 'error',
};

/** 时效状态圆点颜色(检索结果元信息行小圆点) */
export const TIME_STATUS_DOT_COLOR: Record<string, string> = {
  effective: '#059669',
  expiring: '#d97706',
  abolished: '#dc2626',
};

/** 关键词标签拆分(分号/逗号分隔,对齐原型 tags 拆分规则) */
export function splitTags(text?: string): string[] {
  return (text || '')
    .split(/[;；,，]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** 后端政策行 → 前端实体(snake→camel) */
function mapPolicy(row: Recordable): Policy {
  return {
    id: row.policy_id,
    code: row.policy_id,
    title: row.title,
    docNo: row.doc_no,
    policyLevel: row.policy_level,
    policyLevelLabel: row.policy_level_label || row.policy_level,
    policyType: row.policy_type,
    policyTypeLabel: row.policy_type_label || row.policy_type,
    businessArea: row.business_area,
    businessAreaLabel: row.business_area_label || row.business_area,
    timeStatus: row.time_status,
    timeStatusLabel: row.time_status_label || row.time_status,
    submitStatus: row.submit_status,
    submitStatusLabel: row.submit_status_label || row.submit_status,
    sourceOrg: row.source_org,
    publishDate: row.publish_date,
    abolishDate: row.abolish_date,
    keywords: row.keywords,
    areaTags: row.area_tags,
    phaseTags: row.phase_tags,
    fileName: row.file_name,
    fileId: row.file_id,
    fileUrl: row.file_url,
    versions: (row.versions || []).map((item: Recordable) => ({
      fileVersion: item.file_version,
      changeDate: item.change_date,
      changeDept: item.change_dept,
      operator: item.operator,
    })),
  };
}

/** 前端实体 → 后端 PolicyIn(snake 化,供保存) */
function toPolicyIn(data: Recordable) {
  return {
    title: data.title,
    doc_no: data.docNo,
    policy_level: data.policyLevel || null,
    policy_type: data.policyType || null,
    business_area: data.businessArea || null,
    time_status: data.timeStatus || 'effective',
    source_org: data.sourceOrg || null,
    publish_date: data.publishDate,
    abolish_date: data.abolishDate || null,
    keywords: data.keywords || null,
    area_tags: data.areaTags || null,
    phase_tags: data.phaseTags || null,
    file_id: data.fileId || null,
    file_url: data.fileUrl || null,
  };
}

/** 字典列表(按 dict_type 分组,{label: dict_label, value: dict_code}) */
export async function fetchDicts(): Promise<Record<string, PolicyDictItem[]>> {
  const data = await defHttp.get<{ items: Recordable[]; grouped: Record<string, Recordable[]> }>(
    { url: `${POLICY_API}/dicts` },
    RAW,
  );
  const grouped: Record<string, PolicyDictItem[]> = {};
  Object.entries(data?.grouped || {}).forEach(([type, items]) => {
    grouped[type] = (items || []).map((item) => ({
      label: item.dict_label,
      value: item.dict_code,
    }));
  });
  return grouped;
}

/** 适用片区/项目类型标签全集(检索页「全部区域」下拉用) */
export async function fetchAreaTags(): Promise<string[]> {
  const data = await defHttp.get<{ items: string[] }>({ url: `${POLICY_API}/policies/area-tags` }, RAW);
  return data?.items || [];
}

/** 政策分页列表(响应含统计 stats 与分类导航计数 nav,随列表一并返回) */
export async function policyList(params: PolicyListParams): Promise<{
  list: Policy[];
  count: number;
  stats: PolicyStats;
  nav: PolicyNavCounts;
}> {
  const query = {
    title: params.title || undefined,
    doc_no: params.docNo || undefined,
    source_org: params.sourceOrg || undefined,
    submit_status: params.submitStatus || undefined,
    policy_level: params.policyLevel || undefined,
    policy_type: params.policyType || undefined,
    business_area: params.businessArea || undefined,
    time_status: params.timeStatus || undefined,
    page: params.page || 1,
    page_size: params.pageSize || 20,
  };
  const data = await defHttp.get<Recordable>({ url: `${POLICY_API}/policies`, params: query }, RAW);
  return {
    list: (data?.items || []).map(mapPolicy),
    count: data?.total || 0,
    stats: (data?.stats || { total: 0, effective: 0, expiring: 0, abolished: 0 }) as PolicyStats,
    nav: (data?.nav || {}) as PolicyNavCounts,
  };
}

/** 政策详情(含版本变更记录) */
export async function policyInfo(policyId: string): Promise<Policy> {
  const data = await defHttp.get<Recordable>({ url: `${POLICY_API}/policies/${policyId}` }, RAW);
  return mapPolicy(data || {});
}

/** 新增/保存政策 */
export function policySave(data: Recordable, policyId?: string): Promise<Recordable> {
  const payload = toPolicyIn(data);
  // defHttp 无 putJson,PUT JSON 手动置 content-type
  return policyId
    ? defHttp.put(
        { url: `${POLICY_API}/policies/${policyId}`, data: payload, headers: { 'content-type': 'application/json' } },
        RAW,
      )
    : defHttp.postJson({ url: `${POLICY_API}/policies`, data: payload }, RAW);
}

/** 提交入库(解析文件进入知识库) */
export function policySubmit(policyId: string): Promise<Recordable> {
  return defHttp.postJson({ url: `${POLICY_API}/policies/${policyId}/submit`, data: {} }, RAW);
}

/** 废止政策 */
export function policyAbolish(policyId: string, abolishDate: string): Promise<Recordable> {
  return defHttp.postJson(
    { url: `${POLICY_API}/policies/${policyId}/abolish`, data: { abolish_date: abolishDate } },
    RAW,
  );
}

/** 删除政策 */
export function policyDelete(policyId: string): Promise<Recordable> {
  return defHttp.delete({ url: `${POLICY_API}/policies/${policyId}` }, RAW);
}

/** 上传文件(MinIO,返回 file_id/file_url) */
export async function uploadPolicyFile(file: File): Promise<{ fileId: string; fileUrl: string }> {
  const res = await defHttp.uploadFile({ url: `${POLICY_API}/files` }, { file });
  const data = (res as Recordable)?.data || {};
  return { fileId: data.file_id, fileUrl: data.file_url };
}

/** 文件内容地址(浏览器经 /policy_api 代理访问;inline=true 为预览) */
export function policyFileUrl(fileId: string, inline = false): string {
  return `${POLICY_API}/files/${fileId}/content${inline ? '?inline=true' : ''}`;
}

/** 片段检索(语义/关键字共用,对齐原型 /search/snippets) */
export async function searchSnippets(payload: {
  query: string;
  mode: 'semantic' | 'keyword';
  topK?: number;
  policyLevel?: string;
  policyType?: string;
  businessArea?: string;
  areaTag?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: 'relevance' | 'date';
}): Promise<{ total: number; items: SnippetHit[] }> {
  const data = await defHttp.postJson<Recordable>(
    {
      url: `${POLICY_API}/search/snippets`,
      data: {
        query: payload.query,
        mode: payload.mode,
        top_k: payload.topK,
        group_by_document: true,
        policy_only: true,
        policy_level: payload.policyLevel || null,
        policy_type: payload.policyType || null,
        business_area: payload.businessArea || null,
        area_tag: payload.areaTag || null,
        date_from: payload.dateFrom || null,
        date_to: payload.dateTo || null,
        sort: payload.sort || 'relevance',
      },
    },
    RAW,
  );
  const items: SnippetHit[] = (data?.items || []).map((item: Recordable) => {
    const score = item.score == null ? undefined : Number(item.score) <= 1 ? Number(item.score) * 100 : Number(item.score);
    return {
      chunkId: item.chunk_id,
      snippet: item.snippet,
      score,
      policy: { ...mapPolicy(item.document || {}), snippet: item.snippet, matchScore: score },
    };
  });
  return { total: data?.total || 0, items };
}
