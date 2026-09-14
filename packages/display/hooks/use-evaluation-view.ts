import type { InjectionKey } from 'vue';
import { ref } from 'vue';

/**
 * 成果评估模块（/display/evaluation）的页面（由侧边栏第 3/4 个图标切换，页内切换不换路由）
 *
 * - `own`：成果评估自己的内容（左侧地图 + 右侧 Tab 抽屉），进入本模块的默认页面
 * - `overview`：原「项目实施」第三个页面 —— 征收管理总览（左右两张底图拼接 + 红色热点切详情大图）
 * - `nameProtect`：原「项目实施」第四个页面 —— 只展示一张「名称保护」图
 */
export type EvaluationView = 'own' | 'overview' | 'nameProtect';

/** 首页（默认页）：进入成果评估默认落在的页面 */
export const HOME_EVALUATION_VIEW: EvaluationView = 'own';

/**
 * Hook：成果评估模块的页面状态
 *
 * 侧边栏图标点击 → 页内切换页面，不换路由。先写 Hook，再由 layouts/index.tsx 受控
 * 初始化并 provide，Sidebar（写入）与成果评估页（读取）共享同一个实例。
 */
export function useEvaluationView() {
  const evaluationView = ref<EvaluationView>(HOME_EVALUATION_VIEW);
  /** 总览页面内是否已展开详情大图（红色热点切换） */
  const detailVisible = ref(false);

  /** 切换到某个页面；换页时收起总览内的详情大图，保证每次进入某页都是它自己的初始样子 */
  const setEvaluationView = (view: EvaluationView) => {
    evaluationView.value = view;
    detailVisible.value = false;
  };

  /** 回到默认页（成果评估自己的内容） */
  const resetEvaluationView = () => setEvaluationView(HOME_EVALUATION_VIEW);

  return { evaluationView, detailVisible, setEvaluationView, resetEvaluationView };
}

/** InjectionKey 直接取 Hook 返回类型，类型零维护 */
export const EvaluationViewKey: InjectionKey<ReturnType<typeof useEvaluationView>> = Symbol('EvaluationView');
