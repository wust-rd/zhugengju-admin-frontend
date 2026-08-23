import arrow1Svg from '@jeesite/assets/svg/display/arrow1.svg';
import { useECharts } from '@jeesite/core/hooks/web/useECharts';
import { cn } from '@jeesite/core/libs';
import { ArtFont } from '@jeesite/display/components/art-font';
import { CornerPanel } from '@jeesite/display/components/corner-panel';
import { XodItem, XodRow } from '@jeesite/display/components/corner-panel/xod-row';
import { DoubleRing } from '@jeesite/display/components/double-ring';
import { DropdownSelector } from '@jeesite/display/components/dropdown-selector';
import { GlassRing } from '@jeesite/display/components/glass-ring';
import { GlowCollapse } from '@jeesite/display/components/glow-collapse';
import { GlowTabs, type GlowTabItem } from '@jeesite/display/components/glow-tabs';
import { GlowTitle2 } from '@jeesite/display/components/glow-title/title2';
import { DisplayPageLayout } from '@jeesite/display/components/page-layout';
import { LayerControls } from '@jeesite/display/components/layer-controls';
import { StatCard } from '@jeesite/display/components/stat-card';
import {
  VMap,
  VMapControls,
  VMapPopup,
  VMarker,
  VMarkerContent,
  VMarkerLabel,
  VMarkerPopup,
  VMarkerTooltip,
} from '@jeesite/vmap';
import { Tooltip, type MenuItemType } from 'antdv-next';
import type { Ref } from 'vue';
import { defineComponent, onMounted, ref, shallowRef } from 'vue';
import { RouterLink } from 'vue-router';
import { SchemeMapLayers } from './map-layers';

// 区域 tabs：激活项由 GlowTabs 的 svg 发光胶囊指示器表达（按钮本身不再发光）
const regionTabs: GlowTabItem[] = [
  { key: 'district', label: '行政区划', icon: 'i-ri-road-map-line' },
  { key: 'progress', label: '推进情况', icon: 'i-ri-list-check-3' },
];

/** 天地图子域名列表（t0~t7，多域名并行请求，突破浏览器并发限制） */
const TIANDITU_SUBDOMAINS = ['0', '1', '2', '3', '4', '5', '6', '7'];

/**
 * 构建天地图瓦片 URL 数组（DataServer REST 接口，CGCS2000 经纬度 _c 系列，EPSG:4490）
 * 配合 Map 的 crs: 'EPSG:4490' 使用；layer 传 'vec_c'/'cva_c'
 */
function tiandituTileUrls(layer: string): string[] {
  return TIANDITU_SUBDOMAINS.map(
    (s) =>
      `https://t${s}.tianditu.gov.cn/DataServer?T=${layer}&X={x}&Y={y}&L={z}&tk=${import.meta.env.VITE_TIANDITU_TOKEN}`,
  );
}

/** OSS 图片基础地址 */
const OSS_BASE = 'https://zhugengju-public.oss-cn-wuhan-lr.aliyuncs.com/片区策划';

// 片区概况
const PIANQU_IMG = `${OSS_BASE}/片区概况.webp`;

/** 天地图底图：矢量底图 + 中文注记叠加 */
const tiandituStyle: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'tianditu-vec': {
      type: 'raster',
      tiles: tiandituTileUrls('vec_c'),
      tileSize: 256,
      minzoom: 2,
      maxzoom: 18,
    },
    'tianditu-cva': {
      type: 'raster',
      tiles: tiandituTileUrls('cva_c'),
      tileSize: 256,
      minzoom: 2,
      maxzoom: 18,
    },
  },
  layers: [
    { id: 'tianditu-vec', type: 'raster', source: 'tianditu-vec' },
    { id: 'tianditu-cva', type: 'raster', source: 'tianditu-cva' },
  ],
};

export default defineComponent({
  name: 'DisplayScheme',
  setup() {
    /** 天地图原生构造选项（_c 系列瓦片为 CGCS2000 经纬度坐标系，CRS 切 EPSG:4490） */
    const mapOptions: Partial<maplibregl.MapOptions> = {
      crs: 'EPSG:4490',
      center: [114.2761773, 30.5344542] as [number, number], // 数据范围中心（武汉）
      zoom: 11,
    };

    /** 右侧抽屉（地图点击打开） */
    const drawerVisible = ref(false);
    const previewVisible = ref(false);
    /** 项目 tab 三个按钮点击后弹出的图片地址 */
    const projectPreviewSrc = ref('');

    /** 关闭预览弹窗 */
    const closePreview = () => {
      previewVisible.value = false;
      projectPreviewSrc.value = '';
    };

    const popupOpen = ref(false);

    // 区域 tabs 当前激活项（点击切换，单选）
    const activeRegionKey = ref<string>('district');

    // 指标分类下拉菜单项
    const batches: MenuItemType[] = [
      {
        key: '1',
        label: '第一批 80',
      },
      {
        key: '2',
        label: ' 第二批 120',
      },
    ];

    const activeBatch = ref('1');

    // 片区投资总额右侧环形图
    const chartRef = shallowRef<HTMLDivElement | null>(null);
    const { setOptions } = useECharts(chartRef as Ref<HTMLDivElement>);

    // 片区行政区划分布：荧光分段柱状图 + 折线
    const chart2Ref = shallowRef<HTMLDivElement | null>(null);
    const { setOptions: setOptions2 } = useECharts(chart2Ref as Ref<HTMLDivElement>);

    onMounted(() => {
      // —— 行政区划分布：三色渐变柱（浅蓝 → 青 → 金黄，从下往上）+ 值分隔格纹层 ——
      // 武汉市 13 个行政区（简称）
      const xAxisData = [
        '江岸',
        '江汉',
        '硚口',
        '汉阳',
        '武昌',
        '青山',
        '洪山',
        '东西湖',
        '汉南',
        '蔡甸',
        '江夏',
        '黄陂',
        '新洲',
      ];
      // 投资额（亿元）
      // 投资额（亿元）：与 13 个区一一对应
      const investData = [35, 62, 45, 78, 52, 90, 68, 55, 40, 72, 58, 83, 47];
      // 柱高上限
      const yMax1 = 100;

      setOptions2({
        grid: {
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        },
        xAxis: {
          type: 'category',
          data: xAxisData,
          axisLabel: {
            color: '#A2B0B8',
            fontSize: 12,
            interval: 0,
            margin: 10,
          },
          axisLine: {
            lineStyle: {
              color: 'rgba(255, 255, 255, 0.4)',
            },
          },
          axisTick: {
            alignWithLabel: true,
            lineStyle: {
              color: 'rgba(255, 255, 255, 0.4)',
              width: 2,
            },
            show: true,
          },
        },
        yAxis: {
          type: 'value',
          min: 0,
          max: yMax1,
          show: true,
          axisLine: { show: false },
          splitLine: {
            lineStyle: {
              color: 'rgba(31, 180, 255, 0.12)',
              type: 'solid',
              width: 1,
            },
          },
          axisLabel: { color: '#A2B0B8' },
          nameTextStyle: {
            color: '#A2B0B8',
            align: 'center',
            padding: [0, 10, 0, 0],
            fontSize: 12,
          },
        },
        series: [
          // 【渐变柱】从下往上：浅蓝 → 青 → 金黄（y 从 1 到 0，offset 0 在底部）
          {
            name: '投资额',
            type: 'bar',
            barWidth: 12,
            z: 10,
            zlevel: 2,
            data: investData,
            itemStyle: {
              color: {
                type: 'linear',
                x: 0,
                y: 1,
                x2: 0,
                y2: 0,
                colorStops: [
                  { offset: 0, color: '#2bd9ff' }, // 浅蓝（底）
                  { offset: 0.5, color: '#34e8c0' }, // 青（中）
                  { offset: 1, color: '#cbfe3a' }, // 金黄（顶）
                ],
              },
              // 荧光光晕
              shadowBlur: 12,
              shadowColor: 'rgba(0, 207, 255, 0.5)',
              borderRadius: [0, 0, 0, 0],
            },
          },
          // 【值分隔格纹层】横向细分隔条叠加在柱子上（zlevel 3 > 2，画在渐变柱之上）
          {
            type: 'pictorialBar',
            symbol: 'rect',
            symbolRepeat: 'fixed',
            symbolMargin: 3,
            symbolSize: [18, 3],
            symbolClip: false,
            data: investData,
            z: 0,
            zlevel: 3,
            itemStyle: {
              color: '#354D6B',
            },
          },
        ],
        tooltip: {
          trigger: 'axis',
          formatter: '{b}<br/>投资额：{c0}亿元',
        },
      });

      setOptions({
        series: [
          {
            type: 'pie',
            radius: ['68%', '82%'],
            center: ['50%', '50%'],
            padAngle: 3,
            avoidLabelOverlap: true,
            label: { show: false },
            emphasis: { scale: false },
            data: [
              {
                value: 113.3,
                name: '2026年完成',
                itemStyle: {
                  color: '#eeff2a',
                  borderRadius: 2,
                  shadowBlur: 10,
                  shadowColor: '#eeff2a',
                },
              },
              {
                value: 783.34,
                name: '累计完成',
                itemStyle: {
                  color: '#4ADE80',
                  borderRadius: 2,
                  shadowBlur: 10,
                  shadowColor: '#4ADE80',
                },
              },
            ],
          },
        ],
      });
    });

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

              {/* 统计卡片：StatCard 只提供边框容器，内容由调用方渲染 */}
              <StatCard class="mt-24px">
                <div class="flex items-center">
                  <div>
                    {/* 顶部标题栏 */}
                    <div class="flex items-center">
                      <DoubleRing class="size-32px">
                        <div class="i-ri-exchange-2-fill size-16px text-white" />
                      </DoubleRing>
                      <div class="ml-12px text-16px text-white font-500 tracking-wide">片区投资总额</div>
                      <Tooltip title="片区投资总额统计口径：含土地出让、基础设施及公共服务设施投资">
                        <div class="ml-8px i-ri-information-fill size-16px text-gray-500 cursor-pointer" />
                      </Tooltip>
                    </div>

                    {/* 中部数值区：数字用 Subway Ticker Grid 点阵 */}
                    <div class="mt-20px flex items-baseline gap-8px">
                      <div class="font-subway text-36px font-700 leading-none text-cyan-500">1310.72</div>
                      <div class="text-20px text-white/90 font-500">亿</div>
                    </div>
                  </div>

                  <div ref={chartRef} id="chart-ring" class="size-100px ml-auto"></div>
                </div>

                {/* 底部指标行 */}
                <div class="mt-20px flex items-center">
                  {[
                    { value: '783.34', label: '累计完成' },
                    { value: '113.30', label: '2026年完成' },
                  ].map((item) => (
                    <div key={item.label} class="flex flex-1 items-center">
                      <div class="w-4px h-56px rd-full bg-linear-to-b from-[#3BCFF7] to-[#84E6BD]" />
                      <div class="ml-20px">
                        <div class="inline-flex items-end text-white">
                          <div class="font-subway text-20px font-600 tabular-nums">{item.value}</div>
                          <div class="text-14px ml-4px translate-y-[-2px]">亿</div>
                        </div>
                        <div class="text-13px text-white/50">{item.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </StatCard>

              {/* 区域 tabs：svg 发光胶囊滑动指示器（GlowTabs 抽象组件，tab 内容由调用方渲染） */}
              <GlowTabs v-model:activeKey={activeRegionKey.value} class="mt-20px">
                {{
                  // tab 完全由调用方渲染（GlowTabs 抽象组件）：每个元素带 data-glow-tab-key 供点击委托与指示器测量
                  default: () =>
                    regionTabs.map((tab) => {
                      const active = tab.key === activeRegionKey.value;
                      return (
                        <div
                          key={tab.key}
                          data-glow-tab-key={tab.key}
                          class="shrink-0 px-12px flex-1 h-42px rd-10px flex items-center justify-center gap-8px select-none cursor-pointer"
                        >
                          <div
                            class={cn(tab.icon, 'size-20px transition-colors', active ? 'text-white' : 'text-gray-500')}
                          />
                          <div class={cn('text-16px transition-colors', active ? 'text-white' : 'text-gray-500')}>
                            {tab.label}
                          </div>
                        </div>
                      );
                    }),
                }}
              </GlowTabs>

              {/* 片区行政区划分布 */}
              <StatCard class="mt-24px">
                {/* 顶部标题栏 */}
                <div class="flex items-center">
                  <DoubleRing class="size-32px">
                    <div class="i-ri-map-2-fill size-16px text-white" />
                  </DoubleRing>
                  <div class="ml-12px text-16px text-white font-500 tracking-wide">片区行政区划分布</div>
                  <Tooltip title="这是片区行政区划分布">
                    <div class="ml-8px i-ri-information-fill size-16px text-gray-500 cursor-pointer" />
                  </Tooltip>
                </div>

                <div ref={chart2Ref} class="mt-24px w-full h-180px" id="chart"></div>
              </StatCard>

              <div class="flex items-center mt-16px">
                <img class="size-32px" src={arrow1Svg} />

                <div class="ml-12px text-16px font-500 text-white">更新片区列表</div>

                <div class="ml-auto text-14px text-gray-500">2026-05-21</div>
              </div>

              <div class="mt-16px space-y-12px flex-1 min-h-0 overflow-y-auto pr-24px -mr-24px scrollbar-gutter-stable">
                {/* 折叠面板：标题 + 徽章 + 箭头，点击展开/收起（GlowCollapse 组件）
               内容为 CornerPanel 容器（深蓝面板 + 点击高亮）+ XodRow 片区行 */}
                <GlowCollapse title="江岸区">
                  <CornerPanel isRound class="rd-8px">
                    {xodItems.map((item) => (
                      <XodRow key={item.label} item={item} />
                    ))}
                  </CornerPanel>
                </GlowCollapse>

                <GlowCollapse title="江汉区">
                  <CornerPanel isRound class="rd-8px">
                    {xodItems.map((item) => (
                      <XodRow key={item.label} item={item} />
                    ))}
                  </CornerPanel>
                </GlowCollapse>

                <GlowCollapse title="硚口区">
                  <CornerPanel isRound class="rd-8px">
                    {xodItems.map((item) => (
                      <XodRow key={item.label} item={item} />
                    ))}
                  </CornerPanel>
                </GlowCollapse>

                <GlowCollapse title="汉阳区">
                  <CornerPanel isRound class="rd-8px">
                    {xodItems.map((item) => (
                      <XodRow key={item.label} item={item} />
                    ))}
                  </CornerPanel>
                </GlowCollapse>
              </div>
            </>
          ),
          right: () => (
            <>
              {/* 地图：VMap 组件内部创建/销毁 MapLibre 实例，crs/center/zoom 走 options prop */}
              <VMap style={tiandituStyle} options={mapOptions}>
                <VMapControls class="absolute right-24px bottom-24px z-10" />
                {/* 图层 / 交互逻辑子组件：必须在 VMap 插槽内才能 useMap */}
                <SchemeMapLayers
                  onUpdate:drawer={(v: boolean) => {
                    drawerVisible.value = v;
                  }}
                />
                {/* Marker 示例：坐标 114.2913547, 30.5635014（需在 VMap 插槽内才可注入地图实例） */}
                <VMarker longitude={114.2913547} latitude={30.5635014}>
                  <VMarkerContent>
                    <div class="bg-red-500 size-4 rounded-full border-2 border-white shadow-lg" />
                    <VMarkerLabel position="bottom">VMarkerTooltip</VMarkerLabel>
                  </VMarkerContent>
                  <VMarkerTooltip>VMarkerTooltip</VMarkerTooltip>
                </VMarker>

                <VMarker longitude={114.3313547} latitude={30.5635014}>
                  <VMarkerContent>
                    <div class="bg-yellow-500 size-4 rounded-full border-2 border-white shadow-lg" />
                    <VMarkerLabel position="bottom">VMarkerPopup</VMarkerLabel>
                  </VMarkerContent>
                  <VMarkerPopup closeButton>
                    <div>VMarkerPopup</div>
                    <button class="b" onClick={() => (popupOpen.value = true)}>
                      打开 Mappopup
                    </button>
                  </VMarkerPopup>
                </VMarker>

                {popupOpen.value && (
                  <VMapPopup
                    longitude={114.3313547}
                    latitude={30.5235014}
                    closeButton
                    onClose={() => {
                      popupOpen.value = false;
                    }}
                  >
                    我是 VMapPopup
                  </VMapPopup>
                )}
              </VMap>

          {/* 图层管理器：左上角胶囊按钮 */}
          <LayerControls class="left-32px" />

              {/* 右侧 Drawer：地图点击打开，Tab 切换内容；显示时从右往左平移渐显，隐藏时向右移出并淡出 */}
              <div
                class={cn('fixed top-100px right-12px z-50 transition-[transform,opacity] duration-200', {
                  'opacity-100': drawerVisible.value,
                  // opacity-0 仅不可见，仍需 pointer-events-none 禁用鼠标穿透
                  'pointer-events-none opacity-0': !drawerVisible.value,
                })}
              >
                <RouterLink to="/display/scheme/detail">
                  <img src={PIANQU_IMG} class="w-320px h-800px object-fill" />
                </RouterLink>
              </div>
            </>
          ),
        }}
      </DisplayPageLayout>
    );
  },
});
