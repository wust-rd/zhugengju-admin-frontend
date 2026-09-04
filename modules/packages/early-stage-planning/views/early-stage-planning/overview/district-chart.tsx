import { useECharts } from '@jeesite/core/hooks/web/useECharts';
import { DoubleRing } from '@jeesite/display/components/double-ring';
import { StatCard } from '@jeesite/display/components/stat-card';
import { Tooltip } from 'antdv-next';
import type { Ref } from 'vue';
import { defineComponent, onMounted, shallowRef } from 'vue';

/** 行政区划分布图表数据（静态占位，接入接口后替换） */
const DISTRICT_X_AXIS = ['江岸', '江汉', '硚口', '汉阳', '武昌', '青山', '洪山', '东西湖', '汉南', '蔡甸', '江夏', '黄陂', '新洲'];
/** 投资额（亿元）：与 13 个区一一对应 */
const DISTRICT_INVEST = [35, 62, 45, 78, 52, 90, 68, 55, 40, 72, 58, 83, 47];
/** 柱高上限 */
const Y_MAX = 100;

/**
 * DistrictChart —— 片区行政区划分布：荧光分段柱状图 + 值分隔格纹层
 *
 * 三色渐变柱（浅蓝 → 青 → 金黄，从下往上）+ 横向细分隔条叠加在柱上。
 * echarts 实例与数据内部管理（静态占位）。
 */
export const DistrictChart = defineComponent({
  name: 'DistrictChart',
  setup() {
    const chartRef = shallowRef<HTMLDivElement | null>(null);
    const { setOptions } = useECharts(chartRef as Ref<HTMLDivElement>);

    onMounted(() => {
      setOptions({
        grid: {
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        },
        xAxis: {
          type: 'category',
          data: DISTRICT_X_AXIS,
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
          max: Y_MAX,
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
            data: DISTRICT_INVEST,
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
            data: DISTRICT_INVEST,
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
    });

    return () => (
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

        <div ref={chartRef} class="mt-24px w-full h-180px" id="chart"></div>
      </StatCard>
    );
  },
});
