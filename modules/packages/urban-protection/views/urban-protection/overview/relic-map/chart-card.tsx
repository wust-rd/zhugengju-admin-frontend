import { cn } from '@jeesite/core/libs';
import { useECharts } from '@jeesite/core/hooks/web/useECharts';
import { DoubleRing } from '@jeesite/display/components/double-ring';
import { StatCard } from '@jeesite/display/components/stat-card';
import { defineComponent, onMounted, shallowRef, type PropType, type Ref } from 'vue';

/** 图表公共 tooltip 视觉样式（各图自行叠加 trigger / formatter） */
export const TOOLTIP_STYLE = {
  backgroundColor: 'rgba(11,27,42,0.9)',
  borderColor: '#13CDFF',
  textStyle: { color: '#E2E8F0' },
} as const;

/** 坐标轴 / 网格线公共颜色 */
export const AXIS_LABEL_COLOR = '#A2B0B8';
export const AXIS_LINE_COLOR = 'rgba(255,255,255,0.4)';
export const SPLIT_LINE_COLOR = 'rgba(31,180,255,0.12)';

/**
 * ChartCard —— 大屏图表卡片通用封装
 *
 * 抽掉三个图表组件里重复的样板：StatCard 卡片 + 标题头（DoubleRing + icon + 标题）+
 * ECharts 容器，内部管理 useECharts 生命周期。调用方只传 title / icon / option。
 *
 * props：
 * - title：卡片标题
 * - icon：标题左侧图标（iconify 类名，如 'i-ri-map-2-fill'）
 * - height：图表容器高度（px），默认 200
 * - option：ECharts option（当前为静态占位数据，onMounted 时一次性 setOptions；
 *           若后续 option 变为响应式，可在本组件加 watch 同步）
 */
export const ChartCard = defineComponent({
  name: 'ChartCard',
  props: {
    title: { type: String, required: true },
    icon: { type: String, default: '' },
    height: { type: Number, default: 200 },
    option: { type: Object as PropType<Recordable>, required: true },
  },
  setup(props) {
    const chartRef = shallowRef<HTMLDivElement | null>(null);
    const { setOptions } = useECharts(chartRef as Ref<HTMLDivElement>);

    onMounted(() => {
      setOptions(props.option);
    });

    return () => (
      <StatCard class="mt-16px">
        <div class="flex items-center">
          <DoubleRing class="size-32px">
            <div class={cn('size-16px text-white', props.icon)} />
          </DoubleRing>
          <div class="ml-12px text-16px text-white font-500 tracking-wide">{props.title}</div>
        </div>
        <div ref={chartRef} class="mt-12px w-full" style={{ height: `${props.height}px` }} />
      </StatCard>
    );
  },
});
