import { useECharts } from '@jeesite/core/hooks/web/useECharts';
import { colors } from '@jeesite/core/libs/colors';
import { Light } from '@jeesite/display/components/light/index';
import { StatCard } from '@jeesite/display/components/stat-card';
import type { Ref } from 'vue';
import { defineComponent, onMounted, ref, shallowRef } from 'vue';
import { RatingDatum } from '../inspection/rating-result';

/** 项目分类统计：饼图与右侧统计网格共用同一份数据（数值为百分数，合计 100） */
const ratingData: RatingDatum[] = [
  { key: '既有建造改造', label: '既有建造改造', value: 12.7, color: colors.blue[400] },
  { key: '老旧厂区改造', label: '老旧厂区改造', value: 13.6, color: colors.orange[400] },
  { key: '老旧小区改造', label: '老旧小区改造', value: 13.6, color: colors.green[400] },
  { key: '城中村改造', label: '城中村改造', value: 22.0, color: colors.pink[400] },
  { key: '老旧街区改造', label: '老旧街区改造', value: 22.0, color: colors.yellow[400] },
  { key: '其他', label: '其他', value: 16.1, color: colors.gray[400] },
];

/**
 * RatingResult —— 项目分类统计：环形饼图 + 中心文字 + 统计网格
 *
 * 环形饼图（echarts）hover 某段时中心显示该段名称与数值；
 * 右侧网格展示各分类颜色与名称。echarts 实例与 hover 状态内部管理。
 */
export const RatingResult = defineComponent({
  name: 'RatingResult',
  setup() {
    const chartRef = shallowRef<HTMLDivElement | null>(null);
    const { setOptions, getInstance } = useECharts(chartRef as Ref<HTMLDivElement>);
    // 中心文字：初始为空，hover 某段时填充其名称与数值（由下方 HTML overlay 渲染，避免 echarts graphic 类型问题）
    const centerLabel = ref('');
    const centerValue = ref('');

    onMounted(() => {
      // options 内联传入 setOptions，由参数类型 EChartsOption 上下文推断，
      // 保证 type: 'pie' 保持字面量类型（脱离上下文会被拓宽为 string 报类型不匹配）
      setOptions({
        series: [
          {
            type: 'pie',
            // —— 饼圈粗细 ——
            // 环形半径：[内半径%, 外半径%]，数值差 = 环宽。70%~88% 即环宽 18% 的粗环
            radius: ['70%', '88%'],
            center: ['50%', '50%'],
            // 段与段之间的夹角间隙（度），数值越小断层越细
            padAngle: 2,
            avoidLabelOverlap: true,
            label: { show: false },
            emphasis: { scale: false },
            data: ratingData.map(({ label, value, color }) => ({
              name: label,
              value,
              itemStyle: {
                color,
                borderRadius: 2,
                // —— 荧光效果 ——
                // 减小的荧光：光晕比原先（blur 8）更收敛
                shadowBlur: 4,
                shadowColor: color,
              },
            })),
          },
        ],
      });

      // 鼠标移入某段：中心显示该段名称与数值；移出后清空
      const chart = getInstance();
      if (!chart) return;
      chart.on('mouseover', (params) => {
        const item = ratingData.find((d) => d.label === params.name);
        if (!item) return;
        centerLabel.value = item.label;
        centerValue.value = `${item.value}%`;
      });
      chart.on('mouseout', () => {
        centerLabel.value = '';
        centerValue.value = '';
      });
    });

    return () => (
      <StatCard class="mt-16px">
        <div class="flex items-center">
          <Light class="-ml-16px" height={24} />
          <div class="ml-20px text-white text-16px">项目分类统计</div>
        </div>

        <div class="mb-16px flex items-center">
          <div class="relative size-140px shrink-0">
            <div ref={chartRef} class="w-full h-full" />
            {/* 中心文字 overlay：hover 某段时显示其名称与数值，pointer-events-none 不挡图表交互 */}
            <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              {/* —— 文本大小 —— */}
              {/* 名称：text-12px 小号，可改 text-14px 等调整 */}
              <span class="text-white text-16px leading-6">{centerLabel.value}</span>
              {/* 数值：text-26px 大号，可改 text-30px 等调整 */}
              <span class="text-white text-20px font-500 leading-8">{centerValue.value}</span>
            </div>
          </div>

          <div class="ml-16px flex-1 grid grid-cols-2 gap-x-12px gap-y-8px">
            {ratingData.map((item) => (
              <div key={item.label} class="flex items-center gap-8px px-8px py-6px whitespace-nowrap">
                <div class="shrink-0 size-8px rd-full" style={{ backgroundColor: item.color }} />
                <span class="text-white text-14px">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </StatCard>
    );
  },
});
