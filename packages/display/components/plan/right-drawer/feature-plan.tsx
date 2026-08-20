import { defineComponent, ref } from 'vue';
import { cn } from '@jeesite/core/libs';

import diamond from '@jeesite/assets/images/display/plan/diamond.svg';
import bottomImg from '@jeesite/assets/images/display/plan/底部.png';
import arrowImg from '@jeesite/assets/images/display/plan/箭头开关.svg';
import albumPic1 from '@jeesite/assets/images/display/plan/picture-box.webp';
import albumPic2 from '@jeesite/assets/images/display/plan/test.webp';
import albumPic3 from '@jeesite/assets/images/display/plan/area-overview-modal-header.png';

import { CollapsibleSection } from '../collapsible-section';
import { AlbumPreviewModal } from './album-preview-modal';

/** 图册占位图（TODO: 替换为真实图册图片） */
const ALBUM_PLACEHOLDERS = [albumPic1, albumPic2, albumPic3, albumPic1];

/** 功能策划 */
export const FeaturePlan = defineComponent({
  setup() {
    /** 图册预览弹窗可见性 */
    const previewVisible = ref(false);
    /** 打开弹窗时显示第几张图（点击缩略图时记录下标） */
    const previewIndex = ref(0);

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
                <div class="mt-16px w-full b-1 b-solid b-white/6 bg-white/2 p-12px rd-8px bg-white/6">
                  <div class="flex items-center h-24px">
                    <div class="size-12px rd-full bg-white/10 flex items-center justify-center">
                      <div class="w-4px h-4px bg-white rd-full" />
                    </div>

                    <div class="text-14px lh-20px text-white/75 font-500 ml-8px">片区功能定位</div>
                  </div>

                  <div class="mt-8px h-20px flex items-center">
                    <div class="text-black font-600 inline-block px-6px py-2px rd-4px bg-cyan-400 text-10px lh-14px">
                      IOD
                    </div>
                    <div class="text-black font-600 inline-block px-6px py-2px rd-4px bg-#FEA517 text-10px lh-14px ml-4px">
                      SOD
                    </div>
                    <div class="text-white ml-12px text-14px font-400 lh-20px">文旅+公服导向</div>
                  </div>

                  <div class="text-white text-12px font-400 lh-24px mt-8px">
                    结合汉阳区万载知音之路历史文化主轴打造提升行动方案，万载知音文化之路，实施4大规划策略，以文化支撑、以活动引领、以景观彰显、以慢行串联，谱写一曲汉阳承古启今的韵律之歌。
                    <br />
                    显正片位于汉阳历史风貌区核心区域，片区以历史为描点、通过街巷织补、多样拼贴、片区更新、空间弥合等多种方式串联各大文旅资源，以期让片区达到特色提振、新旧融合、全域活化。
                  </div>
                </div>

                <div class="mt-16px w-full b-1 b-solid b-white/6 bg-white/2 p-12px rd-8px bg-white/6">
                  <div class="flex items-center h-24px">
                    <div class="size-12px rd-full bg-white/10 flex items-center justify-center">
                      <div class="w-4px h-4px bg-white rd-full" />
                    </div>

                    <div class="text-14px lh-20px text-white/75 font-500 ml-8px">片区策划图册</div>

                    {/* 展开按钮（渐变边框：background 双图层 border-box/padding-box 裁剪，兼容圆角） */}
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

                  {/* 图册：4 张图横向排列（TODO: 换成真实图册图片） */}
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
                </div>
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
