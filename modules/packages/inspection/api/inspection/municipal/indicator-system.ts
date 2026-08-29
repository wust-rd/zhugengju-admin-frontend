/**
 * 市住更局 —— 体检指标体系管理（列表页数据模型与接口）
 *
 * 说明：
 *  - 后端响应统一为 JeeSite 格式：`{ result: 'true'|'false'|'login', message, sessionid }`，
 *    `defHttp` 已自动处理 `result === 'login'`（跳登录）与 `result === 'false'`（错误提示）。
 *  - 列表接口返回 `{ list: T[], count: number, pageNo, pageSize }`，与
 *    `packages/core/settings/componentSetting.ts` 的 fetchSetting（list / count / pageNo / pageSize）对齐。
 *  - 页面约定见 `docs/`：统一 `defHttp` + `adminPath`，adminPath 来自 `useGlobSetting()`（此处为 `/a`）。
 */
import type { Result } from '@jeesite/types/axios';
import { defHttp } from '@jeesite/core/utils/http/axios';
import { useGlobSetting } from '@jeesite/core/hooks/setting';

const { adminPath } = useGlobSetting();

/** 提交状态：0 待提交，1 已提交 */
export const SUBMIT_STATUS = {
  PENDING: '0',
  SUBMITTED: '1',
} as const;

/** 启用状态：0 停用，1 启用 */
export const ENABLED_STATUS = {
  DISABLED: '0',
  ENABLED: '1',
} as const;

/** 体检指标体系 实体 */
export interface IndicatorSystem {
  // 业务字段
  code?: string; // 序号（业务编码，如 202601）
  year?: string; // 体检年份（如 2026 / 2026-12-10 所属年度）
  indicatorName?: string; // 指标体系名称
  indicatorCount?: number; // 指标数量（项）
  reportUnit?: string; // 填报单位
  reportDate?: string; // 填报时间（yyyy-MM-dd）
  enabled?: string; // 启用状态（0 停用，1 启用）
  submitStatus?: string; // 提交状态（0 待提交，1 已提交）
  // JeeSite 通用字段
  id?: string;
  status?: string; // 状态（正常/停用）
  remarks?: string;
  createBy?: string;
  createDate?: string;
  updateBy?: string;
  updateDate?: string;
}

/** 列表实体（用于接口返回） */
export interface IndicatorSystemData extends IndicatorSystem {
  rowNum?: number; // 序号（前端计算行号用）
}

/** JeeSite 分页返回结构（与 componentSetting 的 fetchSetting 对齐） */
export interface IndicatorSystemPage extends Result {
  list?: IndicatorSystemData[];
  count?: number;
  total?: number;
  pageNo?: number;
  pageSize?: number;
}

/** 列表查询参数 */
export interface IndicatorSystemQuery {
  pageNo?: number;
  pageSize?: number;
  year?: string; // 体检年份
  indicatorName?: string; // 指标体系名称
}

/** 列表接口：POST，返回 `{ result, message, list, count }` */
export const indicatorSystemListData = (params?: IndicatorSystemQuery) =>
  defHttp.post<IndicatorSystemPage>(
    { url: adminPath + '/inspection/municipal/indicatorSystem/listData', params },
    { errorMessageMode: 'none' },
  );

/** 表单详情接口：GET */
export const indicatorSystemForm = (params?: { code?: string }) =>
  defHttp.get<IndicatorSystem & Result>(
    { url: adminPath + '/inspection/municipal/indicatorSystem/form', params },
    { errorMessageMode: 'none' },
  );

/** 保存接口：POST JSON */
export const indicatorSystemSave = (data?: IndicatorSystem) =>
  defHttp.postJson<IndicatorSystem & Result>(
    { url: adminPath + '/inspection/municipal/indicatorSystem/save', data },
    { errorMessageMode: 'message' },
  );

/** 删除接口：GET（单个） */
export const indicatorSystemDelete = (params?: { code?: string }) =>
  defHttp.get<IndicatorSystem & Result>(
    { url: adminPath + '/inspection/municipal/indicatorSystem/delete', params },
    { errorMessageMode: 'message' },
  );

/** 批量删除接口：GET，codes 为逗号分隔的编码串 */
export const indicatorSystemDeleteAll = (params?: { codes?: string }) =>
  defHttp.get<IndicatorSystem & Result>(
    { url: adminPath + '/inspection/municipal/indicatorSystem/deleteAll', params },
    { errorMessageMode: 'message' },
  );

/** 启用 */
export const indicatorSystemEnable = (params?: { code?: string }) =>
  defHttp.get<IndicatorSystem & Result>(
    { url: adminPath + '/inspection/municipal/indicatorSystem/enable', params },
    { errorMessageMode: 'message' },
  );

/** 停用 */
export const indicatorSystemDisable = (params?: { code?: string }) =>
  defHttp.get<IndicatorSystem & Result>(
    { url: adminPath + '/inspection/municipal/indicatorSystem/disable', params },
    { errorMessageMode: 'message' },
  );

/** 提交 */
export const indicatorSystemSubmit = (params?: { code?: string }) =>
  defHttp.get<IndicatorSystem & Result>(
    { url: adminPath + '/inspection/municipal/indicatorSystem/submit', params },
    { errorMessageMode: 'message' },
  );
