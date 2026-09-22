import { computed, defineComponent, ref, type PropType } from 'vue';
import { cn } from '@jeesite/core/libs';
import { XOD_COLOR } from '@jeesite/display/components/corner-panel/xod-row';

import diamond from '@jeesite/assets/images/display/plan/diamond.svg';
import bottomImg from '@jeesite/assets/images/display/plan/底部.png';
import arrowImg from '@jeesite/assets/images/display/plan/箭头开关.svg';

import { CollapsibleSection } from '@jeesite/shared/components/collapsible-section';
import type { AreaInfo } from '../area-info';
import { panelImageIndexes } from '../panel-image-state';

/** 功能定位胶囊兜底色（XOD_COLOR 未覆盖的编码，如 POD） */
const FUNC_PILL_FALLBACK = '#94a3b8';

/** 功能策划 */
export const FeaturePlan = defineComponent({
  props: {
    /** 当前片区完整数据（图斑要素 feature + 填报表单 form 含图片直链） */
    area: { type: Object as PropType<AreaInfo>, required: true },
  },
  setup(props) {
    console.log('[功能策划] 片区完整数据（图斑要素 + 填报表单）', props.area);

    /** 填报字段（section-function-plan：总体目标 / 功能定位编码数组 / 功能策划文本） */
    const overallGoal = computed(() => props.area.form?.overallGoal?.trim() || '');
    const funcTypes = computed(() => props.area.form?.funcTypes ?? []);
    const funcPlan = computed(() => props.area.form?.funcPlan?.trim() || '');

    /** 策划图册（≤5 张）：缩略图行点选驱动左侧面板大图 */
    const atlasUrls = computed(() => (props.area.form?.atlas ?? []).map((f) => f.url).filter((u): u is string => !!u));

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
                {/* 第一块：总体目标（填报「片区功能策划-总体目标」） */}
                <div class="mt-16px w-full b-1 b-solid b-white/6 bg-white/2 p-12px rd-8px bg-white/6">
                  <div class="flex items-center h-24px">
                    <div class="size-12px rd-full bg-white/10 flex items-center justify-center">
                      <div class="w-4px h-4px bg-white rd-full" />
                    </div>

                    <div class="text-14px lh-20px text-white/75 font-500 ml-8px">总体目标</div>
                  </div>

                  <div class="text-white text-14px font-400 lh-24px mt-8px">{overallGoal.value || '暂无数据'}</div>
                </div>

                {/* 第二块：片区功能定位（胶囊）+ 功能策划（文本） */}
                <div class="mt-16px w-full b-1 b-solid b-white/6 bg-white/2 p-12px rd-8px bg-white/6">
                  <div class="flex items-center h-24px">
                    <div class="size-12px rd-full bg-white/10 flex items-center justify-center">
                      <div class="w-4px h-4px bg-white rd-full" />
                    </div>

                    <div class="text-14px lh-20px text-white/75 font-500 ml-8px">片区功能定位</div>
                  </div>

                  {/* 功能定位胶囊：编码大写 + XOD_COLOR 配色（POD 等未覆盖编码走兜底色） */}
                  <div class="mt-8px flex flex-wrap items-center gap-4px">
                    {funcTypes.value.length ? (
                      funcTypes.value.map((code) => (
                        <div
                          key={code}
                          class="font-chakra rd-4px h-16px px-6px flex items-center justify-center text-black text-14px font-500"
                          style={{ background: XOD_COLOR[String(code).toLowerCase()] ?? FUNC_PILL_FALLBACK }}
                        >
                          {String(code).toUpperCase()}
                        </div>
                      ))
                    ) : (
                      <div class="text-14px text-white/40">暂无数据</div>
                    )}
                  </div>

                  <div class="text-white text-14px font-400 lh-24px mt-8px">{funcPlan.value || '暂无数据'}</div>
                </div>

                {/* 第三块：策划图册缩略图（单排，超宽横向滑动）：点选驱动左侧面板大图（选中高亮青边） */}
                {atlasUrls.value.length > 0 && (
                  <div class="mt-16px w-full b-1 b-solid b-white/6 bg-white/2 p-12px rd-8px bg-white/6">
                    <div class="flex items-center h-24px">
                      <div class="size-12px rd-full bg-white/10 flex items-center justify-center">
                        <div class="w-4px h-4px bg-white rd-full" />
                      </div>

                      <div class="text-14px lh-20px text-white/75 font-500 ml-8px">策划图册</div>
                    </div>

                    <div class="mt-12px flex gap-8px overflow-x-auto scrollbar-none">
                      {atlasUrls.value.map((url, i) => (
                        <img
                          key={url + i}
                          src={url}
                          alt={`图册 ${i + 1}`}
                          class={cn(
                            'h-64px w-64px shrink-0 cursor-pointer rd-8px object-cover transition-all duration-150',
                            i === (panelImageIndexes['功能策划'] ?? 0)
                              ? 'b-2 b-[#4FD8FF] shadow-[0_0_10px_rgba(79,216,255,0.55)]'
                              : 'b-1 b-solid b-white/10 hover-b-[#4FD8FF]',
                          )}
                          onClick={() => (panelImageIndexes['功能策划'] = i)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            ),
          }}
        ></CollapsibleSection>
      </div>
    );
  },
});
