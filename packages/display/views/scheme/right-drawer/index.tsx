import { defineComponent, onMounted, onUnmounted, ref, watch, type CSSProperties } from 'vue';

import { BasicInfo } from './basic-info';
import { FeaturePlan } from './feature-plan';
import { FundPlan } from './fund-plan';
import { PhysicalExam } from './physical-exam';
import { PostEvaluation } from './post-evaluation';
import { ProjectInfo } from './project-info';

/** 抽屉 Tab 配置 */
const DRAWER_TABS = ['基本情况', '体检情况', '功能策划', '项目情况', '资金方案', '实施后评估'] as const;
type DrawerTabLabel = (typeof DRAWER_TABS)[number];

/** Tab 对应的内容组件 */
const TAB_COMPONENTS = {
  基本情况: BasicInfo,
  体检情况: PhysicalExam,
  功能策划: FeaturePlan,
  项目情况: ProjectInfo,
  资金方案: FundPlan,
  实施后评估: PostEvaluation,
};

/* ---------- 交互参数（可调） ---------- */

/** scrollspy 切换提前量：区块顶距视口顶多少 px 内切换高亮 */
const SPY_OFFSET = 24;

/** 判定「已滚到底部」的容差（px） */
const BOTTOM_TOLERANCE = 2;

/** 点击 Tab 后锁定 scrollspy 的时长（ms），需覆盖浏览器平滑滚动耗时 */
const SCROLL_LOCK_MS = 1200;

/**
 * 右侧抽屉：常显示面板，内容区为 Tab 切换页面
 *
 * - 顶部 Tab 切换器：横向排列，超出宽度可横向滑动（滚动条隐藏）；
 *   激活项为独立的「滑动指示器」，高亮切换时平滑滑动过去
 * - 内容区：6 个 Tab 的内容按顺序排列，点击 Tab 与手动滚动双向联动：
 *   scrollspy 同步高亮 + 程序化滚动锁 + 底部留白（最后一块也能滚到顶）
 */
export const RightDrawer = defineComponent({
  setup() {
    const activeTab = ref<DrawerTabLabel>('基本情况');
    const contentRef = ref<HTMLElement | null>(null);
    const tabBarRef = ref<HTMLElement | null>(null);

    /** 取 Tab 栏中指定 tab 的元素（data-tab 定位） */
    const getTabEl = (tab: DrawerTabLabel) =>
      tabBarRef.value?.querySelector<HTMLElement>(`[data-tab="${tab}"]`) ?? null;

    /** 取内容区中指定 tab 的区块元素（data-tab 定位） */
    const getSectionEl = (tab: DrawerTabLabel) =>
      contentRef.value?.querySelector<HTMLElement>(`[data-tab="${tab}"]`) ?? null;

    /* ---------- 滑动高亮指示器 ---------- */

    // 指示器 left/width 跟随 activeTab，过渡动画由元素 class 的 transition 承担
    const indicatorStyle = ref<CSSProperties>({ left: '0px', width: '0px' });

    const updateIndicator = () => {
      const el = getTabEl(activeTab.value);
      if (!el) return;
      // offsetLeft/offsetWidth 相对 Tab 栏内容包装器（relative）
      indicatorStyle.value = { left: `${el.offsetLeft}px`, width: `${el.offsetWidth}px` };
    };

    // 高亮切换（点击 / scrollspy）后刷新指示器位置
    watch(activeTab, updateIndicator);

    /* ---------- 内容区底部留白 ---------- */

    // 让最后一个卡片能滚到顶部：padding-bottom = 可视高度 - 最后一个卡片高度
    const bottomPadding = ref(0);

    const updateBottomPadding = () => {
      const container = contentRef.value;
      if (!container) return;
      const last = container.lastElementChild as HTMLElement | null;
      if (!last) return;
      bottomPadding.value = Math.max(0, container.clientHeight - last.offsetHeight);
    };

    /** resize / 字体加载后区块尺寸可能变化，重算指示器与留白 */
    const recalcLayout = () => {
      updateBottomPadding();
      updateIndicator();
    };

    onMounted(() => {
      recalcLayout();
      window.addEventListener('resize', recalcLayout);
      // 自定义字体（优设标题黑）异步加载会影响尺寸，加载完成后重算一次
      document.fonts?.ready.then(recalcLayout).catch(() => {});
    });
    onUnmounted(() => window.removeEventListener('resize', recalcLayout));

    /* ---------- scrollspy：滚动同步高亮 ---------- */

    // 程序化平滑滚动期间锁定 scrollspy，避免高亮在中间区块间闪烁
    let lockScrollSync = false;
    let lockTimer: number | undefined;

    /** 内容区滚动 → 同步高亮当前 Tab */
    const syncActiveTab = () => {
      if (lockScrollSync) return; // 程序化滚动期间不覆盖高亮（点击已设目标 tab）
      const container = contentRef.value;
      if (!container) return;
      const { scrollTop, scrollHeight, clientHeight } = container;

      let current: DrawerTabLabel;
      // 滚到底部：直接高亮最后一块（最后一块可能永远到不了顶部）
      if (scrollTop + clientHeight >= scrollHeight - BOTTOM_TOLERANCE) {
        current = DRAWER_TABS[DRAWER_TABS.length - 1];
      } else {
        // 从前往后找顶部越过视口顶（含 SPY_OFFSET 提前量）的最后一块
        current = DRAWER_TABS[0];
        for (const tab of DRAWER_TABS) {
          const el = getSectionEl(tab);
          if (el && el.offsetTop <= scrollTop + SPY_OFFSET) current = tab;
        }
      }

      if (activeTab.value === current) return; // 高亮未变化：不做后续滚动
      activeTab.value = current;
      scrollActiveTabIntoView();
    };

    /** 点击 Tab：平滑滚动到对应内容区块 */
    const scrollToTab = (tab: DrawerTabLabel) => {
      const container = contentRef.value;
      if (!container) return;
      const target = getSectionEl(tab);
      if (!target) return;
      const top = target.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop;
      activeTab.value = tab;
      lockScrollSync = true;
      container.scrollTo({ top, behavior: 'smooth' });
      // 平滑滚动结束后解锁并校准高亮（保险计时，兼容不支持 scrollend 的浏览器）
      window.clearTimeout(lockTimer);
      lockTimer = window.setTimeout(() => {
        lockScrollSync = false;
        syncActiveTab();
      }, SCROLL_LOCK_MS);
    };

    /** 高亮 tab 超出 Tab 栏视口时，水平滚到居中（始终保持可见） */
    const scrollActiveTabIntoView = () => {
      const bar = tabBarRef.value;
      if (!bar) return;
      const el = getTabEl(activeTab.value);
      if (!el) return;
      const barRect = bar.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      // 完全可见就不动，避免无谓滚动
      if (elRect.left >= barRect.left && elRect.right <= barRect.right) return;
      const target = el.offsetLeft - (bar.clientWidth - el.offsetWidth) / 2;
      bar.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
    };

    return () => (
      <div
        class="absolute right-0 top-0 flex h-full w-420px shrink-0 flex-col b-l-1 b-solid b-white/6 bg-[#01213B]"
        // style={{ background: 'linear-gradient(171deg, #0F172A -11.93%, #1A5072 99.26%)' }}
      >
        {/* 顶部 Tab 切换器（超出宽度横向滑动，scrollbar-none 隐藏滚动条） */}
        <div ref={tabBarRef} class="scrollbar-none flex h-44px items-stretch overflow-x-auto bg-[#1a3a5c]">
          {/* 内容包装器：指示器绝对定位在它内部，随 Tab 栏一起横向滚动 */}
          <div class="relative flex h-full items-stretch">
            {/* 滑动高亮指示器：随 activeTab 左右平滑滑动 */}
            <div
              class="absolute top-0 h-full border border-[#5fbfff]/60 bg-gradient-to-r from-[#0ea5e9]/20 to-[#0E83BD] shadow-lg transition-all duration-300 ease-out"
              style={indicatorStyle.value}
            />

            {DRAWER_TABS.map((tab) => (
              <div
                key={tab}
                data-tab={tab}
                class={
                  'relative z-10 flex shrink-0 cursor-pointer items-center justify-center px-12px text-14px whitespace-nowrap transition-colors duration-150 ' +
                  (activeTab.value === tab ? 'font-500 text-white' : 'text-white/60 hover:text-white')
                }
                onClick={() => {
                  activeTab.value = tab;
                  scrollToTab(tab);
                  scrollActiveTabIntoView();
                }}
              >
                {tab}
              </div>
            ))}
          </div>
        </div>

        {/* 内容区：6 个 Tab 的内容按顺序排列，点击 Tab 滚动定位到对应区块 */}
        <div
          ref={contentRef}
          onScroll={syncActiveTab}
          class="scrollbar-gutter-stable relative flex-1 overflow-y-auto"
          style={{ paddingBottom: `${bottomPadding.value}px` }}
        >
          {DRAWER_TABS.map((tab) => {
            const TabContent = TAB_COMPONENTS[tab];
            return (
              <section key={tab} data-tab={tab} class="">
                <TabContent />
              </section>
            );
          })}
        </div>
      </div>
    );
  },
});
