import { cn } from '@jeesite/core/libs';
import {
  useMap,
  useMapLayer,
  VMap,
  VMapControls,
  VMarker,
  VMarkerContent,
  basemapStyle,
  basemapMapOptions,
} from '@jeesite/vmap';
import { computed, defineComponent, onBeforeUnmount, onMounted, reactive, shallowRef, watch, type PropType } from 'vue';
import {
  RELIC_LEVELS,
  loadRelics,
  relicLevelOf,
  type Relic,
} from '@jeesite/urban-protection/api/urban-protection/relic';
import {
  CITY_SCOPE_LAYERS,
  cityScopeFillLayerId,
  cityScopeLineLayerId,
  loadCityScopeLayers,
  type CityScopeFeatureProps,
  type CityScopeKind,
  type CityScopeLayerData,
} from '@jeesite/urban-protection/api/urban-protection/city-scope';
import { RelicCard } from './relic-card';
import { ScopeCard, type SelectedCityScope } from './scope-card';
import { DisplayPageLayout } from '@jeesite/display/components/page-layout';
import { UrbanProtectionDistrictBar } from './district-bar';
import { UrbanProtectionTrendLine } from './trend-line';
import { UrbanProtectionStatusDonut } from './status-donut';
import { RightInfoPanels } from './right-info-panels';

/** 各级别点位尺寸（国家级最大、市级最小，一眼可分） */
const LEVEL_DOT_SIZE: Record<string, string> = {
  [RELIC_LEVELS[0].value]: 'size-20px',
  [RELIC_LEVELS[1].value]: 'size-15px',
};
const DEFAULT_DOT_SIZE = 'size-12px';

/**
 * 地图逻辑子组件（纯逻辑，不渲染 DOM）：
 * 必须在 <VMap> 插槽内使用 —— useMap() 依赖 VMap 注入的地图上下文。
 * - 点击地图空白处（非 Marker / 控件 / 范围面）→ 通知父级关闭右侧信息卡片。
 */
const RelicMapLogic = defineComponent({
  name: 'RelicMapLogic',
  emits: {
    mapClick: () => true,
  },
  setup(_props, { emit }) {
    const { map, isLoaded } = useMap();

    // 点击地图空白处：关闭右侧信息卡片。
    // Marker / 控件是地图容器内的 DOM，click 会冒泡到容器再触发 map click，
    // 需按事件源过滤；点在名城范围面上时交给范围面点击逻辑（选中弹卡），也不关闭。
    useMapLayer(map, isLoaded, (m) => {
      const onClick = (e: maplibregl.MapMouseEvent) => {
        const target = e.originalEvent.target as Element | null;
        if (target?.closest?.('.maplibregl-marker, .maplibregl-ctrl')) return;
        const scopeIds = CITY_SCOPE_LAYERS.map((l) => cityScopeFillLayerId(l.sourceId)).filter((id) => m.getLayer(id));
        if (scopeIds.length > 0 && m.queryRenderedFeatures(e.point, { layers: scopeIds }).length > 0) return;
        emit('mapClick');
      };
      m.on('click', onClick);
      return () => m.off('click', onClick);
    });

    return () => null;
  },
});

/**
 * 名城范围线图层子组件（纯逻辑，必须在 <VMap> 插槽内使用）：
 * - 数据就绪后 addSource + fill/line 图层（geojson source 内联在 style 里不渲染，必须 load 后动态添加）；
 * - visible 控制三类图层显隐（图例开关联动）；
 * - 点击面要素 → queryRenderedFeatures 命中后 emit select（父级弹右侧卡片）；
 * - 悬停面要素切手型光标。
 */
const CityScopeLayers = defineComponent({
  name: 'CityScopeLayers',

  props: {
    layers: { type: Array as PropType<CityScopeLayerData[]>, default: () => [] },
    visible: { type: Object as PropType<Record<CityScopeKind, boolean>>, required: true },
    /** 当前选中范围面（null 表示未选中），联动 feature-state 高亮 */
    selected: { type: Object as PropType<SelectedCityScope | null>, default: null },
  },

  emits: {
    select: (payload: SelectedCityScope) => !!payload,
  },

  setup(props, { emit }) {
    const { map, isLoaded } = useMap();

    /** 当前已添加的范围面 fill 图层 id（点击 / 光标 / 空白判定需过滤不存在的图层） */
    const fillLayerIds = (m: maplibregl.Map) =>
      CITY_SCOPE_LAYERS.map((l) => cityScopeFillLayerId(l.sourceId)).filter((id) => m.getLayer(id));

    // 事件监听交给 useMapLayer 托管（setStyle 换底图时自动注销、重挂）
    useMapLayer(map, isLoaded, (m) => {
      const onClick = (e: maplibregl.MapMouseEvent) => {
        // 文物点 / 控件是地图容器内的 DOM，click 会冒泡触发 map click：
        // 点与面重叠时点击点，只走 Marker 自己的点击（弹文物卡片），不当作点在面上。
        const target = e.originalEvent.target as Element | null;
        if (target?.closest?.('.maplibregl-marker, .maplibregl-ctrl')) return;
        const ids = fillLayerIds(m);
        if (ids.length === 0) return;
        const [hit] = m.queryRenderedFeatures(e.point, { layers: ids });
        if (!hit) return;
        const def = CITY_SCOPE_LAYERS.find((l) => cityScopeFillLayerId(l.sourceId) === hit.layer.id);
        if (!def) return;
        emit('select', { def, props: hit.properties as CityScopeFeatureProps });
      };
      const onMouseMove = (e: maplibregl.MapMouseEvent) => {
        const ids = fillLayerIds(m);
        const over = ids.length > 0 && m.queryRenderedFeatures(e.point, { layers: ids }).length > 0;
        m.getCanvas().style.cursor = over ? 'pointer' : '';
      };
      m.on('click', onClick);
      m.on('mousemove', onMouseMove);
      return () => {
        m.off('click', onClick);
        m.off('mousemove', onMouseMove);
      };
    });

    // paint 内联 feature-state 表达式：selected 面加深填充 + 加粗白描边，其余维持常规样式
    // （表达式须内联书写以获得 paint 属性的上下文元组类型，提出共享常量会丢失类型）

    // 数据 / 地图就绪 → 补齐 source 与图层；visible 变化 → 同步显隐。
    // setStyle 换底图会清空 layers/sources，isLoaded 重新变 true 后这里会再次补齐。
    watch(
      [() => props.layers, () => ({ ...props.visible }), map, isLoaded],
      ([layers, visible, m, loaded]) => {
        if (!m || !loaded) return;
        for (const { def, fc } of layers) {
          if (!m.getSource(def.sourceId)) {
            // 自定义轻量 GeoJSON 类型与 spec 的 FeatureCollection 结构兼容，此处按 spec 断言
            m.addSource(def.sourceId, { type: 'geojson', data: fc as any });
            m.addLayer({
              id: cityScopeFillLayerId(def.sourceId),
              type: 'fill',
              source: def.sourceId,
              paint: {
                'fill-color': def.color,
                'fill-opacity': ['case', ['boolean', ['feature-state', 'selected'], false], 0.5, 0.3],
              },
            });
            m.addLayer({
              id: cityScopeLineLayerId(def.sourceId),
              type: 'line',
              source: def.sourceId,
              paint: {
                'line-color': ['case', ['boolean', ['feature-state', 'selected'], false], '#FFFFFF', def.lineColor],
                'line-width': ['case', ['boolean', ['feature-state', 'selected'], false], 5, 3],
                'line-opacity': 1,
              },
            });
          }
          const visibility = visible[def.kind] ? 'visible' : 'none';
          m.setLayoutProperty(cityScopeFillLayerId(def.sourceId), 'visibility', visibility);
          m.setLayoutProperty(cityScopeLineLayerId(def.sourceId), 'visibility', visibility);
        }
      },
      { immediate: true, flush: 'post' },
    );

    // 选中变化 → 迁移 feature-state 高亮：清上一个、亮当前（source 尚未就绪时忽略，由上方补齐 watch 后手点触发）
    watch(
      [() => props.selected, map, isLoaded],
      ([sel, m, loaded], prev) => {
        if (!m || !loaded) return;
        const prevSel = prev?.[0];
        if (prevSel && m.getSource(prevSel.def.sourceId)) {
          m.setFeatureState({ source: prevSel.def.sourceId, id: prevSel.props.fid }, { selected: false });
        }
        if (sel && m.getSource(sel.def.sourceId)) {
          m.setFeatureState({ source: sel.def.sourceId, id: sel.props.fid }, { selected: true });
        }
      },
      { flush: 'post' },
    );

    // 卸载回收图层与数据源（getLayer/getSource 判空：setStyle 可能已移除）
    onBeforeUnmount(() => {
      const m = map.value;
      if (!m) return;
      for (const { sourceId } of CITY_SCOPE_LAYERS) {
        for (const id of [cityScopeFillLayerId(sourceId), cityScopeLineLayerId(sourceId)]) {
          if (m.getLayer(id)) m.removeLayer(id);
        }
        if (m.getSource(sourceId)) m.removeSource(sourceId);
      }
    });

    return () => null;
  },
});

export default defineComponent({
  name: 'ViewsUrbanProtectionRelicMap',

  setup() {
    // 沉浸式全屏由布局按路由自动判定（new-header 的 isDisplayRoute），页面无需拨开关

    /** 文物清单（本地 JSON 加载，接入接口后替换 loadRelics 即可） */
    const relics = shallowRef<Relic[]>([]);

    /** 三类名城范围线（本地 geojson，接入接口后替换 loadCityScopeLayers 即可） */
    const scopeLayers = shallowRef<CityScopeLayerData[]>([]);

    onMounted(async () => {
      try {
        const [relicList, scopeList] = await Promise.all([loadRelics(), loadCityScopeLayers()]);
        relics.value = relicList;
        scopeLayers.value = scopeList;
      } catch (e) {
        // 数据加载失败保持空地图（不抛未处理 Promise），控制台留痕便于排查
        console.error('[relic-map] 数据加载失败', e);
      }
    });

    /** 各类范围线图层显隐（图例行点击切换） */
    const scopeVisible = reactive<Record<CityScopeKind, boolean>>({
      historicUrbanArea: true,
      historicVillage: true,
      historicBlock: true,
    });

    /** 各级别文物点显隐（图例行点击切换；不在级别表中的空级别不受控） */
    const levelVisible = reactive<Record<string, boolean>>(
      Object.fromEntries(RELIC_LEVELS.map((l) => [l.value, true])),
    );

    /** 地图点位 = 图例级别显隐过滤结果 */
    const filteredRelics = computed(() => relics.value.filter((r) => levelVisible[r.level] ?? true));

    /** 当前选中文物：点击地图点位设置，展示右侧信息卡片（与范围面卡片互斥） */
    const selected = shallowRef<Relic | null>(null);

    /** 当前选中范围面：点击范围面设置，展示右侧信息卡片（与文物卡片互斥） */
    const selectedScope = shallowRef<SelectedCityScope | null>(null);

    /** 图例各级别计数（全量数据按级别统计，不随图例显隐变化） */
    const legendRows = computed(() =>
      RELIC_LEVELS.map((level) => ({
        ...level,
        count: relics.value.filter((r) => r.level === level.value).length,
      })),
    );

    return () => (
      <DisplayPageLayout collapsible={false}>
        {{
          left: () => (
            <>
              <UrbanProtectionDistrictBar />
              <UrbanProtectionTrendLine />
              <UrbanProtectionStatusDonut />
            </>
          ),
          right: () => (
            <div class="relative size-full overflow-hidden">
              {/* 地图：VMap 组件内部创建/销毁 MapLibre 实例，crs/center/zoom 走 options prop */}
              <VMap style={basemapStyle} options={basemapMapOptions}>
                <VMapControls class="absolute right-24px bottom-24px z-10" />

                <RelicMapLogic
                  onMapClick={() => {
                    selected.value = null;
                    selectedScope.value = null;
                  }}
                />

                {/* 名城范围线：三类面图层，点击面弹右侧信息卡片，selected 联动选中高亮，visible 随图例开关联动 */}
                <CityScopeLayers
                  layers={scopeLayers.value}
                  visible={scopeVisible}
                  selected={selectedScope.value}
                  onSelect={(payload) => {
                    selectedScope.value = payload;
                    selected.value = null;
                  }}
                />

                {/* 文物点位：级别决定颜色与尺寸，悬停显示名称，点击弹出右侧信息卡片 */}
                {filteredRelics.value.map((relic) => {
                  const level = relicLevelOf(relic.level);
                  return (
                    <VMarker
                      key={relic.id}
                      longitude={relic.lng}
                      latitude={relic.lat}
                      onClick={() => {
                        selected.value = relic;
                        selectedScope.value = null;
                      }}
                    >
                      <VMarkerContent>
                        <div class="group relative">
                          <div
                            class={cn(
                              'rd-full border-2 border-white/90 transition-transform group-hover:scale-125',
                              LEVEL_DOT_SIZE[relic.level] ?? DEFAULT_DOT_SIZE,
                            )}
                            style={{ background: level.color, boxShadow: `0 0 8px ${level.color}99` }}
                          />

                          <div class="pointer-events-none absolute left-1/2 top-full mt-4px -translate-x-1/2 rd-4px bg-[#0f2b47]/90 px-8px py-2px text-14px whitespace-nowrap text-white opacity-0 transition-opacity group-hover:opacity-100">
                            {relic.name}
                          </div>
                        </div>
                      </VMarkerContent>
                    </VMarker>
                  );
                })}
              </VMap>

              {/* 图例：文物级别颜色 + 当前筛选计数；名城范围线三类色块 + 显隐开关 */}
              <div class="absolute bottom-24px left-24px z-10 min-w-150px rd-8px border border-cyan-900 bg-[#0f2b47]/85 px-14px py-10px backdrop-blur">
                <div class="text-14px text-white/45">图例</div>

                {/* 文物级别：行点击切换该级别点位显隐（隐藏时整行降透明度），计数不随之变化 */}
                <div class="mt-8px space-y-6px">
                  {legendRows.value.map((row) => (
                    <div
                      key={row.value}
                      class={cn(
                        'flex cursor-pointer select-none items-center text-13px transition-opacity',
                        !levelVisible[row.value] && 'opacity-40',
                      )}
                      onClick={() => {
                        levelVisible[row.value] = !levelVisible[row.value];
                      }}
                    >
                      <div class="size-8px rd-full" style={{ background: row.color }} />
                      <div class="ml-8px text-white/70">{row.label}文物保护单位</div>
                      <div class="ml-auto font-500 text-white">{row.count}</div>
                    </div>
                  ))}
                </div>

                {/* 名城范围线：行点击切换该类图层显隐（隐藏时整行降透明度） */}
                <div class="mt-8px space-y-6px border-t border-white/10 pt-8px">
                  {scopeLayers.value.map(({ def, fc }) => (
                    <div
                      key={def.kind}
                      class={cn(
                        'flex cursor-pointer select-none items-center text-13px transition-opacity',
                        !scopeVisible[def.kind] && 'opacity-40',
                      )}
                      onClick={() => {
                        scopeVisible[def.kind] = !scopeVisible[def.kind];
                      }}
                    >
                      <div class="h-10px w-14px rd-2px" style={{ background: def.color }} />
                      <div class="ml-8px text-white/70">{def.label}</div>
                      <div class="ml-auto font-500 text-white">{fc.features.length}</div>
                    </div>
                  ))}
                </div>

                <div class="mt-8px flex items-center justify-between border-t border-white/10 pt-8px text-13px">
                  <span class="text-white/45">当前筛选</span>
                  <span class="font-500 text-white">{filteredRelics.value.length} 处</span>
                </div>
              </div>
              {/* 右侧信息栏：巡查完成率 / 优保建筑预警 / 政策法规（占位数据） */}
              <RightInfoPanels />
              {/* 右侧信息卡片：文物点位与名城范围面互斥展示，点击空白处/关闭按钮收起（弹卡时叠在信息栏之上） */}
              <RelicCard relic={selected.value} onClose={() => (selected.value = null)} />
              <ScopeCard scope={selectedScope.value} onClose={() => (selectedScope.value = null)} />
            </div>
          ),
        }}
      </DisplayPageLayout>
    );
  },
});
