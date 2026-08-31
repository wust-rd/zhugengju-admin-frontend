import { useECharts } from '@jeesite/core/hooks/web/useECharts';
import { DoubleRing } from '@jeesite/display/components/double-ring';
import { StatCard } from '@jeesite/display/components/stat-card';
import { Tooltip } from 'antdv-next';
import type { Ref } from 'vue';
import { defineComponent, onMounted, shallowRef } from 'vue';

/**
 * InvestTotalCard —— 片区投资总额卡片：Subway 点阵数字 + 环形图 + 底部指标行
 *
 * 环形图（echarts）为「2026年完成 / 累计完成」双段环形；
 * 中部数值与底部指标行为静态业务数据（接入接口后改 props/数据源）。
 * echarts 实例内部管理。
 */
export const InvestTotalCard = defineComponent({
  name: 'InvestTotalCard',
  setup() {
    // 片区投资总额右侧环形图
    const chartRef = shallowRef<HTMLDivElement | null>(null);
    const { setOptions } = useECharts(chartRef as Ref<HTMLDivElement>);

    onMounted(() => {
      setOptions({
        series: [
          {
            type: 'pie',
            radius: ['68%', '82%'],
            center: ['50%', '50%'],
            padAngle: 3,
            avoidLabelOverlap: true,
            label: { show: false },
            emphasis: { scale: false },
            data: [
              {
                value: 113.3,
                name: '2026年完成',
                itemStyle: {
                  color: '#eeff2a',
                  borderRadius: 2,
                  shadowBlur: 10,
                  shadowColor: '#eeff2a',
                },
              },
              {
                value: 783.34,
                name: '累计完成',
                itemStyle: {
                  color: '#4ADE80',
                  borderRadius: 2,
                  shadowBlur: 10,
                  shadowColor: '#4ADE80',
                },
              },
            ],
          },
        ],
      });
    });

    return () => (
      <StatCard class="mt-24px">
        <div class="flex items-center">
          <div>
            {/* 顶部标题栏 */}
            <div class="flex items-center">
              <DoubleRing class="size-32px">
                <div class="i-ri-exchange-2-fill size-16px text-white" />
              </DoubleRing>
              <div class="ml-12px text-16px text-white font-500 tracking-wide">片区投资总额</div>
              <Tooltip title="片区投资总额统计口径：含土地出让、基础设施及公共服务设施投资">
                <div class="ml-8px i-ri-information-fill size-16px text-gray-500 cursor-pointer" />
              </Tooltip>
            </div>

            {/* 中部数值区：数字用 Subway Ticker Grid 点阵 */}
            <div class="mt-20px flex items-baseline gap-8px">
              <div class="font-subway text-36px font-700 leading-none text-cyan-500">1310.72</div>
              <div class="text-20px text-white/90 font-500">亿</div>
            </div>
          </div>

          <div ref={chartRef} id="chart-ring" class="size-100px ml-auto"></div>
        </div>

        {/* 底部指标行 */}
        <div class="mt-20px flex items-center">
          {[
            { value: '783.34', label: '累计完成' },
            { value: '113.30', label: '2026年完成' },
          ].map((item) => (
            <div key={item.label} class="flex flex-1 items-center">
              <div class="w-4px h-56px rd-full bg-linear-to-b from-[#3BCFF7] to-[#84E6BD]" />
              <div class="ml-20px">
                <div class="inline-flex items-end text-white">
                  <div class="font-subway text-20px font-600 tabular-nums">{item.value}</div>
                  <div class="text-14px ml-4px translate-y-[-2px]">亿</div>
                </div>
                <div class="text-13px text-white/50">{item.label}</div>
              </div>
            </div>
          ))}
        </div>
      </StatCard>
    );
  },
});
