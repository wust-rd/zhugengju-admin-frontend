import { defineComponent, inject, ref } from 'vue';
import { cn, withAlpha } from '@jeesite/core/libs';
import { XOD_COLOR } from '@jeesite/display/components/corner-panel/xod-row';

import diamond from '@jeesite/assets/images/display/plan/diamond.svg';
import bottomImg from '@jeesite/assets/images/display/plan/底部.png';
import arrowImg from '@jeesite/assets/images/display/plan/箭头开关.svg';
import albumPic1 from '@jeesite/assets/images/display/plan/picture-box.webp';
import albumPic2 from '@jeesite/assets/images/display/plan/test.webp';
import albumPic3 from '@jeesite/assets/images/display/plan/area-overview-modal-header.png';

import { CollapsibleSection } from '@jeesite/display/components/collapsible-section';
import { AreaDetailViewKey, useAreaDetailView } from '../use-area-detail-view';
import { AlbumPreviewModal } from './album-preview-modal';
import { selectableCardClass } from './shared';

/** 图册占位图（TODO: 替换为真实图册图片） */
const ALBUM_PLACEHOLDERS = [albumPic1, albumPic2, albumPic3, albumPic1];

/** 两张卡片对应的左侧大图（点击某张卡片，左侧就显示它那一张；默认第一张） */
const FEATURE_CARDS = ['总体目标', '主导功能定位'] as const;
export type FeatureCard = (typeof FEATURE_CARDS)[number];

/** 总体目标 */
const GOAL_TEXT =
  '依托滨江区位优势，以“文创+宜居”为核心，打造水、城、人融合共生的“皮子文化生活街区”“滨水工业区活化更新标杆”';

/** 主导功能定位 · 三个导向标签（配色取左侧看板「更新片区列表」同一套 XOD_COLOR） */
const FUNC_TAGS: { key: string; label: string }[] = [
  { key: 'cod', label: 'COD文旅导向' },
  { key: 'sod', label: 'SOD公服导向' },
  { key: 'tod', label: 'TOD交通导向' },
];

/** 主导功能定位 · 说明（多行：换行位置即展示分行，渲染处用 whitespace-pre-line） */
const FUNC_TEXT = `TOD/COD/SOD融合发展：以公共交通、文旅服务、公共服务为导向，打造集品质居住、文旅创意、便民服务于一体的亮点片区。
工业遗存活化：采用“修旧如旧”工艺对老旧厂区进行精心的保护性修缮，保留工业肌理与历史记忆，并规划建设集文化展示、创意办公、特色商业于一体的复合型街区，推动工业遗存焕发时代生机。
业态多元布局：引入品牌商业综合体、文旅创意街区、公寓民宿、便民服务网点等，优化商业结构，提升区域活力。目前正在向市经信局申请“工业4A级景区”认证，助力文旅价值再升级。`;

/** 功能策划 */
export const FeaturePlan = defineComponent({
  setup() {
    /** 图册预览弹窗可见性 */
    const previewVisible = ref(false);
    /** 打开弹窗时显示第几张图（点击缩略图时记录下标） */
    const previewIndex = ref(0);

    // 卡片选中状态：优先用页面 provide 的共享实例（左侧大图据此联动），
    // 没有 provider 时退化为组件自己的局部状态
    const view = inject(AreaDetailViewKey, null) ?? useAreaDetailView();
    const activeCard = view.featureCard;

    return () => (
      <div class="p-16px">
        {/* 可折叠区块 */}
        <CollapsibleSection
          defaultOpen={true}
          v-slots={{
            header: ({ isOpen }) => (
              <div class="flex h-36px w-full items-center relative pb-4px">
                <img src={diamond} alt="基本信息" class="w-20px h-20px ml-2px" />

                <div class="text-18px font-400 text-white ml-8px font-youshe">片区功能策划</div>

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
            body: () => (
              <>
                {/* 标题 + 内容：总体目标（点击后左侧大图切到「功能策划-总体目标」） */}
                <div
                  class={selectableCardClass(activeCard.value === '总体目标')}
                  onClick={() => (activeCard.value = '总体目标')}
                >
                  <div class="flex items-center h-24px">
                    <div class="size-12px rd-full bg-white/10 flex items-center justify-center">
                      <div class="w-4px h-4px bg-white rd-full" />
                    </div>

                    <div class="text-14px lh-20px text-white/75 font-500 ml-8px">总体目标</div>
                  </div>

                  <div class="mt-8px text-white text-14px font-400 lh-24px">{GOAL_TEXT}</div>
                </div>

                {/* 标题 + 内容：主导功能定位（三个导向标签 + 说明文字；点击后左侧大图切到「功能策划-主导功能定位」） */}
                <div
                  class={selectableCardClass(activeCard.value === '主导功能定位')}
                  onClick={() => (activeCard.value = '主导功能定位')}
                >
                  <div class="flex items-center h-24px">
                    <div class="size-12px rd-full bg-white/10 flex items-center justify-center">
                      <div class="w-4px h-4px bg-white rd-full" />
                    </div>

                    <div class="text-14px lh-20px text-white/75 font-500 ml-8px">主导功能定位</div>
                  </div>

                  {/* 三个导向标签横向排列（配色取 XOD_COLOR，与左侧看板形态一致） */}
                  <div class="mt-12px flex flex-wrap items-center gap-8px">
                    {FUNC_TAGS.map((tag) => {
                      const color = XOD_COLOR[tag.key] ?? '#17FEB9';
                      return (
                        <div
                          key={tag.key}
                          class="b-1 b-solid rd-4px px-8px py-2px text-14px lh-20px"
                          style={{ background: withAlpha(color, 0.15), borderColor: withAlpha(color, 0.45), color }}
                        >
                          {tag.label}
                        </div>
                      );
                    })}
                  </div>

                  <div class="mt-12px text-white text-14px font-400 lh-24px whitespace-pre-line">{FUNC_TEXT}</div>
                </div>

                {/* <div class="mt-16px w-full b-1 b-solid b-white/6 bg-white/2 p-12px rd-8px bg-white/6">
                  <div class="flex items-center h-24px">
                    <div class="size-12px rd-full bg-white/10 flex items-center justify-center">
                      <div class="w-4px h-4px bg-white rd-full" />
                    </div>

                    <div class="text-14px lh-20px text-white/75 font-500 ml-8px">片区策划图册</div>

                    <div
                      class="size-24px ml-auto flex cursor-pointer items-center justify-center rd-4px"
                      style={{
                        border: '1px solid transparent',
                        background:
                          'linear-gradient(#163651, #163651) padding-box, linear-gradient(135deg, #5293C0, #193B58) border-box',
                      }}
                      onClick={() => {
                        previewIndex.value = 0;
                        previewVisible.value = true;
                      }}
                    >
                      <div class="i-ri:expand-diagonal-s-fill size-18px bg-white"></div>
                    </div>
                  </div>

                  <div class="mt-12px flex gap-6px">
                    {ALBUM_PLACEHOLDERS.map((src, i) => (
                      <img
                        key={i}
                        src={src}
                        alt={`图册 ${i + 1}`}
                        class="size-52px cursor-pointer rd-8px object-cover b-2px b-solid b-white/10 bg-white/5 transition-all duration-150 hover:b-white/40"
                        onClick={() => {
                          previewIndex.value = i;
                          previewVisible.value = true;
                        }}
                      />
                    ))}
                  </div>
                </div> */}
              </>
            ),
          }}
        >
          {/* TODO: 填写「功能策划」内容 */}
        </CollapsibleSection>

        {/* 图册预览弹窗 */}
        <AlbumPreviewModal
          visible={previewVisible.value}
          images={ALBUM_PLACEHOLDERS}
          initialIndex={previewIndex.value}
          onUpdate:visible={(v) => (previewVisible.value = v)}
        />
      </div>
    );
  },
});
