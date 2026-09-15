import { defineComponent, inject } from 'vue';
import { cn } from '@jeesite/core/libs';
import { CollapsibleSection } from '@jeesite/display/components/collapsible-section';
import { GlowButton } from '@jeesite/display/components/glow-button';

import diamond from '@jeesite/assets/images/display/plan/diamond.svg';
import bottomImg from '@jeesite/assets/images/display/plan/底部.png';
import arrowImg from '@jeesite/assets/images/display/plan/箭头开关.svg';

import { AreaDetailViewKey, useAreaDetailView } from '../use-area-detail-view';

/** 体检情况三个 Tab */
const EXAM_TABS = ['问题清单', '资源清单', '需求清单'] as const;
export type ExamTab = (typeof EXAM_TABS)[number];

/** 皮子街片区素材 OSS 基础地址（原始链接为 percent-encoding，这里已解码） */
const AREA_OSS = 'https://epile-dev.oss-cn-wulanchabu.aliyuncs.com/guihuaju/片区策划-皮子街';

/** 问题清单配图（一张） */
const PROBLEM_LIST_IMG = `${AREA_OSS}/体检情况-问题清单1.webp`;

/** 资源清单配图：上下两张 */
const RESOURCE_LIST_IMGS = [`${AREA_OSS}/体检情况-资源清单1.webp`, `${AREA_OSS}/体检情况-资源清单2.webp`];

/** 需求清单配图：上下两张 */
const DEMAND_LIST_IMGS = [`${AREA_OSS}/体检情况-需求清单1.webp`, `${AREA_OSS}/体检情况-需求清单2.webp`];

/** 资源清单文案（多行：换行位置即展示分行，渲染处用 whitespace-pre-line） */
const RESOURCE_LIST_TEXT = `片区暂无政府及平台公司名下闲置资产，共 6 处可利用闲置资产，总建面约 7.89 万㎡。
核心载体南洋卷烟厂（5.23 万㎡）体量完整、区位优越，活化基础好；康成酒厂（2.2 万㎡）功能复合，可垂直分层提效。
其余 4 处分散于硚口路沿线，规模偏小，涵盖商业、医疗、金融类存量物业。`;

/** 需求清单文案（多行：换行位置即展示分行，渲染处用 whitespace-pre-line） */
const DEMAND_LIST_TEXT = `居住环境：老旧小区改造意愿强，95%居民支持排水、消防、道路与楼体改造。
设施配套：超 65% 居民盼增设停车位及充电设施。
公共服务：医疗养老需求突出，盼建社区养老护理、医疗监测站。
便民服务：超 70% 居民呼吁特色餐饮、社区食堂，期待智慧菜场、社区商业体。
活动空间：需求健身休憩绿化空间，愿建口袋公园、休闲广场。
商业服务：期盼品牌商超、商办区及文旅创意街区。`;

/** 问题清单数据 */
const PROBLEM_LIST = [
  '住：老旧小区设施老化，低层私房消防隐患大，物业公服不足，缺中长期住宿产品。',
  '吃：餐饮以快餐为主，缺特色正餐，分布不均，难满足多元需求。',
  '游：无公共绿地与开放空间，户外休闲场地缺位。',
  '购：商业体量小业态散，缺集中商业与生鲜市场，采购不便。',
  '娱：游娱设施小且散，依附底商，功能单一，缺公共活动用房。',
  '医：基层首诊弱，公卫服务缺位，优质医疗超 15 分钟步行圈。',
  '养：养老服务单一，居家照护、助餐、保健服务空白。',
  '创：具备数字工业与创意设计产业基底，但发展空间不足，高品质办公载体及人才服务配套缺位。',
];

/** 体检情况 */
export const PhysicalExam = defineComponent({
  setup() {
    // 二级 Tab 状态：优先用页面 provide 的共享实例（左侧大图据此联动），
    // 没有 provider 时退化为组件自己的局部状态
    const view = inject(AreaDetailViewKey, null) ?? useAreaDetailView();
    const activeTab = view.examTab;

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

                      {/* 问题清单配图（列表下方一张图） */}
                      <img src={PROBLEM_LIST_IMG} alt="问题清单" class="mt-12px w-full rd-8px" />
                    </div>
                  )}
                  {activeTab.value === '资源清单' && (
                    <div class="min-h-160px rd-8px border border-dashed border-white/15 p-16px">
                      {/* 上下结构：上面一段文字，下面两张图片 */}
                      <div class="text-14px lh-24px text-white/85 whitespace-pre-line">{RESOURCE_LIST_TEXT}</div>

                      {RESOURCE_LIST_IMGS.map((src, index) => (
                        <img key={src} src={src} alt={`资源清单${index + 1}`} class="mt-12px w-full rd-8px" />
                      ))}
                    </div>
                  )}
                  {activeTab.value === '需求清单' && (
                    <div class="min-h-160px rd-8px border border-dashed border-white/15 p-16px">
                      {/* 上下结构：上面一段文字，下面两张图片 */}
                      <div class="text-14px lh-24px text-white/85 whitespace-pre-line">{DEMAND_LIST_TEXT}</div>

                      {DEMAND_LIST_IMGS.map((src, index) => (
                        <img key={src} src={src} alt={`需求清单${index + 1}`} class="mt-12px w-full rd-8px" />
                      ))}
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
