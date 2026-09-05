import { defineComponent } from 'vue';
import { cn } from '@jeesite/core/libs';

import { CollapsibleSection } from '@jeesite/display/components/collapsible-section';

/** 建设内容及规模 */
const BUILDING_DESC =
  '现状建筑面积约51万平方米，以住宅为主。总用地面积约85亩，总建筑面积6.8万㎡，由4栋5-10层的单体建筑加1栋1层楼展厅组成，用途有酒店、商业、办公。A区总建筑面积6.6万㎡,主要建设双创孵化基地、培训中心及配套展示中心、服务中心、商服等。';

/** 关键信息 */
const KEY_INFO = [
  { label: '实施主体', value: '区文旅局' },
  { label: '片区责任主体', value: '车站街道' },
  { label: '开工时间', value: '2025年12月' },
  { label: '完工时间', value: '2026年12月' },
];

/** 项目基本信息：标签 + 取值（两列网格） */
const INFO_ITEMS = [
  { label: '行政区', value: '江岸区' },
  { label: '更新片区', value: '大智门火车站片' },
  { label: '项目名称', value: '大智门火车站旧址修缮等' },
  { label: '五改类别', value: '老旧街区改造', pill: true },
  { label: '四好目标', value: '好街区' },
  { label: '项目来源', value: '市级更新片区内项目' },
];

/** 项目基本信息：项目投资 标签 + 取值（两列网格） */
const PROJECT_INVEST_ITEMS = [
  { label: '项目投资估算', value: '0.1846亿元' },
  { label: '已完成投资', value: '0.15亿元' },
  { label: '资金来源及落实情况', value: '国家专项资金，已落实' },
];

/** 项目基本信息内容 */
export const BasicInfo = defineComponent({
  name: 'BasicInfo',
  setup() {
    return () => (
      <div
        class="p-12px rd-16px backdrop-blur-10px max-h-600px overflow-auto scrollbar-none"
        style={{ background: 'linear-gradient(270deg, #0F172A 1.26%, rgba(37, 86, 126, 0.90) 99.65%)' }}
      >
        <div class="grid grid-cols-2 gap-x-32px gap-y-24px p-8px">
          {INFO_ITEMS.map((item) => (
            <div key={item.label}>
              <div class="text-14px text-white/40">{item.label}</div>

              {item.pill ? (
                /* 五改类别：黄色胶囊 */
                <div
                  class={cn(
                    'mt-6px inline-block rounded-full border px-10px py-3px text-14px',
                    'border-[#F5C443] text-[#F5C443]',
                  )}
                  style={{ background: '#F5C4431A' }}
                >
                  {item.value}
                </div>
              ) : (
                <div class="mt-6px text-14px text-white">{item.value}</div>
              )}
            </div>
          ))}
        </div>

        {/* 分割线 */}
        <div class="h-1px bg-white/10"></div>

        {/* 卡片区 */}
        <div class="mt-12px space-y-12px">
          {/* 建设内容及规模：可折叠卡片 */}
          <CollapsibleSection
            defaultOpen
            v-slots={{
              header: ({ isOpen }) => (
                <div class="flex h-36px items-center px-8px">
                  {/* 左侧白色竖条 */}
                  <div
                    class="h-16px w-3px shrink-0 rd-full bg-white"
                    style={{
                      boxShadow:
                        '0 0 32px 0 rgba(255, 255, 255, 0.30), 0 0 24px 0 #FFF, 1px 0 12px 0 rgba(255, 255, 255, 0.30), 2px 0 8px 0 rgba(255, 255, 255, 0.60)',
                    }}
                  />

                  <div class="text-14px font-500 text-white ml-12px">项目概况</div>

                  {/* 展开/收起圆形箭头按钮 */}
                  <div
                    class={cn(
                      'ml-auto flex size-24px items-center justify-center rounded-full border border-white/10 bg-white/10 transition-transform duration-200',
                      { '-rotate-90': !isOpen },
                    )}
                  >
                    <div class="i-ri:arrow-down-s-line text-white" />
                  </div>
                </div>
              ),
              body: () => (
                <>
                  {/* 建设内容及规模 */}
                  <div class="rounded-8px  p-12px border border-2px border-white/6 mt-6px bg-#0F172A/15">
                    <div class="text-14px text-white/75 bg-white/6 h-30px px-12px py-6px">建设内容及规模</div>

                    <div class="mt-8px text-14px text-white lh-20px p-4px">{BUILDING_DESC}</div>
                  </div>

                  {/* 关键信息列表 */}
                  <div class="rounded-8px  p-12px border border-2px border-white/6 mt-6px bg-#0F172A/15">
                    {KEY_INFO.map((row) => (
                      <div key={row.label} class="flex items-center h-28px px-4px mt-8px">
                        <div class="rd-full size-12px flex items-center justify-center bg-white/10">
                          <div class="size-4px rd-full bg-white" />
                        </div>

                        <span class="text-14px text-white/75 font-400 ml-12px">{row.label}</span>

                        <span class="ml-auto text-14px text-white w-160px">{row.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              ),
            }}
          />

          <CollapsibleSection
            defaultOpen
            v-slots={{
              header: ({ isOpen }) => (
                <div class="flex h-36px items-center px-8px">
                  {/* 左侧白色竖条 */}
                  <div
                    class="h-16px w-3px shrink-0 rd-full bg-white"
                    style={{
                      boxShadow:
                        '0 0 32px 0 rgba(255, 255, 255, 0.30), 0 0 24px 0 #FFF, 1px 0 12px 0 rgba(255, 255, 255, 0.30), 2px 0 8px 0 rgba(255, 255, 255, 0.60)',
                    }}
                  />

                  <div class="text-14px font-500 text-white ml-12px">项目投资</div>

                  {/* 展开/收起圆形箭头按钮 */}
                  <div
                    class={cn(
                      'ml-auto flex size-24px items-center justify-center rounded-full border border-white/10 bg-white/10 transition-transform duration-200',
                      { '-rotate-90': !isOpen },
                    )}
                  >
                    <div class="i-ri:arrow-down-s-line text-white" />
                  </div>
                </div>
              ),
              body: () => (
                <>
                  {/* 信息列表 */}
                  <div class="rounded-8px  p-12px border border-2px border-white/6 mt-6px bg-#0F172A/15">
                    {PROJECT_INVEST_ITEMS.map((row) => (
                      <div key={row.label} class="flex items-center h-28px px-4px mt-8px">
                        <div class="rd-full size-12px flex items-center justify-center bg-white/10">
                          <div class="size-4px rd-full bg-white" />
                        </div>

                        <span class="text-14px text-white/75 font-400 ml-12px">{row.label}</span>

                        <span class="ml-auto text-14px text-white w-160px">{row.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              ),
            }}
          />
        </div>
      </div>
    );
  },
});
