import { buildYearItems, cn } from '@jeesite/core/libs';
import { ArtFont } from '@jeesite/display/components/art-font';
import { DropdownSelector } from '@jeesite/display/components/dropdown-selector';
import { GlassRing } from '@jeesite/display/components/glass-ring';
import { GlowTitle2 } from '@jeesite/display/components/glow-title/title2';
import { DisplayPageLayout } from '@jeesite/display/components/page-layout';
import { LayerControls } from '@jeesite/display/components/layer-controls';
import { VMap, VMapControls, basemapStyle, basemapMapOptions } from '@jeesite/vmap';
import { defineComponent, onBeforeUnmount, ref, shallowRef } from 'vue';
import { RouterLink } from 'vue-router';
import { colors } from '@jeesite/core/libs/colors';
import { DistrictChart } from './district-chart';
import { InvestStats } from './invest-stats';
import { Monitoring } from '@jeesite/display/components/ifco/monitoring';
import { ProjectInfoTabs } from '@jeesite/display/components/ifco/project-info-tabs';
import { ProgressChart } from './progress-chart';
import { IfcoMapLayers, IFCO_LAYER_COLORS } from './map-layers';
import { RatingResult } from './rating-result';
import { PolygonCard } from './polygon-card';
import type { SelectedPolygon } from './polygon-types';
import { ProjectProgress } from '@jeesite/display/components/ifco/project-progress';

/** OSS 图片基础地址 */
const OSS_BASE = 'https://zhugengju-public.oss-cn-wuhan-lr.aliyuncs.com/片区策划';

// 片区概况
const PIANQU_IMG = `${OSS_BASE}/片区概况.webp`;

export default defineComponent({
  name: 'DisplayIfco',
  setup() {
    // 沉浸式全屏由布局按路由自动判定（new-header 的 isDisplayRoute），页面无需拨开关

    /** 右侧抽屉（知音地块点击打开） */
    const drawerVisible = ref(false);

    /** 当前选中多边形（项目地块 / 片区范围），点击面设置，展示右侧详情卡片 */
    const selectedPolygon = shallowRef<SelectedPolygon | null>(null);

    // 年份下拉：最近 N 年（当前改为最近两年，变更年数只改 buildYearItems 参数）
    const yearItems = buildYearItems(2);
    const yearKey = ref<string | number>(yearItems[0]?.key ?? '');

    return () => (
      <DisplayPageLayout>
        {{
          left: ({ toggle }) => (
            <>
              {/* 面板头部：标题 + 年份下拉 + 收起按钮 */}
              <GlowTitle2 class="w-full h-56px">
                <ArtFont class="ml-72px text-20px">数据看板</ArtFont>

                <DropdownSelector v-model:activeKey={yearKey.value} items={yearItems} class="ml-auto w-128px" ghost />

                <GlassRing
                  class="ml-16px w-32px h-32px flex items-center justify-center cursor-pointer"
                  onClick={toggle}
                >
                  <div class="i-ri-arrow-left-double-fill size-20px text-white" />
                </GlassRing>
              </GlowTitle2>

              {/* 项目区域分布：荧光柱状图 + 值分隔格纹 */}
              <DistrictChart />

              {/* 项目分类统计：环形饼图 + 中心文字 + 网格 */}
              <RatingResult />

              {/* 片区推进情况三色图：绿/黄/红 分段进度条 + 统计 */}
              <ProgressChart />

              {/* 项目投资统计：环形进度 + 年度投资总额 / 累计完成 */}
              <InvestStats />
            </>
          ),
          right: () => (
            <>
              {/* 地图：VMap 组件内部创建/销毁 MapLibre 实例，crs/center/zoom 走 options prop */}
              <VMap reuseMaps style={basemapStyle} options={basemapMapOptions}>
                <VMapControls class="absolute right-24px bottom-24px z-10" />
                {/* 图层 / 交互逻辑子组件：必须在 VMap 插槽内才能 useMap；selected 联动选中高亮 */}
                <IfcoMapLayers
                  selected={selectedPolygon.value}
                  onUpdate:drawer={(v: boolean) => {
                    drawerVisible.value = v;
                  }}
                  onSelect={(polygon) => {
                    selectedPolygon.value = polygon;
                  }}
                />
              </VMap>

              {/* 多边形详情卡片：点击项目地块 / 片区范围面弹出，点击空白处/关闭按钮收起 */}
              <PolygonCard polygon={selectedPolygon.value} onClose={() => (selectedPolygon.value = null)} />

              {/* 图例：左下角，配色取自 IFCO_LAYER_COLORS（与图层 paint 同源） */}
              <div class="absolute bottom-24px left-32px z-10 rd-8px border border-cyan-900 bg-[#0f2b47]/85 px-14px py-10px backdrop-blur">
                <div class="text-14px text-white/45">图例</div>

                <div class="mt-8px space-y-6px">
                  <div class="flex items-center text-13px">
                    <div class="h-10px w-14px rd-2px" style={{ background: IFCO_LAYER_COLORS.batch1 }} />
                    <div class="ml-8px text-white/70">项目地块 · 第一批</div>
                  </div>
                  <div class="flex items-center text-13px">
                    <div class="h-10px w-14px rd-2px" style={{ background: IFCO_LAYER_COLORS.batch2 }} />
                    <div class="ml-8px text-white/70">项目地块 · 第二批</div>
                  </div>
                  <div class="flex items-center text-13px">
                    <div class="h-3px w-14px rd-1px" style={{ background: colors.stone[400] }} />
                    <div class="ml-8px text-white/70">片区范围线</div>
                  </div>
                </div>
              </div>

              {/* 图层管理器：左上角胶囊按钮 */}
              <LayerControls class="left-32px" />

              {/* 右侧 Drawer：地图点击打开，Tab 切换内容；显示时从右往左平移渐显，隐藏时向右移出并淡出 */}
              <div
                class={cn('fixed top-100px right-12px z-50 transition-[transform,opacity] duration-200', {
                  'opacity-100': drawerVisible.value,
                  // opacity-0 仅不可见，仍需 pointer-events-none 禁用鼠标穿透
                  'pointer-events-none opacity-0': !drawerVisible.value,
                })}
              >
                <RouterLink to="/display/ifco/detail">
                  <img src={PIANQU_IMG} class="w-320px h-800px object-fill" />
                </RouterLink>
              </div>

              {/* 监测面板：右上角（内容留空，待填充） 小雨说先不做，可能没有这个功能*/}
              {/* <Monitoring class="absolute right-24px top-24px z-10 w-320px" /> */}

              {/* 项目进度总览 */}
              {/* <ProjectProgress class="absolute right-24px top-24px z-10 w-420px" /> */}

              {/* 项目基本信息/项目改造情况 */}
              {/* <ProjectInfoTabs class="absolute right-24px top-24px z-10" /> */}
            </>
          ),
        }}
      </DisplayPageLayout>
    );
  },
});
