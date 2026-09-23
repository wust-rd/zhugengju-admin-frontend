import { defineComponent, inject, nextTick, onMounted, onUnmounted, ref, watch, type CSSProperties } from 'vue';

import { AreaDetailViewKey, useAreaDetailView } from '../use-area-detail-view';
import { BasicInfo } from './basic-info';
import { FeaturePlan } from './feature-plan';
import { FundPlan } from './fund-plan';
import { PhysicalExam } from './physical-exam';
import { PostEvaluation } from './post-evaluation';
import { ProjectInfo } from './project-info';
import { RegulatoryChange } from './regulatory-change';
import { UrbanDesign } from './urban-design';

/** 抽屉 Tab 配置（导出：外部可用它校验 ?tab= 之类的入参） */
export const DRAWER_TABS = [
  '基本情况',
  '体检情况',
  '功能策划',
  '城市设计',
  '规划调整',
  '项目情况',
  // '资金方案',
  '更新后评估',
] as const;
export type DrawerTabLabel = (typeof DRAWER_TABS)[number];

/** 判断任意值是否为合法的抽屉 Tab 名（用于 URL query 等外部入参校验） */
export const isDrawerTab = (value: unknown): value is DrawerTabLabel =>
  typeof value === 'string' && (DRAWER_TABS as readonly string[]).includes(value);

/** Tab 对应的内容组件 */
const TAB_COMPONENTS = {
  基本情况: BasicInfo,
  体检情况: PhysicalExam,
  功能策划: FeaturePlan,
  城市设计: UrbanDesign,
  规划调整: RegulatoryChange,
  项目情况: ProjectInfo,
  资金方案: FundPlan,
  更新后评估: PostEvaluation,
};

/* ---------- 交互参数（可调） ---------- */

/**
 * scrollspy 判定线：区块顶进入「内容区顶部 SPY_OFFSET px 以内」即高亮。
 *
 * 口径必须和「点击 Tab」一致：点击是把区块顶滚到内容区顶部（对齐 0，见 scrollToTab），
 * 所以手动滚动的切换点也贴住顶部 —— 下一个区块顶一碰到顶边就切，点谁亮谁、滚到谁亮谁。
 * 24px 是「容差」而不是「提前量」：平滑滚动可能因亚像素取整停在区块顶上方零点几像素，
 * 留点余量才不会刚点完又被 scrollspy 判回上一块。
 *
 * 历史：曾用「视口中线」（0.5 × 视口高）来兜「大区块内部浏览时 tab 不亮」，但那等于
 * 让手动滚动比点击早半屏切换，两个方向口径不一致；大区块的问题现在由底部留白
 * （updateBottomPadding：最后一块也能滚到顶）+ 滚到底高亮最后一块兜住。
 */
const SPY_OFFSET = 24;

/** 判定「已滚到底部」的容差（px） */
const BOTTOM_TOLERANCE = 2;

/** 点击 Tab 后锁定 scrollspy 的时长（ms），需覆盖浏览器平滑滚动耗时 */
const SCROLL_LOCK_MS = 1200;

/**
 * 右侧抽屉：常显示面板，内容区为 Tab 切换页面
 *
 * - 顶部 Tab 切换器：横向排列，超出宽度可横向滑动（滚动条隐藏）；
 *   激活项为独立的「滑动指示器」，高亮切换时平滑滑动过去；
 *   切换后选中的 Tab 会被滚到 Tab 栏中间（首尾受边界限制），避免贴边导致相邻 Tab 点不到
 * - 内容区：6 个 Tab 的内容按顺序排列，点击 Tab 与手动滚动双向联动：
 *   点击 = 把目标区块顶滚到内容区顶部；手动滚动 = 区块顶碰到顶部判定线（SPY_OFFSET）就亮，
 *   两个方向同一口径；再加程序化滚动锁（防平滑滚动期间高亮跳动）与底部留白（最后一块也能滚到顶）
 *
 * 一级 Tab 状态优先用页面 provide 的共享实例（area-detail 页据此换左侧大图），
 * 没有 provider 时退化为组件自己的局部状态，保证本组件仍可独立使用。
 */
export const RightDrawer = defineComponent({
  setup() {
    const view = inject(AreaDetailViewKey, null) ?? useAreaDetailView();
    const activeTab = view.primaryTab;
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

    /**
     * 监听最后一个区块的尺寸：它的高度会随内容变（图片/字体、折叠面板开合、雷达图换主题…），
     * 只在 resize / fonts.ready 时算的留白会过期 —— 留白不够，最后一块就永远滚不到顶部，
     * 顶部判定线也就越不过去（只剩「滚到底」兜底）。用 ResizeObserver 跟着重算最省心。
     */
    let lastSectionObserver: ResizeObserver | undefined;

    const observeLastSection = () => {
      lastSectionObserver?.disconnect();
      const last = contentRef.value?.lastElementChild;
      if (!last || typeof ResizeObserver === 'undefined') return;
      lastSectionObserver = new ResizeObserver(updateBottomPadding);
      lastSectionObserver.observe(last);
    };

    onMounted(() => {
      recalcLayout();
      observeLastSection();
      // 初始也把选中的 Tab 居中，避免一进来就贴边
      scrollActiveTabIntoView();
      // 默认 Tab 被外部改成了非第一个（如 /display/scheme/area-detail?tab=项目情况）时，
      // 内容区要一起定位过去，否则会出现「高亮在项目情况、内容还停在基本情况」的错位。
      // 放在 nextTick：底部留白要先写进 DOM，最后一个区块才滚得到顶。
      nextTick(() => {
        if (activeTab.value !== DRAWER_TABS[0]) scrollToTab(activeTab.value, 'auto');
        scrollActiveTabIntoView();
      });
      window.addEventListener('resize', recalcLayout);
      // 自定义字体（优设标题黑）异步加载会影响尺寸，加载完成后重算一次
      document.fonts?.ready
        .then(() => {
          recalcLayout();
          scrollActiveTabIntoView();
        })
        .catch(() => {});
    });
    onUnmounted(() => {
      window.removeEventListener('resize', recalcLayout);
      lastSectionObserver?.disconnect();
    });

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
        // 从前往后找最后一个「区块顶已越过顶部判定线」的区块（见 SPY_OFFSET 注释）
        const line = scrollTop + SPY_OFFSET;
        current = DRAWER_TABS[0];
        for (const tab of DRAWER_TABS) {
          const el = getSectionEl(tab);
          if (el && el.offsetTop <= line) current = tab;
        }
      }

      if (activeTab.value === current) return; // 高亮未变化：不做后续滚动
      activeTab.value = current;
      scrollActiveTabIntoView();
    };

    /**
     * 滚动内容区到指定 Tab 的区块
     *
     * @param behavior 'smooth'（默认）点击切换用平滑滚动，并临时锁住 scrollspy；
     *                 'auto' 初始化定位用立即滚动，无需动画、也不用锁（滚动事件本身会校准高亮）
     */
    const scrollToTab = (tab: DrawerTabLabel, behavior: ScrollBehavior = 'smooth') => {
      const container = contentRef.value;
      if (!container) return;
      const target = getSectionEl(tab);
      if (!target) return;
      const top = target.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop;
      activeTab.value = tab;
      container.scrollTo({ top, behavior });
      if (behavior !== 'smooth') return;
      lockScrollSync = true;
      // 平滑滚动结束后解锁并校准高亮（保险计时，兼容不支持 scrollend 的浏览器）
      window.clearTimeout(lockTimer);
      lockTimer = window.setTimeout(() => {
        lockScrollSync = false;
        syncActiveTab();
      }, SCROLL_LOCK_MS);
    };

    /**
     * 让高亮 Tab 尽量在 Tab 栏里横向居中（首尾受边界限制）
     * 点击 / scrollspy 切换后都调用：选中的 Tab 不再贴边，两侧相邻 Tab 也能点到
     */
    const scrollActiveTabIntoView = () => {
      const bar = tabBarRef.value;
      if (!bar) return;
      const el = getTabEl(activeTab.value);
      if (!el) return;
      // 居中的目标位置（offsetLeft 相对内容包装器，与 scrollLeft 同一坐标系）
      const centered = el.offsetLeft - (bar.clientWidth - el.offsetWidth) / 2;
      // 夹到可滚动范围内：两端 Tab 无法真正居中，只能贴边
      const max = Math.max(0, bar.scrollWidth - bar.clientWidth);
      const left = Math.min(Math.max(centered, 0), max);
      if (Math.abs(left - bar.scrollLeft) < 1) return; // 已在目标位置，避免无谓滚动
      bar.scrollTo({ left, behavior: 'smooth' });
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
