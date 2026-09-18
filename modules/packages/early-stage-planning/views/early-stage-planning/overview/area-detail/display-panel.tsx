/**
 * 片区详情 · 左侧展示面板（骨架：展示内容待补充）
 *
 * 结构：头部（返回看板 + 片区名 + 批次/规模/区位）→ 展示区（占位）→ 联动示例条（可删）
 * 展示区后续接图片轮播 / 地图 / 视频等：替换「展示区」那个 div 的内容即可，
 * 页面布局与左右联动 API 都不需要改。
 *
 * 联动：
 * - props.activeTab：右侧抽屉当前区块（抽屉 → 面板方向，展示内容可据此切换）；
 * - emit('tabChange', tab)：点击「联动示例」里的区块（面板 → 抽屉方向，驱动抽屉切区块）。
 */
import { defineComponent, type PropType } from 'vue';
import { ArtFont } from '@jeesite/display/components/art-font';
import { GlassRing } from '@jeesite/display/components/glass-ring';
import type { EspMapAreaRow } from '@jeesite/early-stage-planning/api/early-stage-planning/esp-map';
import { dash, fmtAreaHa } from '../area-format';
import { DRAWER_TABS, type DrawerTabLabel } from '../right-drawer';

export const AreaDetailPanel = defineComponent({
  name: 'EarlyStagePlanningAreaDetailPanel',

  // 输出约束
  emits: {
    /** 返回看板页 */
    back: () => true,
    /** 切换联动区块（驱动右侧抽屉） */
    tabChange: (tab: DrawerTabLabel) => !!tab,
  },

  // 输入约束
  props: {
    /** 片区行数据（接口 areas 行属性） */
    area: { type: Object as PropType<Omit<EspMapAreaRow, 'geometry'>>, required: true },
    /** 右侧抽屉当前区块（展示内容可据此切换） */
    activeTab: { type: String as PropType<DrawerTabLabel>, required: true },
  },

  setup(props, { emit }) {
    return () => {
      const a = props.area;

      return (
        <div class="flex h-full flex-col px-32px pb-24px pt-24px">
          {/* 头部：返回 + 片区名 + 基础指标 + 当前联动区块 */}
          <div class="flex shrink-0 items-center">
            <GlassRing class="flex size-32px cursor-pointer items-center justify-center" onClick={() => emit('back')}>
              <div class="i-ri-arrow-left-line size-20px text-white" />
            </GlassRing>

            <ArtFont class="ml-16px text-20px">{dash(a.AREA_NAME)}</ArtFont>

            <div class="ml-16px flex items-center gap-8px text-14px text-white/60">
              <span class="b-1 b-solid b-white/10 bg-white/5 px-8px py-2px rd-full">{dash(a.BATCH)}</span>
              <span>{fmtAreaHa(a.AREA_HA)}</span>
              <span>{dash(a.DIST)}</span>
            </div>

            {/* 联动状态提示：真实展示内容接入后可直接删 */}
            <div class="ml-auto text-14px text-white/50">
              当前区块：<span class="text-#53E2F6">{props.activeTab}</span>
            </div>
          </div>

          {/* 展示区：图片 / 地图 / 视频等待接入，替换本区块内容即可 */}
          <div class="mt-20px flex min-h-0 flex-1 items-center justify-center b-1 b-dashed b-white/15 bg-white/2 rd-12px">
            <div class="text-center text-white/35">
              <div class="text-16px">展示区（图片 / 地图 / 视频待接入）</div>
              <div class="mt-8px text-14px">替换本区块即可，页面布局与联动 API 无需改动</div>
            </div>
          </div>

          {/* 联动示例条：验证「面板 → 抽屉」方向跑通，接入真实展示内容后可整块删除 */}
          <div class="mt-16px flex shrink-0 items-center gap-8px">
            <div class="mr-8px text-14px text-white/40">联动示例</div>

            {DRAWER_TABS.map((tab) => (
              <div
                key={tab}
                class={
                  'cursor-pointer b-1 b-solid px-12px py-4px text-14px rd-full transition-all duration-200 ' +
                  (props.activeTab === tab
                    ? 'b-[#0BD6FFBF] bg-[#0BD6FF26] text-white'
                    : 'b-white/10 text-white/60 hover-text-white')
                }
                onClick={() => emit('tabChange', tab)}
              >
                {tab}
              </div>
            ))}
          </div>
        </div>
      );
    };
  },
});
