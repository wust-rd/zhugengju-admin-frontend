import { useECharts } from '@jeesite/core/hooks/web/useECharts';
import { DoubleRing } from '@jeesite/display/components/double-ring';
import { StatCard } from '@jeesite/display/components/stat-card';
import { Tooltip } from 'antdv-next';
import type { PropType, Ref } from 'vue';
import { defineComponent, shallowRef, watch } from 'vue';

/** 功能定位维度（other = 未命中任何导向 / FUNC_TYPE 为空） */
type FuncKey = 'cod' | 'tod' | 'iod' | 'sod' | 'eod' | 'hod' | 'other';

/** 各维度单一配色（柱体从该色向底部渐变变浅；顶帽用亮色） */
const FUNC_COLORS: Record<FuncKey, { color: string; cap: string }> = {
  cod: { color: '#0891B2', cap: '#22D3EE' },
  tod: { color: '#D97706', cap: '#FBBF24' },
  iod: { color: '#059669', cap: '#34D399' },
  sod: { color: '#4F46E5', cap: '#818CF8' },
  eod: { color: '#65A30D', cap: '#A3E635' },
  hod: { color: '#A21CAF', cap: '#E879F9' },
  other: { color: '#64748B', cap: '#94A3B8' },
};

/**
 * FuncTypeChart —— 片区功能定位分布：各导向维度命中片区数柱状图
 *
 * 统计口径：片区 FUNC_TYPE 文本（大写化）包含维度关键词即 +1，一个片区可命中多个维度；
 * 未命中任何维度（含空值）计入「其他」。
 * 柱样式：单一维度色、自上而下渐变变浅；柱顶一段亮色小杠；无背景竖带。
 *
 * props：
 * - rows: { key, count }[]（维度 → 命中片区数，含 other）
 */
export const FuncTypeChart = defineComponent({
  name: 'FuncTypeChart',

  props: {
    rows: { type: Array as PropType<{ key: FuncKey; count: number }[]>, default: () => [] },
  },

  setup(props) {
    const chartRef = shallowRef<HTMLDivElement | null>(null);
    const { setOptions } = useECharts(chartRef as Ref<HTMLDivElement>);

    function render(rows: { key: FuncKey; count: number }[]) {
      const yMax = Math.max(Math.ceil(Math.max(...rows.map((r) => r.count), 1) / 10) * 10, 10);

      setOptions({
        grid: { top: 8, left: 0, right: 0, bottom: 0 },
        xAxis: {
          type: 'category',
          data: rows.map((r) => (r.key === 'other' ? '其他' : r.key.toUpperCase())),
          axisLabel: { color: '#E2E8F0', fontSize: 12, interval: 0, margin: 12 },
          axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.4)' } },
          axisTick: { show: false },
        },
        yAxis: {
          type: 'value',
          min: 0,
          max: yMax,
          interval: 10,
          axisLine: { show: false },
          splitLine: { lineStyle: { color: 'rgba(31, 180, 255, 0.12)', type: 'solid', width: 1 } },
          axisLabel: { color: '#A2B0B8' },
        },
        series: [
          // 【柱身】数值减去顶帽的高度，单一维度色从顶部实色向底部渐变变浅（stack 底层）
          {
            type: 'bar',
            stack: 'func',
            barWidth: 22,
            z: 10,
            zlevel: 2,
            data: rows.map(({ key, count }) => {
              const cap = Math.min(1.2, count);
              return {
                value: count - cap,
                itemStyle: {
                  color: {
                    type: 'linear',
                    x: 0,
                    y: 0,
                    x2: 0,
                    y2: 1,
                    colorStops: [
                      { offset: 0, color: FUNC_COLORS[key].color },
                      { offset: 1, color: `${FUNC_COLORS[key].color}26` },
                    ],
                  },
                },
              };
            }),
          },
          // 【柱顶亮色小杠】1.2 高的帽段堆叠在柱身之上（stack 顶层，从柱身顶部继续向上画）
          {
            type: 'bar',
            stack: 'func',
            barWidth: 22,
            z: 11,
            zlevel: 3,
            silent: true,
            tooltip: { show: false },
            data: rows.map(({ key, count }) => ({
              value: Math.min(1.2, count),
              itemStyle: { color: FUNC_COLORS[key].cap },
            })),
          },
        ],
        tooltip: {
          trigger: 'axis',
          formatter: (params: unknown) => {
            const list = params as { name: string; value: number }[];
            const hit = list[0];
            return hit ? `${hit.name}：${hit.value} 个片区` : '';
          },
        },
      });
    }

    watch(() => props.rows, (rows) => render(rows), { immediate: true, deep: true });

    return () => (
      <StatCard class="mt-24px">
        {/* 顶部标题栏 */}
        <div class="flex items-center">
          <DoubleRing class="size-32px">
            <div class="i-ri-compass-3-fill size-16px text-white" />
          </DoubleRing>
          <div class="ml-12px text-16px text-white font-500 tracking-wide">片区功能定位分布</div>
          <Tooltip title="统计各功能导向维度覆盖的片区数量，一个片区可命中多个导向维度；未命中任何维度计入其他">
            <div class="ml-8px i-ri-information-fill size-16px text-gray-500 cursor-pointer" />
          </Tooltip>
        </div>

        <div ref={chartRef} class="mt-24px w-full h-180px" id="chart"></div>
      </StatCard>
    );
  },
});
