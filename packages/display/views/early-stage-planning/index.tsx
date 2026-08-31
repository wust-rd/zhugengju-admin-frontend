import arrow1Svg from '@jeesite/assets/svg/display/arrow1.svg';
import { ArtFont } from '@jeesite/display/components/art-font';
import { CollapseGroups } from '@jeesite/display/components/collapse-groups';
import { XodItem, XodRow } from '@jeesite/display/components/corner-panel/xod-row';
import { DropdownSelector } from '@jeesite/display/components/dropdown-selector';
import { GlassRing } from '@jeesite/display/components/glass-ring';
import { type GlowTabItem } from '@jeesite/display/components/glow-tabs';
import { GlowTitle2 } from '@jeesite/display/components/glow-title/title2';
import { DisplayPageLayout } from '@jeesite/display/components/page-layout';
import { RegionTabs } from '@jeesite/display/components/region-tabs';
import type { MenuItemType } from 'antdv-next';
import { defineComponent, ref } from 'vue';
import { DistrictChart } from './district-chart';
import { InvestTotalCard } from './invest-total-card';
import { RightDrawer } from '@jeesite/display/components/early-stage-planning/right-drawer';
import { AreaOverviewModal } from '@jeesite/display/components/early-stage-planning/area-overview-modal';

// 区域 tabs：激活项由 RegionTabs 的 svg 发光胶囊指示器表达（按钮本身不再发光）
const regionTabs: GlowTabItem[] = [
  { key: 'district', label: '行政区划', icon: 'i-ri-road-map-line' },
  { key: 'progress', label: '推进情况', icon: 'i-ri-list-check-3' },
];

export default defineComponent({
  name: 'DisplayEarlyStagePlanning',
  setup() {
    // 区域 tabs 当前激活项（点击切换，单选）
    const activeRegionKey = ref<string>('district');

    // 指标分类下拉菜单项
    const batches: MenuItemType[] = [
      { key: '1', label: '第一批 80' },
      { key: '2', label: ' 第二批 120' },
    ];

    const activeBatch = ref('1');

    // 更新片区列表假数据（XodRow 行）：片区名 + 更新类型布尔任意组合，接入接口后替换
    const xodItems: XodItem[] = [
      { label: '西马片', tod: true, eod: true, iod: false, sod: true },
      { label: '黑泥湖片', cod: true, hod: true },
      { label: '一元片', eod: true, iod: true, sod: true },
      { label: '大智路火车站片', tod: true, cod: true, hod: true },
      { label: '澳门金角启动片', sod: true, cod: true },
      { label: '新兴街片', tod: true, iod: true, hod: true },
      { label: '合作路片', eod: true, sod: true, cod: true },
    ];

    return () => (
      <DisplayPageLayout>
        {{
          left: ({ toggle }) => (
            <>
              {/* 面板头部：标题 + 批次下拉 + 收起按钮 */}
              <GlowTitle2 class="w-full h-56px">
                <ArtFont class="ml-72px text-20px">数据看板</ArtFont>

                <DropdownSelector v-model:activeKey={activeBatch.value} items={batches} class="ml-auto w-128px" ghost />

                <GlassRing
                  class="ml-16px w-32px h-32px flex items-center justify-center cursor-pointer"
                  onClick={toggle}
                >
                  <div class="i-ri-arrow-left-double-fill size-20px text-white" />
                </GlassRing>
              </GlowTitle2>

              {/* 片区投资总额：Subway 数字 + 环形图 + 指标行 */}
              <InvestTotalCard />

              {/* 区域 tabs：RegionTabs 组件（发光胶囊指示器 + tab 渲染），animated=false 简单样式 */}
              <RegionTabs
                v-model:activeKey={activeRegionKey.value}
                items={regionTabs}
                animated={false}
                class="mt-20px"
              />

              {/* 片区行政区划分布：荧光柱状图 + 值分隔格纹 */}
              <DistrictChart />

              <div class="flex items-center mt-16px">
                <img class="size-32px" src={arrow1Svg} />

                <div class="ml-12px text-16px font-500 text-white">更新片区列表</div>

                <div class="ml-auto text-14px text-gray-500">2026-05-21</div>
              </div>

              <div class="mt-16px space-y-12px">
                {/* 折叠分组：CollapseGroups 组件（GlowCollapse + CornerPanel + XodRow 片区行） */}
                <CollapseGroups
                  groups={[
                    { title: '江岸区', items: xodItems },
                    { title: '江汉区', items: xodItems },
                    { title: '硚口区', items: xodItems },
                    { title: '汉阳区', items: xodItems },
                  ]}
                  isRound
                  panelClass="rd-8px"
                >
                  {{
                    row: (item) => <XodRow item={item as XodItem} />,
                  }}
                </CollapseGroups>
              </div>
            </>
          ),
          right: () => <div class="size-full relative bg-white">
          <RightDrawer />
          {/* <AreaOverviewModal /> */}
          
          </div>,
        }}
      </DisplayPageLayout>
    );
  },
});
