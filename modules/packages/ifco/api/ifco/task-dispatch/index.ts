/**
 * ifco —— 年度项目安排 · 任务分解与派发：数据类型与本地数据层。
 *
 * 后端尚未介入：列表与筛选用内存数据（前 2 行照设计稿抄录），保存/启用开关
 * 直接写回内存列表，刷新即恢复；后端接入后替换为 defHttp 接口（列表分页返回
 * { list, count } 对齐 BasicTable fetchSetting）。
 */
import { dateUtil } from '@jeesite/core/utils/dateUtil';
import { match } from 'ts-pattern';
import { DISTRICTS } from '../project-library';

/** 区级目标分解对象：各区年度刚性投资目标字段（与项目库的行政区清单同源） */
export { DISTRICTS };

/** 任务状态：任务下发后进入进行中，编制期结束后归档为已结束 */
export type TaskStatus = '进行中' | '已结束';

/** 操作列可用操作 */
export type TaskAction = '查看' | '编辑';

/** 年度任务（市局下发年度刚性投资目标并分解到各区） */
export type TaskDispatchItem = {
  id: string;
  /** 任务年份 */
  taskYear: number;
  /** 年度刚性投资目标（亿元） */
  annualRigidTarget: number;
  /** 创建时间（YYYY-MM-DD） */
  createTime: string;
  /** 编制开始时间（YYYY-MM-DD） */
  compileStartDate: string;
  /** 市级编制结束时间（YYYY-MM-DD，列表「编制结束时间」列展示） */
  cityCompileEndDate: string;
  /** 区级编制结束时间（YYYY-MM-DD） */
  districtCompileEndDate: string;
  /** 年度刚性目标说明 */
  rigidTargetRemark: string;
  /** 各区年度刚性投资目标（亿元）：区名 → 目标值 */
  districtTargets: Record<string, number>;
  /** 启用状态（列表开关） */
  enabled: boolean;
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

/** 任务年份选项：下一年（新增任务的常规年份）～ 前两年，降序 */
export function taskYearOptions(): { label: string; value: number }[] {
  const currentYear = dateUtil().year();
  return [1, 0, -1, -2].map((offset) => {
    const year = currentYear + offset;
    return { label: String(year), value: year };
  });
}

/** 新任务 id（本地演示用） */
export function newTaskId(): string {
  return `task-${dateUtil().format('YYYYMMDDHHmmssSSS')}`;
}

/** 内存列表（照设计稿抄录 2 行，各区目标合计与市级目标一致） */
const TASK_LIST: TaskDispatchItem[] = [
  {
    id: 'task-2027',
    taskYear: 2027,
    annualRigidTarget: 3000,
    createTime: '2026-07-13',
    compileStartDate: '2026-07-18',
    cityCompileEndDate: '2026-10-01',
    districtCompileEndDate: '2026-11-01',
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
    enabled: true,
    status: '进行中',
  },
  {
    id: 'task-2026',
    taskYear: 2026,
    annualRigidTarget: 2500,
    createTime: '2025-07-13',
    compileStartDate: '2025-07-18',
    cityCompileEndDate: '2025-10-01',
    districtCompileEndDate: '2025-11-01',
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
    enabled: false,
    status: '已结束',
  },
];

/** 按搜索条件过滤（本地演示：任务年份） */
export function filterTasks(params: Recordable): TaskDispatchItem[] {
  const { taskYear } = params;
  return TASK_LIST.filter((task) => taskYear == null || taskYear === '' || String(task.taskYear) === String(taskYear));
}

/** 新增/编辑写回内存列表（本地演示，刷新即恢复） */
export function saveTask(data: TaskDispatchItem): void {
  const index = TASK_LIST.findIndex((task) => task.id === data.id);
  if (index >= 0) TASK_LIST.splice(index, 1, data);
  else TASK_LIST.unshift(data);
}
