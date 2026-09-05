import { defineComponent, onBeforeUnmount, ref } from 'vue';
import { useAppStore } from '@jeesite/core/store/modules/app';
import { DisplayPageLayout } from '@jeesite/display/components/page-layout';
import { GlowTitle3 } from '@jeesite/display/components/glow-title/title3';
import { LayerControls } from '@jeesite/display/components/layer-controls';
import { VMap, VMapControls } from '@jeesite/vmap';

import { ExpropriationOverview } from './expropriation-overview';
import { DistrictList } from './district-list';
import { ExpropriationInfoTabs } from './project-info-tabs';

/** 天地图子域名列表（t0~t7，多域名并行请求，突破浏览器并发限制） */
const TIANDITU_SUBDOMAINS = ['0', '1', '2', '3', '4', '5', '6', '7'];

/**
 * 构建天地图瓦片 URL 数组（DataServer REST 接口，CGCS2000 经纬度 _c 系列，EPSG:4490）
 * 配合 Map 的 crs: 'EPSG:4490' 使用；layer 传 'vec_c'/'cva_c'
 */
function tiandituTileUrls(layer: string): string[] {
  return TIANDITU_SUBDOMAINS.map(
    (s) =>
      `https://t${s}.tianditu.gov.cn/DataServer?T=${layer}&X={x}&Y={y}&L={z}&tk=${import.meta.env.VITE_TIANDITU_TOKEN}`,
  );
}

/** 天地图底图：矢量底图 + 中文注记叠加 */
const tiandituStyle: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'tianditu-vec': { type: 'raster', tiles: tiandituTileUrls('vec_c'), tileSize: 256, minzoom: 2, maxzoom: 18 },
    'tianditu-cva': { type: 'raster', tiles: tiandituTileUrls('cva_c'), tileSize: 256, minzoom: 2, maxzoom: 18 },
  },
  layers: [
    { id: 'tianditu-vec', type: 'raster', source: 'tianditu-vec' },
    { id: 'tianditu-cva', type: 'raster', source: 'tianditu-cva' },
  ],
};

/** 天地图原生构造选项（_c 系列瓦片为 CGCS2000 经纬度坐标系，CRS 切 EPSG:4490） */
const mapOptions: Partial<maplibregl.MapOptions> = {
  crs: 'EPSG:4490',
  center: [114.305, 30.593] as [number, number], // 武汉
  zoom: 11,
};

export default defineComponent({
  name: 'DisplayExpropriationManagement',
  setup() {
    const appStore = useAppStore();
    // 沉浸式全屏：进入时隐藏顶部标签栏、去掉内容区 padding，让页面占据整个屏幕（保留侧边菜单）
    appStore.setImmersive(true);
    // 离开时恢复，避免影响其它页面
    onBeforeUnmount(() => {
      appStore.setImmersive(false);
    });

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
              <VMap style={tiandituStyle} options={mapOptions}>
                <VMapControls class="absolute right-24px bottom-24px z-10" />
              </VMap>

              {/* 图层管理器：左上角胶囊按钮（图层开关/数据菜单，占位数据） */}
              <LayerControls class="left-32px top-24px" />

              {/* 征收项目信息 Tab 面板：项目基本信息 / 征收进度汇总（右上角） */}
              <ExpropriationInfoTabs class="absolute right-24px top-24px z-10" />
            </>
          ),
        }}
      </DisplayPageLayout>
    );
  },
});
