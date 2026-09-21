/**
 * 面板展示区 · 规划调整视图
 *
 * 查看模式由右侧 plan-adjust tab 的三按钮驱动（panel-image-state 的 adjustViewMode）：
 * - before / after：调整前（后）图纸单图铺满
 * - compare：调整前/后两图左右并排（各半宽 + 左上角角标；缺哪侧哪侧虚线占位）
 */
import { computed, defineComponent, type PropType } from 'vue';
import { adjustViewMode } from '../panel-image-state';

/** 并排对比的两侧（顺序即渲染顺序） */
const COMPARE_HALVES = [
  { key: 'before', label: '调整前' },
  { key: 'after', label: '调整后' },
] as const;

export const PanelAdjustView = defineComponent({
  name: 'EarlyStagePlanningPanelAdjustView',

  props: {
    /** 调整前图纸直链（空串 = 未上传） */
    beforeUrl: { type: String, default: '' },
    /** 调整后图纸直链（空串 = 未上传） */
    afterUrl: { type: String, default: '' },
  },

  setup(props) {
    /** key → 直链 */
    const urlOf = computed(() => ({
      before: props.beforeUrl,
      after: props.afterUrl,
    }));

    /** 单图模式当前显示的直链（无图为空串） */
    const singleUrl = computed(() =>
      adjustViewMode.value === 'before' ? props.beforeUrl : props.afterUrl,
    );

    return () =>
      adjustViewMode.value === 'compare' ? (
        /* 对比模式：两图并排（一张都没有时整块占位） */
        props.beforeUrl || props.afterUrl ? (
          <div class="absolute inset-16px flex gap-12px">
            {COMPARE_HALVES.map((half) => {
              const url = urlOf.value[half.key];
              return url ? (
                <div
                  key={half.key}
                  class="relative flex-1 rd-8px bg-contain bg-center bg-no-repeat"
                  style={{ backgroundImage: `url(${url})` }}
                >
                  <div class="absolute left-8px top-8px rd-full bg-black/50 px-8px py-2px text-12px text-white/80 backdrop-blur-sm">
                    {half.label}
                  </div>
                </div>
              ) : (
                <div
                  key={half.key}
                  class="flex flex-1 items-center justify-center rd-8px b-1 b-dashed b-white/15 text-14px text-white/40"
                >
                  暂无{half.label}图纸
                </div>
              );
            })}
          </div>
        ) : (
          <div class="text-14px text-white/40">暂无图片</div>
        )
      ) : singleUrl.value ? (
        /* 单图模式：调整前或调整后图纸 */
        <div
          class="absolute inset-16px bg-contain bg-center bg-no-repeat rd-8px"
          style={{ backgroundImage: `url(${singleUrl.value})` }}
        />
      ) : (
        <div class="text-14px text-white/40">暂无图片</div>
      );
  },
});
