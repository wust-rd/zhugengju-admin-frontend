/**
 * ifco —— 年度计划编制 · 计划编制管理/编制工作台：数据类型与本地数据层。
 *
 * 后端尚未介入：任务清单照设计稿抄录 2 行；工作台项目行复用 project-library
 * 的在库项目（确定性生成 采纳状态/年度投资计划/计划开工时间），采纳操作直接
 * 写回内存，刷新即恢复；后端接入后替换为 defHttp 接口。
 */
import { dateUtil } from '@jeesite/core/utils/dateUtil';
import { match } from 'ts-pattern';
import { DISTRICTS } from '../project-library';
import { taskYearOptions } from '../task-dispatch';

/**
 * 工作台项目源（年度计划编制自身假数据；项目库已接口化，不再派生其内存仓库）。
 * 字段对齐原 project-library 派生行（projectCode/projectName/district/…）。
 */
const WORKBENCH_SOURCE = DISTRICTS.slice(0, 12).map((district, i) => ({
  projectCode: `2026${String(35600 + i)}`,
  projectName: `${district}城市更新项目（${i + 1}期）`,
  district,
  renewalAreaName: '',
  fiveReformType: ['老旧小区改造', '老旧街区改造', '城中村改造'][i % 3] ?? '老旧小区改造',
  investEstimate: Number((0.5 + ((i * 37) % 500) / 100).toFixed(2)),
  fundSourceList: ['地方政府专项债券', '市级及以下预算资金—区级'],
  projectAffiliation: 'district',
  inLibraryDate: `2026-0${(i % 9) + 1}-15`,
  status: '待提交',
}));

/** 区级目标分解对象与任务年份选项（与任务分解派发同源） */
export { DISTRICTS, taskYearOptions };

/** 编制状态：编制期内为进行中，期结束归档 */
export type CompileStatus = '进行中' | '已归档';

/** 工作台项目的采纳状态 */
export type AdoptStatus = '已采纳' | '待采纳' | '不采纳';

/** 操作列可用操作 */
export type CompileAction = '查看' | '进入编制工作台';

/** 年度计划编制任务（列表页一行 = 一个年度任务） */
export type CompilationTask = {
  /** 记录编码（RESTful 路由 {id} 用，如 '2027'） */
  code: string;
  taskYear: number;
  /** 年度刚性投资目标（亿元） */
  annualRigidTarget: number;
  /** 年度投资合计（亿元，工作台采纳项目年度投资计划的合计；本地演示为抄录值） */
  totalInvest: number;
  /** 编制开始时间（YYYY-MM-DD） */
  compileStartDate: string;
  /** 编制结束时间（YYYY-MM-DD） */
  compileEndDate: string;
  /** 区级编制结束时间（YYYY-MM-DD） */
  districtCompileEndDate: string;
  /** 采纳日期（YYYY-MM-DD） */
  adoptDate: string;
  /** 年度刚性目标说明 */
  rigidTargetRemark: string;
  /** 各区年度刚性投资目标（亿元）：区名 → 目标值 */
  districtTargets: Record<string, number>;
  status: CompileStatus;
};

/** 工作台项目行 = 在库项目 + 编制期字段 */
export type WorkbenchProject = {
  projectCode: string;
  projectName: string;
  district: string;
  renewalAreaName: string;
  fiveReformType: string;
  /** 投资估算（亿元） */
  investEstimate: number;
  /** 年度投资计划/本年度计划完成投资（亿元；不采纳项目为空，采纳编辑可填） */
  yearPlanInvest?: number;
  /** 备注（纳入年度计划确认信息，可空） */
  remarks?: string;
  fundSourceList: string[];
  projectAffiliation: string;
  /** 计划开工时间（YYYY-MM-DD） */
  planStartDate: string;
  /** 入库年份（搜索用） */
  inLibraryYear: string;
  /** 当前项目状态（项目库状态原文） */
  status: string;
  adoptStatus: AdoptStatus;
};

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

/** 采纳状态选项（搜索表单用；空值 = 全部） */ export const ADOPT_STATUS_OPTIONS: AdoptStatus[] = [
  '已采纳',
  '待采纳',
  '不采纳',
];

/** 任务清单（照设计稿抄录 2 行；区级目标合计与市级目标一致） */
const TASK_LIST: CompilationTask[] = [
  {
    code: '2027',
    taskYear: 2027,
    annualRigidTarget: 3000,
    totalInvest: 1900,
    compileStartDate: '2026-07-18',
    compileEndDate: '2026-10-01',
    districtCompileEndDate: '2026-11-01',
    adoptDate: '2026-07-15',
    rigidTargetRemark: '本年度市级下发的刚性投资目标是3000亿元，现将目标分解到各区',
    districtTargets: {
      江岸区: 300,
      江汉区: 260,
      硚口区: 180,
      汉阳区: 240,
      武昌区: 300,
      青山区: 200,
      洪山区: 280,
      东西湖区: 220,
      蔡甸区: 150,
      江夏区: 180,
      黄陂区: 190,
      新洲区: 150,
      武汉东湖新技术开发区: 160,
      武汉经济技术开发区: 120,
      东湖生态旅游风景区: 30,
      长江新区: 40,
    },
    status: '进行中',
  },
  {
    code: '2026',
    taskYear: 2026,
    annualRigidTarget: 2500,
    totalInvest: 2505,
    compileStartDate: '2025-07-18',
    compileEndDate: '2025-10-01',
    districtCompileEndDate: '2025-11-01',
    adoptDate: '2025-07-15',
    rigidTargetRemark: '本年度市级下发的刚性投资目标是2500亿元，现将目标分解到各区',
    districtTargets: {
      江岸区: 250,
      江汉区: 215,
      硚口区: 150,
      汉阳区: 200,
      武昌区: 250,
      青山区: 165,
      洪山区: 235,
      东西湖区: 180,
      蔡甸区: 125,
      江夏区: 150,
      黄陂区: 160,
      新洲区: 125,
      武汉东湖新技术开发区: 135,
      武汉经济技术开发区: 100,
      东湖生态旅游风景区: 25,
      长江新区: 35,
    },
    status: '已归档',
  },
];

/** 按搜索条件过滤任务（本地演示：任务年份） */
export function filterTasks(params: Recordable): CompilationTask[] {
  const { taskYear } = params;
  return TASK_LIST.filter((task) => taskYear == null || taskYear === '' || String(task.taskYear) === String(taskYear));
}

/** 按记录编码取任务（工作台 show 页反查） */
export function findTask(code: string): CompilationTask | undefined {
  return TASK_LIST.find((task) => task.code === code);
}

/** 新任务编码（本地演示用） */
export function newTaskCode(): string {
  return dateUtil().format('YYYYMMDDHHmmssSSS');
}

/** 投资目标完成率：年度投资合计 / 刚性目标（保留 1 位小数，如 63.3%） */
export function completionRate(task: CompilationTask): string {
  if (!task.annualRigidTarget) return '-';
  return `${((task.totalInvest / task.annualRigidTarget) * 100).toFixed(1)}%`;
}

/** 距离编制结束天数（今天到编制结束时间，负数 = 已过期；归档任务由调用方显示 -） */
export function daysUntilDeadline(task: CompilationTask): number {
  return dateUtil().diff(dateUtil(task.compileEndDate), 'day');
}

/** 任务保存：新增/编辑写回内存（本地演示，刷新即恢复） */
export function saveTask(data: CompilationTask): void {
  const index = TASK_LIST.findIndex((task) => task.code === data.code);
  if (index >= 0) TASK_LIST.splice(index, 1, data);
  else TASK_LIST.unshift(data);
}

// ── 工作台项目行（复用在库项目，确定性生成编制期字段） ─────────────────
/** 采纳状态：按项目编码尾数取模（60% 已采纳 / 20% 待采纳 / 20% 不采纳） */
function makeAdoptStatus(projectCode: string): AdoptStatus {
  const tail = Number(projectCode.slice(-1));
  return tail % 5 <= 1 ? '已采纳' : tail % 5 === 2 || tail % 5 === 3 ? '待采纳' : '不采纳';
}

/** 年度投资计划：按采纳状态取投资估算的比例（不采纳 = 不纳入计划，为空） */
function makeYearPlanInvest(investEstimate: number, adoptStatus: AdoptStatus): number | undefined {
  if (adoptStatus === '不采纳') return undefined;
  const ratio = adoptStatus === '已采纳' ? 0.35 : 0.3;
  return Math.round(investEstimate * ratio * 100) / 100;
}

/** 工作台行集（任务编码 → 项目行；采纳操作直接改内存行） */
const WORKBENCH_MAP = new Map<string, WorkbenchProject[]>(
  TASK_LIST.map((task) => [
    task.code,
    WORKBENCH_SOURCE.map((project) => {
      const adoptStatus = makeAdoptStatus(project.projectCode);
      return {
        projectCode: project.projectCode,
        projectName: project.projectName,
        district: project.district,
        renewalAreaName: project.renewalAreaName ?? '',
        fiveReformType: project.fiveReformType ?? '',
        investEstimate: project.investEstimate,
        yearPlanInvest: makeYearPlanInvest(project.investEstimate, adoptStatus),
        fundSourceList: project.fundSourceList ?? [],
        projectAffiliation: project.projectAffiliation ?? '',
        planStartDate: dateUtil(task.compileStartDate).add(1, 'day').format('YYYY-MM-DD'),
        inLibraryYear: (project.inLibraryDate ?? '').slice(0, 4),
        status: project.status,
        adoptStatus,
      };
    }),
  ]),
);

/** 工作台筛选条件（与搜索表单字段同构；adoptStatus 空 = 全部） */
export type WorkbenchQuery = {
  adoptStatus?: AdoptStatus | '';
  projectName?: string;
  district?: string;
  fiveReformType?: string;
  inLibraryYear?: string | number;
  status?: string;
  projectAffiliation?: string;
};

/** 工作台行过滤（本地演示：采纳状态 + 六字段搜索） */
export function filterWorkbench(code: string, query: WorkbenchQuery = {}): WorkbenchProject[] {
  const rows = WORKBENCH_MAP.get(code) ?? [];
  const keyword = (query.projectName ?? '').trim();
  const year =
    query.inLibraryYear === undefined || query.inLibraryYear === '' ? undefined : String(query.inLibraryYear);
  return rows.filter(
    (row) =>
      (!query.adoptStatus || row.adoptStatus === query.adoptStatus) &&
      (!keyword || row.projectName.includes(keyword)) &&
      (!query.district || row.district === query.district) &&
      (!query.fiveReformType || row.fiveReformType === query.fiveReformType) &&
      (!query.status || row.status === query.status) &&
      (!query.projectAffiliation || row.projectAffiliation === query.projectAffiliation) &&
      (year === undefined || row.inLibraryYear === year),
  );
}

/** 批量采纳：把勾选/目标项目置为已采纳（本地演示，刷新即恢复） */
export function adoptProjects(code: string, projectCodes: string[]): void {
  const rows = WORKBENCH_MAP.get(code) ?? [];
  for (const row of rows) {
    if (projectCodes.includes(row.projectCode)) {
      row.adoptStatus = '已采纳';
      row.yearPlanInvest = row.yearPlanInvest ?? makeYearPlanInvest(row.investEstimate, '已采纳');
    }
  }
}

/** 单个采纳（纳入年度计划）：置为已采纳并写入本年度计划完成投资/备注 */
export function adoptProject(
  code: string,
  projectCode: string,
  patch: { yearPlanInvest?: number; remarks?: string } = {},
): void {
  const row = (WORKBENCH_MAP.get(code) ?? []).find((item) => item.projectCode === projectCode);
  if (!row) return;
  row.adoptStatus = '已采纳';
  row.yearPlanInvest = patch.yearPlanInvest ?? row.yearPlanInvest ?? makeYearPlanInvest(row.investEstimate, '已采纳');
  if (patch.remarks !== undefined) row.remarks = patch.remarks;
}
