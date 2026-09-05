import { defineComponent, ref } from 'vue';
import { cn } from '@jeesite/core/libs';
import { CollapsibleSection } from '../../collapsible-section';
import { GlowButton } from '../../glow-button';

import diamond from '@jeesite/assets/images/display/plan/diamond.svg';
import bottomImg from '@jeesite/assets/images/display/plan/底部.png';
import arrowImg from '@jeesite/assets/images/display/plan/箭头开关.svg';

/** 体检情况三个 Tab */
const EXAM_TABS = ['问题清单', '资源清单', '需求清单'] as const;
type ExamTab = (typeof EXAM_TABS)[number];

/** 问题清单数据 */
const PROBLEM_LIST = [
  '青石小区26栋住宅房屋，建筑面积3.4万方，基础设施、立面改造和功能配套完善。',
  '共勉小区11栋住宅房屋，建筑面积1.77万方，基础设施、立面改造和功能配套完善。',
  '城南社区老旧小区16栋住宅房屋，建筑面积6万平方米，基础设施完善、增设消防设施、外立面粉刷等。',
  '南城社区老旧小区16栋住宅房屋，建筑面积6万平方米，基础设施完善、增设消防设施、外立面粉刷等。',
];

/** 体检情况 */
export const PhysicalExam = defineComponent({
  setup() {
    // 当前选中的 Tab
    const activeTab = ref<ExamTab>('问题清单');

    return () => (
      <div class="p-16px">
        {/* 可折叠区块 */}
        <CollapsibleSection
          defaultOpen
          v-slots={{
            header: ({ isOpen }) => (
              <div class="flex h-36px w-full items-center relative pb-4px">
                <img src={diamond} alt="基本信息" class="w-20px h-20px ml-2px" />

                <div class="text-18px font-400 text-white ml-8px font-youshe">片区体检情况</div>

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
              <div class="">
                {/* 三个按钮 = 三个 Tab，点击切换 */}
                <div class="mt-16px flex justify-center space-x-12px">
                  {EXAM_TABS.map((tab) => (
                    <GlowButton
                      key={tab}
                      isActive
                      borderGlow={activeTab.value === tab}
                      glowOpacity={activeTab.value === tab ? 1.5 : 0.25}
                      width={120}
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

                {/* 内容区：选中哪个 Tab 显示哪块内容（TODO 自己填） */}
                <div class="mt-16px">
                  {activeTab.value === '问题清单' && (
                    <div class="mt-16px w-full b-1 b-solid b-white/6 bg-white/2 p-12px font-500 rd-8px bg-white/6">
                      <CollapsibleSection
                        defaultOpen
                        v-slots={{
                          header: () => (
                            <div class="flex items-center h-24px">
                              <div class="size-12px rd-full bg-white/10 flex items-center justify-center">
                                <div class="w-4px h-4px bg-white rd-full" />
                              </div>

                              <div class="text-14px lh-20px text-white/75 font-500 ml-8px">问题清单</div>
                            </div>
                          ),
                          body: () => (
                            <div class="mt-8px space-y-8px">
                              {PROBLEM_LIST.map((item, index) => (
                                <div key={index} class="flex items-start mt-8px">
                                  <div class="rd-full size-12px bg-white text-black flex items-center justify-center text-8px shrink-0 font-600 mt-7px">
                                    {index + 1}
                                  </div>

                                  <div class="text-14px lh-24px text-white ml-12px font-400">{item}</div>
                                </div>
                              ))}
                            </div>
                          ),
                        }}
                      ></CollapsibleSection>
                    </div>
                  )}
                  {activeTab.value === '资源清单' && (
                    <div class="min-h-160px rd-8px border border-dashed border-white/15 p-16px">
                      {/* TODO: 「资源清单」内容 */}
                      <div class="text-white/60">资源清单内容</div>
                    </div>
                  )}
                  {activeTab.value === '需求清单' && (
                    <div class="min-h-160px rd-8px border border-dashed border-white/15 p-16px">
                      {/* TODO: 「需求清单」内容 */}
                      <div class="text-white/60">需求清单内容</div>
                    </div>
                  )}
                </div>
              </div>
            ),
          }}
        />
      </div>
    );
  },
});
