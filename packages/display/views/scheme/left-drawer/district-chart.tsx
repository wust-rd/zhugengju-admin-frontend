import { useECharts } from '@jeesite/core/hooks/web/useECharts';
import { DoubleRing } from '@jeesite/display/components/double-ring';
import { StatCard } from '@jeesite/display/components/stat-card';
import { Tooltip } from 'antdv-next';
import type { PropType, Ref } from 'vue';
import { defineComponent, shallowRef, watch } from 'vue';

/**
 * DistrictChart —— 片区行政区划分布：荧光分段柱状图 + 值分隔格纹层
 *
 * 16 个区划（写法归并后）全量渲染、无滑动；区名去掉「区」字后竖排（rotate 90）；
 * 三色渐变柱（浅蓝 → 青 → 金黄，从下往上）+ 横向细分隔条叠加在柱上。
 * 数据来自 area-data.districtInvest（geojson 按 DIST 聚合 INV_BIL，随批次下拉联动传入）。
 *
 * props：
 * - rows: { name, value }[]（区划 → 投资额亿元）；为空时渲染空轴
 */
export const DistrictChart = defineComponent({
  name: 'DistrictChart',

  props: {
    rows: { type: Array as PropType<{ name: string; value: number }[]>, default: () => [] },
  },

  setup(props) {
    const chartRef = shallowRef<HTMLDivElement | null>(null);
    const { setOptions } = useECharts(chartRef as Ref<HTMLDivElement>);

    function render(rows: { name: string; value: number }[]) {
      const names = rows.map((r) => r.name);
      const values = rows.map((r) => r.value);
      // 柱高上限取最大值向上取整到 50 的倍数，柱子留出头顶空间
      const yMax = Math.max(Math.ceil(Math.max(...values, 1) / 50) * 50, 50);

      setOptions({
        grid: { top: 8, left: 0, right: 0, bottom: 78 },
        xAxis: {
          type: 'category',
          data: names,
          // 区名去掉「区」字后逐字竖排（每字一行，字身保持正立）；悬停 tooltip 仍显示完整区名
          axisLabel: {
            color: '#A2B0B8',
            fontSize: 11,
            interval: 0,
            margin: 10,
            formatter: (name: string) => {
              const short = name.endsWith('区') ? name.slice(0, -1) : name;
              return short.split('').join('\n');
            },
          },
          axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.4)' } },
          axisTick: {
            alignWithLabel: true,
            lineStyle: { color: 'rgba(255, 255, 255, 0.4)', width: 2 },
            show: true,
          },
        },
        yAxis: {
          type: 'value',
          min: 0,
          max: yMax,
          show: true,
          axisLine: { show: false },
          splitLine: { lineStyle: { color: 'rgba(31, 180, 255, 0.12)', type: 'solid', width: 1 } },
          axisLabel: { color: '#A2B0B8' },
        },
        series: [
          // 【渐变柱】从下往上：浅蓝 → 青 → 金黄（y 从 1 到 0，offset 0 在底部）
          {
            name: '投资额',
            type: 'bar',
            barWidth: 14,
            z: 10,
            zlevel: 2,
            data: values,
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
            data: values,
            z: 0,
            zlevel: 3,
            itemStyle: { color: '#354D6B' },
          },
        ],
        tooltip: { trigger: 'axis', formatter: '{b}<br/>投资额：{c0}亿元' },
      });
    }

    watch(
      () => props.rows,
      (rows) => render(rows),
      { immediate: true },
    );

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

        <div ref={chartRef} class="mt-16px w-full h-250px" id="chart"></div>
      </StatCard>
    );
  },
});
