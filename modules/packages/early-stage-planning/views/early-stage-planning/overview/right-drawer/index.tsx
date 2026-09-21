import { computed, defineComponent, onMounted, onUnmounted, ref, watch, type CSSProperties, type PropType } from 'vue';

import type { AreaInfo } from '../area-info';
import { BasicInfo } from './basic-info';
import { CityDesign } from './city-design';
import { FeaturePlan } from './feature-plan';
import { PhysicalExam } from './physical-exam';
import { PlanAdjust } from './plan-adjust';
import { PostEvaluation } from './post-evaluation';
import { ProjectInfo } from './project-info';

/** 抽屉 Tab 配置（导出：左侧展示面板 / 详情页联动时共用同一份口径） */
export const DRAWER_TABS = [
  '基本情况',
  '体检情况',
  '功能策划',
  '城市设计',
  '规划调整',
  '项目情况',
  '更新后评估',
] as const;
export type DrawerTabLabel = (typeof DRAWER_TABS)[number];

/** 默认高亮区块（非受控模式的初值） */
const DEFAULT_TAB: DrawerTabLabel = DRAWER_TABS[0];

/** Tab 对应的内容组件 */
const TAB_COMPONENTS = {
  基本情况: BasicInfo,
  体检情况: PhysicalExam,
  功能策划: FeaturePlan,
  城市设计: CityDesign,
  规划调整: PlanAdjust,
  项目情况: ProjectInfo,
  更新后评估: PostEvaluation,
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
 *   激活项为独立的「滑动指示器」，高亮切换时平滑滑动过去，并把选中项滚动到
 *   Tab 栏居中（尽量），保证下一个 tab 始终可点
 * - 内容区：6 个 Tab 的内容按顺序排列，点击 Tab 与手动滚动双向联动：
 *   scrollspy 同步高亮 + 程序化滚动锁 + 底部留白（最后一块也能滚到顶）
 *
 * 左右联动 API（详情页用，可选，不传即保持原行为）：
 * - v-model:activeTab：受控高亮区块；父级（左侧展示面板）改这个值即切换到对应区块并平滑滚动过去；
 * - 同一 v-model 的双向：抽屉内点击 Tab / 滚动同步高亮时也会回写父级，供左侧展示面板跟随。
 */
export const RightDrawer = defineComponent({
  // 输出约束
  emits: {
    /** 高亮区块变化（v-model:activeTab 的回写） */
    'update:activeTab': (tab: DrawerTabLabel) => !!tab,
  },
  // 输入约束
  props: {
    /** 受控高亮区块（可选）：传入即由父级驱动；不传则内部自持 */
    activeTab: { type: String as PropType<DrawerTabLabel>, default: undefined },
    /** 当前片区完整数据（图斑要素 + 填报表单含图片直链，form 可 null）：透传给六个 tab 消费 */
    area: { type: Object as PropType<AreaInfo>, required: true },
  },
  setup(props, { emit }) {
    /** 非受控模式下的高亮区块（受控时以 activeTab prop 为准） */
    const innerTab = ref<DrawerTabLabel>(DEFAULT_TAB);
    /** 生效的高亮区块：受控优先，非受控回落内部状态 */
    const activeTab = computed<DrawerTabLabel>(() => props.activeTab ?? innerTab.value);

    /** 统一写入入口：更新内部状态并回写父级（受控/非受控都走这里） */
    const setActiveTab = (tab: DrawerTabLabel) => {
      innerTab.value = tab;
      emit('update:activeTab', tab);
    };

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
      setActiveTab(current);
      scrollActiveTabIntoView(current);
    };

    /** 点击 Tab：平滑滚动到对应内容区块 */
    const scrollToTab = (tab: DrawerTabLabel) => {
      const container = contentRef.value;
      if (!container) return;
      const target = getSectionEl(tab);
      if (!target) return;
      const top = target.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop;
      setActiveTab(tab);
      lockScrollSync = true;
      container.scrollTo({ top, behavior: 'smooth' });
      // 平滑滚动结束后解锁并校准高亮（保险计时，兼容不支持 scrollend 的浏览器）
      window.clearTimeout(lockTimer);
      lockTimer = window.setTimeout(() => {
        lockScrollSync = false;
        syncActiveTab();
      }, SCROLL_LOCK_MS);
    };

    /** 点击 Tab：切高亮（scrollToTab 内的 setActiveTab 统一写入）+ 滚动 + 把被点的 tab
        居中（显式传 tab，受控模式下不等父级回传，点哪就居中哪） */
    const onTabClick = (tab: DrawerTabLabel) => {
      scrollToTab(tab);
      scrollActiveTabIntoView(tab);
    };

    /**
     * 受控模式：父级（左侧展示面板）改 activeTab 时滚到对应区块。
     * tab === innerTab 说明本次变化由抽屉内部发起（点击/scrollspy 已自行滚动过），跳过以免重复滚动。
     */
    watch(
      () => props.activeTab,
      (tab) => {
        if (!tab || tab === innerTab.value) return;
        scrollToTab(tab);
        scrollActiveTabIntoView(tab);
      },
    );

    /** 选中 tab 滚到 Tab 栏居中（尽量居中）：不判断「是否可见」——否则点到视口右缘的
        tab 时它原地不动，下一个 tab 仍在屏幕外点不到；两侧空间不足时 scrollLeft 的
        0/最大值边界自然夹住，居中到头的项再点也不会晃动。
        ★ tab 必须显式传入：受控模式（详情页 v-model:activeTab）下点击后 props.activeTab
        要等父级重渲染才更新，这里读 activeTab.value 会拿到「上一个」tab，表现为点了新
        tab 却把旧 tab 滚到中间（非受控模式 innerTab 同步更新，故只有受控模式出错） */
    const scrollActiveTabIntoView = (tab: DrawerTabLabel = activeTab.value) => {
      const bar = tabBarRef.value;
      if (!bar) return;
      const el = getTabEl(tab);
      if (!el) return;
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
                onClick={() => onTabClick(tab)}
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
                <TabContent area={props.area} />
              </section>
            );
          })}
        </div>
      </div>
    );
  },
});
