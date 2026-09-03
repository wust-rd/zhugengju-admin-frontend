import { defineComponent } from 'vue';
import { AXIS_LABEL_COLOR, AXIS_LINE_COLOR, ChartCard, SPLIT_LINE_COLOR, TOOLTIP_STYLE } from './chart-card';

/** 月份：1月 ~ 6月 */
const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月'];
/** 已修缮（占位数据，接入接口后替换） */
const RENOVATED = [1400, 1500, 1620, 1580, 1520, 1600];
/** 在修缮（占位数据，接入接口后替换） */
const IN_RENOVATION = [1100, 1250, 1180, 1320, 1280, 1350];
/** 待修缮（占位数据，接入接口后替换） */
const TODO = [700, 820, 780, 900, 860, 920];

/** 三序列样式：颜色与图例一致 */
const SERIES_STYLE = [
  { name: '已修缮', data: RENOVATED, color: '#E879F9' },
  { name: '在修缮', data: IN_RENOVATION, color: '#22D3EE' },
  { name: '待修缮', data: TODO, color: '#FBBF24' },
] as const;

const option = {
  grid: { top: 30, left: 6, right: 6, bottom: 0 },
  tooltip: { trigger: 'axis', ...TOOLTIP_STYLE },
  legend: {
    top: 0,
    itemWidth: 10,
    itemHeight: 6,
    textStyle: { color: AXIS_LABEL_COLOR, fontSize: 12 },
  },
  xAxis: {
    type: 'category',
    data: MONTHS,
    boundaryGap: false,
    axisLabel: { color: AXIS_LABEL_COLOR, fontSize: 12 },
    axisLine: { lineStyle: { color: AXIS_LINE_COLOR } },
    axisTick: { show: false },
  },
  yAxis: {
    type: 'value',
    max: 2500,
    name: '单位：个',
    nameTextStyle: { color: AXIS_LABEL_COLOR, align: 'left', padding: [0, 0, 6, 0] },
    axisLabel: { color: AXIS_LABEL_COLOR },
    splitLine: { lineStyle: { color: SPLIT_LINE_COLOR } },
  },
  series: SERIES_STYLE.map(({ name, data, color }) => ({
    name,
    type: 'line' as const,
    smooth: true,
    data,
    symbol: 'circle',
    symbolSize: 5,
    itemStyle: { color },
    lineStyle: { color, width: 2 },
  })),
};

/**
 * UrbanProtectionTrendLine —— 优保建筑修缮与状态监测趋势：已修缮 / 在修缮 / 待修缮（折线图）
 */
export const UrbanProtectionTrendLine = defineComponent({
  name: 'UrbanProtectionTrendLine',
  setup() {
    return () => <ChartCard title="优保建筑修缮与状态监测趋势" icon="i-ri-line-chart-fill" option={option} />;
  },
});
