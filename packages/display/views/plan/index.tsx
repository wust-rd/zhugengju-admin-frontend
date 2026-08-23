import { ArtFont } from '@jeesite/display/components/art-font';
import { DoubleRing } from '@jeesite/display/components/double-ring';
import { DropdownSelector } from '@jeesite/display/components/dropdown-selector';
import { GlassRing } from '@jeesite/display/components/glass-ring';
import { type GlowTabItem } from '@jeesite/display/components/glow-tabs';
import { GlowTitle2 } from '@jeesite/display/components/glow-title/title2';
import { DisplayPageLayout } from '@jeesite/display/components/page-layout';
import { StatCard } from '@jeesite/display/components/stat-card';
import { useECharts } from '@jeesite/core/hooks/web/useECharts';
import { Tooltip, type MenuItemType } from 'antdv-next';
import type { Ref } from 'vue';
import { defineComponent, onMounted, ref, shallowRef } from 'vue';
import arrow1Svg from '@jeesite/assets/svg/display/arrow1.svg';
import { CollapseGroups } from '@jeesite/display/components/collapse-groups';
import { RegionTabs } from '@jeesite/display/components/region-tabs';
import { XodItem, XodRow } from '@jeesite/display/components/corner-panel/xod-row';

// 区域 tabs：激活项由 GlowTabs 的 svg 发光胶囊指示器表达（按钮本身不再发光）
const regionTabs: GlowTabItem[] = [
  { key: 'district', label: '行政区划', icon: 'i-ri-road-map-line' },
  { key: 'progress', label: '推进情况', icon: 'i-ri-list-check-3' },
];

export default defineComponent({
  name: 'DisplayPlan',
  setup() {
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

          {/* 区域 tabs：RegionTabs 业务组件（发光胶囊指示器 + tab 渲染），animated=false 简单样式 */}
          <RegionTabs
            v-model:activeKey={activeRegionKey.value}
            items={regionTabs}
            animated={false}
            class="mt-20px"
          />

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
            {/* 折叠分组：CollapseGroups 业务组件（GlowCollapse + CornerPanel + XodRow 片区行） */}
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
          right: () => <div class="size-full relative" />,
        }}
      </DisplayPageLayout>
    );
  },
});
