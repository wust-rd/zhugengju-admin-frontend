import { computed, defineComponent, inject, provide } from 'vue';
import { match } from 'ts-pattern';
import { useRoute } from 'vue-router';
import { EvaluationViewKey } from '@jeesite/display/hooks/use-evaluation-view';

import { isDrawerTab, RightDrawer, type DrawerTabLabel } from '../scheme/right-drawer';
import type { DesignCard } from '../scheme/right-drawer/urban-design';
import type { ExamTab } from '../scheme/right-drawer/physical-exam';
import type { FeatureCard } from '../scheme/right-drawer/feature-plan';
import type { RegulatoryTab } from '../scheme/right-drawer/regulatory-change';
import { EVALUATION_IMAGES } from '../scheme/right-drawer/shared';
import { AreaDetailViewKey, useAreaDetailView } from '../scheme/use-area-detail-view';

/** 皮子街片区素材 OSS 基础地址（与片区详情页 views/scheme/area-detail.tsx 同一套） */
const AREA_OSS = 'https://epile-dev.oss-cn-wulanchabu.aliyuncs.com/guihuaju/片区策划-皮子街';

/**
 * 一级 Tab → 左侧大图（从 area-detail.tsx 直接复制过来的一套映射）
 *
 * 只列「一张 Tab 对一张图」的；另外五个 Tab 的图由各自的二级选择决定：
 * 「体检情况」看 EXAM_IMG、「规划变更」看 REG_IMG、「功能策划」看 FEATURE_IMG、
 * 「城市设计」看 DESIGN_IMG、「实施后评估」看 shared 的 EVALUATION_IMAGES。
 */
type PlainTab = Exclude<DrawerTabLabel, '体检情况' | '规划变更' | '功能策划' | '城市设计' | '实施后评估'>;

const TAB_IMG: Record<PlainTab, string> = {
  基本情况: `${AREA_OSS}/基本情况-大图.webp`,
  项目情况: `${AREA_OSS}/项目情况.webp`,
};

/** 二级 Tab（「体检情况」内的三个清单）→ 左侧大图（皮子街素材） */
const EXAM_IMG: Record<ExamTab, string> = {
  问题清单: `${AREA_OSS}/体检情况-问题清单-大图.webp`,
  资源清单: `${AREA_OSS}/体检情况-资源清单-大图.webp`,
  需求清单: `${AREA_OSS}/体检情况-需求清单-大图.webp`,
};

/** 「规划变更」三个图纸 → 左侧大图（皮子街素材） */
const REG_IMG: Record<RegulatoryTab, string> = {
  调整前图纸: `${AREA_OSS}/规划变更-调整前.webp`,
  调整后图纸: `${AREA_OSS}/规划变更-调整后.webp`,
  调整前后对比: `${AREA_OSS}/规划变更-前后对比.webp`,
};

/** 「功能策划」两张卡片 → 左侧大图（皮子街素材） */
const FEATURE_IMG: Record<FeatureCard, string> = {
  总体目标: `${AREA_OSS}/功能策划-总体目标.webp`,
  主导功能定位: `${AREA_OSS}/功能策划-主导功能定位.webp`,
};

/** 「城市设计」两张卡片 → 左侧大图（皮子街素材） */
const DESIGN_IMG: Record<DesignCard, string> = {
  产业发展: `${AREA_OSS}/城市设计-产业发展.webp`,
  历史文化保护: `${AREA_OSS}/城市设计-历史文化保护.webp`,
};

/** 打开本页默认停留的 Tab：成果评估 → 实施后评估 */
const DEFAULT_TAB: DrawerTabLabel = '实施后评估';

/** 搬过来的「总览」页面（原项目实施第三个页面）：左右两张底图拼接 + 红色热点切详情大图 */
const MAP_IMAGE_URL_LEFT = 'https://epile-dev.oss-cn-wulanchabu.aliyuncs.com/guihuaju/征收管理/总览-left.webp';
const MAP_IMAGE_URL_RIGHT = 'https://epile-dev.oss-cn-wulanchabu.aliyuncs.com/guihuaju/征收管理/总览-地图.webp';
/** 点击红色热点后整页展示的图片 */
const DETAIL_IMAGE_URL = 'https://epile-dev.oss-cn-wulanchabu.aliyuncs.com/guihuaju/征收管理/征收管理-总览页面2.webp';

/** 搬过来的「名称保护」页面（原项目实施第四个页面）：整页只有一张图 */
const NAME_PROTECT_IMAGE_URL = 'https://epile-dev.oss-cn-wulanchabu.aliyuncs.com/guihuaju/征收管理/名称保护.webp';

/**
 * 成果评估页（/display/evaluation）
 *
 * 本页「自己的内容」（默认页）就是片区详情页那一套：左侧大图 + 右侧真实抽屉 RightDrawer，
 * 打开即停在「实施后评估」Tab —— 实现是从 views/scheme/area-detail.tsx 直接复制过来的
 * （按需求不抽公共组件），因此两页的 Tab ↔ 图片映射、左右联动方式完全一致。
 *
 * 另外两个页面仍由侧边栏第 3/4 个图标页内切换（不换路由）：
 *   overview = 征收管理总览、nameProtect = 名称保护单图。
 */
export default defineComponent({
  name: 'DisplayResult',
  setup() {
    // 共享 Tab 状态：provide 给抽屉内的组件，本页读它换左侧大图
    const view = useAreaDetailView();
    provide(AreaDetailViewKey, view);

    // 打开本页默认停在「实施后评估」；带 ?tab=xxx 时以参数为准（非法值忽略），
    // 与 /display/scheme/area-detail?tab=xxx 的行为保持一致
    const { tab } = useRoute().query;
    view.primaryTab.value = isDrawerTab(tab) ? tab : DEFAULT_TAB;

    /** 当前该显示的左侧大图：两个「多图」Tab 各按自己的二级选择取图，其余走 TAB_IMG 静态映射 */
    const currentImg = computed(() => {
      const current = view.primaryTab.value;
      if (current === '体检情况') return EXAM_IMG[view.examTab.value];
      if (current === '规划变更') return REG_IMG[view.regulatoryTab.value];
      if (current === '功能策划') return FEATURE_IMG[view.featureCard.value];
      if (current === '城市设计') return DESIGN_IMG[view.designCard.value];
      if (current === '实施后评估') return EVALUATION_IMAGES[view.evalImgIndex.value];
      return TAB_IMG[current]; // 此处 current 已被收窄为 PlainTab
    });

    /**
     * 成果评估模块页面状态（由 layouts/index.tsx provide，Sidebar 第 3/4 个图标写入）
     * - evaluationView：当前页面（own = 本页原有内容、overview = 总览、nameProtect = 名称保护单图）
     * - detailVisible：总览内是否展开详情大图（红色热点切换）
     */
    const { evaluationView, detailVisible, resetEvaluationView } = inject(EvaluationViewKey)!;

    // 默认页：进入本模块一律落在「成果评估自己的内容」。
    // 在 setup 中同步重置（而非 onMounted），避免先渲染一帧上次残留的页面。
    resetEvaluationView();

    /** 成果评估自己的内容（左侧大图 + 右侧真实抽屉，默认停在「实施后评估」）—— 默认页 */
    const renderOwnContent = () => (
      <>
        {/* 左侧大图：跟随右侧抽屉当前 Tab 切换（object-contain 完整显示） */}
        <div class="relative h-full min-w-0 flex-1 overflow-hidden">
          <img src={currentImg.value} alt={view.primaryTab.value} class="size-full object-contain" />
        </div>

        {/* 右侧：真实抽屉组件。RightDrawer 自身是 absolute right-0 top-0 + w-420px，
            用等尺寸的 relative 容器兜住它的尺寸（与片区详情页里的用法一致） */}
        <div class="relative h-full w-420px shrink-0">
          <RightDrawer />
        </div>
      </>
    );

    /** 原项目实施第三个页面 —— 征收管理总览（左右两张底图拼接，红色热点切详情大图） */
    const renderOverview = () => (
      <>
        <div class="flex size-full relative">
          {detailVisible.value ? (
            <img src={DETAIL_IMAGE_URL} alt="项目详情" class="size-full object-fill" />
          ) : (
            <>
              <img src={MAP_IMAGE_URL_LEFT} alt="项目地图" class="w-460px h-full block" />

              <img src={MAP_IMAGE_URL_RIGHT} alt="项目地图" class="flex-1 object-fill" />
            </>
          )}

          {/* 红色热点：点击在「总览 ↔ 详情大图」之间切换 */}
          <div
            class="absolute top-124px right-700px z-10 size-100px cursor-pointer"
            onClick={() => (detailVisible.value = !detailVisible.value)}
          />
        </div>
      </>
    );

    // 侧边栏第 3/4 个图标切换页面（页内切换，不换路由）：
    //   own         = 本页原有内容（默认）
    //   overview    = 原项目实施第三个页面
    //   nameProtect = 原项目实施第四个页面
    //
    // 注意：setup 必须返回「渲染函数」，不能直接返回 VNode，
    // 否则 Vue 会报 setup() should not return VNodes directly 并把页面渲染成空白。
    return () =>
      match(evaluationView.value)
        .with('own', renderOwnContent)
        .with('overview', renderOverview)
        .with('nameProtect', () => <img src={NAME_PROTECT_IMAGE_URL} alt="名称保护" class="size-full object-fill" />)
        .exhaustive();
  },
});
