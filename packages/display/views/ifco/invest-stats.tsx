import { useECharts } from '@jeesite/core/hooks/web/useECharts';
import { Light } from '@jeesite/display/components/light/index';
import { StatCard } from '@jeesite/display/components/stat-card';
import type { Ref } from 'vue';
import { defineComponent, onMounted, shallowRef, type PropType } from 'vue';

/**
 * InvestStats —— 项目投资统计：环形进度（echarts）+ 年度投资总额 / 累计完成
 *
 * 左侧环形进度饼图（echarts，青色进度弧 + 浅色轨道），中心显示百分比；
 * 右侧两行统计：年度投资总额（青色点阵数字）、2026年累计完成（绿色点阵数字）。
 * 数据静态占位（total 3000 / done 750，progress 默认 25% = 750/3000）。
 *
 * props：
 * - progress: 环形进度百分比，默认 25
 * - total: 年度投资总额（亿），默认 3000
 * - done: 2026年累计完成（亿），默认 750
 */
export const InvestStats = defineComponent({
  name: 'InvestStats',
  props: {
    /** 环形进度百分比 */
    progress: { type: Number as PropType<number>, default: 25 },
    /** 年度投资总额（亿） */
    total: { type: Number as PropType<number>, default: 3000 },
    /** 2026年累计完成（亿） */
    done: { type: Number as PropType<number>, default: 750 },
  },
  setup(props) {
    // 环形进度饼图（echarts，与 RatingResult 同款用法）
    const chartRef = shallowRef<HTMLDivElement | null>(null);
    const { setOptions } = useECharts(chartRef as Ref<HTMLDivElement>);

    onMounted(() => {
      // options 内联传入 setOptions，由参数类型 EChartsOption 上下文推断
      setOptions({
        series: [
          {
            type: 'pie',
            // 环形半径：[内半径%, 外半径%]，差值 = 环宽（70%~82% 即环宽 12%）
            radius: ['70%', '82%'],
            center: ['50%', '50%'],
            // 从顶部开始顺时针绘制
            startAngle: 90,
            silent: true,
            avoidLabelOverlap: true,
            label: { show: false },
            emphasis: { scale: false },
            data: [
              {
                value: props.progress,
                name: '完成',
                itemStyle: {
                  color: '#22D3EE',
                  borderRadius: 4,
                  // 荧光：与段同色晕开
                  shadowBlur: 8,
                  shadowColor: '#22D3EE',
                },
              },
              {
                value: 100 - props.progress,
                name: '剩余',
                itemStyle: { color: 'rgba(255, 255, 255, 0.08)' },
              },
            ],
          },
        ],
      });
    });

    return () => (
      <StatCard class="mt-16px">
        {/* 标题栏 */}
        <div class="flex items-center">
          <Light class="-ml-16px" height={24} />
          <div class="ml-20px text-white text-16px">项目投资统计</div>
        </div>

        {/* 内容区：左侧环形进度 + 右侧统计 */}
        <div class="mt-16px flex items-center">
          {/* 左侧环形进度：echarts 饼图 + 中心百分比 overlay */}
          <div class="relative w-120px h-120px shrink-0">
            <div ref={chartRef} class="size-full" />
            {/* 中心百分比：HTML overlay，避免 echarts graphic 类型问题 */}
            <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span class="text-20px text-white font-500">{props.progress}%</span>
            </div>
          </div>

          {/* 右侧统计：两行（label + 点阵数字 + 单位，底部装饰线） */}
          <div class="ml-24px flex-1 flex flex-col gap-20px">
            <div class="flex items-baseline border-b border-white/10 pb-8px">
              <span class="text-14px text-gray-300 shrink-0">年度投资总额</span>
              <span class="font-youshe text-24px text-cyan-500 ml-auto leading-none">{props.total.toFixed(2)}</span>
              <span class="text-14px text-white/90 ml-4px">亿</span>
            </div>

            <div class="flex items-baseline border-b border-white/10 pb-8px">
              <span class="text-14px text-gray-300 shrink-0">2026年累计完成</span>
              <span class="font-youshe text-24px text-green-500 ml-auto leading-none">{props.done.toFixed(2)}</span>
              <span class="text-14px text-white/90 ml-4px">亿</span>
            </div>
          </div>
        </div>
      </StatCard>
    );
  },
});
