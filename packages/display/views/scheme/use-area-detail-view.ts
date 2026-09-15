import type { InjectionKey } from 'vue';
import { ref } from 'vue';
import type { DrawerTabLabel } from './right-drawer';
import type { ExamTab } from './right-drawer/physical-exam';

/**
 * Hook：片区详情页（/display/scheme/area-detail）的 Tab 状态
 *
 * 为什么需要它：左侧大图要跟着右侧抽屉的当前 Tab 变，但 Tab 状态本来就藏在抽屉内部，
 * 而且是被「点击 Tab」和「内容区滚动 scrollspy」双向驱动的，页面自己拿不到。
 * 所以把状态提到一份共享实例上：页面 provide 并据此换左侧大图，
 * RightDrawer（一级 Tab）与 PhysicalExam（二级 Tab）inject 后读写同一份状态。
 *
 * 与 packages/display/hooks/use-evaluation-view.ts 同一套模式
 * （Sidebar 写入 / 成果评估页读取，靠 InjectionKey + 同一个实例联动）。
 *
 * 注意：Tab 的字面量清单仍由各自组件持有（right-drawer 的 DRAWER_TABS、
 * physical-exam 的 EXAM_TABS），这里只引用它们的类型，避免三处各写一份字符串。
 */
export function useAreaDetailView() {
  /** 一级 Tab：右侧抽屉的 6 个 Tab，默认「基本情况」 */
  const primaryTab = ref<DrawerTabLabel>('基本情况');
  /** 二级 Tab：「体检情况」内的 3 个清单 Tab，默认「问题清单」 */
  const examTab = ref<ExamTab>('问题清单');

  return { primaryTab, examTab };
}

/** InjectionKey 直接取 Hook 返回类型，类型零维护 */
export const AreaDetailViewKey: InjectionKey<ReturnType<typeof useAreaDetailView>> = Symbol('AreaDetailView');
