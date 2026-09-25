/**
 * ifco —— 年度项目安排 · 任务分解与派发：接口层。
 *
 * 对接后端 /a/ifco/annual/task（modules/ifco annual 包，接口文档-年度项目安排.md）。
 * 值口径与后端一致：日期 YYYY-MM-DD 字符串；任务状态按市级编制结束时间推导
 * （进行中/已结束）；各区目标 districtTargets={区名:目标值}；任务年份全局唯一。
 */
import { defHttp } from '@jeesite/core/utils/http/axios';
import { useGlobSetting } from '@jeesite/core/hooks/setting';
import { match } from 'ts-pattern';
import { unwrap } from '../progress-fill';
import { DISTRICTS } from '../project-library';

const { adminPath } = useGlobSetting();
const BASE = adminPath + '/ifco/annual/task';

/** 区级目标分解对象：各区年度刚性投资目标字段（与项目库的行政区清单同源） */
export { DISTRICTS };

/** 任务状态：今天 ≤ 市级编制结束时间=进行中，超过=已结束（编制页展示为已归档） */
export type TaskStatus = '进行中' | '已结束';

/** 操作列可用操作 */
export type TaskAction = '查看' | '编辑';

/** 年度任务（市局下发年度刚性投资目标并分解到各区） */
export type TaskDispatchItem = {
  id: string;
  /** 任务年份（全局唯一） */
  taskYear: number;
  /** 年度刚性投资目标（亿元） */
  annualRigidTarget: number;
  /** 创建时间（YYYY-MM-DD） */
  createTime: string;
  /** 编制开始时间（YYYY-MM-DD） */
  compileStartDate: string;
  /** 市级编制结束时间（YYYY-MM-DD，状态推导基准） */
  cityCompileEndDate: string;
  /** 区级编制结束时间（YYYY-MM-DD，须早于市级） */
  districtCompileEndDate: string;
  /** 提交状态（未提交/已提交；已提交后任务与采纳内容锁定不可改） */
  submitStatus: string;
  /** 提交日期（YYYY-MM-DD） */
  submitDate: string;
  /** 年度刚性目标说明 */
  rigidTargetRemark: string;
  /** 各区年度刚性投资目标（亿元）：区名 → 目标值 */
  districtTargets: Record<string, number>;
  /** 已采纳年度投资合计（亿元；计划编制页消费） */
  totalInvest?: number;
  /** 任务状态 */
  status: TaskStatus;
};

/** 任务状态 → Tag 展示属性（进行中=蓝描边、已结束=灰） */
export function statusTagProps(status: TaskStatus): { color: string; variant: 'solid' | 'outlined' } {
  return match(status)
    .with('进行中', () => ({ color: 'blue', variant: 'outlined' }) as const)
    .with('已结束', () => ({ color: 'default', variant: 'outlined' }) as const)
    .exhaustive();
}

/** 各状态可用操作：已结束任务仅可查看 */
export const ACTIONS_BY_STATUS: Record<TaskStatus, TaskAction[]> = {
  进行中: ['查看', '编辑'],
  已结束: ['查看'],
};

/** 任务年份选项：当前年份 ～ 后三年，升序 */
export function taskYearOptions(): { label: string; value: number }[] {
  const currentYear = new Date().getFullYear();
  return [0, 1, 2, 3].map((offset) => {
    const year = currentYear + offset;
    return { label: String(year), value: year };
  });
}

// ── 接口函数 ───────────────────────────────────────────────────────

/** 任务清单（task_year 倒序；含区级目标/已采纳合计/推导状态） */
export function fetchAnnualTasks() {
  return unwrap<TaskDispatchItem[]>(defHttp.get({ url: BASE + '/list' }));
}

/** 保存任务（新建/更新合一；撞年返回 400；区级目标随任务整替） */
export function saveAnnualTask(data: Partial<TaskDispatchItem>) {
  return unwrap<{ id: string; taskYear: number; status: TaskStatus }>(defHttp.postJson({ url: BASE + '/save', data }));
}

/** 提交年度计划（提交后任务与采纳内容锁定不可改） */
export function submitAnnualTask(id: string) {
  return unwrap<TaskDispatchItem>(defHttp.post({ url: BASE + '/submit', params: { id } }));
}
