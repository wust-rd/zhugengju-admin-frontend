import { defineComponent } from 'vue';
import { AXIS_LABEL_COLOR, ChartCard, TOOLTIP_STYLE } from './chart-card';

/** 修缮状态占比（占位数据，接入接口后替换） */
const STATUS = [
  { name: '已修缮', value: 35.45, color: '#F59E0B' },
  { name: '在修缮', value: 30.12, color: '#22D3EE' },
  { name: '待修缮', value: 20.67, color: '#4ADE80' },
  { name: '其他', value: 13.76, color: '#64748B' },
];

/** legend 文案：名称 + 百分比 */
const STATUS_LABEL: Record<string, string> = Object.fromEntries(
  STATUS.map((s) => [s.name, `${s.name} ${s.value}%`]),
);

const option = {
  tooltip: { trigger: 'item', ...TOOLTIP_STYLE, formatter: '{b} {c}%' },
  legend: {
    orient: 'vertical',
    right: 0,
    top: 'middle',
    textStyle: { color: AXIS_LABEL_COLOR, fontSize: 12 },
    itemWidth: 10,
    itemHeight: 6,
    formatter: (name: string) => STATUS_LABEL[name],
  },
  series: [
    {
      name: '修缮状态',
      type: 'pie',
      radius: ['55%', '75%'],
      center: ['36%', '50%'],
      avoidLabelOverlap: false,
      label: { show: false },
      emphasis: { label: { show: false } },
      data: STATUS.map((s) => ({ name: s.name, value: s.value, itemStyle: { color: s.color } })),
    },
  ],
};

/**
 * UrbanProtectionStatusDonut —— 优保建筑当前修缮状态占比（环形图）
 */
export const UrbanProtectionStatusDonut = defineComponent({
  name: 'UrbanProtectionStatusDonut',
  setup() {
    return () => <ChartCard title="优保建筑当前修缮状态占比" icon="i-ri-pie-chart-2-fill" option={option} />;
  },
});
