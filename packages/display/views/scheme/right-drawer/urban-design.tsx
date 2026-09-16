import { defineComponent, inject } from 'vue';
import { cn } from '@jeesite/core/libs';

import diamond from '@jeesite/assets/images/display/plan/diamond.svg';
import bottomImg from '@jeesite/assets/images/display/plan/底部.png';
import arrowImg from '@jeesite/assets/images/display/plan/箭头开关.svg';

import { CollapsibleSection } from '@jeesite/display/components/collapsible-section';
import { AreaDetailViewKey, useAreaDetailView } from '../use-area-detail-view';
import { selectableCardClass } from './shared';

/** 两张卡片对应的左侧大图（点击某张卡片，左侧就显示它那一张；默认第一张「产业发展」） */
const DESIGN_CARDS = ['产业发展', '历史文化保护'] as const;
export type DesignCard = (typeof DESIGN_CARDS)[number];

/** 产业发展 */
const INDUSTRY_TEXT = '工业遗产活化，激活双厂遗产资源，打造区域重要文化坐标，打响南洋1916文化品牌。';

/** 历史文化保护 */
const HISTORY_TEXT = '传承文脉历史，“低效激活、向史而生”。活化双长、漫游后街、品味烟火。';

/**
 * 城市设计（片区详情页右侧抽屉的 Tab）
 *
 * 内容为「标题 + 内容」两块卡片，样式与兄弟 Tab（basic-info / feature-plan / regulatory-change）同款；
 * 点中哪张卡片，页面左侧大图就切到对应的「城市设计-{卡片名}」图（默认「产业发展」那张）。
 */
export const UrbanDesign = defineComponent({
  name: 'UrbanDesign',
  setup() {
    // 卡片选中状态：优先用页面 provide 的共享实例（左侧大图据此联动），
    // 没有 provider 时退化为组件自己的局部状态
    const view = inject(AreaDetailViewKey, null) ?? useAreaDetailView();
    const activeCard = view.designCard;

    return () => (
      <div class="p-16px">
        <CollapsibleSection
          defaultOpen
          v-slots={{
            header: ({ isOpen }) => (
              <div class="flex h-36px w-full items-center relative pb-4px">
                <img src={diamond} alt="城市设计" class="w-20px h-20px ml-2px" />

                <div class="text-18px font-400 text-white ml-8px font-youshe">城市设计</div>

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
              <>
                {/* 标题 + 内容：产业发展（点击后左侧大图切到「城市设计-产业发展」） */}
                <div
                  class={selectableCardClass(activeCard.value === '产业发展')}
                  onClick={() => (activeCard.value = '产业发展')}
                >
                  <div class="flex items-center h-24px">
                    <div class="size-12px rd-full bg-white/10 flex items-center justify-center">
                      <div class="w-4px h-4px bg-white rd-full" />
                    </div>

                    <div class="text-14px lh-20px text-white/75 font-500 ml-8px">产业发展</div>
                  </div>

                  <div class="mt-8px text-white text-14px font-400 lh-24px">{INDUSTRY_TEXT}</div>
                </div>

                {/* 标题 + 内容：历史文化保护（点击后左侧大图切到「城市设计-历史文化保护」） */}
                <div
                  class={selectableCardClass(activeCard.value === '历史文化保护')}
                  onClick={() => (activeCard.value = '历史文化保护')}
                >
                  <div class="flex items-center h-24px">
                    <div class="size-12px rd-full bg-white/10 flex items-center justify-center">
                      <div class="w-4px h-4px bg-white rd-full" />
                    </div>

                    <div class="text-14px lh-20px text-white/75 font-500 ml-8px">历史文化保护</div>
                  </div>

                  <div class="mt-8px text-white text-14px font-400 lh-24px">{HISTORY_TEXT}</div>
                </div>
              </>
            ),
          }}
        />
      </div>
    );
  },
});
