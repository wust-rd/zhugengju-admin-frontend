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
import { useMessage } from '@jeesite/core/hooks/web/useMessage';
import type { MenuItemType } from 'antdv-next';
import { computed, defineComponent, ref, shallowRef, watch } from 'vue';
import { AreaLayers } from './area-layers';
import { DistrictChart } from './district-chart';
import { FuncTypeChart, type FuncKey } from './func-type-chart';
import { InvestTotalCard, type BatchInvest } from './invest-total-card';
import { ProgressChart } from './progress-chart';
import {
  areaGroups,
  BATCHES,
  type BatchKey,
  districtAreaCount,
  filterPredicate,
  funcFlags,
  loadAreas,
  progressItems,
  type AreaCollection,
} from './area-data';
import { VMap, VMapControls, basemapStyle, basemapMapOptions } from '@jeesite/vmap';

// 区域 tabs：激活项由 RegionTabs 的 svg 发光胶囊指示器表达（按钮本身不再发光）
const regionTabs: GlowTabItem[] = [
  { key: 'district', label: '行政区划', icon: 'i-ri-road-map-line' },
  { key: 'progress', label: '推进情况', icon: 'i-ri-list-check-3' },
  { key: 'func', label: '功能定位', icon: 'i-ri-compass-3-line' },
];

/** 批次投资进度数据（业务口径数据；后端就绪后替换此处常量；全部 = 两批相加）
 *  口径：done = 已完成投资（累计完成）；plan2026 = 2026 年计划完成投资（2026年完成） */
const BATCH_INVEST: Record<'第一批' | '第二批' | '全部', BatchInvest> = {
  第一批: { label: '第一批', total: 1310.71, done: 853.45, plan2026: 312.76 },
  第二批: { label: '第二批', total: 1934.09, done: 946.26, plan2026: 442.87 },
  全部: { label: '全部', total: 3244.8, done: 1799.71, plan2026: 755.63 },
};

export default defineComponent({
  name: 'DisplayEarlyStagePlanning',
  setup() {
    // 沉浸式全屏由布局按路由自动判定（new-header 的 isDisplayRoute），页面无需拨开关

    // 区域 tabs 当前激活项（点击切换，单选）
    const activeRegionKey = ref<string>('district');

    // ---- 更新片区数据（按批次请求 esp 图斑接口；地图/柱状图/分组列表共用，按批次缓存） ----
    const areas = shallowRef<AreaCollection | null>(null);
    /** 当前选中批次（'第一批' | '第二批' | '全部'，见 area-data.BatchKey） */
    const activeBatch = ref<string>('全部');
    /** 各批次片区数（下拉 label 回显；批次数据加载完成后补充） */
    const batchCounts = shallowRef<Partial<Record<string, number>>>({});
    const batches = computed<MenuItemType[]>(() =>
      BATCHES.map((b) => ({ key: b, label: batchCounts.value[b] != null ? `${b} ${batchCounts.value[b]}` : b })),
    );

    const { showMessage } = useMessage();

    /** activeBatch 规整为合法 BatchKey（异常值兜底第一批） */
    const batchKey = computed<BatchKey>(() =>
      BATCHES.includes(activeBatch.value as BatchKey) ? (activeBatch.value as BatchKey) : '第一批',
    );

    /** 请求当前批次全部片区（geometry 解码由 loadAreas 内完成；
        竞态保护：批次快速切换时只认最后一次请求的结果） */
    let loadSeq = 0;
    async function applyBatch(batch: BatchKey) {
      const seq = ++loadSeq;
      try {
        const fc = await loadAreas(batch);
        if (seq !== loadSeq) return;
        areas.value = fc;
        batchCounts.value = { ...batchCounts.value, [batch]: fc.features.length };
      } catch (e) {
        if (seq === loadSeq) showMessage(`片区数据加载失败：${e instanceof Error ? e.message : e}`, 'error');
      }
    }

    watch(batchKey, (b) => applyBatch(b), { immediate: true });

    // ---- 图表点击筛选（值随 tab 维度：district → 区划名；progress → 颜色；func → 维度 key） ----
    const chartFilter = ref<string | null>(null);
    /** activeRegionKey 规整为三个统计维度之一（filterPredicate / 数据管道用） */
    const regionKey = computed<'district' | 'progress' | 'func'>(() =>
      activeRegionKey.value === 'district' || activeRegionKey.value === 'progress' ? activeRegionKey.value : 'func',
    );
    /** 切换 tab / 批次时清除筛选（跨维度筛选值无意义，且换批次后语义易错位） */
    watch([activeRegionKey, batchKey], () => {
      chartFilter.value = null;
    });
    /** 统计图点击回调：再点同一项取消；null 为图表空白点击取消 */
    function onChartSelect(value: string | null) {
      chartFilter.value = value === null ? null : chartFilter.value === value ? null : value;
    }

    /** 筛选命中的要素（地图渲染用，三个 tab 均过滤；null = 全量） */
    const mapAreas = computed<AreaCollection | null>(() => {
      if (!areas.value || !chartFilter.value) return areas.value;
      const pred = filterPredicate(regionKey.value, chartFilter.value);
      return { ...areas.value, features: areas.value.features.filter(pred) };
    });

    /** 列表分组数据：行政区划 tab 保持全量分组（点击只控制展开态）；
        推进情况 / 功能定位 tab 仅保留命中片区分组 */
    const groups = computed<CollapseGroupItem<XodItem>[]>(() => {
      const src = areas.value;
      if (!src) return [];
      const list = regionKey.value === 'district' ? src : (mapAreas.value ?? src);
      return areaGroups(list).map((g) =>
        regionKey.value === 'district' && chartFilter.value
          ? { ...g, defaultExpanded: g.title === chartFilter.value }
          : g,
      );
    });

    /** 列表重挂载 key：筛选变化时重建分组（GlowCollapse 为非受控展开，靠重挂载应用展开态） */
    const listKey = computed(() => `${activeRegionKey.value}-${batchKey.value}-${chartFilter.value ?? ''}`);

    /** 柱状图数据：当前批次片区按区划统计数量（区划全量，不随筛选变化） */
    const chartRows = computed(() => (areas.value ? districtAreaCount(areas.value) : []));

    /** 片区投资总额数据：随批次下拉联动 */
    const activeInvest = computed(() => BATCH_INVEST[batchKey.value] ?? null);

    /** 功能定位维度 key（other = 未命中任何导向 / FUNC_TYPE 为空） */
    type FuncRowKey = 'cod' | 'tod' | 'iod' | 'sod' | 'eod' | 'hod' | 'other';
    const FUNC_KEYS: FuncRowKey[] = ['cod', 'tod', 'iod', 'sod', 'eod', 'hod'];

    /** 功能定位分布：FUNC_TYPE_VALUE 命中维度即计数（一片可命中多维，按全量批次统计不随筛选变化）；
        未命中任何维度（含空值）计入 other；随批次联动 */
    const funcRows = computed<{ key: FuncRowKey; count: number }[]>(() => {
      const counts = new Map<FuncRowKey, number>(FUNC_KEYS.map((k) => [k, 0] as [FuncRowKey, number]));
      counts.set('other', 0);
      for (const f of areas.value?.features ?? []) {
        const flags = funcFlags(f.properties.FUNC_TYPE_VALUE);
        let hit = false;
        for (const k of FUNC_KEYS) {
          if (flags[k]) {
            counts.set(k, (counts.get(k) ?? 0) + 1);
            hit = true;
          }
        }
        if (!hit) counts.set('other', (counts.get('other') ?? 0) + 1);
      }
      const ordered: FuncRowKey[] = [...FUNC_KEYS, 'other'];
      return ordered.map((key) => ({ key, count: counts.get(key) ?? 0 }));
    });

    /** 三色图数据：AREA_COLOR 计数占比（当前批次；数据未就绪为空，组件用内置兜底） */
    const progressRows = computed(() => (areas.value ? progressItems(areas.value) : []));

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

              {/* 行政区划 tab：片区行政区划分布荧光柱状图（当前批次接口数据按区划计数，区划全量）
                  推进情况 tab：片区推进情况三色图（AREA_COLOR 计数占比，恒绿/黄/红三段）
                  功能定位 tab：片区功能定位分布（FUNC_TYPE_VALUE 解析的各导向维度片区数）
                  三图均可点击筛选：列表与右侧地图联动（行政区划=展开对应区收起其余，其余=列表仅留命中片区） */}
              {activeRegionKey.value === 'district' ? (
                <DistrictChart rows={chartRows.value} activeName={chartFilter.value} onSelect={onChartSelect} />
              ) : activeRegionKey.value === 'progress' ? (
                <ProgressChart
                  items={progressRows.value.length ? progressRows.value : undefined}
                  activeKey={chartFilter.value}
                  onSelect={onChartSelect}
                />
              ) : (
                <FuncTypeChart
                  rows={funcRows.value}
                  activeKey={chartFilter.value as FuncKey}
                  onSelect={onChartSelect}
                />
              )}

              <div class="flex items-center mt-16px">
                <img class="size-32px" src={arrow1Svg} />

                <div class="ml-12px text-16px font-500 text-white">更新片区列表</div>

                <div class="ml-auto text-14px text-gray-500">2026-05-21</div>
              </div>

              <div class="mt-16px space-y-12px max-h-500px overflow-y-auto scrollbar-none">
                {/* 折叠分组：三个 tab 共用的各区真实片区名单（随批次联动，仅上方图表随 tab 切换）；
                    key 含筛选值 —— GlowCollapse 非受控展开，重挂载以应用「选中区展开、其余收起」 */}
                <CollapseGroups key={listKey.value} groups={groups.value} isRound panelClass="rd-8px">
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

                {/* 更新片区面：当前批次接口数据（筛选生效时仅命中要素，TopoJSON/WKT 解码还原），批次切换 setData 刷新 */}
                <AreaLayers areas={mapAreas.value} />
              </VMap>
            </>
          ),
        }}
      </DisplayPageLayout>
    );
  },
});
