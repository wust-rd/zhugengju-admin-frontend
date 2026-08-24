import { buildYearItems } from '@jeesite/core/libs';
import { CornerItem, CornerPanelRow } from '@jeesite/display/components/corner-panel';
import { CollapseGroups } from '@jeesite/display/components/collapse-groups';
import { type GlowTabItem } from '@jeesite/display/components/glow-tabs';
import { DisplayPageLayout } from '@jeesite/display/components/page-layout';
import { RegionTabs } from '@jeesite/display/components/region-tabs';
import type { MenuItemType } from 'antdv-next';
import { defineComponent, ref } from 'vue';
import { RatingResult, type RatingDatum } from './rating-result';
import { SearchFilter } from './search-filter';
import { TopFilter } from './top-filter';

// 指标评价结果分布：饼图与右侧统计网格共用同一份数据（数值为百分数）
const ratingData: RatingDatum[] = [
  { key: '很好', label: '很好', value: 18.7, color: '#22D3EE' },
  { key: '无标准', label: '无标准', value: 20.1, color: '#CBD5E1' },
  { key: '较好', label: '较好', value: 32.5, color: '#4ADE80' },
  { key: '较差', label: '较差', value: 32.5, color: '#F472B6' },
  { key: '一般', label: '一般', value: 23.7, color: '#FBBF24' },
];

// —— 三个折叠面板的指标列表（占位数据，接入接口后替换） ——
// 生态宜居：公园绿化 / 绿地率等指标
const ecoItems: CornerItem[] = [
  { seq: '01', label: '公园绿化活动场地服务半径', value: '77.8%', rating: '很好' },
  { seq: '02', label: '城市绿地率', value: '28.58%', rating: '一般' },
  { seq: '03', label: '城市绿化覆盖率', value: '84.0%', rating: '较好' },
  { seq: '04', label: '10万人拥有综合公园数量', value: '5个', rating: '很好' },
  { seq: '05', label: '人均公园绿地面积', value: '0.16m²/人', rating: '较差' },
  { seq: '06', label: '公园综合吸引半径', value: '7.03Km', rating: '较好' },
  { seq: '07', label: '年度主要城市公园游客量', value: '3万人', rating: '一般' },
  { seq: '08', label: '公园内年举办活动数量', value: '25场', rating: '一般' },
];

// 历史文化保护利用：历史建筑 / 街区 / 非遗等指标
const heritageItems: CornerItem[] = [
  { seq: '01', label: '历史文化街区保护率', value: '92.5%', rating: '很好' },
  { seq: '02', label: '历史建筑修缮率', value: '68.0%', rating: '较好' },
  { seq: '03', label: '非遗代表性项目数量', value: '36项', rating: '一般' },
  { seq: '04', label: '古树名木保护率', value: '100%', rating: '很好' },
];

// 特色活力：夜间经济 / 活动等指标
const vitalityItems: CornerItem[] = [
  { seq: '01', label: '夜间经济活跃度', value: '87.3%', rating: '很好' },
  { seq: '02', label: '网红打卡点数量', value: '42处', rating: '较好' },
  { seq: '03', label: '文化活动年举办场次', value: '128场', rating: '较好' },
  { seq: '04', label: '青年人口占比', value: '24.6%', rating: '一般' },
];

// 区域 tabs：激活项由 RegionTabs 的 svg 发光胶囊指示器表达（按钮本身不再发光）
const regionTabs: GlowTabItem[] = [
  { key: 'city', label: '城区', icon: 'i-ri-map-2-line' },
  { key: 'factory', label: '工厂', icon: 'i-ri-community-line' },
  { key: 'enterprise', label: '企业', icon: 'i-ri-building-2-line' },
  { key: 'residence', label: '住宅', icon: 'i-ri-home-smile-line' },
];

export default defineComponent({
  name: 'DisplayInspection',
  setup() {
    // 指标分类下拉菜单项
    const items: MenuItemType[] = [
      { key: '1', label: '一好基础指标' },
      { key: '2', label: '二好基础指标' },
      { key: '3', label: '三好基础指标' },
      { key: '4', label: '四好基础指标' },
    ];

    // 年份下拉：最近 N 年（当前改为最近两年，变更年数只改 buildYearItems 参数）
    const yearItems = buildYearItems(2);
    const yearKey = ref<string | number>(yearItems[0]?.key ?? '');

    // 受控选中项：指标分类默认选中「四好基础指标」，年份默认选中最近一年（当前年）
    const indicatorKey = ref<string | number>('4');

    // 区域 tabs 当前激活项（点击切换，单选）
    const activeRegionKey = ref<string>('city');

    return () => (
      <DisplayPageLayout collapsible={false}>
        {{
          left: () => (
            <>
              {/* 顶部筛选行：年份 + 指标分类 */}
              <TopFilter
                v-model:yearKey={yearKey.value}
                v-model:indicatorKey={indicatorKey.value}
                yearItems={yearItems}
                indicatorItems={items}
              />

              {/* 区域 tabs：RegionTabs 组件（发光胶囊指示器 + 文字动画） */}
              <RegionTabs v-model:activeKey={activeRegionKey.value} items={regionTabs} class="mt-16px" />

              {/* 指标评价结果：环形饼图 + 中心文字 + 统计网格 */}
              <RatingResult ratingData={ratingData} />

              {/* 搜索筛选行：搜索框 + 全部筛选下拉 */}
              <SearchFilter v-model:activeKey={yearKey.value} items={ratingData as unknown as MenuItemType[]} />

              <div class="mt-16px space-y-12px">
                {/* 折叠分组：CollapseGroups 组件（GlowCollapse + CornerPanel + CornerPanelRow 指标行） */}
                <CollapseGroups
                  groups={[
                    { title: '生态宜居', badgeValue: 25, items: ecoItems },
                    { title: '历史文化保护利用', badgeValue: 18, items: heritageItems },
                    { title: '特色活力', badgeValue: 12, items: vitalityItems },
                  ]}
                >
                  {{
                    row: (item) => <CornerPanelRow item={item as CornerItem} />,
                  }}
                </CollapseGroups>
              </div>
            </>
          ),
        }}
      </DisplayPageLayout>
    );
  },
});
