/**
 * 面板展示区 · 图片视图（基本情况 / 体检情况 / 功能策划 / 城市设计共用）
 *
 * 大图（contain 居中）+ 左右箭头循环切换（多图时）+ 底部缩略图条（可选，基本情况用）。
 * 展示下标统一存 panel-image-state 的 panelImageIndexes[props.tab]——右侧 tab 内
 * 的缩略图行与本视图的箭头/缩略图条读写同一份，选中高亮双向同步。
 */
import { computed, defineComponent, watch, type PropType } from 'vue';
import { cn } from '@jeesite/core/libs';
import { panelImageIndexes } from '../panel-image-state';
import type { DrawerTabLabel } from '../right-drawer';

export const PanelImageView = defineComponent({
  name: 'EarlyStagePlanningPanelImageView',

  props: {
    /** 联动的抽屉 tab 名（共享下标的存取键） */
    tab: { type: String as PropType<DrawerTabLabel>, required: true },
    /** 展示图集 url（空数组 = 暂无图片） */
    images: { type: Array as PropType<string[]>, required: true },
    /** 是否显示底部缩略图条（基本情况在面板内切换；其余 tab 的切换器在右侧抽屉） */
    showStrip: { type: Boolean, default: false },
  },

  setup(props) {
    /** 当前展示下标（读共享状态；写入统一走 setIndex 循环取模） */
    const index = computed(() => panelImageIndexes[props.tab] ?? 0);

    /** 越界保护（图集变短 / 切换 tab 而共享下标残留） */
    const current = computed(() =>
      props.images.length ? props.images[Math.min(index.value, props.images.length - 1)] : undefined,
    );

    /** 写入共享下标（循环取模） */
    function setIndex(i: number) {
      const len = props.images.length;
      panelImageIndexes[props.tab] = len ? ((i % len) + len) % len : 0;
    }

    /** 图集变化时下标越界重置（如切换片区后图变少） */
    watch(
      () => props.images,
      (list) => {
        if ((panelImageIndexes[props.tab] ?? 0) >= list.length) panelImageIndexes[props.tab] = 0;
      },
    );

    /** 左右切换（循环） */
    function step(dir: 1 | -1) {
      if (!props.images.length) return;
      setIndex(index.value + dir);
    }

    return () =>
      current.value ? (
        <>
          {/* 大图 */}
          <div
            class="absolute inset-16px bg-contain bg-center bg-no-repeat rd-8px"
            style={{ backgroundImage: `url(${current.value})` }}
          />

          {/* 左右切换箭头（多图时显示，循环切换；右侧 tab 缩略图高亮同步跟随） */}
          {props.images.length > 1 && (
            <>
              <div
                class="absolute left-24px top-1/2 flex size-36px -translate-y-1/2 cursor-pointer items-center justify-center rd-full b-1 b-solid b-white/15 bg-black/40 text-white backdrop-blur-sm transition-all duration-150 hover-bg-black/60"
                onClick={() => step(-1)}
              >
                <div class="i-ri-arrow-left-s-line size-22px" />
              </div>
              <div
                class="absolute right-24px top-1/2 flex size-36px -translate-y-1/2 cursor-pointer items-center justify-center rd-full b-1 b-solid b-white/15 bg-black/40 text-white backdrop-blur-sm transition-all duration-150 hover-bg-black/60"
                onClick={() => step(1)}
              >
                <div class="i-ri-arrow-right-s-line size-22px" />
              </div>
            </>
          )}

          {/* 底部缩略图条（可选） */}
          {props.showStrip && props.images.length > 1 && (
            <div class="absolute bottom-16px left-1/2 flex -translate-x-1/2 gap-8px rd-full bg-black/40 px-12px py-8px backdrop-blur-sm">
              {props.images.map((url, i) => (
                <img
                  key={url + i}
                  src={url}
                  alt={`图 ${i + 1}`}
                  class={cn(
                    'h-48px w-48px cursor-pointer rd-6px object-cover transition-all duration-150',
                    i === index.value
                      ? 'b-2 b-[#4FD8FF] shadow-[0_0_10px_rgba(79,216,255,0.55)]'
                      : 'b-1 b-white/20 opacity-70 hover-opacity-100',
                  )}
                  onClick={() => setIndex(i)}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <div class="text-14px text-white/40">暂无图片</div>
      );
  },
});
