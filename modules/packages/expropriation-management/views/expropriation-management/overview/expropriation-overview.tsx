import { cn } from '@jeesite/core/libs';
import { useECharts } from '@jeesite/core/hooks/web/useECharts';
import { GlowButton } from '@jeesite/display/components/glow-button';
import { StatCard } from '@jeesite/display/components/stat-card';
import type { Ref } from 'vue';
import { defineComponent, onMounted, ref, shallowRef } from 'vue';

import arrowIcon from '@jeesite/assets/images/expropriation-management/箭头1.svg';
/**
 *征收数据总览（静态占位数据，接入接口后按区域 key 替换） */
const OVERVIEW = {
  /** 已完成征地面积总额（万平方米） */
  area: '67.33',
  /** 面积完成率（环形进度） */
  areaRate: 80,
  /** 累计完成户数 */
  householdCount: '68888',
  /** 户数完成率 */
  householdRate: 61.8,
  /** 累计落实资金（亿） */
  fund: '36.00',
  /** 资金落实率 */
  fundRate: 50.2,
  statDate: '2026/05/21',
};

/** 日期左侧装饰方块（三个，亮度递减；取色自设计稿） */
const DECOR_SQUARES = ['#3BF8FF', '#30BCC8', '#2C95AC'];

/** 区域 tabs（点击切换下方分区详情卡数据） */
const REGION_TABS = [
  { key: 'center', label: '中心区' },
  { key: 'function', label: '功能区' },
  { key: 'new-town', label: '新城区' },
];

/** 分区详情卡数据（占位；接入接口后按激活区域返回） */
const REGION_DETAIL: Record<
  string,
  { area: string; areaRate: number; household: string; householdRate: number; fund: string; fundRate: number }
> = {
  center: { area: '67.33', areaRate: 75, household: '2155', householdRate: 50, fund: '312.83', fundRate: 34 },
  function: { area: '42.10', areaRate: 58, household: '1380', householdRate: 44, fund: '201.60', fundRate: 29 },
  'new-town': { area: '28.77', areaRate: 36, household: '906', householdRate: 31, fund: '128.45', fundRate: 18 },
};

/**
 * RingProgress —— 环形进度（echarts）
 *
 * 双 pie 叠加：底层整圆为暗色底轨，上层 240° 扇区做进度弧（绿色渐变 + 圆角端点 + 光晕），
 * 中心 title 图形显示百分比。设计稿中进度弧约 3/4 圈、末端带亮点。
 */
const RingProgress = defineComponent({
  name: 'RingProgress',
  props: {
    percent: { type: Number, required: true },
    size: { type: Number, default: 92 },
  },
  setup(props) {
    const chartRef = shallowRef<HTMLDivElement | null>(null);
    const { setOptions } = useECharts(chartRef as Ref<HTMLDivElement>);

    onMounted(() => {
      setOptions({
        // 中心百分比文字
        title: {
          text: `${props.percent}%`,
          left: 'center',
          top: 'center',
          textStyle: { color: '#FFFFFF', fontSize: 18, fontWeight: 500 },
        },
        tooltip: { show: false },
        series: [
          // 底轨：整圆暗色
          {
            type: 'pie',
            radius: ['72%', '86%'],
            center: ['50%', '50%'],
            startAngle: 90,
            silent: true,
            label: { show: false },
            data: [{ value: 1, itemStyle: { color: 'rgba(255,255,255,0.10)' } }],
          },
          // 进度弧：value = percent，其余为透明占位，拼出部分弧
          {
            type: 'pie',
            radius: ['72%', '86%'],
            center: ['50%', '50%'],
            startAngle: 90,
            silent: true,
            label: { show: false },
            data: [
              {
                value: props.percent,
                itemStyle: {
                  borderRadius: 6,
                  color: {
                    type: 'linear',
                    x: 0,
                    y: 0,
                    x2: 1,
                    y2: 1,
                    colorStops: [
                      { offset: 0, color: '#35E0B0' },
                      { offset: 1, color: '#1E9E8E' },
                    ],
                  },
                  shadowBlur: 10,
                  shadowColor: 'rgba(53, 224, 176, 0.5)',
                },
              },
              { value: 100 - props.percent, itemStyle: { color: 'transparent' } },
            ],
          },
        ],
      });
    });

    return () => (
      <div ref={chartRef} style={{ width: `${props.size}px`, height: `${props.size}px` }} class="shrink-0" />
    );
  },
});

/** 横向滑条进度（渐变轨道 + 圆点滑块 + 右侧百分比） */
const SliderBar = defineComponent({
  name: 'SliderBar',
  props: {
    class: { type: String, default: '' },
    percent: { type: Number, required: true },
    /** 渐变末端色（青绿 / 金黄两种） */
    color: { type: String, default: '#35E0B0' },
  },
  setup(props) {
    return () => (
      <div class={cn('flex flex-1 items-center gap-10px', props.class)}>
        <div class="relative h-6px flex-1 rd-full" style={{ background: 'rgba(255,255,255,0.12)' }}>
          <div
            class="absolute left-0 top-0 h-full rd-full"
            style={{
              width: `${props.percent}%`,
              background: `linear-gradient(to right, rgba(255,255,255,0.25), ${props.color})`,
            }}
          />
          <div
            class="absolute top-1/2 size-10px rd-full -translate-y-1/2"
            style={{
              left: `calc(${props.percent}% - 5px)`,
              background: '#FFFFFF',
              boxShadow: `0 0 8px ${props.color}`,
            }}
          />
        </div>
        <span class="w-44px shrink-0 text-right text-14px text-white">{props.percent}%</span>
      </div>
    );
  },
});

/**
 * ExpropriationOverview —— 征收数据总览
 *
 * 顶部汇总卡（完成征地面积总额 + 环形进度 + 户数/资金滑条）→ 区域 tabs（中心区/功能区/新城区）
 * → 分区详情卡（面积/户数/资金三项与完成率徽标）。
 * 数据为静态占位，接入接口后按激活区域替换。
 */
export const ExpropriationOverview = defineComponent({
  name: 'ExpropriationOverview',

  setup() {
    const activeRegion = ref<string>('center');
    const detail = () => REGION_DETAIL[activeRegion.value] ?? REGION_DETAIL.center;

    return () => (
      <div class="mt-16px">
        {/* 小节标题栏（箭头图标 + 标题 + 右侧日期与装饰方块） */}
        <div class="flex items-center">
          <img src={arrowIcon} class="size-24px" />

          <div class="ml-10px text-white text-16px">征收数据总览</div>

          <div class="ml-auto">
            {/* 统计日期：三个递减亮度方块（装饰）+ 日期文字，方块配色取自设计稿 */}
            <div class="flex items-center gap-4px justify-end">
              {DECOR_SQUARES.map((color) => (
                <div key={color} class="size-5px" style={{ background: color }} />
              ))}
            </div>

            <div class="text-12px text-white/45 mt-4px">{OVERVIEW.statDate}</div>
          </div>
        </div>

        {/* 汇总卡 */}
        <StatCard class="mt-12px">
          {/* 已完成征地面积总额 + 环形进度 */}
          <div class="flex items-center">
            <div class="min-w-0 flex-1">
              <div class="flex items-center text-14px text-white/85">
                <span class="inline-flex size-32px items-center justify-center rd-full border border-cyan-400/60">
                  <span class="i-ri-building-4-line size-18px text-cyan-300" />
                </span>

                <div class="ml-12px text-16px lh-24px"> 已完成征地面积总额</div>

                <span class="i-ri-information-fill size-12px cursor-pointer text-white/35 ml-12px" />
              </div>

              <div class="mt-20px flex items-baseline gap-8px">
                {/* LED 数码管风格数字 */}
                {/* LED 数码管风格数字（font-subway：SubwayTickerGrid 点阵字体） */}
                <span
                  class="text-36px font-400 leading-none text-[#35E0B0] font-subway"
                  style={{ textShadow: '0 0 14px rgba(53, 224, 176, 0.55)' }}
                >
                  {OVERVIEW.area}
                </span>
                <span class="text-20px font-500 text-white/60">万平方米</span>
              </div>
            </div>

            <RingProgress percent={OVERVIEW.areaRate} />
          </div>

          <div class="my-20px h-1px w-full bg-white/10" />

          {/* 户数 / 资金滑条 */}
          <div class="mt-16px space-y-14px">
            <div class="flex items-center gap-12px">
              <div class="w-120px shrink-0">
                <div class="text-14px text-white">累计完成户数</div>
                <div class="mt-4px text-20px font-400 text-[#00E5FF] font-youshe">{OVERVIEW.householdCount}户</div>
              </div>

              <SliderBar percent={OVERVIEW.householdRate} color="#35E0B0" class="ml-2px" />
            </div>

            <div class="flex items-center gap-12px mt-20px">
              <div class="w-120px shrink-0">
                <div class="text-14px text-white">累计落实资金</div>
                <div class="mt-4px text-20px font-400 text-[#F5E334] font-youshe">{OVERVIEW.fund}亿</div>
              </div>

              <SliderBar percent={OVERVIEW.fundRate} color="#F5E334" class="ml-2px" />
            </div>
          </div>
        </StatCard>

        {/* 区域 tabs（GlowButton：选中亮描边 + 底部光晕，未选中弱光晕） */}
        <div class="mt-14px grid grid-cols-3 gap-10px">
          {REGION_TABS.map((tab) => (
            <GlowButton
              key={tab.key}
              isActive
              borderGlow={activeRegion.value === tab.key}
              glowOpacity={activeRegion.value === tab.key ? 0.75 : 0.25}
              // width 必须传数字：SVG viewBox 按数字构建（拉伸比 1:1），
              // 传 '100%' 会回退 202 兜底宽再横向压缩，radius 视觉随之变形
              width={133}
              height={40}
              radius={8}
              class={cn('text-15px font-400', {
                'text-white': activeRegion.value === tab.key,
                'text-white/55': activeRegion.value !== tab.key,
              })}
              onClick={() => (activeRegion.value = tab.key)}
            >
              {tab.label}
            </GlowButton>
          ))}
        </div>

        {/* 分区详情卡 */}
        <StatCard class="mt-12px">
          {(() => {
            const d = detail();
            return (
              <>
                {/* 已完成征地面积行 */}
                <div class="flex items-center h-38px">
                  <span class="text-15px text-white/85">已完成征地面积</span>
                  <span
                    class="text-24px font-400 text-[#02FF96] leading-none font-youshe ml-auto flex items-end gap-8px h-30px"
                    style={{ textShadow: '0 0 10px rgba(53,224,176,0.5)' }}
                  >
                    {d.area}

                    <span class="text-14px text-white/55 h-20px">万平方米</span>
                  </span>

                  <span
                    class="ml-auto rd-full border px-10px py-2px text-12px px-12px"
                    style={{
                      borderColor: 'rgba(53,224,176,0.5)',
                      color: '#02FF96',
                      background: '#02FF960F',
                    }}
                  >
                    {d.areaRate}%
                  </span>
                </div>

                <div class="my-16px bg-white/10 h-1px" />

                {/* 户数 / 资金双列 */}
                <div class="flex h-80px py-12px">
                  <div class="flex w-180px">
                    <div class="w-3px h-54px bg-[#00E5FF] rd-full" />

                    <div class="ml-16px">
                      <div class="text-20px font-500 text-white/90">{d.household}户</div>

                      <div class="mt-4px text-12px text-white/55">完成户数</div>
                    </div>

                    <div
                      class="rd-full w-51px h-26px border text-14px flex items-center justify-center font-400 ml-auto"
                      style={{
                        borderColor: 'rgba(46,144,250,0.6)',
                        color: '#5FA8F5',
                        background: 'rgba(46,144,250,0.1)',
                      }}
                    >
                      {d.householdRate}%
                    </div>
                  </div>

                  <div class="flex w-180px ml-auto">
                    <div class="w-3px h-54px bg-[#00E5FF] rd-full" />

                    <div class="ml-16px">
                      <div class="text-20px font-500 text-white/90">{d.household}户</div>

                      <div class="mt-4px text-12px text-white/55">完成户数</div>
                    </div>

                    <div
                      class="rd-full w-51px h-26px border text-14px flex items-center justify-center font-400 ml-auto"
                      style={{
                        borderColor: 'rgba(245,227,52,0.55)',
                        color: '#F5E334',
                        background: 'rgba(245,227,52,0.08)',
                      }}
                    >
                      {d.householdRate}%
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </StatCard>
      </div>
    );
  },
});
