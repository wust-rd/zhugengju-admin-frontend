import { defineComponent, ref } from 'vue';

import { BasicInfo } from './basic-info';
import { FeaturePlan } from './feature-plan';
import { FundPlan } from './fund-plan';
import { PhysicalExam } from './physical-exam';
import { PostEvaluation } from './post-evaluation';
import { ProjectInfo } from './project-info';

/** 抽屉 Tab 配置 */
const DRAWER_TABS = ['基本情况', '体检情况', '功能策划', '项目情况','资金方案', '实施后评估', ] as const;
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

/**
 * 右侧抽屉：常显示面板，内容区为 Tab 切换页面
 *
 * 设计：
 *  - 固定宽度 420px，高度撑满，位于页面最右侧
 *  - 深色背景，左侧细边框分隔
 *  - 顶部 5 等分 Tab 切换器，激活项高亮显示
 */
export const RightDrawer = defineComponent({
  setup() {
    const activeTab = ref<DrawerTabLabel>('基本情况');
    const contentRef = ref<HTMLElement | null>(null);

    /** 点击 Tab：平滑滚动到对应内容区块 */
    const scrollToTab = (tab: DrawerTabLabel) => {
      const container = contentRef.value;
      if (!container) return;
      const target = container.querySelector<HTMLElement>(`[data-tab="${tab}"]`);
      if (!target) return;
      const top = target.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop;
      container.scrollTo({ top, behavior: 'smooth' });
    };

    return () => (
      <div
        class="absolute right-0 top-0 flex h-full w-420px shrink-0 flex-col b-l-1 b-solid b-white/6 bg-[#01213B]"
        // style={{ background: 'linear-gradient(171deg, #0F172A -11.93%, #1A5072 99.26%)' }}
      >
        {/* 顶部 Tab 切换器（超出宽度横向滑动，细滚动条 hover 才显示） */}
        <div class="flex h-44px items-stretch overflow-x-auto bg-[#1a3a5c]">
          {DRAWER_TABS.map((tab) => (
            <div
              key={tab}
              class={
                'flex shrink-0 cursor-pointer items-center justify-center px-12px text-14px whitespace-nowrap transition-all duration-100 ' +
                (activeTab.value === tab
                  ? 'border border-[#5fbfff]/60 bg-gradient-to-r from-[#0ea5e9]/20 to-[#0E83BD] font-500 text-white shadow-lg'
                  : 'border border-transparent text-white/60 hover:text-white')
              }
              onClick={() => {
                activeTab.value = tab;
                scrollToTab(tab);
              }}
            >
              {tab}
            </div>
          ))}
        </div>

        {/* 内容区：6 个 Tab 的内容按顺序排列，点击 Tab 滚动定位到对应区块 */}
        <div ref={contentRef} class="scrollbar-none flex-1 overflow-y-auto">
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
