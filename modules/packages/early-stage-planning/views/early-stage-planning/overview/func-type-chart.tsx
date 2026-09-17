import { useECharts } from '@jeesite/core/hooks/web/useECharts';
import { DoubleRing } from '@jeesite/display/components/double-ring';
import { StatCard } from '@jeesite/display/components/stat-card';
import { Tooltip } from 'antdv-next';
import type { PropType, Ref } from 'vue';
import { defineComponent, onMounted, shallowRef, watch } from 'vue';

/** 功能定位维度（other = 未命中任何导向 / FUNC_TYPE 为空） */
export type FuncKey = 'cod' | 'tod' | 'iod' | 'sod' | 'eod' | 'hod' | 'other';

/** 各维度单一配色（柱体从该色向底部渐变变浅；顶帽用亮色） */
const FUNC_COLORS: Record<FuncKey, { color: string; cap: string }> = {
  cod: { color: '#0891B2', cap: '#22D3EE' },
  tod: { color: '#D97706', cap: '#FBBF24' },
  iod: { color: '#059669', cap: '#34D399' },
  sod: { color: '#4F46E5', cap: '#818CF8' },
  eod: { color: '#65A30D', cap: '#A3E635' },
  hod: { color: '#A21CAF', cap: '#E879F9' },
  other: { color: '#64748B', cap: '#94A3B8' },
};

/**
 * FuncTypeChart —— 片区功能定位分布：各导向维度命中片区数柱状图
 *
 * 统计口径：片区 FUNC_TYPE 文本（大写化）包含维度关键词即 +1，一个片区可命中多个维度；
 * 未命中任何维度（含空值）计入「其他」。
 * 柱样式：单一维度色、自上而下渐变变浅；柱顶一段亮色小杠；无背景竖带。
 *
 * 点击柱子 → emit select(维度 key)：父级据此筛选列表与地图（FUNC_TYPE_VALUE 含该编码的片区）；
 * 再次点击同一柱或点击图表空白处 → emit select(null) 取消；有选中时未选中柱降透明度。
 *
 * props：
 * - rows: { key, count }[]（维度 → 命中片区数，含 other）
 * - activeKey: 当前选中的维度 key（null = 未筛选）
 */
export const FuncTypeChart = defineComponent({
  name: 'FuncTypeChart',

  props: {
    rows: { type: Array as PropType<{ key: FuncKey; count: number }[]>, default: () => [] },
    /** 当前选中的维度 key（无筛选为 null；未选中柱降透明度） */
    activeKey: { type: String as PropType<FuncKey | null>, default: null },
  },

  emits: {
    /** 点击柱子传出维度 key；点击空白/再次点击同一柱传出 null（取消筛选） */
    select: (key: string | null) => key === null || typeof key === 'string',
  },

  setup(props, { emit }) {
    const chartRef = shallowRef<HTMLDivElement | null>(null);
    const { setOptions, getInstance } = useECharts(chartRef as Ref<HTMLDivElement>);

    /** animate：数据变化 clear 全量重绘并保留柱体入场动画；仅选中态变化（点击筛选
        压暗）时走 merge 更新且关动画——clear 会重建系列导致入场动画重放 */
    function render(rows: { key: FuncKey; count: number }[], animate: boolean) {
      const yMax = Math.max(Math.ceil(Math.max(...rows.map((r) => r.count), 1) / 10) * 10, 10);
      // 选中态：未选中柱整体压暗（柱身与顶帽都按数据项写 opacity）
      const dim = (key: FuncKey) => (props.activeKey && key !== props.activeKey ? 0.3 : 1);

      setOptions(
        {
          animation: animate,
          grid: { top: 8, left: 0, right: 0, bottom: 0 },
          xAxis: {
            type: 'category',
            data: rows.map((r) => (r.key === 'other' ? '其他' : r.key.toUpperCase())),
            axisLabel: { color: '#E2E8F0', fontSize: 12, interval: 0, margin: 12 },
            axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.4)' } },
            axisTick: { show: false },
          },
          yAxis: {
            type: 'value',
            min: 0,
            max: yMax,
            interval: 10,
            axisLine: { show: false },
            splitLine: { lineStyle: { color: 'rgba(31, 180, 255, 0.12)', type: 'solid', width: 1 } },
            axisLabel: { color: '#A2B0B8' },
          },
          series: [
            // 【柱身】数值减去顶帽的高度，单一维度色从顶部实色向底部渐变变浅（stack 底层）
            {
              type: 'bar',
              stack: 'func',
              barWidth: 22,
              z: 10,
              zlevel: 2,
              data: rows.map(({ key, count }) => {
                const cap = Math.min(1.2, count);
                return {
                  value: count - cap,
                  itemStyle: {
                    opacity: dim(key),
                    color: {
                      type: 'linear',
                      x: 0,
                      y: 0,
                      x2: 0,
                      y2: 1,
                      colorStops: [
                        { offset: 0, color: FUNC_COLORS[key].color },
                        { offset: 1, color: `${FUNC_COLORS[key].color}26` },
                      ],
                    },
                  },
                };
              }),
            },
            // 【柱顶亮色小杠】1.2 高的帽段堆叠在柱身之上（stack 顶层，从柱身顶部继续向上画）
            {
              type: 'bar',
              stack: 'func',
              barWidth: 22,
              z: 11,
              zlevel: 3,
              silent: true,
              tooltip: { show: false },
              data: rows.map(({ key, count }) => ({
                value: Math.min(1.2, count),
                itemStyle: { color: FUNC_COLORS[key].cap, opacity: dim(key) },
              })),
            },
          ],
          tooltip: {
            trigger: 'axis',
            formatter: (params: unknown) => {
              const list = params as { name: string; value: number }[];
              const hit = list[0];
              if (!hit) return '';
              // 真实片区数 = 柱身 + 顶帽之和（柱身为 count - 顶帽高 1.2，直接取会带小数）
              const total = list.reduce((s, p) => s + (Number(p.value) || 0), 0);
              return `${hit.name}：${Math.round(total)} 个片区`;
            },
          },
        },
        animate,
      );
    }

    /** 柱子点击（传出维度 key）与空白点击（传出 null 取消）；
        实例可能因主题切换被重建，按实例记忆幂等重绑 */
    let boundInst: unknown = null;
    function bindClick() {
      const inst = getInstance();
      if (!inst || boundInst === inst) return;
      boundInst = inst;
      inst.on('click', (params: { dataIndex?: number }) => {
        const row = props.rows[params.dataIndex ?? -1];
        if (row) emit('select', row.key);
      });
      // zr 空白点击无 target → 取消选中（柱子点击有 target，不会误触发）
      inst.getZr().on('click', (e: { target?: unknown }) => {
        if (!e.target) emit('select', null);
      });
    }

    watch(
      [() => props.rows, () => props.activeKey],
      ([rows], [prevRows]) => {
        render(rows, rows !== prevRows);
        bindClick();
      },
      { immediate: true, deep: true },
    );
    onMounted(bindClick);

    return () => (
      <StatCard class="mt-24px">
        {/* 顶部标题栏 */}
        <div class="flex items-center">
          <DoubleRing class="size-32px">
            <div class="i-ri-compass-3-fill size-16px text-white" />
          </DoubleRing>
          <div class="ml-12px text-16px text-white font-500 tracking-wide">片区功能定位分布</div>
          <Tooltip title="统计各功能导向维度覆盖的片区数量，一个片区可命中多个导向维度；未命中任何维度计入其他">
            <div class="ml-8px i-ri-information-fill size-16px text-gray-500 cursor-pointer" />
          </Tooltip>
        </div>

        <div ref={chartRef} class="mt-24px w-full h-180px" id="chart"></div>
      </StatCard>
    );
  },
});
