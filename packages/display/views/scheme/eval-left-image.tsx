import { defineComponent, type PropType } from 'vue';

import type { EvalImgView } from './use-area-detail-view';

/**
 * 「更新后评估」左侧大图渲染（片区详情页 / 成果评估页共用）
 *
 * evalImgView 有两种形态（见 use-area-detail-view）：
 * - single：单图 object-contain，与其他 Tab 的左侧大图行为一致；
 * - compare：改造前后对比 —— 左右分栏两张图并排，各带左上角「改造前 / 改造后」角标。
 *
 * 对比模式两图等大不拉伸的保证在数据侧（见 shared.ts 的 FACTORY_BEFORE/AFTER 注释）：
 * 两张图已归一化为同一宽高比（≈1.455），分栏等宽 + object-contain 下渲染大小完全一致。
 */
export const EvalLeftImage = defineComponent({
  name: 'EvalLeftImage',
  props: {
    view: { type: Object as PropType<EvalImgView>, required: true },
  },
  setup(props) {
    /** 对比分栏的单侧：图 + 左上角角标 */
    const renderPane = (src: string, tag: string, key: string) => (
      <div key={key} class="relative min-w-0 flex-1 overflow-hidden rd-4px b-1 b-solid b-white/10">
        <div class="absolute top-8px left-8px z-1 rd-4px bg-black/50 px-8px py-2px text-13px lh-18px text-white/90">
          {tag}
        </div>
        <img src={src} alt={tag} class="size-full object-contain" />
      </div>
    );

    return () => (
      <div class="size-full">
        {props.view.mode === 'compare' ? (
          <div class="flex size-full gap-10px">
            {renderPane(props.view.before, '改造前', 'before')}
            {renderPane(props.view.after, '改造后', 'after')}
          </div>
        ) : (
          <img src={props.view.src} alt="更新后评估" class="size-full object-contain" />
        )}
      </div>
    );
  },
});
