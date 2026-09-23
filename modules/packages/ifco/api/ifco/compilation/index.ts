/**
 * ifco —— 年度计划编制 · 计划编制管理/编制工作台：接口层。
 *
 * 对接后端 /a/ifco/annual/*（modules/ifco annual 包，接口文档-年度项目安排.md）。
 * 任务与 /a/ifco/annual/task 同源（任务分解与派发共用），本层做展示口径映射：
 * 后端 status=已结束 → 编制页展示 已归档；code=任务 id（RESTful 路由 {id}）。
 * 工作台行=全部在库项目（排除已退出）左连本任务采纳行；视角过滤（区级只看
 * 本区项目）由页面按登录机构做。
 */
import { defHttp } from '@jeesite/core/utils/http/axios';
import { useGlobSetting } from '@jeesite/core/hooks/setting';
import { match } from 'ts-pattern';
import { unwrap } from '../progress-fill';
import { DISTRICTS, fetchAnnualTasks, taskYearOptions, type TaskDispatchItem } from '../task-dispatch';
import { dateUtil } from '@jeesite/core/utils/dateUtil';

const { adminPath } = useGlobSetting();
const TASK_BASE = adminPath + '/ifco/annual/task';
const PLAN_BASE = adminPath + '/ifco/annual/plan';

/** 区级目标分解对象与任务年份选项（与任务分解派发同源） */
export { DISTRICTS, taskYearOptions };

/** 编制状态：编制期内为进行中，期结束归档（后端已结束 → 已归档） */
export type CompileStatus = '进行中' | '已归档';

/** 工作台项目的采纳状态 */
export type AdoptStatus = '已采纳' | '待采纳' | '不采纳';

/** 操作列可用操作 */
export type CompileAction = '查看' | '进入编制工作台';

/** 年度计划编制任务（列表页一行 = 一个年度任务；展示口径） */
export type CompilationTask = {
  /** 记录编码（RESTful 路由 {id} 用，= 后端任务 id） */
  code: string;
  taskYear: number;
  /** 年度刚性投资目标（亿元） */
  annualRigidTarget: number;
  /** 本年度计划完成投资合计（亿元，= 已采纳项目 yearPlanInvest 合计，后端派生） */
  totalInvest: number;
  /** 编制开始时间（YYYY-MM-DD） */
  compileStartDate: string;
  /** 编制结束时间（YYYY-MM-DD，= 市级编制结束时间） */
  compileEndDate: string;
  /** 区级编制结束时间（YYYY-MM-DD） */
  districtCompileEndDate: string;
  /** 采纳日期（YYYY-MM-DD；后端未提供，查看抽屉留空） */
  adoptDate: string;
  /** 年度刚性目标说明 */
  rigidTargetRemark: string;
  /** 各区年度刚性投资目标（亿元）：区名 → 目标值 */
  districtTargets: Record<string, number>;
  status: CompileStatus;
};

/** 工作台项目行 = 在库项目 + 采纳字段（键与后端 /annual/plan/rows 一致） */
export type WorkbenchProject = {
  pUid: string;
  projectCode: string;
  projectName: string;
  district: string;
  renewalAreaName: string;
  fiveReformType: string;
  /** 投资估算（亿元） */
  investEstimate?: number;
  /** 年度投资计划/本年度计划完成投资（亿元；不采纳项目为空，采纳编辑可填） */
  yearPlanInvest?: number;
  /** 备注（纳入年度计划确认信息，可空） */
  remarks?: string;
  fundSourceList: string[];
  projectAffiliation: string;
  /** 计划开工时间（YYYY-MM-DD，主表 start_date） */
  planStartDate: string;
  /** 计划完工时间（YYYY-MM-DD，主表 end_date） */
  planCompletionDate: string;
  /** 本年度计划完成投资（主表 year_invest，项目库步骤③共享字段；区别于采纳的 yearPlanInvest） */
  yearInvest?: number;
  /** 入库年份（搜索用） */
  inLibraryYear: string;
  /** 当前项目状态（项目库状态原文） */
  status: string;
  adoptStatus: AdoptStatus;
};

/** 后端任务行 → 编制页展示口径（已结束→已归档；code=id；合计数值化） */
function toCompileTask(row: TaskDispatchItem): CompilationTask {
  return {
    code: row.id,
    taskYear: row.taskYear,
    annualRigidTarget: Number(row.annualRigidTarget ?? 0),
    totalInvest: Number(row.totalInvest ?? 0),
    compileStartDate: row.compileStartDate ?? '',
    compileEndDate: row.cityCompileEndDate ?? '',
    districtCompileEndDate: row.districtCompileEndDate ?? '',
    adoptDate: '',
    rigidTargetRemark: row.rigidTargetRemark ?? '',
    districtTargets: row.districtTargets ?? {},
    status: row.status === '已结束' ? '已归档' : '进行中',
  };
}

// ── 展示属性/派生 ─────────────────────────────────────────────────

/** 编制状态 → Tag 展示属性（进行中=蓝描边、已归档=灰描边） */
export function compileStatusTagProps(status: CompileStatus): {
  color: string;
  variant: 'solid' | 'outlined';
} {
  return match(status)
    .with('进行中', () => ({ color: 'blue', variant: 'outlined' }) as const)
    .with('已归档', () => ({ color: 'default', variant: 'outlined' }) as const)
    .exhaustive();
}

/** 采纳状态 → Tag 展示属性（已采纳=蓝、待采纳=橙、不采纳=红，均描边） */
export function adoptStatusTagProps(status: AdoptStatus): { color: string; variant: 'solid' | 'outlined' } {
  return match(status)
    .with('已采纳', () => ({ color: 'blue', variant: 'outlined' }) as const)
    .with('待采纳', () => ({ color: 'orange', variant: 'outlined' }) as const)
    .with('不采纳', () => ({ color: 'red', variant: 'outlined' }) as const)
    .exhaustive();
}

/** 各状态可用操作：已归档任务不可进入工作台 */
export const ACTIONS_BY_STATUS: Record<CompileStatus, CompileAction[]> = {
  进行中: ['查看', '进入编制工作台'],
  已归档: ['查看'],
};

/** 各采纳状态可用操作：已采纳仅可查看，待采纳/不采纳可采纳编辑（改判） */
export const ACTIONS_BY_ADOPT: Record<AdoptStatus, string[]> = {
  已采纳: ['查看'],
  待采纳: ['查看', '采纳编辑'],
  不采纳: ['查看', '采纳编辑'],
};

/** 采纳状态搜索选项 */
export const ADOPT_STATUS_OPTIONS = ['已采纳', '待采纳', '不采纳'] as const;

/** 投资目标完成率：本年度计划完成投资合计 / 刚性目标（保留 1 位小数，如 63.3%） */
export function completionRate(task: CompilationTask): string {
  if (!task.annualRigidTarget) return '-';
  return `${((task.totalInvest / task.annualRigidTarget) * 100).toFixed(1)}%`;
}

/** 距离编制结束天数（今天到编制结束时间，负数 = 已过期；归档任务由调用方显示 -） */
export function daysUntilDeadline(task: CompilationTask): number {
  return dateUtil().diff(dateUtil(task.compileEndDate), 'day');
}

/** 工作台筛选条件（与搜索表单字段同构；空值 = 全部；客户端过滤） */
export type WorkbenchQuery = {
  adoptStatus?: AdoptStatus | '';
  projectName?: string;
  district?: string;
  fiveReformType?: string;
  inLibraryYear?: string | number;
  status?: string;
  projectAffiliation?: string;
};

// ── 接口函数 ───────────────────────────────────────────────────────

/** 编制任务清单（= 年度任务清单的编制页展示口径） */
export async function fetchCompileTasks(): Promise<CompilationTask[]> {
  const rows = (await fetchAnnualTasks()) ?? [];
  return rows.map(toCompileTask);
}

/** 单任务（工作台提示条；id=记录编码 code） */
export async function fetchCompileTask(id: string): Promise<CompilationTask> {
  const row = await unwrap<TaskDispatchItem>(defHttp.get({ url: TASK_BASE + '/get', params: { id } }));
  return toCompileTask(row);
}

/** 工作台行集（全部在库项目左连本任务采纳行；无采纳行=待采纳） */
export function fetchWorkbenchRows(taskId: string) {
  return unwrap<WorkbenchProject[]>(defHttp.get({ url: PLAN_BASE + '/rows', params: { taskId } }));
}

/** 工作台行集客户端过滤（搜索表单七字段；空值=全部） */
export function filterWorkbenchRows(rows: WorkbenchProject[], query: WorkbenchQuery = {}): WorkbenchProject[] {
  const { adoptStatus, projectName, district, fiveReformType, inLibraryYear, status, projectAffiliation } = query;
  return rows.filter(
    (row) =>
      (!adoptStatus || row.adoptStatus === adoptStatus) &&
      (!projectName || row.projectName.includes(projectName.trim())) &&
      (!district || row.district === district) &&
      (!fiveReformType || row.fiveReformType === fiveReformType) &&
      (!inLibraryYear || String(inLibraryYear) === '' || row.inLibraryYear === String(inLibraryYear)) &&
      (!status || row.status === status) &&
      (!projectAffiliation || row.projectAffiliation === projectAffiliation),
  );
}

/** 采纳编辑保存（任务×项目一行 upsert；支持已采纳/不采纳改判） */
export function adoptAnnualPlan(data: {
  taskId: string;
  pUid: string;
  adoptStatus: AdoptStatus;
  yearPlanInvest?: number;
  remarks?: string;
}) {
  return unwrap<{ taskId: string; pUid: string; adoptStatus: AdoptStatus }>(
    defHttp.post({ url: PLAN_BASE + '/adopt', data }),
  );
}

/** 一键采纳（勾选项目批量置为已采纳；年度投资=投资估算×35% 演示口径） */
export function adoptAnnualPlanAll(taskId: string, pUids: string[]) {
  return unwrap<{ count: number }>(defHttp.post({ url: PLAN_BASE + '/adoptAll', data: { taskId, pUids } }));
}
