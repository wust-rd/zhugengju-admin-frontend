import { computed, defineComponent, ref, watch, type PropType } from 'vue';
import { cn } from '@jeesite/core/libs';
import { CollapsibleSection } from '@jeesite/shared/components/collapsible-section';
import { GlowButton } from '@jeesite/shared/components/glow-button';
import type { AreaInfo } from '../area-info';
import { examPanelImages, panelImageIndexes } from '../panel-image-state';

import diamond from '@jeesite/assets/images/display/plan/diamond.svg';
import bottomImg from '@jeesite/assets/images/display/plan/底部.png';
import arrowImg from '@jeesite/assets/images/display/plan/箭头开关.svg';

/** 三清单配置：tab 名 → 填报表单字段（清单条目数组 + 配图文件数组）+ 小节短标题。
    字段口径与填报页 section-health-check.vue 一一对应（每个清单 ≤5 张配图） */
const EXAM_SECTIONS = [
  { tab: '问题整治清单', short: '问题清单', listField: 'problemList', imageField: 'problemImages' },
  { tab: '发展机遇清单', short: '机遇清单', listField: 'opportunityList', imageField: 'opportunityImages' },
  { tab: '更新诉求清单', short: '诉求清单', listField: 'demandList', imageField: 'demandImages' },
] as const;
type ExamTab = (typeof EXAM_SECTIONS)[number]['tab'];

/** 体检情况 */
export const PhysicalExam = defineComponent({
  props: {
    /** 当前片区完整数据（图斑要素 feature + 填报表单 form 含图片直链） */
    area: { type: Object as PropType<AreaInfo>, required: true },
  },
  setup(props) {
    console.log('[体检情况] 片区完整数据（图斑要素 + 填报表单）', props.area);

    // 当前选中的 Tab
    const activeTab = ref<ExamTab>('问题整治清单');

    /** 当前清单配置（tab → 表单字段） */
    const activeSection = computed(() => EXAM_SECTIONS.find((s) => s.tab === activeTab.value) ?? EXAM_SECTIONS[0]);
    /** 当前清单条目（字符串数组，去空行） */
    const listItems = computed(() => {
      const rows = props.area.form?.[activeSection.value.listField];
      return Array.isArray(rows) ? rows.map(String).filter((r) => r.trim()) : [];
    });
    /** 当前清单配图 url 列表（文件对象 → url，无 url 的剔除） */
    const imageUrls = computed(() =>
      (props.area.form?.[activeSection.value.imageField] ?? []).map((f) => f.url).filter((u): u is string => !!u),
    );

    /** 左侧面板联动：清单切换 / 片区数据变化时重置为该清单首图（初值 = 问题整治清单首图），
        之后由用户点缩略图接管（panel-image-state 共享状态） */
    watch(
      imageUrls,
      (urls) => {
        examPanelImages.value = urls;
        panelImageIndexes['体检情况'] = 0;
      },
      { immediate: true },
    );

    return () => (
      <div class="p-16px">
        {/* 可折叠区块 */}
        <CollapsibleSection
          defaultOpen
          v-slots={{
            header: ({ isOpen }) => (
              <div class="flex h-36px w-full items-center relative pb-4px">
                <img src={diamond} alt="基本信息" class="w-20px h-20px ml-2px" />

                <div class="text-18px font-400 text-white ml-8px font-youshe">片区体检情况</div>

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
                {/* 三个按钮 = 三个清单 Tab，点击切换 */}
                <div class="mt-16px flex justify-center space-x-12px">
                  {EXAM_SECTIONS.map((s) => (
                    <GlowButton
                      key={s.tab}
                      isActive
                      borderGlow={activeTab.value === s.tab}
                      glowOpacity={activeTab.value === s.tab ? 1.5 : 0.25}
                      width={120}
                      height={36}
                      radius={8}
                      class={cn('text-14px font-500', {
                        'text-white': activeTab.value === s.tab,
                        'text-white/60': activeTab.value !== s.tab,
                      })}
                      onClick={() => (activeTab.value = s.tab)}
                    >
                      {s.tab}
                    </GlowButton>
                  ))}
                </div>

                {/* 内容区：当前清单条目（编号列表）+ 配图缩略图（点击放大预览），均空显示占位 */}
                <div class="mt-16px w-full b-1 b-solid b-white/6 bg-white/2 p-12px font-500 rd-8px bg-white/6">
                  {listItems.value.map((item, index) => (
                    <div key={index} class="flex items-start mt-8px">
                      <div class="rd-full size-12px bg-white text-black flex items-center justify-center text-8px shrink-0 font-600 mt-7px">
                        {index + 1}
                      </div>

                      <div class="text-14px lh-24px text-white ml-12px font-400">{item}</div>
                    </div>
                  ))}

                  {/* 配图缩略图（≤5 张，单排，超宽横向滑动）：点选驱动左侧面板大图（选中高亮青边） */}
                  {imageUrls.value.length > 0 && (
                    <div class="mt-12px flex gap-8px overflow-x-auto scrollbar-none">
                      {imageUrls.value.map((url, i) => (
                        <img
                          key={url + i}
                          src={url}
                          alt={`${activeSection.value.short}配图 ${i + 1}`}
                          class={cn(
                            'h-64px w-64px shrink-0 cursor-pointer rd-8px object-cover transition-all duration-150',
                            i === (panelImageIndexes['体检情况'] ?? 0)
                              ? 'b-2 b-[#4FD8FF] shadow-[0_0_10px_rgba(79,216,255,0.55)]'
                              : 'b-1 b-solid b-white/10 hover-b-[#4FD8FF]',
                          )}
                          onClick={() => (panelImageIndexes['体检情况'] = i)}
                        />
                      ))}
                    </div>
                  )}

                  {/* 条目与配图均空：占位 */}
                  {!listItems.value.length && !imageUrls.value.length && (
                    <div class="py-24px text-center text-14px text-white/40">暂无数据</div>
                  )}
                </div>
              </div>
            ),
          }}
        />
      </div>
    );
  },
});
