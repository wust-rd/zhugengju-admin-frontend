import arrow1Svg from '@jeesite/assets/svg/display/arrow1.svg';
import { ArtFont } from '@jeesite/display/components/art-font';
import { CollapseGroups, type CollapseGroupItem } from '@jeesite/display/components/collapse-groups';
import type { XodItem } from '@jeesite/display/components/corner-panel/xod-row';
import { DropdownSelector } from '@jeesite/display/components/dropdown-selector';
import { GlassRing } from '@jeesite/display/components/glass-ring';
import { type GlowTabItem } from '@jeesite/display/components/glow-tabs';
import { GlowTitle2 } from '@jeesite/display/components/glow-title/title2';
import { DisplayPageLayout } from '@jeesite/display/components/page-layout';
import { RegionTabs } from '@jeesite/display/components/region-tabs';
import { useMessage } from '@jeesite/core/hooks/web/useMessage';
import { useGo } from '@jeesite/core/hooks/web/usePage';
import { Input, type MenuItemType } from 'antdv-next';
import { CircleX, Search } from 'lucide-vue-next';
import { computed, defineComponent, ref, shallowRef, watch } from 'vue';
import { AreaLayers } from './area-layers';
import { AreaOverviewModal } from './area-overview-modal';
import { areaDetailPath } from './area-detail/route';
import { FuncTagRow } from './func-tag-row';
import { DistrictChart } from './district-chart';
import { FuncTypeChart, type FuncKey } from './func-type-chart';
import { InvestTotalCard, type BatchInvest } from './invest-total-card';
import { ProgressChart } from './progress-chart';
import {
  areaGroups,
  type AreaRow,
  BATCHES,
  type BatchKey,
  bboxOf,
  districtAreaCount,
  filterPredicate,
  funcFlags,
  loadAreas,
  loadProjects,
  progressItems,
  type AreaCollection,
  type ProjectCollection,
} from './area-data';
import type { FocusArea } from './area-layers';
import type { EspMapAreaRow } from '@jeesite/early-stage-planning/api/early-stage-planning/esp-map';
import { VMap, VMapControls, basemapStyle, basemapMapOptions } from '@jeesite/vmap';

// 区域 tabs：激活项由 RegionTabs 的 svg 发光胶囊指示器表达（按钮本身不再发光）
const regionTabs: GlowTabItem[] = [
  { key: 'district', label: '行政区划', icon: 'i-ri-road-map-line' },
  { key: 'progress', label: '推进情况', icon: 'i-ri-list-check-3' },
  { key: 'func', label: '功能定位', icon: 'i-ri-compass-3-line' },
];

/** 批次投资进度数据（业务口径数据；后端就绪后替换此处常量；全部 = 两批相加）
 *  口径：done = 已完成投资（累计完成）；plan2026 = 2026 年计划完成投资（2026年完成） */
const BATCH_INVEST: Record<'第一批' | '第二批' | '新增' | '全部', BatchInvest> = {
  第一批: { label: '第一批', total: 1310.71, done: 853.45, plan2026: 312.76 },
  第二批: { label: '第二批', total: 1934.09, done: 946.26, plan2026: 442.87 },
  // 新增批次（方案填报新增片区）当前 0 片，后端下发后替换为真实口径
  新增: { label: '新增', total: 0, done: 0, plan2026: 0 },
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
    /** 项目图斑（当前批次；地图放大层级 / 列表点片区聚焦时展示，样式参考投融建运） */
    const projects = shallowRef<ProjectCollection | null>(null);
    /** 当前选中批次（'第一批' | '第二批' | '全部'，见 area-data.BatchKey） */
    const activeBatch = ref<string>('全部');
    /** 各批次片区数（下拉 label 回显；批次数据加载完成后补充） */
    const batchCounts = shallowRef<Partial<Record<string, number>>>({});
    const batches = computed<MenuItemType[]>(() =>
      BATCHES.map((b) => ({ key: b, label: batchCounts.value[b] != null ? `${b} ${batchCounts.value[b]}` : b })),
    );

    const { showMessage } = useMessage();
    const go = useGo();

    /** activeBatch 规整为合法 BatchKey（异常值兜底第一批） */
    const batchKey = computed<BatchKey>(() =>
      BATCHES.includes(activeBatch.value as BatchKey) ? (activeBatch.value as BatchKey) : '第一批',
    );

    /** 请求当前批次全部片区（geometry 解码由 loadAreas 内完成；
        竞态保护：批次快速切换时只认最后一次请求的结果）；
        项目图斑随后台并加载（辅助数据，失败静默） */
    let loadSeq = 0;
    async function applyBatch(batch: BatchKey) {
      const seq = ++loadSeq;
      projects.value = null;
      loadProjects(batch)
        .then((pfc) => {
          if (seq === loadSeq) projects.value = pfc;
        })
        .catch(() => {});
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

    /** 初始化各批次计数：额外发一次全量请求按行 BATCH 归类（第一批/第二批/新增/全部），
        使下拉各档位一开始就带数量；结果同时充当「全部」档缓存（loadAreas 去重，不重复请求）。
        新增填报片区（is_approve='2'）不在全量响应内，计数恒 0，后端支持后选中该档时由 applyBatch 回填 */
    loadAreas('全部')
      .then((fc) => {
        const counts: Record<string, number> = { 全部: fc.features.length, 新增: 0 };
        for (const f of fc.features) {
          const b = f.properties.BATCH;
          counts[b] = (counts[b] ?? 0) + 1;
        }
        batchCounts.value = { ...batchCounts.value, ...counts };
      })
      .catch(() => {
        // 计数失败静默：不影响当前批次加载（applyBatch 有独立错误提示），选中对应批次时再回填
      });

    // ---- 图表点击筛选（值随 tab 维度：district → 区划名；progress → 颜色；func → 维度 key） ----
    const chartFilter = ref<string | null>(null);
    /** activeRegionKey 规整为三个统计维度之一（filterPredicate / 数据管道用） */
    const regionKey = computed<'district' | 'progress' | 'func'>(() =>
      activeRegionKey.value === 'district' || activeRegionKey.value === 'progress' ? activeRegionKey.value : 'func',
    );
    /** 片区聚焦（列表点击片区行）：飞到该片区并只显示其项目图斑；再点同一行取消 */
    const focusArea = shallowRef<FocusArea | null>(null);

    /** 切换 tab / 批次时清除筛选（跨维度筛选值无意义，且换批次后语义易错位），并取消片区聚焦 */
    watch([activeRegionKey, batchKey], () => {
      chartFilter.value = null;
      focusArea.value = null;
    });
    /** 地图飞行令牌：图表筛选设置/取消时递增，AreaLayers 收到后 fitBounds 到当前要素范围 */
    const fitToken = ref(0);

    /** 统计图点击回调：再点同一项取消；null 为图表空白点击取消（图表筛选与片区聚焦互斥） */
    function onChartSelect(value: string | null) {
      chartFilter.value = value === null ? null : chartFilter.value === value ? null : value;
      focusArea.value = null;
      fitToken.value += 1;
    }

    function onAreaRowClick(item: AreaRow) {
      if (!item.auid || focusArea.value?.auid === item.auid) {
        focusArea.value = null;
        return;
      }
      const f = areas.value?.features.find((ft) => ft.properties.A_UID === item.auid);
      const bbox = f ? bboxOf([f]) : null;
      focusArea.value = bbox ? { auid: item.auid, bbox } : null;
    }

    /** 地图点选片区（A_UID → 片区概况面板；null = 地图空白点击收起）。
        数据源取当前批次的 mapAreas（与地图所见一致；图表筛选后仍可点选命中片区） */
    const pickedArea = shallowRef<AreaCollection['features'][number] | null>(null);
    function onMapPick(auid: string | null) {
      if (auid == null) {
        pickedArea.value = null;
        return;
      }
      pickedArea.value = mapAreas.value?.features.find((f) => f.properties.A_UID === auid) ?? null;
    }

    /** 概况面板「查看详情」：跳片区详情路由页（:id = 片区 A_UID） */
    function openAreaDetail() {
      const auid = pickedArea.value?.properties.A_UID;
      if (!auid) return;
      go(areaDetailPath(auid));
    }

    /** 筛选命中的要素（地图渲染用，三个 tab 均过滤；null = 全量） */
    const mapAreas = computed<AreaCollection | null>(() => {
      if (!areas.value || !chartFilter.value) return areas.value;
      const pred = filterPredicate(regionKey.value, chartFilter.value);
      return { ...areas.value, features: areas.value.features.filter(pred) };
    });

    /** 项目图斑渲染数据：图表筛选生效时只保留命中片区内的项目（与片区面口径一致） */
    const projectsShown = computed<ProjectCollection | null>(() => {
      if (!projects.value || !mapAreas.value || !chartFilter.value) return projects.value;
      const auids = new Set(
        mapAreas.value.features.map((f) => f.properties.A_UID).filter((v): v is string => v != null),
      );
      return {
        ...projects.value,
        features: projects.value.features.filter((f) => f.properties.A_UID != null && auids.has(f.properties.A_UID)),
      };
    });

    /** 列表分组数据：行政区划 tab 保持全量分组（点击只控制展开态）；
        推进情况 / 功能定位 tab 仅保留命中片区分组 */
    /** 片区名称模糊筛选关键字（纯前端本地过滤，空串 = 不过滤） */
    const searchKeyword = ref('');

    const groups = computed<CollapseGroupItem<XodItem>[]>(() => {
      const src = areas.value;
      if (!src) return [];
      const list = regionKey.value === 'district' ? src : (mapAreas.value ?? src);
      const kw = searchKeyword.value.trim().toLowerCase();
      return areaGroups(list)
        .map((g) => ({ ...g, items: kw ? g.items.filter((i) => i.label.toLowerCase().includes(kw)) : g.items }))
        .filter((g) => g.items.length > 0)
        .map((g) =>
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

                {/* 片区名称模糊筛选（纯前端，本地过滤当前列表；样式对齐 SearchFilter 的暗色输入框） */}
                <Input
                  value={searchKeyword.value}
                  classes={{
                    root: '!bg-white/6 !border-gray-500 focus-within:!border-cyan-500 ml-auto w-168px h-32px text-white !rd-8px',
                    input: 'placeholder:!text-gray-500 text-14px',
                  }}
                  prefix={<Search class="size-16px text-gray-400" />}
                  placeholder="输入片区名称"
                  allowClear
                  onUpdate:value={(v: any) => (searchKeyword.value = String(v ?? ''))}
                >
                  {{
                    clearIcon: () => <CircleX class="size-16px text-gray-400" />,
                  }}
                </Input>
              </div>

              <div class="mt-16px space-y-12px max-h-500px overflow-y-auto scrollbar-none">
                {/* 折叠分组：三个 tab 共用的各区真实片区名单（随批次联动，仅上方图表随 tab 切换）；
                    key 含筛选值 —— GlowCollapse 非受控展开，重挂载以应用「选中区展开、其余收起」 */}
                <CollapseGroups key={listKey.value} groups={groups.value} isRound panelClass="rd-8px">
                  {{
                    row: (item) => (
                      <FuncTagRow item={item as XodItem} onClick={() => onAreaRowClick(item as AreaRow)} />
                    ),
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
                {/* 更新片区面：当前批次接口数据（筛选生效时仅命中要素），fill-color 按当前 tab 维度
                    match 着色（行政区划=批次双色 / 推进情况=三色 / 功能定位=首个编码色），左下角图例；
                    项目图斑放大到 13 级自动显示，列表点击片区聚焦飞行并只显示其项目 */}
                <AreaLayers
                  areas={mapAreas.value}
                  colorBy={regionKey.value}
                  fitToken={fitToken.value}
                  projects={projectsShown.value}
                  focus={focusArea.value}
                  highlight={(pickedArea.value?.properties.A_UID as string | undefined) ?? null}
                  onPick={onMapPick}
                />

                {/* 片区概况面板：地图点击片区弹出（点空白/关闭按钮收起；「查看详情」进详情页） */}
                {pickedArea.value && (
                  <AreaOverviewModal
                    area={pickedArea.value.properties as Omit<EspMapAreaRow, 'geometry'>}
                    onClose={() => (pickedArea.value = null)}
                    onDetail={openAreaDetail}
                  />
                )}
              </VMap>
            </>
          ),
        }}
      </DisplayPageLayout>
    );
  },
});
