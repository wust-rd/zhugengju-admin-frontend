import { GlassRing } from '@jeesite/display/components/glass-ring';
import { cn } from '@jeesite/core/libs';
import { defineComponent, ref, watch, type PropType } from 'vue';
import {
  relicCategoryLabel,
  relicLevelOf,
  type Relic,
} from '@jeesite/urban-protection/api/urban-protection/relic';

/**
 * RelicCard —— 文物信息卡片（文物地图页右侧）
 *
 * 点击地图文物点位后从右侧滑入：名称/级别 → 实景照片（首图大图 + 缩略图条点击切换）→
 * 属性网格（类别/年代/区域/公布年份/保存状况/编号/地址）→ 简介纵向滚动。
 * relic 为 null 时整体隐藏（透明 + 禁用鼠标穿透）。
 */
export const RelicCard = defineComponent({
  name: 'RelicCard',

  props: {
    relic: { type: Object as PropType<Relic | null>, default: null },
  },

  emits: {
    close: () => true,
  },

  setup(props, { emit }) {
    /** 当前展示的照片下标（切换文物时重置回首图） */
    const photoIndex = ref(0);
    watch(
      () => props.relic?.id,
      () => {
        photoIndex.value = 0;
      },
    );

    return () => {
      const relic = props.relic;
      const level = relicLevelOf(relic?.level);

      /** 属性网格项（两列布局，地址单独跨两列） */
      const metaItems: [string, string][] = relic
        ? [
            ['类别', relicCategoryLabel(relic.category)],
            ['年代', relic.era || '—'],
            ['所属区域', relic.district || '—'],
            ['公布年份', relic.publicTime ? String(relic.publicTime) : '—'],
            ['保存状况', relic.situation || '—'],
            ['文物编号', relic.code || '—'],
          ]
        : [];

      return (
        <div
          class={cn(
            'absolute right-24px top-24px z-20 w-400px max-h-[calc(100%-48px)] flex flex-col rd-12px overflow-hidden',
            'border border-cyan-900 bg-[#0f2b47]/95 shadow-2xl backdrop-blur',
            'transition-[transform,opacity] duration-200',
            relic ? 'opacity-100' : 'pointer-events-none translate-x-16px opacity-0',
          )}
        >
          {relic && (
            <>
              {/* 头部：名称 + 级别标签 + 关闭按钮 */}
              <div class="flex items-start gap-8px bg-gradient-to-r from-[#123a5c] to-transparent px-20px pt-16px pb-12px">
                <div class="min-w-0 flex-1">
                  <div class="truncate text-18px font-600 text-white" title={relic.name}>
                    {relic.name}
                  </div>
                  <div
                    class="mt-6px inline-flex items-center gap-6px rd-full border px-10px py-2px text-12px"
                    style={{
                      borderColor: `${level.color}66`,
                      color: level.color,
                      background: `${level.color}14`,
                    }}
                  >
                    <div class="size-6px rd-full" style={{ background: level.color }} />
                    {level.label}
                  </div>
                </div>

                <GlassRing
                  class="h-28px w-28px flex shrink-0 cursor-pointer items-center justify-center"
                  onClick={() => emit('close')}
                >
                  <div class="i-ri-close-line size-16px text-white" />
                </GlassRing>
              </div>

              {/* 实景照片：通栏大图（OSS 外链，懒加载）+ 缩略图条点击切换 */}
              {relic.avatars.length > 0 ? (
                <div class="px-20px">
                  <div class="relative h-200px w-full overflow-hidden rd-8px bg-black/30">
                    <img src={relic.avatars[photoIndex.value]} class="size-full object-cover" />
                    {relic.avatars.length > 1 && (
                      <div class="absolute right-8px bottom-8px rd-full bg-black/50 px-8px py-1px text-12px text-white/85">
                        {photoIndex.value + 1} / {relic.avatars.length}
                      </div>
                    )}
                  </div>

                  {relic.avatars.length > 1 && (
                    <div class="scrollbar-none mt-8px flex gap-6px overflow-x-auto pb-2px">
                      {relic.avatars.map((src, i) => (
                        <img
                          key={src}
                          src={src}
                          loading="lazy"
                          class={cn(
                            'h-56px w-84px shrink-0 cursor-pointer rd-6px object-cover transition-opacity',
                            i === photoIndex.value
                              ? 'ring-2 ring-cyan-400/90'
                              : 'opacity-60 hover:opacity-100',
                          )}
                          onClick={() => {
                            photoIndex.value = i;
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div class="mx-20px flex h-120px flex-col items-center justify-center gap-8px rd-8px bg-white/5 text-white/35">
                  <div class="i-ri-image-line size-28px" />
                  <div class="text-12px">暂无实景照片</div>
                </div>
              )}

              {/* 属性网格 */}
              <div class="grid grid-cols-2 gap-x-16px gap-y-10px px-20px py-14px">
                {metaItems.map(([label, value]) => (
                  <div class="min-w-0">
                    <div class="text-12px text-white/45">{label}</div>
                    <div class="mt-2px truncate text-13px text-white/90" title={value}>
                      {value}
                    </div>
                  </div>
                ))}

                <div class="col-span-2 min-w-0">
                  <div class="text-12px text-white/45">详细地址</div>
                  <div class="mt-2px text-13px text-white/90">{relic.address || '—'}</div>
                </div>
              </div>

              {/* 简介：卡片高度受限时纵向滚动 */}
              <div class="min-h-0 flex-1 overflow-y-auto border-t border-white/10 px-20px py-12px">
                <div class="mb-6px text-12px text-white/45">文物简介</div>
                <div class="whitespace-pre-wrap text-13px leading-relaxed text-white/80">
                  {relic.introduce || '暂无简介'}
                </div>
              </div>
            </>
          )}
        </div>
      );
    };
  },
});
