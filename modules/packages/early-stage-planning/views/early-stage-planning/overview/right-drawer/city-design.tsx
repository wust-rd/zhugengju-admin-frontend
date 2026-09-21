import { computed, defineComponent, ref, watch, type PropType } from 'vue';
import { cn } from '@jeesite/core/libs';
import { CollapsibleSection } from '@jeesite/shared/components/collapsible-section';
import { GlowButton } from '@jeesite/shared/components/glow-button';
import type { AreaInfo } from '../area-info';
import { cityDesignPanelImages, panelImageIndexes } from '../panel-image-state';

import diamond from '@jeesite/assets/images/display/plan/diamond.svg';
import bottomImg from '@jeesite/assets/images/display/plan/底部.png';
import arrowImg from '@jeesite/assets/images/display/plan/箭头开关.svg';

/** 城市设计 */
export const CityDesign = defineComponent({
  props: {
    /** 当前片区完整数据（图斑要素 feature + 填报表单 form 含图片直链） */
    area: { type: Object as PropType<AreaInfo>, required: true },
  },
  setup(props) {
    console.log('[城市设计] 片区完整数据（图斑要素 + 填报表单）', props.area);

    /** 已填报的城市设计条目（类别六选一不可重复：人居环境/产业发展/…/交通影响评价） */
    const designs = computed(() => props.area.form?.cityDesigns ?? []);

    /** 当前选中类别（类别名标识；片区数据变化后失效回落首类） */
    const activeType = ref('');
    watch(
      designs,
      (list) => {
        if (!list.some((d) => d.type === activeType.value)) activeType.value = list[0]?.type ?? '';
      },
      { immediate: true },
    );

    /** 当前条目（选中类别的内容文本 + 设计图片） */
    const activeEntry = computed(() => designs.value.find((d) => d.type === activeType.value) ?? designs.value[0]);
    /** 当前条目设计图片 url */
    const imageUrls = computed(() =>
      (activeEntry.value?.images ?? []).map((f) => f.url).filter((u): u is string => !!u),
    );

    /** 左侧面板联动：类别切换 / 片区数据变化时重置为该类别首图，之后由点缩略图接管 */
    watch(
      imageUrls,
      (urls) => {
        cityDesignPanelImages.value = urls;
        panelImageIndexes['城市设计'] = 0;
      },
      { immediate: true },
    );

    /** 类别 tab 条容器（选中项滚动居中用） */
    const tabBarRef = ref<HTMLElement | null>(null);

    /** 选中类别滚到 tab 条居中（尽量）：让用户知道两侧还有更多 tab；两侧空间不足时
        scrollLeft 的 0/最大值边界自然夹住，居中到头的项再点也不会晃动（同外层抽屉 tab 条做法） */
    function scrollActiveIntoView(index: number) {
      const bar = tabBarRef.value;
      const el = bar?.children[index] as HTMLElement | undefined;
      if (!bar || !el) return;
      const target = el.offsetLeft - (bar.clientWidth - el.offsetWidth) / 2;
      bar.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
    }

    return () => (
      <div class="p-16px">
        {/* 可折叠区块 */}
        <CollapsibleSection
          defaultOpen
          v-slots={{
            header: ({ isOpen }) => (
              <div class="flex h-36px w-full items-center relative pb-4px">
                <img src={diamond} alt="城市设计" class="w-20px h-20px ml-2px" />

                <div class="text-18px font-400 text-white ml-8px font-youshe">片区城市设计</div>

                {/* 箭头：打开朝下（SVG 原方向不旋转），关闭朝右（逆时针转 90°） */}
                <img
                  src={arrowImg}
                  alt=""
                  class={cn('w-20px h-20px ml-auto transition-transform duration-200', {
                    '-rotate-90': !isOpen,
                  })}
                />

                {/* 底部图片 */}
                <img src={bottomImg} alt="" class="w-full h-4px absolute bottom-0 left-0 object-fill" />
              </div>
            ),
            body: () =>
              designs.value.length ? (
                <div class="">
                  {/* 类别 Tab：已填报的类别（≤6 个，单排，超宽横向滑动），点击切换并滚到居中 */}
                  <div ref={tabBarRef} class="mt-16px flex gap-12px overflow-x-auto scrollbar-none">
                    {designs.value.map((d, i) => (
                      <GlowButton
                        key={d.type}
                        isActive
                        borderGlow={activeType.value === d.type}
                        glowOpacity={activeType.value === d.type ? 1.5 : 0.25}
                        width={120}
                        height={36}
                        radius={8}
                        class={cn(
                          'shrink-0 text-14px font-500',
                          activeType.value === d.type ? 'text-white' : 'text-white/60',
                        )}
                        onClick={() => {
                          activeType.value = d.type;
                          scrollActiveIntoView(i);
                        }}
                      >
                        {d.type}
                      </GlowButton>
                    ))}
                  </div>

                  {/* 主要内容：选中类别的填报文本 */}
                  <div class="mt-16px w-full b-1 b-solid b-white/6 bg-white/2 p-12px font-500 rd-8px bg-white/6">
                    <div class="flex items-center h-24px">
                      <div class="size-12px rd-full bg-white/10 flex items-center justify-center">
                        <div class="w-4px h-4px bg-white rd-full" />
                      </div>

                      <div class="text-14px lh-20px text-white/75 font-500 ml-8px">主要内容</div>
                    </div>

                    <div class="text-white text-14px font-400 lh-24px mt-8px">
                      {activeEntry.value?.content?.trim() || '暂无数据'}
                    </div>
                  </div>

                  {/* 设计图片缩略图（单排，超宽横向滑动）：点选驱动左侧面板大图（选中高亮青边） */}
                  {imageUrls.value.length > 0 && (
                    <div class="mt-16px w-full b-1 b-solid b-white/6 bg-white/2 p-12px font-500 rd-8px bg-white/6">
                      <div class="flex items-center h-24px">
                        <div class="size-12px rd-full bg-white/10 flex items-center justify-center">
                          <div class="w-4px h-4px bg-white rd-full" />
                        </div>

                        <div class="text-14px lh-20px text-white/75 font-500 ml-8px">设计图片</div>
                      </div>

                      <div class="mt-12px flex gap-8px overflow-x-auto scrollbar-none">
                        {imageUrls.value.map((url, i) => (
                          <img
                            key={url + i}
                            src={url}
                            alt={`${activeType.value}设计图 ${i + 1}`}
                            class={cn(
                              'h-64px w-64px shrink-0 cursor-pointer rd-8px object-cover transition-all duration-150',
                              i === (panelImageIndexes['城市设计'] ?? 0)
                                ? 'b-2 b-[#4FD8FF] shadow-[0_0_10px_rgba(79,216,255,0.55)]'
                                : 'b-1 b-solid b-white/10 hover-b-[#4FD8FF]',
                            )}
                            onClick={() => (panelImageIndexes['城市设计'] = i)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* 未填报城市设计：整块占位 */
                <div class="mt-16px py-24px text-center text-14px text-white/40">暂无数据</div>
              ),
          }}
        />
      </div>
    );
  },
});
