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
import { dateUtil } from '@jeesite/core/utils/dateUtil';

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

/** 体检年份下拉选项（近 5 年，按当前年份动态生成，倒序） */
export const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => {
  const year = String(dateUtil().year() - i);
  return { label: `${year} 年`, value: year };
});

/** 体检指标体系 实体 */
export type IndicatorSystem = {
  // 业务字段
  code?: string; // 序号（业务编码，如 202601）
  year?: string; // 体检年份
  surveyArea?: string; // 体检片区(区级,武汉街道名)
  adminDivision?: string; // 行政区划(区级,武汉行政区名)
  functionPosition?: string[]; // 功能定位(区级,可多选:TOD/COD/HOD/IOD/EOD,展示时拼接)（如 2026 / 2026-12-10 所属年度）
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
};

/** 列表实体（用于接口返回） */
export type IndicatorSystemData = IndicatorSystem & {
  rowNum?: number; // 序号（前端计算行号用）
};

/** JeeSite 分页返回结构（与 componentSetting 的 fetchSetting 对齐） */
export type IndicatorSystemPage = Result & {
  list?: IndicatorSystemData[];
  count?: number;
  total?: number;
  pageNo?: number;
  pageSize?: number;
};

/** 列表查询参数 */
export type IndicatorSystemQuery = {
  pageNo?: number;
  pageSize?: number;
  year?: string; // 体检年份
  indicatorName?: string; // 指标体系名称
};

/** 演示用假数据（列表页 dataSource 与 show 页按 id 反查共用；后端接入后删除） */
export const MOCK_LIST: IndicatorSystem[] = [
  {
    id: '1',
    code: '202601',
    year: '2026',
    surveyArea: '后湖街道',
    adminDivision: '江岸区',
    functionPosition: ['TOD', 'COD'],
    indicatorName: '四好基础指标',
    indicatorCount: 124,
    reportUnit: '市住更局',
    reportDate: '2026-12-10',
    enabled: ENABLED_STATUS.DISABLED,
    submitStatus: SUBMIT_STATUS.PENDING,
  },
  {
    id: '2',
    code: '202602',
    year: '2026',
    surveyArea: '水果湖街道',
    adminDivision: '武昌区',
    functionPosition: ['COD', 'HOD', 'IOD'],
    indicatorName: '五改专项指标',
    indicatorCount: 69,
    reportUnit: '市住更局',
    reportDate: '2026-12-10',
    enabled: ENABLED_STATUS.ENABLED,
    submitStatus: SUBMIT_STATUS.SUBMITTED,
  },
  {
    id: '3',
    code: '202603',
    year: '2026',
    surveyArea: '大智街道',
    adminDivision: '江岸区',
    functionPosition: ['TOD', 'EOD'],
    indicatorName: '城市更新实施评估体检指标',
    indicatorCount: 26,
    reportUnit: '市住更局',
    reportDate: '2026-12-10',
    enabled: ENABLED_STATUS.ENABLED,
    submitStatus: SUBMIT_STATUS.SUBMITTED,
  },
  {
    id: '4',
    code: '202501',
    year: '2025',
    surveyArea: '中南路街道',
    adminDivision: '武昌区',
    functionPosition: ['COD', 'HOD', 'IOD'],
    indicatorName: '城市体检指标体系',
    indicatorCount: 258,
    reportUnit: '市住更局',
    reportDate: '2025-12-10',
    enabled: ENABLED_STATUS.DISABLED,
    submitStatus: SUBMIT_STATUS.SUBMITTED,
  },
  {
    id: '5',
    code: '202401',
    year: '2024',
    surveyArea: '二七街道',
    adminDivision: '江岸区',
    functionPosition: ['TOD', 'COD'],
    indicatorName: '城市体检指标体系',
    indicatorCount: 212,
    reportUnit: '市住更局',
    reportDate: '2024-12-10',
    enabled: ENABLED_STATUS.DISABLED,
    submitStatus: SUBMIT_STATUS.SUBMITTED,
  },
  {
    id: '6',
    code: '202301',
    year: '2023',
    surveyArea: '劳动街道',
    adminDivision: '江岸区',
    functionPosition: ['TOD', 'EOD'],
    indicatorName: '城市体检指标体系',
    indicatorCount: 234,
    reportUnit: '市住更局',
    reportDate: '2023-12-10',
    enabled: ENABLED_STATUS.DISABLED,
    submitStatus: SUBMIT_STATUS.SUBMITTED,
  },
  {
    id: '7',
    code: '202201',
    year: '2022',
    surveyArea: '丹水池街道',
    adminDivision: '江岸区',
    functionPosition: ['TOD', 'COD'],
    indicatorName: '城市体检指标体系',
    indicatorCount: 158,
    reportUnit: '市住更局',
    reportDate: '2022-12-10',
    enabled: ENABLED_STATUS.DISABLED,
    submitStatus: SUBMIT_STATUS.SUBMITTED,
  },
];
