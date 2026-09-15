import { defineComponent } from 'vue';
import { cn } from '@jeesite/core/libs';

import diamond from '@jeesite/assets/images/display/plan/diamond.svg';
import bottomImg from '@jeesite/assets/images/display/plan/底部.png';
import arrowImg from '@jeesite/assets/images/display/plan/箭头开关.svg';

import { CollapsibleSection } from '@jeesite/display/components/collapsible-section';

/** 基本情况 */
export const BasicInfo = defineComponent({
  setup() {
    const STAT_ITEMS: { label: string; value: string; tag?: boolean }[] = [
      { label: '名称', value: '皮子街片' },
      { label: '片区规模', value: '25公顷' },
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
                    地理位置：皮子街片区位于武汉市核心区域。 人口规模：总人口约7759人，人口密度达30961.69人/平方千米。
                    更新类型：老旧小区改造、老旧工业园区和厂区、完整社区建设、历史建筑保护。
                    实施周期：项目分阶段实施，老旧小区改造力争2025年底完工，老旧厂区改造预计 2026年6月开街运营，F  地块开发持续推进。
                    涉及规模：涵盖8个住宅小区(房开小区、隧华里、仁硚新村、航天星苑、东辉花 园、中环新天地、F
                    地块、特一号小区)、2个闲置工业厂区(武汉康成酒厂、南洋烟厂) 2个商业办公区 ( D+M 工业设计小镇、葛洲坝集团)。
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
