import { useECharts } from '@jeesite/core/hooks/web/useECharts';
import { DoubleRing } from '@jeesite/display/components/double-ring';
import { StatCard } from '@jeesite/display/components/stat-card';
import { Tooltip } from 'antdv-next';
import type { PropType, Ref } from 'vue';
import { computed, defineComponent, shallowRef, watch } from 'vue';

/** 批次投资数据（页面批次下拉联动传入） */
export type BatchInvest = {
  /** 批次名（第一批/第二批） */
  label: string;
  /** 总投资（亿） */
  total: number;
  /** 累计完成投资（亿） */
  done: number;
  /** 2026 年计划完成投资（亿） */
  plan2026: number;
};

/**
 * InvestTotalCard —— 片区投资总额卡片：Subway 点阵数字 + 投资进度环形图 + 底部指标行
 *
 * 环形图（echarts）：该批次总投资进度 = 已完成投资（绿荧光）/ 未完成投资（暗色轨道）；
 * 「累计完成」= 已完成投资，「2026年完成」= 2026 年计划完成的投资；随批次下拉联动。
 *
 * props：
 * - batch: 当前选中批次数据
 */
export const InvestTotalCard = defineComponent({
  name: 'InvestTotalCard',

  props: {
    batch: { type: Object as PropType<BatchInvest | null>, default: null },
  },

  setup(props) {
    // 片区投资总额右侧环形图：总投资进度（已完成 / 未完成）
    const chartRef = shallowRef<HTMLDivElement | null>(null);
    const { setOptions } = useECharts(chartRef as Ref<HTMLDivElement>);

    watch(
      () => props.batch,
      (b) => {
        if (!b) return;
        setOptions({
          // 鼠标 hover 环形图扇区时显示投资额与占比
          tooltip: {
            trigger: 'item',
            backgroundColor: 'rgba(10, 26, 45, 0.92)',
            borderColor: 'rgba(86, 168, 224, 0.5)',
            borderWidth: 1,
            padding: [10, 14],
            textStyle: { color: '#EAF4FF', fontSize: 13 },
            extraCssText: 'border-radius: 8px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);',
            // 固定显示在鼠标左下方（左侧留 12px 间距，贴近左边界时自动回退避免溢出）
            position: (point: number[], _p: any, _dom: any, _rect: any, size: any) => {
              const [x, y] = point;
              const w = size?.contentSize?.[0] ?? 0;
              return [Math.max(8, x - w - 12), y + 12];
            },
            formatter: (params: Recordable) => {
              const value = Number(params.value ?? 0);
              const pct = b.total > 0 ? (value / b.total) * 100 : 0;
              return (
                `${params.marker}<span style="font-weight:500">${params.name}</span><br/>` +
                `<span style="color:#9FC4E0">投资额</span> ` +
                `<span style="font-weight:600">${value.toFixed(2)} 亿</span>` +
                `<span style="color:#9FC4E0;margin-left:12px">占比</span> ` +
                `<span style="color:#7DE3B0;font-weight:600">${pct.toFixed(1)}%</span>`
              );
            },
          },
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
                  value: b.done,
                  name: '已完成投资',
                  itemStyle: {
                    color: '#4ADE80',
                    borderRadius: 2,
                    shadowBlur: 10,
                    shadowColor: '#4ADE80',
                  },
                },
                {
                  value: Math.max(b.total - b.done, 0),
                  name: '未完成投资',
                  itemStyle: {
                    color: 'rgba(255,255,255,0.10)',
                    borderRadius: 2,
                  },
                },
              ],
            },
          ],
        });
      },
      { immediate: true },
    );

    /** 中部大数字：批次总投资（亿，2 位小数） */
    const totalText = computed(() => (props.batch ? props.batch.total.toFixed(2) : '0.00'));

    /** 底部指标行：累计完成（已完成投资）/ 2026年完成（2026 年计划完成投资） */
    const metrics = computed(() =>
      props.batch
        ? [
            { value: props.batch.done.toFixed(2), label: '累计完成' },
            { value: props.batch.plan2026.toFixed(2), label: '2026年完成' },
          ]
        : [],
    );

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
              <div class="font-subway text-36px font-700 leading-none text-cyan-500">{totalText.value}</div>
              <div class="text-20px text-white/90 font-500">亿</div>
            </div>
          </div>

          <div ref={chartRef} id="chart-ring" class="size-100px ml-auto"></div>
        </div>

        {/* 底部指标行 */}
        <div class="mt-20px flex items-center">
          {metrics.value.map((item) => (
            <div key={item.label} class="flex flex-1 items-center">
              <div class="w-4px h-56px rd-full bg-gradient-to-b from-[#3BCFF7] to-[#84E6BD]" />
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
