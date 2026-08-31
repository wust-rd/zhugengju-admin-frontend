/**
 * 市住更局 —— 体检指标体系 数据模型（类型与常量）
 *
 * 说明：
 *  - 当前后端尚未介入，本文件不包含任何接口请求，仅保留页面所需的
 *    类型定义与常量定义，页面为纯 UI 展示。
 *  - 后端就绪后，在本文件中补充接口即可（页面代码无需调整结构）：
 *      import { defHttp } from '@jeesite/core/utils/http/axios';
 *      import { useGlobSetting } from '@jeesite/core/hooks/setting';
 *      const { adminPath } = useGlobSetting();
 *    接口约定：
 *      - 响应统一为 JeeSite 格式 `{ result: 'true'|'false'|'login', message, sessionid }`，
 *        `defHttp` 已自动处理 `result === 'login'`（跳登录）与 `result === 'false'`（错误提示）；
 *      - 列表接口返回 `{ list: T[], count: number, pageNo, pageSize }`，与
 *        `packages/core/settings/componentSetting.ts` 的 fetchSetting（list / count / pageNo / pageSize）对齐。
 */
import type { Result } from '@jeesite/types/axios';

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
