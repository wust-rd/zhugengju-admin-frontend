import arrow1Svg from '@jeesite/assets/svg/display/arrow1.svg';
import { ArtFont } from '@jeesite/display/components/art-font';
import { CollapseGroups, type CollapseGroupItem } from '@jeesite/display/components/collapse-groups';
import { XodItem, XodRow } from '@jeesite/display/components/corner-panel/xod-row';
import { DropdownSelector } from '@jeesite/display/components/dropdown-selector';
import { GlassRing } from '@jeesite/display/components/glass-ring';
import { type GlowTabItem } from '@jeesite/display/components/glow-tabs';
import { GlowTitle2 } from '@jeesite/display/components/glow-title/title2';
import { DisplayPageLayout } from '@jeesite/display/components/page-layout';
import { RegionTabs } from '@jeesite/display/components/region-tabs';
import type { MenuItemType } from 'antdv-next';
import { computed, defineComponent, ref, shallowRef } from 'vue';
import { AreaLayers } from './area-layers';
import { areaGroups, batchOptions, districtInvest, loadAreas } from './area-data';
import { DistrictChart } from './district-chart';
import { FuncTypeChart } from './func-type-chart';
import { InvestTotalCard, type BatchInvest } from './invest-total-card';
import { ProgressChart } from './progress-chart';
import { PROGRESS_ITEMS, progressGroups } from './progress-data';
import { VMap, VMapControls, basemapStyle, basemapMapOptions } from '@jeesite/vmap';

// 区域 tabs：激活项由 RegionTabs 的 svg 发光胶囊指示器表达（按钮本身不再发光）
const regionTabs: GlowTabItem[] = [
  { key: 'district', label: '行政区划', icon: 'i-ri-road-map-line' },
  { key: 'progress', label: '推进情况', icon: 'i-ri-list-check-3' },
  { key: 'func', label: '功能定位', icon: 'i-ri-compass-3-line' },
];

/** 批次投资进度数据（业务口径数据；后端就绪后替换此处常量）
 *  口径：done = 已完成投资（累计完成）；plan2026 = 2026 年计划完成投资（2026年完成） */
const BATCH_INVEST: Record<'第一批' | '第二批', BatchInvest> = {
  第一批: { label: '第一批', total: 1310.71, done: 853.45, plan2026: 312.76 },
  第二批: { label: '第二批', total: 1934.09, done: 946.26, plan2026: 442.87 },
};

export default defineComponent({
  name: 'DisplayEarlyStagePlanning',
  setup() {
    // 沉浸式全屏由布局按路由自动判定（new-header 的 isDisplayRoute），页面无需拨开关

    // 区域 tabs 当前激活项（点击切换，单选）
    const activeRegionKey = ref<string>('district');

    // ---- 更新片区数据（geojson 一次加载，地图/柱状图/分组列表共用） ----
    const areas = shallowRef<Recordable | null>(null);
    const batches = ref<MenuItemType[]>([]);
    /** 当前选中批次（key 即批次值：'第一批' | '第二批'） */
    const activeBatch = ref<string>('第一批');

    loadAreas().then((fc) => {
      areas.value = fc as unknown as Recordable;
    });
    batchOptions().then((opts) => {
      batches.value = opts;
      activeBatch.value = opts[0]?.key ?? '';
    });

    /** 柱状图数据：随批次下拉联动（该批次片区按区划聚合投资额，18 区全量、降序） */
    const chartRows = computed(() =>
      areas.value ? districtInvest(areas.value as never, activeBatch.value === '第二批' ? '第二批' : '第一批') : [],
    );

    /** 片区投资总额数据：随批次下拉联动 */
    const activeInvest = computed(() => BATCH_INVEST[activeBatch.value === '第二批' ? '第二批' : '第一批'] ?? null);

    /** 分组列表数据：随批次下拉联动（第一批/第二批 → 各区真实片区名单 + FUNC_TYPE 胶囊） */
    const groups = computed<CollapseGroupItem<XodItem>[]>(() =>
      areas.value ? areaGroups(areas.value as never, activeBatch.value === '第二批' ? '第二批' : '第一批') : [],
    );

    /** 功能定位维度 key（other = 未命中任何导向 / FUNC_TYPE 为空） */
    type FuncRowKey = 'cod' | 'tod' | 'iod' | 'sod' | 'eod' | 'hod' | 'other';
    const FUNC_KEYS: FuncRowKey[] = ['cod', 'tod', 'iod', 'sod', 'eod', 'hod'];

    /** 功能定位分布：FUNC_TYPE 文本包含维度关键词即计数（一片可命中多维）；
        未命中任何维度（含空值）计入 other；随批次联动 */
    const funcRows = computed<{ key: FuncRowKey; count: number }[]>(() => {
      const batch = activeBatch.value === '第二批' ? '第二批' : '第一批';
      const counts = new Map<FuncRowKey, number>(FUNC_KEYS.map((k) => [k, 0] as [FuncRowKey, number]));
      counts.set('other', 0);
      const grouped = areas.value ? areaGroups(areas.value as never, batch) : [];
      for (const group of grouped) {
        for (const item of group.items) {
          let hit = false;
          for (const k of FUNC_KEYS) {
            if (item[k]) {
              counts.set(k, (counts.get(k) ?? 0) + 1);
              hit = true;
            }
          }
          if (!hit) counts.set('other', (counts.get('other') ?? 0) + 1);
        }
      }
      const ordered: FuncRowKey[] = [...FUNC_KEYS, 'other'];
      return ordered.map((key) => ({ key, count: counts.get(key) ?? 0 }));
    });

    /** 功能定位 tab 的更新片区列表（假数据：按导向维度分组演示） */
    const FUNC_LIST_GROUPS: CollapseGroupItem<XodItem>[] = [
      {
        title: '以文旅为导向（COD）',
        badgeValue: 3,
        items: [
          { label: '昙华林片', cod: true },
          { label: '大智门火车站片', cod: true, sod: true },
          { label: '青岛路片', cod: true, eod: true },
        ],
      },
      {
        title: '以产业为导向（IOD）',
        badgeValue: 3,
        items: [
          { label: '一元片', iod: true },
          { label: '西马片', iod: true, sod: true },
          { label: '黑泥湖片', iod: true, tod: true },
        ],
      },
      {
        title: '以公共服务为导向（SOD）',
        badgeValue: 3,
        items: [
          { label: '澳门金角启动片', sod: true },
          { label: '新兴街片', sod: true, hod: true },
          { label: '合作路片', sod: true, cod: true },
        ],
      },
    ];

    /** 更新片区列表数据：行政区划 tab → 各区真实片区名单；推进情况 / 功能定位 tab → 演示数据 */
    const listGroups = computed<CollapseGroupItem<XodItem>[]>(() =>
      activeRegionKey.value === 'district'
        ? groups.value
        : activeRegionKey.value === 'progress'
          ? progressGroups(activeBatch.value === '第二批' ? '第二批' : '第一批')
          : FUNC_LIST_GROUPS,
    );

    return () => (
      <DisplayPageLayout>
        {{
          left: ({ toggle }) => (
            <>
              {/* 面板头部：标题 + 批次下拉 + 收起按钮 */}
              <GlowTitle2 class="w-full h-56px">
                <ArtFont class="ml-72px text-20px">数据看板</ArtFont>

                <DropdownSelector
                  v-model:activeKey={activeBatch.value}
                  items={batches.value}
                  class="ml-auto w-128px"
                  ghost
                />

                <GlassRing
                  class="ml-16px w-32px h-32px flex items-center justify-center cursor-pointer"
                  onClick={toggle}
                >
                  <div class="i-ri-arrow-left-double-fill size-20px text-white" />
                </GlassRing>
              </GlowTitle2>

              {/* 片区投资总额：Subway 数字 + 投资进度环形图 + 指标行（随批次下拉联动） */}
              <InvestTotalCard batch={activeInvest.value} />

              {/* 区域 tabs：RegionTabs 组件（发光胶囊指示器 + tab 渲染），animated=false 简单样式 */}
              <RegionTabs
                v-model:activeKey={activeRegionKey.value}
                items={regionTabs}
                animated={false}
                class="mt-20px"
              />

              {/* 行政区划 tab：片区行政区划分布荧光柱状图（geojson 真数据，18 区划全量）
                  推进情况 tab：片区推进情况三色图（绿/黄/红 占比 + 片数，演示数据）
                  功能定位 tab：片区功能定位分布（FUNC_TYPE 解析的各导向维度片区数） */}
              {activeRegionKey.value === 'district' ? (
                <DistrictChart rows={chartRows.value} />
              ) : activeRegionKey.value === 'progress' ? (
                <ProgressChart items={PROGRESS_ITEMS} />
              ) : (
                <FuncTypeChart rows={funcRows.value} />
              )}

              <div class="flex items-center mt-16px">
                <img class="size-32px" src={arrow1Svg} />

                <div class="ml-12px text-16px font-500 text-white">更新片区列表</div>

                <div class="ml-auto text-14px text-gray-500">2026-05-21</div>
              </div>

              <div class="mt-16px space-y-12px max-h-500px overflow-y-auto scrollbar-none">
                {/* 折叠分组：行政区划 tab 为各区真实片区名单；推进情况 tab 为推进情况演示数据（均随批次联动） */}
                <CollapseGroups groups={listGroups.value} isRound panelClass="rd-8px">
                  {{
                    row: (item) => <XodRow item={item as XodItem} />,
                  }}
                </CollapseGroups>
              </div>
            </>
          ),
          right: () => (
            <>
              {/* 右侧地图：VMap 内部创建/销毁 MapLibre 实例，底图为天地图（矢量 + 中文注记） */}
              <VMap reuseMaps style={basemapStyle} options={basemapMapOptions}>
                <VMapControls class="absolute right-24px bottom-24px z-10" />

                {/* 更新片区面：第一批紫 / 第二批蓝（仅展示，无交互；联动待后续） */}
                <AreaLayers areas={areas.value} />
              </VMap>
            </>
          ),
        }}
      </DisplayPageLayout>
    );
  },
});
