import { useECharts } from '@jeesite/core/hooks/web/useECharts';
import type { PropType, Ref } from 'vue';
import { defineComponent, shallowRef, watch } from 'vue';

/** 更新前 / 更新后配色（与设计稿图例一致：蓝 / 紫） */
const BEFORE_COLOR = '#1677ff';
const AFTER_COLOR = '#8e5bf9';

/**
 * PostEvalBar —— 一级维度提升成效分组柱状图（满意度分析 tab 左上）
 *
 * props：
 * - groups: 一级维度名称（好房子 / 好小区 / 好社区 / 好城区）
 * - before / after: 各分组的更新前 / 更新后满意度均值（null = 该组未填写）
 * - height: 图表高度（px）
 */
export const PostEvalBar = defineComponent({
  name: 'PostEvalBar',

  props: {
    groups: { type: Array as PropType<string[]>, default: () => [] },
    before: { type: Array as PropType<(number | null)[]>, default: () => [] },
    after: { type: Array as PropType<(number | null)[]>, default: () => [] },
    height: { type: Number, default: 300 },
  },

  setup(props) {
    const chartRef = shallowRef<HTMLDivElement | null>(null);
    const { setOptions } = useECharts(chartRef as Ref<HTMLDivElement>);

    function render() {
      setOptions({
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        legend: {
          top: 0,
          right: 0,
          icon: 'circle',
          itemWidth: 8,
          itemHeight: 8,
          textStyle: { color: '#595959' },
          data: ['更新前', '更新后'],
        },
        grid: { top: 40, left: 8, right: 8, bottom: 8, containLabel: true },
        xAxis: {
          type: 'category',
          data: props.groups,
          axisTick: { show: false },
          axisLine: { lineStyle: { color: '#e5e7eb' } },
          axisLabel: { color: '#595959' },
        },
        yAxis: {
          type: 'value',
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { lineStyle: { color: '#f0f0f0' } },
          axisLabel: { color: '#8c8c8c' },
        },
        series: [
          {
            name: '更新前',
            type: 'bar',
            barWidth: 18,
            itemStyle: { color: BEFORE_COLOR, borderRadius: [2, 2, 0, 0] },
            data: props.before.map((value) => value ?? 0),
          },
          {
            name: '更新后',
            type: 'bar',
            barWidth: 18,
            itemStyle: { color: AFTER_COLOR, borderRadius: [2, 2, 0, 0] },
            data: props.after.map((value) => value ?? 0),
          },
        ],
      });
    }

    watch(() => [props.groups, props.before, props.after], render, { immediate: true, deep: true });

    return () => <div ref={chartRef} class="w-full" style={{ height: `${props.height}px` }} />;
  },
});
