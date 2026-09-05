import { DoubleRing } from '@jeesite/display/components/double-ring';
import { StatCard } from '@jeesite/display/components/stat-card';
import { cn } from '@jeesite/core/libs';
import { defineComponent } from 'vue';

// ---------- 日常巡查与问题整改完成率 ----------

/** 巡查完成率数据（占位，接入接口后替换） */
const INSPECTION_ROWS = [
  { name: '武昌', rate: 72.9 },
  { name: '江汉', rate: 64.5 },
  { name: '江岸', rate: 72.3 },
  { name: '青山', rate: 45.9 },
  { name: '硚口', rate: 54.1 },
  { name: '汉阳', rate: 86.5 },
];

/** 进度条三段配色：已巡检（蓝）/ 在整改（浅蓝）/ 未巡检（暗轨） */
const SEGMENT_COLORS = { done: '#2E90FA', doing: '#35D0C5', todo: 'rgba(255, 255, 255, 0.14)' };

/** 按完成率拆三段宽度（拆分比例为演示值，接入接口后按真实字段计算） */
function segmentsOf(rate: number): { done: number; doing: number; todo: number } {
  const done = Math.round(rate * 0.7);
  const doing = Math.round(rate * 0.3);
  return { done, doing, todo: 100 - done - doing };
}

// ---------- 近期范围内优保建筑预警 ----------

/** 预警条目（占位，接入接口后替换） */
const WARN_ROWS = [
  { name: '水陆片区传统风貌片区', code: '第00059处优保建筑预警', date: '2026.8.19' },
  { name: '汉口老宅', code: '第00047处优保建筑预警', date: '2026.8.19' },
  { name: '昙华林历史片区', code: '第00025处优保建筑预警', date: '2026.8.19' },
  { name: '农民世界', code: '第00001处优保建筑预警', date: '2026.8.19' },
  { name: '青岛路片区改造维护片区', code: '第00006处优保建筑预警', date: '2026.8.19' },
  { name: '花楼片区改造维护片区', code: '第00032处优保建筑预警', date: '2026.8.19' },
  { name: '梅花花楼片区', code: '第00067处优保建筑预警', date: '2026.8.19' },
  { name: '梅园寺古建筑', code: '第00073处优保建筑预警', date: '2026.8.19' },
  { name: '实施片区', code: '第00002处优保建筑预警', date: '2026.8.19' },
];

// ---------- 历史保护相关政策法规 ----------

/** 政策法规（占位，接入接口后替换） */
const POLICY_ROWS = [
  { level: '国家', name: '城市更新「十四五」规划' },
  { level: '部委', name: '关于在城乡建设中加强历史文化保护传承的意见' },
  { level: '省', name: '关于加强历史文化街区保护的办法（试行）' },
  { level: '市', name: '《武汉市历史文化风貌街区保护条例》武汉市「十四五」历史文化名城保护发展规划方案 2022—2031' },
];

/**
 * RightInfoPanels —— 名城保护右侧信息栏（三块）
 *
 * 1. 日常巡查与问题整改完成率：各区分段进度条（已巡检/在整改）+ 完成率百分比；
 * 2. 近期范围内优保建筑预警：条目滚动列表（片区名 / 预警详情 / 预警时间）；
 * 3. 历史保护相关政策法规：级别标签 + 名称列表。
 * 数据均为静态占位，接入接口后替换。
 */
export const RightInfoPanels = defineComponent({
  name: 'RightInfoPanels',

  setup() {
    return () => (
      <div class="absolute right-24px top-18px bottom-24px z-30 w-340px flex flex-col gap-8px overflow-y-auto">
        {/* 1. 日常巡查与问题整改完成率 */}
        <StatCard>
          <div class="flex items-center">
            <DoubleRing class="size-32px">
              <div class="i-ri-survey-fill size-16px text-white" />
            </DoubleRing>
            <div class="ml-12px text-15px text-white font-500 tracking-wide">日常巡查与问题整改完成率</div>
          </div>

          {/* 表头：单位 + 图例 */}
          <div class="mt-8px flex items-center text-14px text-white/45">
            <span>单位：个</span>
            <span class="ml-auto flex items-center gap-10px">
              <span class="flex items-center gap-4px">
                <span class="size-8px rd-2px" style={{ background: SEGMENT_COLORS.done }} />
                已完成
              </span>
              <span class="flex items-center gap-4px">
                <span class="size-8px rd-2px" style={{ background: SEGMENT_COLORS.doing }} />
                在整改
              </span>
            </span>
          </div>

          <div class="mt-8px space-y-12px">
            {INSPECTION_ROWS.map((row) => {
              const seg = segmentsOf(row.rate);
              return (
                <div key={row.name} class="flex items-center gap-10px">
                  <span class="w-36px shrink-0 text-13px text-white/85">{row.name}</span>
                  <div class="relative h-8px flex-1 overflow-hidden rd-full bg-white/8">
                    <div
                      class="absolute left-0 top-0 h-full rd-full"
                      style={{ width: `${seg.done}%`, background: SEGMENT_COLORS.done }}
                    />
                    <div
                      class="absolute top-0 h-full rd-full"
                      style={{ left: `${seg.done}%`, width: `${seg.doing}%`, background: SEGMENT_COLORS.doing }}
                    />
                  </div>
                  <span class="w-44px shrink-0 text-right text-13px font-500 text-white">{row.rate}%</span>
                </div>
              );
            })}
          </div>
        </StatCard>

        {/* 2. 近期范围内优保建筑预警 */}
        <StatCard>
          <div class="flex items-center">
            <DoubleRing class="size-32px">
              <div class="i-ri-alarm-warning-fill size-16px text-white" />
            </DoubleRing>
            <div class="ml-12px text-15px text-white font-500 tracking-wide">近期范围内优保建筑预警</div>
          </div>

          {/* 表头 */}
          <div class="mt-12px grid grid-cols-[1fr_1.4fr_60px] gap-x-8px text-14px text-white/45">
            <span>片区名称</span>
            <span>预警详情</span>
            <span class="text-right">预警时间</span>
          </div>

          <div class="mt-6px max-h-220px space-y-4px overflow-y-auto">
            {WARN_ROWS.map((row, i) => (
              <div
                key={`${row.code}-${i}`}
                class={cn(
                  'grid grid-cols-[1fr_1.4fr_60px] gap-x-8px rd-4px px-4px py-5px text-14px',
                  i % 2 === 0 ? 'bg-white/4' : '',
                )}
              >
                <span class="truncate text-white/85" title={row.name}>
                  {row.name}
                </span>
                <span class="truncate text-cyan-300/85" title={row.code}>
                  {row.code}
                </span>
                <span class="text-right text-white/60">{row.date}</span>
              </div>
            ))}
          </div>
        </StatCard>

        {/* 3. 历史保护相关政策法规 */}
        <StatCard>
          <div class="flex items-center">
            <DoubleRing class="size-32px">
              <div class="i-ri-book-2-fill size-16px text-white" />
            </DoubleRing>
            <div class="ml-12px text-15px text-white font-500 tracking-wide">历史保护相关政策法规</div>
          </div>

          <div class="mt-12px space-y-8px">
            {POLICY_ROWS.map((row) => (
              <div key={row.name} class="flex items-start gap-10px">
                <span class="mt-2px shrink-0 rd-4px bg-cyan-500/15 px-8px py-2px text-14px text-cyan-300">
                  {row.level}
                </span>
                <span class="text-13px leading-20px text-white/85">{row.name}</span>
              </div>
            ))}
          </div>
        </StatCard>
      </div>
    );
  },
});
