import { computed, defineComponent, type PropType } from 'vue';
import { cn } from '@jeesite/core/libs';

import diamond from '@jeesite/assets/images/display/plan/diamond.svg';
import bottomImg from '@jeesite/assets/images/display/plan/底部.png';
import arrowImg from '@jeesite/assets/images/display/plan/箭头开关.svg';

import { CollapsibleSection } from '@jeesite/shared/components/collapsible-section';
import type { AreaInfo } from '../area-info';
import { fmtAreaHa, dash } from '../area-format';
import { panelImageIndexes } from '../panel-image-state';

/** 基本情况 */
export const BasicInfo = defineComponent({
  props: {
    /** 当前片区完整数据（图斑要素 feature + 填报表单 form 含图片直链） */
    area: { type: Object as PropType<AreaInfo>, required: true },
  },
  setup(props) {
    console.log('[基本情况] 片区完整数据（图斑要素 + 填报表单）', props.area);

    /** 统计卡片：取填报表单字段，空值显示 —（computed：同组件复用切片区时随 props.area 重算） */
    const STAT_ITEMS = computed<{ label: string; value: string; tag?: boolean }[]>(() => {
      const { form } = props.area;
      return [
        { label: '名称', value: dash(form?.name) },
        { label: '片区规模', value: fmtAreaHa(form?.areaHa) },
        { label: '所属批次', value: dash(form?.batch), tag: true },
      ];
    });

    /** 片区概况图片（填报「片区基本信息」）：缩略图行点选驱动左侧面板大图 */
    const overviewUrls = computed(() =>
      (props.area.form?.overviewImages ?? []).map((f) => f.url).filter((u): u is string => !!u),
    );

    return () => (
      <div class="p-16px overflow-hidden relative">
        {/* 可折叠区块 */}
        <CollapsibleSection
          defaultOpen
          v-slots={{
            header: ({ isOpen }) => (
              <div class="flex h-36px w-full items-center relative pb-4px">
                <img src={diamond} alt="基本信息" class="w-20px h-20px ml-2px" />

                <div class="text-18px font-400 text-white ml-8px font-youshe">片区基本情况</div>

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
                {/* 统计卡片：值单行显示，超出省略（min-w-0 允许 flex 子项收缩；title 悬浮看全文） */}
                <div class="mt-16px flex h-76px w-full b-1 b-solid b-white/6 bg-white/2 px-4px py-4px text-center font-500 rd-8px bg-white/6">
                  {STAT_ITEMS.value.map((item) => (
                    <div key={item.label} class="min-w-0 flex-1 py-8px">
                      <div class="text-14px lh-20px text-white/60">{item.label}</div>
                      {item.tag ? (
                        <div
                          title={item.value}
                          class="mt-6px inline-block max-w-full truncate b-1 b-solid b-[rgba(23,254,185,0.45)] rd-12px px-8px py-2px text-12px text-#17FEB9"
                        >
                          {item.value}
                        </div>
                      ) : (
                        <div class="mt-8px truncate text-14px font-500 lh-20px text-white" title={item.value}>
                          {item.value}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div class="mt-16px w-full b-1 b-solid b-white/6 bg-white/2 p-12px font-500 rd-8px bg-white/6">
                  <div class="flex items-center h-24px">
                    <div class="size-12px rd-full bg-white/10 flex items-center justify-center">
                      <div class="w-4px h-4px bg-white rd-full" />
                    </div>

                    <div class="text-14px lh-20px text-white/75 font-500 ml-8px">片区概况</div>
                  </div>

                  <div class="mt-8px text-white font-400 text-14px lh-24px">{props.area.form?.overview || ' '}</div>
                </div>

                {/* 片区概况图片缩略图（单排，超宽横向滑动）：点选驱动左侧面板大图（选中高亮青边） */}
                {overviewUrls.value.length > 0 && (
                  <div class="mt-16px w-full b-1 b-solid b-white/6 bg-white/2 p-12px font-500 rd-8px bg-white/6">
                    <div class="flex items-center h-24px">
                      <div class="size-12px rd-full bg-white/10 flex items-center justify-center">
                        <div class="w-4px h-4px bg-white rd-full" />
                      </div>

                      <div class="text-14px lh-20px text-white/75 font-500 ml-8px">片区概况图片</div>
                    </div>

                    <div class="mt-12px flex gap-8px overflow-x-auto scrollbar-none">
                      {overviewUrls.value.map((url, i) => (
                        <img
                          key={url + i}
                          src={url}
                          alt={`概况图 ${i + 1}`}
                          class={cn(
                            'h-64px w-64px shrink-0 cursor-pointer rd-8px object-cover transition-all duration-150',
                            i === (panelImageIndexes['基本情况'] ?? 0)
                              ? 'b-2 b-[#4FD8FF] shadow-[0_0_10px_rgba(79,216,255,0.55)]'
                              : 'b-1 b-solid b-white/10 hover-b-[#4FD8FF]',
                          )}
                          onClick={() => (panelImageIndexes['基本情况'] = i)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ),
          }}
        />
      </div>
    );
  },
});
