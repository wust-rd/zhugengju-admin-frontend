import { computed, defineComponent, provide } from 'vue';
import { useRoute } from 'vue-router';
import { isDrawerTab, RightDrawer, type DrawerTabLabel } from './right-drawer';
import type { FeatureCard } from './right-drawer/feature-plan';
import type { ExamTab } from './right-drawer/physical-exam';
import type { RegulatoryTab } from './right-drawer/regulatory-change';
import type { DesignCard } from './right-drawer/urban-design';
import { EVALUATION_IMAGES } from './right-drawer/shared';
import { AreaDetailViewKey, useAreaDetailView } from './use-area-detail-view';

/** 皮子街片区素材 OSS 基础地址（原始链接为 percent-encoding，这里已解码） */
const AREA_OSS = 'https://epile-dev.oss-cn-wulanchabu.aliyuncs.com/guihuaju/片区策划-皮子街';

/**
 * 一级 Tab → 左侧大图（只列「一张 Tab 对一张图」的那些）
 *
 * 另五个 Tab 的图由各自的二级选择决定，不在这张表里：
 * 「体检情况」看 EXAM_IMG、「规划调整」看 REG_IMG、「功能策划」看 FEATURE_IMG、
 * 「城市设计」看 DESIGN_IMG、「更新后评估」看 shared 的 EVALUATION_IMAGES。
 * 用 Exclude 把它们排除后，以后再加一个普通 Tab 却忘了配图，这里会直接编译报错。
 */
type PlainTab = Exclude<DrawerTabLabel, '体检情况' | '规划调整' | '功能策划' | '城市设计' | '更新后评估'>;

const TAB_IMG: Record<PlainTab, string> = {
  基本情况: `${AREA_OSS}/基本情况-大图.webp`,
  项目情况: `${AREA_OSS}/项目情况.webp`,
  // 「资金方案」tab 已从抽屉隐藏（DRAWER_TABS 里注释掉了）；恢复该 tab 时取消下面这行注释（老桶地址）
  // 资金方案: 'https://zhugengju-public.oss-cn-wuhan-lr.aliyuncs.com/片区策划/片区资金情况.webp',
};

/** 二级 Tab（「体检情况」内的三个清单）→ 左侧大图（皮子街素材） */
const EXAM_IMG: Record<ExamTab, string> = {
  问题清单: `${AREA_OSS}/体检情况-问题清单-大图.webp`,
  资源清单: `${AREA_OSS}/体检情况-资源清单-大图.webp`,
  需求清单: `${AREA_OSS}/体检情况-需求清单-大图.webp`,
};

/** 「规划调整」三个图纸 → 左侧大图（皮子街素材，均已验证可访问） */
const REG_IMG: Record<RegulatoryTab, string> = {
  调整前图纸: `${AREA_OSS}/规划调整-调整前.webp`,
  调整后图纸: `${AREA_OSS}/规划调整-调整后.webp`,
  调整前后对比: `${AREA_OSS}/规划调整-前后对比.webp`,
};

/** 「功能策划」两张卡片 → 左侧大图（皮子街素材，点击卡片切换；默认「总体目标」那张） */
const FEATURE_IMG: Record<FeatureCard, string> = {
  总体目标: `${AREA_OSS}/功能策划-总体目标.webp`,
  主导功能定位: `${AREA_OSS}/功能策划-主导功能定位.webp`,
};

/** 「城市设计」两张卡片 → 左侧大图（皮子街素材，点击卡片切换；默认「产业发展」那张） */
const DESIGN_IMG: Record<DesignCard, string> = {
  产业发展: `${AREA_OSS}/城市设计-产业发展.webp`,
  历史文化保护: `${AREA_OSS}/城市设计-历史文化保护.webp`,
};

/**
 * 片区详情页：左右布局 —— 左侧大图 + 右侧真实抽屉组件
 *
 * 入口：地图上点片区面 → 右上角「片区概况」卡片 → 「查看详情」按钮（/display/scheme/area-detail）。
 * 也支持带 query 直接定位某个 Tab：/display/scheme/area-detail?tab=项目情况
 * （项目实施页左上角的「皮子街片」按钮就是跳回本页并指定「项目情况」）。
 * 右侧复用真实抽屉组件 RightDrawer（7 个 Tab + 点击/滚动联动的数据面板），
 * 与另一条链路的图片版详情页（/display/scheme/detail，detail.tsx）互不影响。
 *
 * 左右联动：本页 provide 一份共享 Tab 状态（use-area-detail-view），
 * RightDrawer 写一级 Tab、PhysicalExam 写体检情况的二级 Tab、RegulatoryChange 写规划调整的图纸，
 * 本页读同一份状态决定左侧显示哪张图。图片映射表只放在本页（交互归抽屉、展示归页面）。
 *
 * 说明：页面本身是 RouterView 的内容，外层 display 布局已是 flex 行，所以这里直接返回
 * 「左 flex-1 + 右固定宽」两个兄弟节点即可，不需要再包一层 flex 容器。
 */
export default defineComponent({
  name: 'DisplaySchemeAreaDetail',
  setup() {
    // 共享 Tab 状态：provide 给抽屉内的组件，本页读它换图
    const view = useAreaDetailView();

    // 支持 ?tab=项目情况 这样的入参，进页面就直接停在指定 Tab
    // （项目实施页左上角「皮子街片」按钮就是这么跳回来的；参数非法则忽略，用默认「基本情况」）
    const { tab } = useRoute().query;
    if (isDrawerTab(tab)) view.primaryTab.value = tab;

    provide(AreaDetailViewKey, view);

    /** 当前该显示的左侧大图：两个「多图」Tab 各按自己的二级选择取图，其余走 TAB_IMG 静态映射 */
    const currentImg = computed(() => {
      const tab = view.primaryTab.value;
      if (tab === '体检情况') return EXAM_IMG[view.examTab.value];
      if (tab === '规划调整') return REG_IMG[view.regulatoryTab.value];
      if (tab === '功能策划') return FEATURE_IMG[view.featureCard.value];
      if (tab === '城市设计') return DESIGN_IMG[view.designCard.value];
      if (tab === '更新后评估') return EVALUATION_IMAGES[view.evalImgIndex.value];
      return TAB_IMG[tab]; // 此处 tab 已被收窄为 PlainTab
    });

    return () => (
      <>
        {/* 左侧大图：跟随右侧抽屉当前 Tab 切换（object-contain 完整显示，留白与布局深色底一致） */}
        <div class="relative h-full min-w-0 flex-1 overflow-hidden">
          <img src={currentImg.value} alt={view.primaryTab.value} class="size-full object-contain" />
        </div>

        {/* 右侧：真实抽屉组件。RightDrawer 自身是 absolute right-0 top-0 + w-420px，
            用等尺寸的 relative 容器兜住它的尺寸（与片区策划页里的用法一致） */}
        <div class="relative h-full w-420px shrink-0">
          <RightDrawer />
        </div>
      </>
    );
  },
});
