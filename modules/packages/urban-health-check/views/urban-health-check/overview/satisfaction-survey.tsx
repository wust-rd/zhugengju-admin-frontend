import { ScrollArea } from '@jeesite/display/components/scroll-area';
import { StatCard } from '@jeesite/display/components/stat-card';
import { Radar } from 'lucide-vue-next';
import { defineComponent, type PropType } from 'vue';

/** 满意度条目：名称 + 满意率(%) */
export type SatisfactionItem = {
  key: string;
  /** 条目名称（调用方决定取关联指标名还是问题原文） */
  name: string;
  /** 满意率(%)，无值时只显示占位不画进度条 */
  rate: number | null;
};

/**
 * 进度条渐变配色（按行序循环，左暗 → 右亮，还原设计稿四色）：
 * 青蓝 / 绿黄→黄 / 绿→亮绿 / 红橙→橙黄
 */
const BAR_GRADIENTS = [
  'bg-gradient-to-r from-cyan-600 via-cyan-400 to-cyan-300',
  'bg-gradient-to-r from-lime-500 to-yellow-400',
  'bg-gradient-to-r from-green-600 to-lime-400',
  'bg-gradient-to-r from-red-500 to-orange-400',
] as const;

/**
 * SatisfactionSurvey —— 居民满意度调查卡片（总览页「指标评价结果」下方）
 *
 * 整卡用 StatCard 边框容器框起（圆角 + 青色描边 + 深蓝渐变底，与名城保护总览
 * 图表卡同款）。卡内：标题行 = 发光圆环图标 + 标题；数据行单行排布 =
 * 名称（左，超长省略）+ 渐变进度条（中，flex 占满）+ 百分比（右）；
 * 进度条 h-7px 全圆角、每行循环四色渐变、进度末端白色发光圆点。
 * 条目较多时列表内部滚动（maxH 控制可视高度），标题常驻。无「月」粒度下拉。
 *
 * props：
 * - items: 条目列表（{ key, name, rate }[]）
 * - maxH: 列表滚动区最大高度（UnoCSS 任意值语法，默认 200px ≈ 5 行）
 */
export const SatisfactionSurvey = defineComponent({
  name: 'SatisfactionSurvey',
  props: {
    /** 满意度条目列表 */
    items: { type: Array as PropType<SatisfactionItem[]>, required: true },
    /** 列表滚动区最大高度（UnoCSS 任意值语法，如 max-h-[220px]） */
    maxH: { type: String, default: 'max-h-200px' },
  },
  setup(props) {
    return () => (
      <StatCard class="mt-20px">
        {/* 标题行：发光圆环图标（雷达波纹）+ 标题 */}
        <div class="flex items-center gap-10px h-36px">
          <div class="size-30px rd-full b-2 b-cyan-400/80 bg-cyan-900/40 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(34,211,238,0.45)]">
            <Radar class="size-16px text-cyan-300" />
          </div>
          <div class="text-white font-500 text-18px truncate">居民满意度调查</div>
        </div>

        <ScrollArea className={`mt-14px w-full ${props.maxH}`}>
          {props.items.length === 0 ? (
            <div class="py-24px text-center text-14px text-gray-500">暂无满意度调查数据</div>
          ) : (
            <div class="space-y-14px pr-6px">
              {props.items.map((item, i) => (
                <div key={item.key} class="flex items-center gap-12px">
                  {/* 名称：定宽省略，title 悬停看全称 */}
                  <div class="w-132px shrink-0 truncate text-14px text-gray-300" title={item.name}>
                    {item.name}
                  </div>

                  {/* 进度条：底轨 white/12 全圆角，填充按行序循环四色渐变，末端白色发光圆点 */}
                  <div class="relative flex-1 h-7px rd-full bg-white/12">
                    <div
                      class={`absolute inset-y-0 left-0 rd-full ${BAR_GRADIENTS[i % BAR_GRADIENTS.length]}`}
                      style={{ width: `${Math.min(Math.max(item.rate ?? 0, 0), 100)}%` }}
                    >
                      {item.rate != null && (
                        <div class="absolute -right-6px top-1/2 -translate-y-1/2 size-12px rd-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.85)]" />
                      )}
                    </div>
                  </div>

                  {/* 百分比 */}
                  <div class="w-52px shrink-0 text-right text-15px text-white font-500 whitespace-nowrap">
                    {item.rate == null ? '--' : `${item.rate}%`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </StatCard>
    );
  },
});
