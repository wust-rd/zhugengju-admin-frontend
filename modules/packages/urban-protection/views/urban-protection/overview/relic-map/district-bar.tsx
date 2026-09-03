import { defineComponent } from 'vue';
import { AXIS_LABEL_COLOR, ChartCard, SPLIT_LINE_COLOR, TOOLTIP_STYLE } from './chart-card';

/** 行政区：武昌 / 蔡甸 / 江汉 / 江岸 / 青山 / 硚口 / 汉阳 / 洪山 */
const DISTRICTS = ['武昌', '蔡甸', '江汉', '江岸', '青山', '硚口', '汉阳', '洪山'];
/** 现状（占位数据，接入接口后替换） */
const CURRENT = [16, 13, 20, 21, 11, 19, 10, 16];
/** 传统风貌建筑（占位数据，接入接口后替换） */
const TRADITIONAL = [11, 6, 14, 14, 9, 15, 5, 14];
/** 柱高上限 */
const Y_MAX = 25;

/** 序列样式：渐变柱体（底部纯色、顶部渐隐）+ 荧光。现状=青蓝系，传统风貌建筑=绿系 */
const SERIES_STYLE = [
  { name: '现状', data: CURRENT, color: '#33C9E8' },
  { name: '传统风貌建筑', data: TRADITIONAL, color: '#2BBF7E' },
] as const;

const option = {
  grid: { top: 30, left: 0, right: 0, bottom: 0 },
  tooltip: { trigger: 'axis', ...TOOLTIP_STYLE },
  legend: {
    top: 0,
    right: 0,
    icon: 'rect',
    itemWidth: 10,
    itemHeight: 6,
    itemGap: 16,
    textStyle: { color: AXIS_LABEL_COLOR, fontSize: 12 },
  },
  xAxis: {
    type: 'category',
    data: DISTRICTS,
    axisLabel: { color: AXIS_LABEL_COLOR, fontSize: 13, interval: 0, margin: 12 },
    axisLine: { show: false },
    axisTick: { show: false },
  },
  yAxis: {
    type: 'value',
    min: 0,
    max: Y_MAX,
    interval: 5,
    axisLine: { show: false },
    splitLine: { lineStyle: { color: SPLIT_LINE_COLOR, type: 'solid', width: 1 } },
    axisLabel: { color: AXIS_LABEL_COLOR },
  },
  series: SERIES_STYLE.map(({ name, data, color }) => ({
    name,
    type: 'bar' as const,
    barWidth: 8,
    data,
    itemStyle: {
      color: {
        type: 'linear' as const,
        x: 0,
        y: 1,
        x2: 0,
        y2: 0,
        colorStops: [
          { offset: 0, color },
          { offset: 1, color: `${color}26` },
        ],
      },
      shadowBlur: 8,
      shadowColor: `${color}66`,
      borderRadius: [2, 2, 0, 0],
    },
  })),
};

/**
 * UrbanProtectionDistrictBar —— 优保建筑区域分布：现状 vs 传统风貌建筑（分组渐变柱状图）
 */
export const UrbanProtectionDistrictBar = defineComponent({
  name: 'UrbanProtectionDistrictBar',
  setup() {
    return () => <ChartCard title="优保建筑区域分布" icon="i-ri-map-2-fill" option={option} />;
  },
});
