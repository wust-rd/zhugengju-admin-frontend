import { computed, defineComponent, type PropType } from 'vue';
import { cn } from '@jeesite/core/libs';
import { CollapsibleSection } from '@jeesite/shared/components/collapsible-section';
import { GlowButton } from '@jeesite/shared/components/glow-button';
import type { AreaInfo } from '../area-info';
import { adjustViewMode } from '../panel-image-state';

import diamond from '@jeesite/assets/images/display/plan/diamond.svg';
import bottomImg from '@jeesite/assets/images/display/plan/底部.png';
import arrowImg from '@jeesite/assets/images/display/plan/箭头开关.svg';

/** 图纸查看模式（面板联动）：调整前 / 调整后 / 前后并排对比 */
const VIEW_MODES = [
  { key: 'before', label: '调整前图纸' },
  { key: 'after', label: '调整后图纸' },
  { key: 'compare', label: '调整前后对比' },
] as const;
type ViewMode = (typeof VIEW_MODES)[number]['key'];

/** 规划调整 */
export const PlanAdjust = defineComponent({
  props: {
    /** 当前片区完整数据（图斑要素 feature + 填报表单 form 含图片直链） */
    area: { type: Object as PropType<AreaInfo>, required: true },
  },
  setup(props) {
    console.log('[规划调整] 片区完整数据（图斑要素 + 填报表单）', props.area);

    /** 调整内容（填报「片区规划调整」，≤300 字，选填） */
    const adjustContent = computed(() => props.area.form?.adjustContent?.trim() || '');

    /** 调整前/后图纸（各 1 张，未传为 null） */
    const beforeUrl = computed(() => props.area.form?.adjustBeforeFile?.url ?? '');
    const afterUrl = computed(() => props.area.form?.adjustAfterFile?.url ?? '');

    return () => (
      <div class="p-16px">
        {/* 可折叠区块 */}
        <CollapsibleSection
          defaultOpen
          v-slots={{
            header: ({ isOpen }) => (
              <div class="flex h-36px w-full items-center relative pb-4px">
                <img src={diamond} alt="规划调整" class="w-20px h-20px ml-2px" />

                <div class="text-18px font-400 text-white ml-8px font-youshe">片区规划调整</div>

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
              <div class="">
                {/* 调整内容：填报文本 */}
                <div class="mt-16px w-full b-1 b-solid b-white/6 bg-white/2 p-12px font-500 rd-8px bg-white/6">
                  <div class="flex items-center h-24px">
                    <div class="size-12px rd-full bg-white/10 flex items-center justify-center">
                      <div class="w-4px h-4px bg-white rd-full" />
                    </div>

                    <div class="text-14px lh-20px text-white/75 font-500 ml-8px">调整内容</div>
                  </div>

                  <div class="text-white text-14px font-400 lh-24px mt-8px">
                    {adjustContent.value || '暂无数据'}
                  </div>
                </div>

                {/* 图纸查看模式：三个按钮点选驱动左侧面板（前/后 = 单图，对比 = 两图并排） */}
                <div class="mt-16px flex justify-center space-x-12px">
                  {VIEW_MODES.map((m) => (
                    <GlowButton
                      key={m.key}
                      isActive
                      borderGlow={adjustViewMode.value === m.key}
                      glowOpacity={adjustViewMode.value === m.key ? 1.5 : 0.25}
                      width={120}
                      height={36}
                      radius={8}
                      class={cn('shrink-0 text-14px font-500', {
                        'text-white': adjustViewMode.value === m.key,
                        'text-white/60': adjustViewMode.value !== m.key,
                      })}
                      onClick={() => (adjustViewMode.value = m.key as ViewMode)}
                    >
                      {m.label}
                    </GlowButton>
                  ))}
                </div>

                {/* 图纸有无提示（选填字段；未上传时面板显示「暂无图片」，这里不再重复占位块） */}
                {!beforeUrl && !afterUrl && (
                  <div class="mt-16px py-24px text-center text-14px text-white/40">暂无图纸</div>
                )}
              </div>
            ),
          }}
        />
      </div>
    );
  },
});
