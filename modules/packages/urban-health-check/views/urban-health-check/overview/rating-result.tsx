import { useECharts } from '@jeesite/core/hooks/web/useECharts';
import { GlowTitle1 } from '@jeesite/display/components/glow-title/title1';
import type { Ref } from 'vue';
import { computed, defineComponent, onMounted, shallowRef, watch, type PropType } from 'vue';

/** 指标评价结果分布数据项：名称 + 百分比 + 颜色 */
export type RatingDatum = {
  key: string;
  label: string;
  value: number;
  color: string;
};

/**
 * RatingResult —— 指标评价结果：环形饼图 + 中心文字 + 统计网格
 *
 * 环形饼图（echarts，与 useECharts 同款用法）hover 某段时，中心显示该段名称与数值；
 * 右侧网格展示全部指标颜色与百分比。echarts 实例与 hover 状态内部管理。
 *
 * props：
 * - ratingData: 指标评价结果数据（{ key, label, value, color }[]，value 为百分数）；
 *   引用变化（年份/体系切换后异步重算）时自动重绘
 */
export const RatingResult = defineComponent({
  name: 'RatingResult',
  props: {
    /** 指标评价结果数据（value 为百分数） */
    ratingData: { type: Array as PropType<RatingDatum[]>, required: true },
    /** 指标总数（未 hover 时环心默认展示；不传显示 --） */
    total: { type: Number, default: undefined },
  },
  setup(props) {
    // 环形饼图（与 useECharts 同款用法，参照 VisitRadar.vue）
    const chartRef = shallowRef<HTMLDivElement | null>(null);
    const { setOptions, getInstance } = useECharts(chartRef as Ref<HTMLDivElement>);
    // 中心文字：未 hover 时显示指标总数；hover 某段时显示该段名称与数值
    // （由下方 HTML overlay 渲染，避免 echarts graphic 类型问题）
    const hovered = shallowRef<RatingDatum | null>(null);
    const centerLabel = computed(() => (hovered.value ? hovered.value.label : '指标总数'));
    const centerValue = computed(() =>
      hovered.value ? `${hovered.value.value}%` : props.total == null ? '--' : String(props.total),
    );

    function renderChart() {
      // options 内联传入 setOptions，由参数类型 EChartsOption 上下文推断，
      // 保证 type: 'pie' 保持字面量类型（脱离上下文会被拓宽为 string 报类型不匹配）。
      // clear=false：不清画布原地合并更新（tab 切换平滑过渡，不闪白、不重播入场动画）
      setOptions(
        {
          // 关闭动画系统：SVG 渲染器下数据过渡动画逐帧重写 path（含 shadowBlur 滤镜重算），
          // 视觉上表现为闪烁；tab/体系切换改为一次写入，无中间帧
          animation: false,
          series: [
            {
              type: 'pie',
              // —— 饼圈粗细 ——
              // 环形半径：[内半径%, 外半径%]，数值差 = 环宽。80%~87% 即环宽 7% 的细圈，
              // 想更细就拉近两值（如 ['83%','87%']），想更粗就拉开（如 ['70%','87%']）
              radius: ['80%', '87%'],
              center: ['50%', '50%'],
              // 段与段之间的夹角间隙（度），数值越大分段越明显
              padAngle: 4,
              avoidLabelOverlap: true,
              label: { show: false },
              emphasis: { scale: false },
              data: props.ratingData.map(({ label, value, color }) => ({
                name: label,
                value,
                itemStyle: {
                  color,
                  borderRadius: 2,
                  // —— 荧光效果 ——
                  // shadowColor 与段同色 + shadowBlur 向四周晕开，形成霓虹发光；
                  // blur 越大荧光越强（同时扩散越开），调小可减弱至无荧光（0）
                  shadowBlur: 8,
                  shadowColor: color,
                  shadowOffsetY: 0,
                },
              })),
            },
          ],
        },
        false,
      );
    }

    onMounted(() => {
      renderChart();

      // 鼠标移入某段：中心切换为该段名称与数值；移出后回到指标总数
      const chart = getInstance();
      if (!chart) return;
      chart.on('mouseover', (params) => {
        hovered.value = props.ratingData.find((d) => d.label === params.name) ?? null;
      });
      chart.on('mouseout', () => {
        hovered.value = null;
      });
    });

    // 数据异步到达 / 年份体系切换重算后重绘（computed 每次返回新数组，浅比较即触发）
    watch(() => props.ratingData, renderChart);

    return () => (
      <div class="mt-20px">
        <GlowTitle1 class="w-full h-28px">
          <div class="pl-52px mb-4px text-white font-500 text-18px">指标评价结果</div>
        </GlowTitle1>

        <div class="mt-16px flex items-center">
          <div class="relative w-160px h-160px shrink-0">
            <div ref={chartRef} class="w-full h-full" />
            {/* 中心文字 overlay：默认显示指标总数，hover 某段时显示其名称与数值，pointer-events-none 不挡图表交互 */}
            <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              {/* —— 文本大小 —— */}
              {/* 名称：text-14px 小号，可改 text-14px 等调整 */}
              <span class="text-white text-16px leading-6">{centerLabel.value}</span>
              {/* 数值：text-26px 大号，可改 text-30px 等调整 */}
              <span class="text-white text-20px font-500 leading-8">{centerValue.value}</span>
            </div>
          </div>

          <div class="ml-16px flex-1 grid grid-cols-2 gap-x-12px gap-y-8px">
            {props.ratingData.map((item) => (
              <div key={item.label} class="flex items-center gap-8px px-8px py-6px whitespace-nowrap">
                {/* 色块：10px 圆角方块（浅色的「无标准」也在深底上可见） */}
                <div class="w-10px h-10px rd-2px shrink-0" style={{ backgroundColor: item.color }} />
                <span class="text-white text-14px">{item.label}</span>
                <span class="text-white text-16px ml-auto">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  },
});
