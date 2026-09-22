import { defineComponent, ref } from 'vue';
import { DisplayPageLayout } from '@jeesite/display/components/page-layout';
import { GlowTitle3 } from '@jeesite/display/components/glow-title/title3';
import { LayerControls } from '@jeesite/display/components/layer-controls';
import { VMap, VMapControls, basemapStyle, basemapMapOptions } from '@jeesite/vmap';

import { ExpropriationOverview } from './expropriation-overview';
import { DistrictList } from './district-list';
import { ExpropriationInfoTabs } from './project-info-tabs';

export default defineComponent({
  name: 'DisplayExpropriationManagement',
  setup() {
    // 沉浸式全屏由布局按路由自动判定（new-header 的 isDisplayRoute），页面无需拨开关

    /** 左侧面板当前视图：main 总览页 / list 片区列表二级页 */
    const leftView = ref<'main' | 'list'>('main');

    return () => (
      <DisplayPageLayout>
        {{
          left: ({ toggle }) => (
            // 纵向弹性列：标题固定在顶部，下方内容超高时独立滚动
            <div class="h-full flex flex-col">
              {leftView.value === 'main' ? (
                <>
                  {/* 一级页：征收信息汇总（右侧「片区列表」按钮进入二级页） */}
                  <GlowTitle3 title="征收信息汇总" class="shrink-0" onButtonClick={() => (leftView.value = 'list')} />

                  {/* 征收数据总览：汇总卡 + 区域 tabs + 分区详情 + 各区完成情况 */}
                  <ExpropriationOverview />
                </>
              ) : (
                /* 二级页：片区列表 */
                <DistrictList onBack={() => (leftView.value = 'main')} />
              )}
            </div>
          ),
          right: () => (
            <>
              {/* 地图：VMap 组件内部创建/销毁 MapLibre 实例，crs/center/zoom 走 options prop */}
              <VMap reuseMaps style={basemapStyle} options={basemapMapOptions}>
                <VMapControls class="absolute right-24px bottom-24px z-10" />
              </VMap>

              {/* 图层管理器：左上角胶囊按钮（图层开关/数据菜单，占位数据） */}
              <LayerControls class="left-32px top-24px" />

              {/* 征收项目信息 Tab 面板：项目基本信息 / 征收进度汇总（右上角） */}
              {/* <ExpropriationInfoTabs class="absolute right-24px top-24px z-10" /> */}
            </>
          ),
        }}
      </DisplayPageLayout>
    );
  },
});
