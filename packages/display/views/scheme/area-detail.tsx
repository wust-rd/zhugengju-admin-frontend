import { computed, defineComponent, provide } from 'vue';
import { RightDrawer, type DrawerTabLabel } from './right-drawer';
import type { ExamTab } from './right-drawer/physical-exam';
import { AreaDetailViewKey, useAreaDetailView } from './use-area-detail-view';

/** 历史素材 OSS 基础地址（其余一级 Tab 的大图仍在这里） */
const OSS_BASE = 'https://zhugengju-public.oss-cn-wuhan-lr.aliyuncs.com/片区策划';

/** 皮子街片区素材 OSS 基础地址（原始链接为 percent-encoding，这里已解码） */
const AREA_OSS = 'https://epile-dev.oss-cn-wulanchabu.aliyuncs.com/guihuaju/片区策划-皮子街';

/**
 * 一级 Tab → 左侧大图
 *
 * 「基本情况」用皮子街素材的大图；其余一级 Tab 在皮子街素材里没有 `{tab}-大图.webp`（探测全部 404），
 * 沿用 detail.tsx 那套「知音东苑片-{tab}」图；「资金方案」连那张也没有，用同项目的片区资金情况图。
 */
const TAB_IMG: Record<DrawerTabLabel, string> = {
  基本情况: `${AREA_OSS}/基本情况-大图.webp`,
  // 「体检情况」这一项实际不会被用到：按 currentImg 的逻辑，它改为按二级 Tab 取 EXAM_IMG 的图
  体检情况: `${OSS_BASE}/知音东苑片-体检情况.webp`,
  功能策划: `${OSS_BASE}/知音东苑片-功能策划.webp`,
  项目情况: `${OSS_BASE}/知音东苑片-项目情况.webp`,
  资金方案: `${OSS_BASE}/片区资金情况.webp`,
  实施后评估: `${OSS_BASE}/知音东苑片-实施后评估.webp`,
};

/** 二级 Tab（「体检情况」内的三个清单）→ 左侧大图（皮子街素材） */
const EXAM_IMG: Record<ExamTab, string> = {
  问题清单: `${AREA_OSS}/体检情况-问题清单-大图.webp`,
  资源清单: `${AREA_OSS}/体检情况-资源清单-大图.webp`,
  需求清单: `${AREA_OSS}/体检情况-需求清单-大图.webp`,
};

/**
 * 片区详情页：左右布局 —— 左侧大图 + 右侧真实抽屉组件
 *
 * 入口：地图上点片区面 → 右上角「片区概况」卡片 → 「查看详情」按钮（/display/scheme/area-detail）。
 * 右侧复用真实抽屉组件 RightDrawer（6 个 Tab + 点击/滚动联动的数据面板），
 * 与另一条链路的图片版详情页（/display/scheme/detail，detail.tsx）互不影响。
 *
 * 左右联动：本页 provide 一份共享 Tab 状态（use-area-detail-view），
 * RightDrawer 写一级 Tab、PhysicalExam 写二级 Tab，本页读同一份状态决定左侧显示哪张图。
 * 图片映射表只放在本页（交互归抽屉、展示归页面）。
 *
 * 说明：页面本身是 RouterView 的内容，外层 display 布局已是 flex 行，所以这里直接返回
 * 「左 flex-1 + 右固定宽」两个兄弟节点即可，不需要再包一层 flex 容器。
 */
export default defineComponent({
  name: 'DisplaySchemeAreaDetail',
  setup() {
    // 共享 Tab 状态：provide 给 RightDrawer / PhysicalExam，本页读它换图
    const view = useAreaDetailView();
    provide(AreaDetailViewKey, view);

    /** 当前该显示的左侧大图：一级 Tab 为「体检情况」时，再按二级 Tab 取图 */
    const currentImg = computed(() =>
      view.primaryTab.value === '体检情况' ? EXAM_IMG[view.examTab.value] : TAB_IMG[view.primaryTab.value],
    );

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
