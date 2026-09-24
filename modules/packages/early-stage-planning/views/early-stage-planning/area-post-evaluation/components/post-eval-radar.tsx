import { useECharts } from '@jeesite/core/hooks/web/useECharts';
import type { PropType, Ref } from 'vue';
import { defineComponent, shallowRef, watch } from 'vue';

/** 更新前 / 更新后配色（与设计稿图例一致：蓝 / 紫） */
const BEFORE_COLOR = '#1677ff';
const AFTER_COLOR = '#8e5bf9';

/**
 * PostEvalRadar —— 更新前 / 更新后对比雷达图（成效指标对比、满意度分析共用）
 *
 * 每个维度一根轴，轴上限按该轴两值取整（≤10 取 10、≤100 取 100，超出按百位向上取整），
 * 因此「%」类指标固定 0~100 刻度，与设计稿一致；未填写的值按 0 绘制。
 *
 * props：
 * - labels: 轴名称（指标项 / 二级维度）
 * - before / after: 与 labels 等长的更新前 / 更新后数值（null = 未填写）
 * - height: 图表高度（px）
 */
export const PostEvalRadar = defineComponent({
  name: 'PostEvalRadar',

  props: {
    labels: { type: Array as PropType<string[]>, default: () => [] },
    before: { type: Array as PropType<(number | null)[]>, default: () => [] },
    after: { type: Array as PropType<(number | null)[]>, default: () => [] },
    /** 只画「更新后」一个系列（更新前锁定的维度：项目进度 / 直接经济效益） */
    hideBefore: { type: Boolean, default: false },
    height: { type: Number, default: 300 },
  },

  setup(props) {
    const chartRef = shallowRef<HTMLDivElement | null>(null);
    const { setOptions } = useECharts(chartRef as Ref<HTMLDivElement>);

    /** 单轴上限：两值取大后按「整齐刻度」取整，% 类指标自然落在 100 */
    function axisMax(values: (number | null)[]): number {
      const max = Math.max(...values.map((value) => (value === null || Number.isNaN(value) ? 0 : value)), 0);
      if (max <= 0) return 1;
      if (max <= 10) return 10;
      if (max <= 100) return 100;
      return Math.ceil(max / 100) * 100;
    }

    function render() {
      const beforeSeries = {
        name: '更新前',
        value: props.before.map((value) => value ?? 0),
        itemStyle: { color: BEFORE_COLOR },
        lineStyle: { color: BEFORE_COLOR, width: 2 },
        areaStyle: { color: BEFORE_COLOR, opacity: 0.08 },
      };
      const afterSeries = {
        name: '更新后',
        value: props.after.map((value) => value ?? 0),
        itemStyle: { color: AFTER_COLOR },
        lineStyle: { color: AFTER_COLOR, width: 2 },
        areaStyle: { color: AFTER_COLOR, opacity: 0.12 },
      };
      setOptions({
        tooltip: { trigger: 'item' },
        legend: {
          bottom: 0,
          icon: 'circle',
          itemWidth: 8,
          itemHeight: 8,
          textStyle: { color: '#595959' },
          // 更新前锁定的维度只画「更新后」，图例也只留一项
          data: props.hideBefore ? ['更新后'] : ['更新前', '更新后'],
        },
        radar: {
          center: ['50%', '46%'],
          radius: '62%',
          indicator: props.labels.map((name, index) => ({
            name,
            max: axisMax([props.before[index] ?? null, props.after[index] ?? null]),
          })),
          axisName: { color: '#8c8c8c', fontSize: 12 },
          axisLine: { lineStyle: { color: '#e5e7eb' } },
          splitLine: { lineStyle: { color: '#e5e7eb' } },
          splitArea: { areaStyle: { color: ['rgba(250, 250, 250, 0.6)', 'rgba(255, 255, 255, 0.6)'] } },
        },
        series: [
          {
            type: 'radar',
            symbolSize: 4,
            data: props.hideBefore ? [afterSeries] : [beforeSeries, afterSeries],
          },
        ],
      });
    }

    watch(() => [props.labels, props.before, props.after, props.hideBefore], render, {
      immediate: true,
      deep: true,
    });

    return () => <div ref={chartRef} class="w-full" style={{ height: `${props.height}px` }} />;
  },
});
