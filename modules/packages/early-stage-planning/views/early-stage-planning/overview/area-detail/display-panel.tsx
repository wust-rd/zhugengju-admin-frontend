/**
 * 片区详情 · 左侧展示面板
 *
 * 结构：头部（返回看板 + 片区名 + 批次/规模/区位）→ 展示区（随右侧抽屉区块联动）→ 区块切换条
 * 展示区内容（按 props.activeTab 联动，右侧滑动/选中 tab 即切换），各视图独立成文件：
 * - 图片类（基本情况/体检情况/功能策划/城市设计）：panel-image-view.tsx
 *   （多图左右箭头循环切换；下标存 panel-image-state，与右侧 tab 缩略图行双向同步）
 * - 规划调整：panel-adjust-view.tsx（调整前/后单图、前后并排对比三模式）
 * - 项目情况：panel-map-view.tsx（复用总览 VMap + AreaLayers 的地图 + 回到片区按钮）
 * - 其余区块：占位待接入
 *
 * 联动：
 * - props.activeTab：右侧抽屉当前区块（抽屉 → 面板方向，展示内容据此切换）；
 * - emit('tabChange', tab)：点击区块切换条（面板 → 抽屉方向，驱动抽屉切区块）。
 */
import { computed, defineComponent, type PropType } from 'vue';
import { ArtFont } from '@jeesite/display/components/art-font';
import { GlassRing } from '@jeesite/display/components/glass-ring';
import type { AreaInfo } from '../area-info';
import { dash, fmtAreaHa } from '../area-format';
import { cityDesignPanelImages, examPanelImages } from '../panel-image-state';
import { DRAWER_TABS, type DrawerTabLabel } from '../right-drawer';
import { PanelAdjustView } from './panel-adjust-view';
import { PanelImageView } from './panel-image-view';
import { PanelMapView } from './panel-map-view';

/** 有图片展示的区块（走 PanelImageView；其余区块展示区为占位或专属视图） */
const IMAGE_TABS = ['基本情况', '体检情况', '功能策划', '城市设计'] as const;
type ImageTab = (typeof IMAGE_TABS)[number];

const isImageTab = (tab: DrawerTabLabel): tab is ImageTab => (IMAGE_TABS as readonly string[]).includes(tab);

export const AreaDetailPanel = defineComponent({
  name: 'EarlyStagePlanningAreaDetailPanel',

  // 输出约束
  emits: {
    /** 返回看板页 */
    back: () => true,
    /** 切换联动区块（驱动右侧抽屉） */
    tabChange: (tab: DrawerTabLabel) => !!tab,
  },

  // 输入约束
  props: {
    /** 片区完整数据（图斑要素 feature + 填报表单 form 含图片直链） */
    area: { type: Object as PropType<AreaInfo>, required: true },
    /** 右侧抽屉当前区块（展示内容可据此切换） */
    activeTab: { type: String as PropType<DrawerTabLabel>, required: true },
  },

  setup(props, { emit }) {
    /** 基本情况图集：填报「片区基本信息」的片区概况图片 url */
    const overviewUrls = computed(() =>
      (props.area.form?.overviewImages ?? []).map((f) => f.url).filter((u): u is string => !!u),
    );

    /** 功能策划图集：填报「片区功能策划-策划图册」的图片 url */
    const atlasUrls = computed(() => (props.area.form?.atlas ?? []).map((f) => f.url).filter((u): u is string => !!u));

    /** 当前区块的展示图集（图片类区块）：体检/城市设计 = 右侧 tab 联动共享状态；
        功能策划 = 策划图册；基本情况 = 概况图片 */
    const activeImages = computed<string[]>(() => {
      switch (props.activeTab) {
        case '体检情况':
          return examPanelImages.value;
        case '城市设计':
          return cityDesignPanelImages.value;
        case '功能策划':
          return atlasUrls.value;
        case '基本情况':
          return overviewUrls.value;
        default:
          return [];
      }
    });

    /** 展示区内容：按当前区块分发到对应子视图（switch + 提前返回，避免嵌套三元） */
    function renderStage() {
      switch (props.activeTab) {
        case '项目情况':
          return <PanelMapView feature={props.area.feature} />;

        case '规划调整':
          return (
            <PanelAdjustView
              beforeUrl={props.area.form?.adjustBeforeFile?.url ?? ''}
              afterUrl={props.area.form?.adjustAfterFile?.url ?? ''}
            />
          );
      }

      if (isImageTab(props.activeTab)) {
        return (
          <PanelImageView
            tab={props.activeTab}
            images={activeImages.value}
            showStrip={props.activeTab === '基本情况'}
          />
        );
      }

      /* 更新后评估等其余区块：待接入 */
      return (
        <div class="text-center text-white/35">
          <div class="text-16px">展示区（{props.activeTab} 内容待接入）</div>
        </div>
      );
    }

    return () => {
      const a = props.area.feature.properties;

      return (
        <div class="flex h-full flex-col px-32px pb-24px pt-24px">
          {/* 头部：返回 + 片区名 + 基础指标 + 当前联动区块 */}
          <div class="flex shrink-0 items-center">
            <GlassRing class="flex size-32px cursor-pointer items-center justify-center" onClick={() => emit('back')}>
              <div class="i-ri-arrow-left-line size-20px text-white" />
            </GlassRing>

            <ArtFont class="ml-16px text-20px">{dash(a.AREA_NAME)}</ArtFont>

            <div class="ml-16px flex items-center gap-8px text-14px text-white/60">
              <span class="b-1 b-solid b-white/10 bg-white/5 px-8px py-2px rd-full">{dash(a.BATCH)}</span>
              <span>{fmtAreaHa(a.AREA_HA)}</span>
              <span>{dash(a.DIST)}</span>
            </div>

            {/* 联动状态提示：真实展示内容接入后可直接删 */}
            <div class="ml-auto text-14px text-white/50">
              当前区块：<span class="text-#53E2F6">{props.activeTab}</span>
            </div>
          </div>

          {/* 展示区：随右侧抽屉区块联动（各视图独立文件，见文件头注释） */}
          <div class="relative mt-20px flex min-h-0 flex-1 items-center justify-center overflow-hidden b-1 b-solid b-white/10 bg-white/2 rd-12px">
            {renderStage()}
          </div>

          {/* 区块切换条：点击驱动右侧抽屉切区块 */}
          <div class="mt-16px flex shrink-0 items-center gap-8px">
            <div class="mr-8px text-14px text-white/40">联动示例</div>

            {DRAWER_TABS.map((tab) => (
              <div
                key={tab}
                class={
                  'cursor-pointer b-1 b-solid px-12px py-4px text-14px rd-full transition-all duration-200 ' +
                  (props.activeTab === tab
                    ? 'b-[#0BD6FFBF] bg-[#0BD6FF26] text-white'
                    : 'b-white/10 text-white/60 hover-text-white')
                }
                onClick={() => emit('tabChange', tab)}
              >
                {tab}
              </div>
            ))}
          </div>
        </div>
      );
    };
  },
});
