import { defineComponent } from 'vue';
import { cn } from '@jeesite/core/libs';

import diamond from '@jeesite/assets/images/display/plan/diamond.svg';
import bottomImg from '@jeesite/assets/images/display/plan/底部.png';
import arrowImg from '@jeesite/assets/images/display/plan/箭头开关.svg';

import { CollapsibleSection } from '../../collapsible-section';

/** 基本情况 */
export const BasicInfo = defineComponent({
  setup() {
    const STAT_ITEMS: { label: string; value: string; tag?: boolean }[] = [
      { label: '名称', value: '显正片' },
      { label: '片区规模', value: '25.7公顷' },
      { label: '更新情况', value: '已批准', tag: true },
    ];

    return () => (
      <div class="p-16px overflow-hidden relative">
        {/* 可折叠区块 */}
        <CollapsibleSection
          defaultOpen
          v-slots={{
            header: ({ isOpen }) => (
              <div class="flex h-36px w-full items-center relative pb-4px">
                <img src={diamond} alt="基本信息" class="w-20px h-20px ml-2px" />

                <div class="text-18px font-400 text-white ml-8px font-youshe">片区基本情况</div>

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
                {/* 统计卡片 */}
                <div class="mt-16px flex h-76px w-full b-1 b-solid b-white/6 bg-white/2 py-4px text-center font-500 rd-8px bg-white/6">
                  {STAT_ITEMS.map((item) => (
                    <div key={item.label} class="flex-1 py-8px">
                      <div class="text-14px lh-20px text-white/60">{item.label}</div>
                      {item.tag ? (
                        <div class="mt-8px inline-block b-1 b-solid b-[rgba(23,254,185,0.45)] rd-12px px-8px py-2px text-14px text-#17FEB9">
                          {item.value}
                        </div>
                      ) : (
                        <div class="mt-8px text-14px font-500 lh-20px text-white">{item.value}</div>
                      )}
                    </div>
                  ))}
                </div>

                <div class="mt-16px w-full b-1 b-solid b-white/6 bg-white/2 p-12px font-500 rd-8px bg-white/6">
                  <div class="flex items-center h-24px">
                    <div class="size-12px rd-full bg-white/10 flex items-center justify-center">
                      <div class="w-4px h-4px bg-white rd-full" />
                    </div>

                    <div class="text-14px lh-20px text-white/75 font-500 ml-8px">片区概况</div>
                  </div>

                  <div class="mt-8px text-white font-400 text-14px lh-24px">
                    片区北临显正街、南抵拦江路、西至青石桥路、东接建桥片。片区内现状总建筑面积约 51
                    万平方米，功能以住宅为主，绝大部分区域划入显正街传统特色街区保护范围，历史底蕴突出。片区历史资源富集，范围内及周边留存显正街、青石桥路、汉阳树、共勉牌坊等多处珍贵历史遗存，属于兼具居住功能与历史风貌保护双重属性的城市更新片区。
                  </div>
                </div>
              </div>
            ),
          }}
        />
      </div>
    );
  },
});
