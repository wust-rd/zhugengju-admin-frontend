import { computed, defineComponent, onMounted, ref, watch } from 'vue';
import { message, type MenuItemType } from 'antdv-next';
import { cn } from '@jeesite/core/libs';
import { CollapseGroups, type CollapseGroupItem } from '@jeesite/display/components/collapse-groups';
import { CornerItem, CornerPanelRow } from '@jeesite/display/components/corner-panel';
import { GlowTabs } from '@jeesite/display/components/glow-tabs';
import { DisplayPageLayout } from '@jeesite/display/components/page-layout';
import { SearchFilter } from '@jeesite/display/components/search-filter';
import { VMap, VMapControls, basemapStyle, basemapMapOptions } from '@jeesite/vmap';
import { indicatorListBySet } from '@jeesite/urban-health-check/api/urban-health-check/urban/indicator';
import {
  overviewResultRows,
  overviewSurveyByYear,
  overviewSystemList,
  type OverviewResultRow,
  type OverviewSystemOption,
  type OverviewSurveyQuestion,
} from '@jeesite/urban-health-check/api/urban-health-check/urban/overview';
import {
  indicatorSpatialGeojson,
  spaceBaseGeojson,
  DIM_SPACE_TYPES,
  type SpaceFeatureCollection,
} from '@jeesite/urban-health-check/api/urban-health-check/urban/space-map';
import { RatingResult, type RatingDatum } from './rating-result';
import { SatisfactionSurvey, type SatisfactionItem } from './satisfaction-survey';
import { TopFilter } from './top-filter';
import { CityCheckMapLayers } from './map-layers';

/**
 * 评估结果五档（后端字典：很好 / 较好 / 一般 / 不足 / 无标准）：
 * 「指标评价结果」饼图、行评级色、筛选下拉共用同一顺序与色系。
 * evaluateResult 为空（已填报但不可评估）归入 无标准 档。
 */
const EVAL_TIERS = [
  { key: '很好', color: '#22D3EE' },
  { key: '较好', color: '#4ADE80' },
  { key: '一般', color: '#FBBF24' },
  { key: '不足', color: '#F472B6' },
  { key: '无标准', color: '#CBD5E1' },
] as const;

/** 指标项 + 结果联表行（indicatorItem 表2 骨架，按 itemNo 挂接表6 结果值） */
type JoinedRow = {
  id?: string; // 表2 指标项主键（问题图斑接口的 indicatorItemId）
  itemNo: number;
  dim1: string; // 一级维度（空归「其他」）
  dim2: string; // 二级维度（空归「其他」）
  name: string;
  unit?: string;
  result?: OverviewResultRow; // 表6 结果行（体系刚建无结果时缺省）
};

/** 指标值 → 展示文本：去尾零，拼单位（如 1393栋 / 77.8%），无值占位 -- */
function formatValue(value: number | null | undefined, unit?: string): string {
  if (value == null) return '--';
  const n = Number(value);
  const text = Number.isInteger(n) ? String(n) : String(parseFloat(n.toFixed(2)));
  return unit ? `${text}${unit}` : text;
}

export default defineComponent({
  name: 'ViewsUrbanHealthCheckOverview',
  setup() {
    // 沉浸式全屏由布局按路由自动判定（new-header 的 isDisplayRoute），页面无需拨开关

    // —— 顶部筛选：年份 + 指标体系（选项均来自后端 indicatorSet/page）——
    const systems = ref<OverviewSystemOption[]>([]);
    const yearKey = ref('');
    const systemKey = ref('');

    // 年份下拉：体系年份去重倒序（有数据的年份优先，非固定近 N 年）
    const yearItems = computed<MenuItemType[]>(() => {
      const years = [...new Set(systems.value.map((s) => s.year).filter((y): y is string => !!y))];
      years.sort((a, b) => Number(b) - Number(a));
      return years.map((y) => ({ key: y, label: `${y} 年` }));
    });

    // 指标体系下拉：当前年份下的体系（label 用体系名称，兜底业务编码）
    const systemItems = computed<MenuItemType[]>(() =>
      systems.value
        .filter((s) => s.year === yearKey.value)
        .map((s) => ({ key: s.id ?? '', label: s.indicatorName || s.code || '未命名体系' })),
    );

    onMounted(async () => {
      try {
        systems.value = await overviewSystemList();
        // 默认选中：优先启用体系所在年份，否则最新年份
        const preferred = systems.value.find((s) => s.enabled === '1') ?? systems.value[0];
        yearKey.value = preferred?.year ?? '';
      } catch (e) {
        console.error('[城市体检总览] 指标体系加载失败', e);
      }
    });

    // —— 满意度调查（按体检年份加载全量问题，展示时按一级维度 tab 过滤）——
    const surveyQuestions = ref<OverviewSurveyQuestion[]>([]);
    let surveyToken = 0;

    // —— 指标项 + 结果联表（按体系主键加载）——
    const rows = ref<JoinedRow[]>([]);
    const loadingRows = ref(false);
    let rowsToken = 0;

    watch(yearKey, (year) => {
      // 年份切换：体系默认取该年份下启用体系，否则第一套（联动触发 systemKey 加载）
      const list = systems.value.filter((s) => s.year === year);
      systemKey.value = (list.find((s) => s.enabled === '1') ?? list[0])?.id ?? '';

      // 满意度调查随年份加载（问题行带 firstDimensionName，供 tab 过滤；年份为空不发请求）
      const token = ++surveyToken;
      if (year) {
        overviewSurveyByYear(year)
          .then((questions) => {
            if (token !== surveyToken) return;
            surveyQuestions.value = questions;
          })
          .catch((e) => console.error('[城市体检总览] 满意度调查加载失败', e));
      }
    });

    watch(systemKey, async (setId) => {
      const token = ++rowsToken;
      rows.value = [];
      if (!setId) return;
      loadingRows.value = true;
      try {
        // 表2 维度骨架 + 表6 结果值并行拉取，按 itemNo 前端联表
        const [items, results] = await Promise.all([indicatorListBySet(setId), overviewResultRows(setId)]);
        if (token !== rowsToken) return;
        const resultMap = new Map(results.map((r) => [String(r.itemNo), r]));
        rows.value = items.map((it) => ({
          id: it.id,
          itemNo: Number(it.code),
          dim1: it.dim1 || '其他',
          dim2: it.dim2 || '其他',
          name: it.indicatorName || '',
          unit: it.unit,
          result: resultMap.get(String(it.code)),
        }));
      } catch (e) {
        console.error('[城市体检总览] 指标项结果加载失败', e);
      } finally {
        if (token === rowsToken) loadingRows.value = false;
      }
    });

    // —— 一级维度 tabs：联表行首次出现顺序（即 itemNo 序）——
    const dimTabs = computed(() => {
      const seen = new Set<string>();
      const tabs: { key: string; label: string }[] = [];
      for (const r of rows.value) {
        if (!seen.has(r.dim1)) {
          seen.add(r.dim1);
          tabs.push({ key: r.dim1, label: r.dim1 });
        }
      }
      return tabs;
    });

    const activeDim = ref('');
    watch(
      dimTabs,
      (tabs) => {
        // 当前 tab 不在新体系的一级维度中时回落到第一个
        if (!tabs.some((t) => t.key === activeDim.value)) activeDim.value = tabs[0]?.key ?? '';
      },
      { immediate: true },
    );

    // —— 居民满意度调查条目：跟随当前一级维度 tab（问题行按 firstDimensionName 过滤；
    // 未标维度的问题视为通用，所有 tab 都展示；名称优先取关联指标名，兜底问题原文）——
    const satisfactionItems = computed<SatisfactionItem[]>(() =>
      surveyQuestions.value
        .filter((q) => !q.firstDimensionName || q.firstDimensionName === activeDim.value)
        .map((q) => ({
          key: q.id ?? String(q.sortNo ?? ''),
          name: q.indicatorItemName || q.questionText || '',
          rate: q.satisfactionRate ?? null,
        })),
    );

    // —— 地图基础图层：一级维度 tab → 绑定对象类型（城区-district / 街区-street /
    // 社区-community / 住房-building+village），切 tab 清叠加并重新铺满视口 ——
    const baseLayer = ref<SpaceFeatureCollection | null>(null);
    let baseToken = 0;

    // —— 地图指标叠加：点击指标行叠加该指标的问题图斑（点/线/面），再点同一行取消 ——
    const overlayLayer = ref<SpaceFeatureCollection | null>(null);
    const activeItemNo = ref<number | null>(null);
    // 全局选中行 key（= 行 seq，与 CornerPanelRow 的 data-corner-key 一致）：
    // 传给所有分组面板实现"整个列表最多选中一行"，其他分组的高亮自动清除
    const activeRowKey = ref('');
    let overlayToken = 0;

    watch(activeDim, () => {
      const token = ++baseToken;
      overlayLayer.value = null;
      activeItemNo.value = null;
      activeRowKey.value = '';
      const types = activeDim.value ? DIM_SPACE_TYPES[activeDim.value] : undefined;
      if (!types?.length) {
        baseLayer.value = null;
        return;
      }
      spaceBaseGeojson(types)
        .then((fc) => {
          if (token === baseToken) baseLayer.value = fc;
        })
        .catch((e) => console.error('[城市体检总览] 基础图层加载失败', e));
    });

    function handleRowClick(row: JoinedRow) {
      if (!row.id) return;
      if (activeItemNo.value === row.itemNo) {
        activeItemNo.value = null;
        activeRowKey.value = '';
        overlayLayer.value = null;
        return;
      }
      activeItemNo.value = row.itemNo;
      activeRowKey.value = String(row.itemNo).padStart(2, '0');
      const token = ++overlayToken;
      indicatorSpatialGeojson(row.id)
        .then((fc) => {
          if (token !== overlayToken) return;
          // 全库仅部分指标有空间图斑数据（住房维度只有 1 个）：
          // 拉回空结果时给出明确反馈并回退选中，避免"点了没东西"的困惑
          if (!fc.features?.length) {
            message.info('该指标暂无空间图斑数据');
            activeItemNo.value = null;
            activeRowKey.value = '';
            overlayLayer.value = null;
            return;
          }
          overlayLayer.value = fc;
        })
        .catch((e) => console.error('[城市体检总览] 指标问题图斑加载失败', e));
    }

    // —— 指标评价结果：跟随当前一级维度 tab（evaluateResult 空归 无标准）——
    // 当前 tab 下的行集合（饼图分布与环心指标总数共用）
    const scopedRows = computed(() =>
      activeDim.value ? rows.value.filter((r) => r.dim1 === activeDim.value) : rows.value,
    );
    const ratingData = computed<RatingDatum[]>(() => {
      const counts = new Map<string, number>(EVAL_TIERS.map((t) => [t.key, 0]));
      for (const r of scopedRows.value) {
        const tier = r.result?.evaluateResult || '无标准';
        counts.set(tier, (counts.get(tier) ?? 0) + 1);
      }
      const total = scopedRows.value.length;
      return EVAL_TIERS.map((t) => ({
        key: t.key,
        label: t.key,
        value: total === 0 ? 0 : Math.round(((counts.get(t.key) ?? 0) / total) * 1000) / 10,
        color: t.color,
      }));
    });

    // —— 搜索 + 评估结果筛选（作用于二级维度列表行）——
    const searchKey = ref('');
    const ratingKey = ref<string | number | null>(null);

    // —— 二级维度分组列表：activeDim 下的行按 dim2 分组，行 = 指标值 + 评估结果 ——
    // 行数据额外携带 JoinedRow（row 隐藏字段），供行点击叠加问题图斑时定位指标项主键
    type RowItem = CornerItem & { row: JoinedRow };
    const bottomGroups = computed<CollapseGroupItem<RowItem>[]>(() => {
      const keyword = searchKey.value.trim();
      const groups: CollapseGroupItem<RowItem>[] = [];
      for (const r of rows.value) {
        if (r.dim1 !== activeDim.value) continue;
        if (keyword && !r.name.includes(keyword)) continue;
        if (ratingKey.value != null && (r.result?.evaluateResult || '无标准') !== ratingKey.value) continue;
        let group = groups.find((g) => g.title === r.dim2);
        if (!group) {
          group = { title: r.dim2, items: [] };
          groups.push(group);
        }
        group.items.push({
          seq: String(r.itemNo).padStart(2, '0'),
          label: r.name,
          value: formatValue(r.result?.resultValue, r.unit),
          rating: r.result?.evaluateResult || '无标准',
          row: r,
        });
      }
      return groups.map((g) => ({ ...g, badgeValue: g.items.length }));
    });

    return () => (
      <DisplayPageLayout collapsible={false}>
        {{
          left: () => (
            <>
              {/* 顶部筛选行：年份 + 指标体系（选项后端拉取） */}
              <TopFilter
                v-model:yearKey={yearKey.value}
                v-model:indicatorKey={systemKey.value}
                yearItems={yearItems.value}
                indicatorItems={systemItems.value}
              />

              {/* 一级维度 tabs：GlowTabs 直接渲染文字 tab（无图标）；tab 集合变化时重挂载让指示器重测位置 */}
              {dimTabs.value.length > 0 && (
                <GlowTabs
                  key={dimTabs.value.map((t) => t.key).join('|')}
                  activeKey={activeDim.value}
                  class="mt-16px"
                  onUpdate:activeKey={(key) => (activeDim.value = String(key))}
                >
                  {dimTabs.value.map((tab) => (
                    <div
                      key={tab.key}
                      data-glow-tab-key={tab.key}
                      class="flex-1 h-42px px-4px rd-10px flex items-center justify-center select-none cursor-pointer"
                    >
                      <div
                        class={cn(
                          'text-16px font-500 whitespace-nowrap transition-colors',
                          tab.key === activeDim.value ? 'text-white' : 'text-gray-500',
                        )}
                      >
                        {tab.label}
                      </div>
                    </div>
                  ))}
                </GlowTabs>
              )}

              {/* 指标评价结果：环形饼图（当前 tab 五档占比，随数据重绘），环心默认显示指标总数 */}
              <RatingResult ratingData={ratingData.value} total={scopedRows.value.length} />

              {/* 居民满意度调查：名称 + 满意率渐变进度条（按年份加载，无月粒度下拉） */}
              <SatisfactionSurvey items={satisfactionItems.value} />

              {/* 搜索筛选行：指标名关键字 + 评估结果五档筛选（清除 = 全部） */}
              <SearchFilter
                v-model:value={searchKey.value}
                v-model:activeKey={ratingKey.value}
                items={EVAL_TIERS.map((t) => ({ key: t.key, label: t.key }))}
                placeholder="搜索指标项名称"
                class="mt-16px"
              />

              <div class="mt-16px">
                {bottomGroups.value.length === 0 ? (
                  <div class="py-24px text-center text-14px text-gray-500">
                    {loadingRows.value ? '数据加载中…' : '暂无数据'}
                  </div>
                ) : (
                  // activeKey 受控：整个列表最多选中一行（跨分组互斥），行点击叠加/取消问题图斑
                  <CollapseGroups groups={bottomGroups.value} activeKey={activeRowKey.value}>
                    {{
                      row: (item) => (
                        // 行点击 → 叠加/取消该指标的问题图斑（CornerPanel 高亮由内部委托，不受包装层影响）
                        <div onClick={() => handleRowClick((item as RowItem).row)}>
                          <CornerPanelRow item={item as CornerItem} />
                        </div>
                      ),
                    }}
                  </CollapseGroups>
                )}
              </div>
            </>
          ),
          right: () => (
            <>
              {/* 右侧地图：VMap 内部创建/销毁 MapLibre 实例，底图为天地图（矢量 + 中文注记）。
                  空间图层逻辑组件在 VMap 插槽内（useMap 依赖注入）：基础图层随 tab、叠加随指标行点击 */}
              <VMap reuseMaps style={basemapStyle} options={basemapMapOptions}>
                <VMapControls class="absolute right-24px bottom-24px z-10" />
                <CityCheckMapLayers base={baseLayer.value} overlay={overlayLayer.value} />
              </VMap>
            </>
          ),
        }}
      </DisplayPageLayout>
    );
  },
});
