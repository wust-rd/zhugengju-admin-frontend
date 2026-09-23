import type { InjectionKey } from 'vue';
import { ref } from 'vue';
import type { DrawerTabLabel } from './right-drawer';
import type { FeatureCard } from './right-drawer/feature-plan';
import type { ExamTab } from './right-drawer/physical-exam';
import type { RegulatoryTab } from './right-drawer/regulatory-change';
import type { DesignCard } from './right-drawer/urban-design';
import { FACTORY_BEFORE } from './right-drawer/shared';

/**
 * 「更新后评估」左侧大图的视图描述：
 * - single：单图（src 为图片地址）
 * - compare：改造前后对比（两张图并排，页面左侧分栏渲染）
 */
export type EvalImgView = { mode: 'single'; src: string } | { mode: 'compare'; before: string; after: string };

/**
 * Hook：片区详情页（/display/scheme/area-detail）的 Tab 状态
 *
 * 为什么需要它：左侧大图要跟着右侧抽屉的当前 Tab 变，但 Tab 状态本来就藏在抽屉内部，
 * 而且是被「点击 Tab」和「内容区滚动 scrollspy」双向驱动的，页面自己拿不到。
 * 所以把状态提到一份共享实例上：页面 provide 并据此换左侧大图，
 * RightDrawer（一级 Tab）、PhysicalExam（体检情况的二级 Tab）、
 * RegulatoryChange（规划调整的图纸按钮）、FeaturePlan（功能策划的卡片）、
 * UrbanDesign（城市设计的卡片）inject 后读写同一份状态。
 *
 * 与 packages/display/hooks/use-evaluation-view.ts 同一套模式
 * （Sidebar 写入 / 成果评估页读取，靠 InjectionKey + 同一个实例联动）。
 *
 * 注意：Tab 的字面量清单仍由各自组件持有（right-drawer 的 DRAWER_TABS、
 * physical-exam 的 EXAM_TABS、regulatory-change 的 CHANGE_TABS、
 * feature-plan 的 FEATURE_CARDS、urban-design 的 DESIGN_CARDS），
 * 这里只引用它们的类型，避免多处各写一份字符串。
 */
export function useAreaDetailView() {
  /** 一级 Tab：右侧抽屉的 Tab，默认「基本情况」 */
  const primaryTab = ref<DrawerTabLabel>('基本情况');
  /** 「体检情况」内的 3 个清单 Tab，默认「问题清单」 */
  const examTab = ref<ExamTab>('问题清单');
  /** 「规划调整」内的 3 个图纸，默认「调整前图纸」（即默认显示第一张图） */
  const regulatoryTab = ref<RegulatoryTab>('调整前图纸');
  /** 「功能策划」内被点中的卡片，默认「总体目标」（即默认显示第一张图） */
  const featureCard = ref<FeatureCard>('总体目标');
  /** 「城市设计」内被点中的卡片，默认「产业发展」（即默认显示第一张图） */
  const designCard = ref<DesignCard>('产业发展');
  /** 「更新后评估」左侧大图视图（单图 / 前后对比），默认两厂改造项目的「改造前」单图
      （与 post-evaluation 块1 按钮的默认选中态一致） */
  const evalImgView = ref<EvalImgView>({ mode: 'single', src: FACTORY_BEFORE });

  return { primaryTab, examTab, regulatoryTab, featureCard, designCard, evalImgView };
}

/** InjectionKey 直接取 Hook 返回类型，类型零维护 */
export const AreaDetailViewKey: InjectionKey<ReturnType<typeof useAreaDetailView>> = Symbol('AreaDetailView');
