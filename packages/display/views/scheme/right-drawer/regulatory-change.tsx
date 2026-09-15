import { defineComponent, inject } from 'vue';
import { cn } from '@jeesite/core/libs';
import { CollapsibleSection } from '@jeesite/display/components/collapsible-section';
import { GlowButton } from '@jeesite/display/components/glow-button';

import diamond from '@jeesite/assets/images/display/plan/diamond.svg';
import bottomImg from '@jeesite/assets/images/display/plan/底部.png';
import arrowImg from '@jeesite/assets/images/display/plan/箭头开关.svg';

import { AreaDetailViewKey, useAreaDetailView } from '../use-area-detail-view';

/** 控规变更的三个图纸按钮（一排放置；默认第一个 = 调整前图纸） */
const CHANGE_TABS = ['调整前图纸', '调整后图纸', '调整前后对比'] as const;
export type RegulatoryTab = (typeof CHANGE_TABS)[number];

/** 调整内容文案（多行：换行位置即展示分行，渲染处用 whitespace-pre-line） */
const CHANGE_TEXT = `部分居住用地、防护绿地、中小学用地、社会停车场用地调整为商业用地、中小学用地、防护绿地和公园绿地；减少1条市政支路，新增1条内部慢行道路。
增加商业用地2.05公顷、中小学0.25公顷、公园绿地0.35公顷，结合园区商业用地、绿地复合社会停车场100个。`;

/** 按钮宽度（px）：3 个一排，3×120 + 2×12 间距 = 384 ≤ 抽屉内容宽 388（420 − 左右各 16 内边距） */
const BTN_WIDTH = 120;

/**
 * 控规变更（片区详情页右侧抽屉的第 4 个 Tab）
 *
 * 「调整内容」标题 + 说明文字 + 一排三个图纸按钮；按钮点中的那张图显示在**页面左侧大图区**，
 * 所以这里只写共享状态（use-area-detail-view 的 regulatoryTab），实际换图由 area-detail 页负责。
 * 结构/配色沿用兄弟 Tab（basic-info / physical-exam）的 CollapsibleSection 范式。
 */
export const RegulatoryChange = defineComponent({
  name: 'RegulatoryChange',
  setup() {
    // 图纸选择状态：优先用页面 provide 的共享实例（左侧大图据此联动），
    // 没有 provider 时退化为组件自己的局部状态
    const view = inject(AreaDetailViewKey, null) ?? useAreaDetailView();
    const activeTab = view.regulatoryTab;

    return () => (
      <div class="p-16px overflow-hidden relative">
        <CollapsibleSection
          defaultOpen
          v-slots={{
            header: ({ isOpen }) => (
              <div class="flex h-36px w-full items-center relative pb-4px">
                <img src={diamond} alt="控规变更" class="w-20px h-20px ml-2px" />

                <div class="text-18px font-400 text-white ml-8px font-youshe">控规变更</div>

                {/* 箭头：打开朝下（SVG 原方向不旋转），关闭朝右（逆时针转 90°） */}
                <img
                  src={arrowImg}
                  alt=""
                  class={cn('w-20px h-20px ml-auto transition-transform duration-200', {
                    '-rotate-90': !isOpen,
                  })}
                />

                {/* 底部图片 */}
                <img src={bottomImg} alt="" class="w-full h-4px absolute bottom-0 left-0 object-fill" />
              </div>
            ),
            body: () => (
              <div>
                {/* 调整内容：标题 + 说明文字 */}
                <div class="mt-16px w-full b-1 b-solid b-white/6 bg-white/2 p-12px font-500 rd-8px bg-white/6">
                  <div class="flex items-center h-24px">
                    <div class="size-12px rd-full bg-white/10 flex items-center justify-center">
                      <div class="w-4px h-4px bg-white rd-full" />
                    </div>

                    <div class="text-14px lh-20px text-white/75 font-500 ml-8px">调整内容</div>
                  </div>

                  <div class="mt-8px text-white font-400 text-14px lh-24px whitespace-pre-line">{CHANGE_TEXT}</div>
                </div>

                {/* 三个图纸按钮：一排放置，点中的那张图显示在左侧大图区 */}
                <div class="mt-16px flex justify-center space-x-12px">
                  {CHANGE_TABS.map((tab) => (
                    <GlowButton
                      key={tab}
                      isActive
                      borderGlow={activeTab.value === tab}
                      glowOpacity={activeTab.value === tab ? 1.5 : 0.25}
                      width={BTN_WIDTH}
                      height={36}
                      radius={8}
                      class={cn('text-14px font-500', {
                        'text-white': activeTab.value === tab,
                        'text-white/60': activeTab.value !== tab,
                      })}
                      onClick={() => (activeTab.value = tab)}
                    >
                      {tab}
                    </GlowButton>
                  ))}
                </div>
              </div>
            ),
          }}
        />
      </div>
    );
  },
});
