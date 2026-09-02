import { GlassRing } from '@jeesite/display/components/glass-ring';
import { cn } from '@jeesite/core/libs';
import { defineComponent, type PropType } from 'vue';
import {
  formatArea,
  formatPerimeter,
  type CityScopeFeatureProps,
  type CityScopeLayerDef,
} from '@jeesite/urban-protection/api/urban-protection/city-scope';

/** 当前选中的范围面（图层定义 + 归一化属性，由地图点击查询构造） */
export interface SelectedCityScope {
  def: CityScopeLayerDef;
  props: CityScopeFeatureProps;
}

/**
 * ScopeCard —— 名城范围线信息卡片（文物地图页右侧）
 *
 * 点击地图范围面后从右侧滑入：基础名 + 类别/范围类型彩色标签 → 属性网格
 * （类别/保护范围/所属区县/占地面积/界线长度/标识码(名村)/备注）→ 范围类型说明。
 * 与 RelicCard 共用右上角卡位，二者互斥展示；scope 为 null 时整体隐藏。
 */
export const ScopeCard = defineComponent({
  name: 'ScopeCard',

  props: {
    scope: { type: Object as PropType<SelectedCityScope | null>, default: null },
  },

  emits: {
    close: () => true,
  },

  setup(props, { emit }) {
    return () => {
      const scope = props.scope;
      const def = scope?.def;
      const p = scope?.props;
      /** 范围类型徽标色：核心保护范围用图层色，建设控制地带降饱和 */
      const scopeColor = p?.scope === '建设控制地带' ? `${def?.color}AA` : def?.color;

      /** 属性网格项（两列，备注跨两列；所属区县/标识码仅名村数据有，条件展示） */
      const metaItems: [string, string][] = p
        ? [
            ['类别', def!.label],
            ['保护范围', p.scope || '—'],
            ['占地面积', formatArea(p.areaM2)],
            ['界线长度', formatPerimeter(p.perimeterM)],
            ...(p.district ? [['所属区县', p.district] as [string, string]] : []),
            ...(p.code ? [['标识码', p.code] as [string, string]] : []),
          ]
        : [];

      return (
        <div
          class={cn(
            'absolute right-24px top-24px z-20 w-400px rd-12px overflow-hidden',
            'border border-cyan-900 bg-[#0f2b47]/95 shadow-2xl backdrop-blur',
            'transition-[transform,opacity] duration-200',
            scope ? 'opacity-100' : 'pointer-events-none translate-x-16px opacity-0',
          )}
        >
          {scope && p && def && (
            <>
              {/* 头部：基础名 + 类别/范围类型标签 + 关闭按钮 */}
              <div class="flex items-start gap-8px bg-gradient-to-r from-[#123a5c] to-transparent px-20px pt-16px pb-12px">
                <div class="min-w-0 flex-1">
                  <div class="truncate text-18px font-600 text-white" title={p.name}>
                    {p.name}
                  </div>

                  <div class="mt-6px flex flex-wrap items-center gap-6px">
                    <div
                      class="inline-flex items-center gap-6px rd-full border px-10px py-2px text-12px"
                      style={{
                        borderColor: `${def.color}66`,
                        color: def.color,
                        background: `${def.color}14`,
                      }}
                    >
                      <div class="size-6px rd-full" style={{ background: def.color }} />
                      {def.label}
                    </div>

                    {p.scope && (
                      <div
                        class="inline-flex items-center rd-full border px-10px py-2px text-12px"
                        style={{ borderColor: `${scopeColor}55`, color: scopeColor, background: `${scopeColor}10` }}
                      >
                        {p.scope}
                      </div>
                    )}
                  </div>
                </div>

                <GlassRing
                  class="h-28px w-28px flex shrink-0 cursor-pointer items-center justify-center"
                  onClick={() => emit('close')}
                >
                  <div class="i-ri-close-line size-16px text-white" />
                </GlassRing>
              </div>

              {/* 属性网格 */}
              <div class="grid grid-cols-2 gap-x-16px gap-y-10px px-20px py-14px">
                {metaItems.map(([label, value]) => (
                  <div key={label} class="min-w-0">
                    <div class="text-12px text-white/45">{label}</div>
                    <div class="mt-2px truncate text-13px text-white/90" title={value}>
                      {value}
                    </div>
                  </div>
                ))}

                {p.note && (
                  <div class="col-span-2 min-w-0">
                    <div class="text-12px text-white/45">备注</div>
                    <div class="mt-2px text-13px text-white/90">{p.note}</div>
                  </div>
                )}
              </div>

              {/* 范围类型说明（仅带范围类型的面展示） */}
              {p.scope && (
                <div class="border-t border-white/10 px-20px py-12px text-12px leading-relaxed text-white/50">
                  {p.scope === '核心保护范围'
                    ? '核心保护范围：历史文化价值最集中、需严格保护的区域。'
                    : '建设控制地带：核心范围外围风貌协调、建设活动需管控的区域。'}
                </div>
              )}
            </>
          )}
        </div>
      );
    };
  },
});
