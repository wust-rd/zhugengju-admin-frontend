import type { InjectionKey } from 'vue';
import { ref } from 'vue';

/**
 * 项目实施页（/display/project）的视图模式
 *
 * - `overview`：总览底图（左右两张拼接 + 红色热点切详情大图）
 * - `nameProtect`：整页只有一张「名称保护」图
 */
export type ProjectView = 'overview' | 'nameProtect';

/**
 * Hook：项目实施页的视图状态
 *
 * 侧边栏图标点击 → 页内切换视图，不换路由。先写 Hook，再由 layouts/index.tsx 受控
 * 初始化并 provide，Sidebar（写入）与项目实施页（读取）共享同一个实例。
 *
 * 页面初始状态 = 总览底图 + 详情大图未展开（resetProjectView 即回到这里）。
 */
export function useProjectView() {
  const projectView = ref<ProjectView>('overview');
  /** 总览视图内是否已展开详情大图（红色热点切换） */
  const detailVisible = ref(false);

  const setProjectView = (view: ProjectView) => {
    projectView.value = view;
  };

  /** 回到项目实施页的初始状态：总览底图 + 详情大图未展开 */
  const resetProjectView = () => {
    projectView.value = 'overview';
    detailVisible.value = false;
  };

  return { projectView, detailVisible, setProjectView, resetProjectView };
}

/** InjectionKey 直接取 Hook 返回类型，类型零维护 */
export const ProjectViewKey: InjectionKey<ReturnType<typeof useProjectView>> = Symbol('ProjectView');
