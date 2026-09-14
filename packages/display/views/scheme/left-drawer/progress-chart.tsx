import { Light } from '@jeesite/display/components/light/index';
import { StatCard } from '@jeesite/display/components/stat-card';
import { Tooltip } from 'antdv-next';
import { defineComponent, type PropType } from 'vue';

/** 三色图数据项：名称 + 百分比 + 数量（片）+ 颜色 */
export type ProgressItem = {
  key: string;
  /** 名称（绿 / 黄 / 红） */
  name: string;
  /** 百分比（进度条段宽） */
  percent: number;
  /** 数量（片） */
  count: number;
  /** 条/竖条颜色 */
  color: string;
};

/** 推进情况三色图数据（静态占位，接接口后替换） */
const DEFAULT_ITEMS: ProgressItem[] = [
  { key: 'green', name: '绿', percent: 25, count: 20, color: '#2EE6A8' },
  { key: 'yellow', name: '黄', percent: 37, count: 40, color: '#F5E334' },
  { key: 'red', name: '红', percent: 28, count: 20, color: '#FB4A64' },
];

/**
 * ProgressChart —— 片区推进情况三色图
 *
 * 绿 / 黄 / 红 三段进度条（段宽 = 百分比）+ 各段下方百分比 + 底部三列统计（名称 + 片数）。
 * 颜色带荧光发光；数据静态占位。
 *
 * props：
 * - items: 三色图数据（{ key, name, percent, count, color }[]，默认内置占位数据）
 */
export const ProgressChart = defineComponent({
  name: 'ProgressChart',
  props: {
    /** 三色图数据，不传则用内置占位数据 */
    items: { type: Array as PropType<ProgressItem[]>, default: () => DEFAULT_ITEMS },
  },
  setup(props) {
    return () => (
      <StatCard class="mt-16px">
        {/* 标题栏 */}
        <div class="flex items-center">
          <Light class="-ml-16px" height={24} />
          <div class="ml-20px text-white text-16px">片区推进情况三色图</div>
        </div>

        {/* 分段进度条 + 百分比：三段连排，段宽 = 百分比，剩余留白 */}
        <div class="mt-32px flex gap-6px w-full">
          {props.items.map((item) => (
            <div key={item.key} class="flex flex-col items-center" style={{ flex: `${item.percent} 1 0%` }}>
              <div
                class="h-10px w-full rd-full"
                style={{ background: item.color, boxShadow: `0 0 8px ${item.color}` }}
              />
              <span class="mt-8px text-14px text-gray-400">{item.percent}%</span>
            </div>
          ))}
        </div>

        {/* 底部三列统计：发光竖条 + 名称 + 数量，底部带同色浅荧光 */}
        <div class="mt-24px mb-16px grid grid-cols-3 gap-x-8px">
          {props.items.map((item) => (
            <div
              key={item.key}
              class="relative overflow-hidden flex items-center gap-8px px-12px py-8px rd-8px bg-white/5 h-40px"
              style={{ boxShadow: `inset 0 -8px 16px -14px ${item.color}` }}
            >
              <div
                class="w-4px h-16px rd-full shrink-0"
                style={{ background: item.color, boxShadow: `0 0 8px ${item.color}` }}
              />
              <span class="text-14px text-white">{item.name}</span>
              <span class="text-14px text-white ml-auto">{item.count}片</span>
            </div>
          ))}
        </div>
      </StatCard>
    );
  },
});
