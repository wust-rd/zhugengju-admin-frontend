import expandBtnImg from '@jeesite/assets/images/display/expand-btn.webp';
import { VMap, VMapControls } from '@jeesite/vmap';
import { animate } from 'motion-v';
import { defineComponent, ref } from 'vue';
import { LayerControls } from '@jeesite/display/components/layer-controls';
import { SchemeMapLayers } from './map-layers';
import { RouterLink } from 'vue-router';
import { cn } from '@jeesite/core/libs';

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

/** OSS 图片基础地址 */
const OSS_BASE = 'https://zhugengju-public.oss-cn-wuhan-lr.aliyuncs.com/片区策划';

// 片区概况
const PIANQU_IMG = `${OSS_BASE}/片区概况.webp`;

/** 天地图底图：矢量底图 + 中文注记叠加 */
const tiandituStyle: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'tianditu-vec': {
      type: 'raster',
      tiles: tiandituTileUrls('vec_c'),
      tileSize: 256,
      minzoom: 2,
      maxzoom: 18,
    },
    'tianditu-cva': {
      type: 'raster',
      tiles: tiandituTileUrls('cva_c'),
      tileSize: 256,
      minzoom: 2,
      maxzoom: 18,
    },
  },
  layers: [
    { id: 'tianditu-vec', type: 'raster', source: 'tianditu-vec' },
    { id: 'tianditu-cva', type: 'raster', source: 'tianditu-cva' },
  ],
};

export default defineComponent({
  name: 'DisplayScheme',
  setup() {
    /** 天地图原生构造选项（_c 系列瓦片为 CGCS2000 经纬度坐标系，CRS 切 EPSG:4490） */
    const mapOptions: Partial<maplibregl.MapOptions> = {
      crs: 'EPSG:4490',
      center: [114.2761773, 30.5344542] as [number, number], // 数据范围中心（武汉）
      zoom: 11,
    };

    const drawerRef = ref<HTMLDivElement | null>(null);
    /** 右侧抽屉（地图点击打开） */
    const drawerVisible = ref(false);
    const previewVisible = ref(false);
    /** 项目 tab 三个按钮点击后弹出的图片地址 */
    const projectPreviewSrc = ref('');
    /** 左侧抽屉收起后，显示左上角展开按钮 */
    const expandVisible = ref(false);
    /** 左侧抽屉收起前的原始宽度，展开动画恢复用 */
    let drawerWidth = 0;

    /** 关闭预览弹窗 */
    const closePreview = () => {
      previewVisible.value = false;
      projectPreviewSrc.value = '';
    };

    /** 点击红色方块：左侧抽屉容器宽度收缩并渐隐，动画结束后彻底隐藏，并显示展开按钮 */
    const hideDrawer = () => {
      const el = drawerRef.value;
      if (!el) return;
      drawerWidth = el.offsetWidth;
      animate(
        el,
        { width: [drawerWidth, 0], opacity: [1, 0] },
        {
          duration: 0.3,
          ease: 'easeInOut',
          onComplete: () => {
            el.style.display = 'none';
            el.style.width = '';
            expandVisible.value = true;
          },
        },
      );
    };

    /** 点击展开按钮：抽屉宽度从 0 恢复到原宽，同时隐藏自身 */
    const showDrawer = () => {
      const el = drawerRef.value;
      if (!el) return;
      expandVisible.value = false;
      el.style.display = '';
      el.style.width = '0px';
      animate(
        el,
        { width: [0, drawerWidth], opacity: [0, 1] },
        {
          duration: 0.3,
          ease: 'easeInOut',
          onComplete: () => {
            el.style.width = '';
          },
        },
      );
    };

    return () => (
      <>
        {/* 左侧抽屉：与地图平级，向左移动渐隐（motion-v 动画） */}
        <div
          ref={(el) => {
            drawerRef.value = el as HTMLDivElement | null;
          }}
          class="relative h-full"
        >
          <img src={`${OSS_BASE}/左侧抽屉.webp`} alt="左侧抽屉" class="h-full object-fill" />

          <div
            class="absolute bg-transparent top-36px right-24px size-40px z-100 cursor-pointer"
            onClick={hideDrawer}
          />
        </div>

        <div class="size-full relative">
          {/* 地图：VMap 组件内部创建/销毁 MapLibre 实例，crs/center/zoom 走 options prop */}
          <VMap style={tiandituStyle} options={mapOptions}>
            <VMapControls class="absolute right-24px bottom-24px z-10" />
            {/* 图层 / 交互逻辑子组件：必须在 VMap 插槽内才能 useMap */}
            <SchemeMapLayers
              onUpdate:drawer={(v: boolean) => {
                drawerVisible.value = v;
              }}
            />
          </VMap>

          {expandVisible.value && (
            <img
              src={expandBtnImg}
              alt=""
              class="absolute top-32px left-32px size-40px z-50 cursor-pointer"
              onClick={showDrawer}
            />
          )}

          {/* 图层管理器：左上角胶囊按钮，left 随左侧抽屉展开状态切换（组件已提取） */}
          <LayerControls
            class={{
              'left-80px': expandVisible.value,
              'left-32px': !expandVisible.value,
            }}
          />
        </div>

        {/* 右侧 Drawer：地图点击打开，Tab 切换内容；显示时从右往左平移渐显，隐藏时向右移出并淡出 */}
        <div
          class={cn('fixed top-100px right-12px z-50 transition-[transform,opacity] duration-200', {
            'opacity-100': drawerVisible.value,
            // opacity-0 仅不可见，仍需 pointer-events-none 禁用鼠标穿透
            'pointer-events-none opacity-0': !drawerVisible.value,
          })}
        >
          <RouterLink to="/display/scheme/detail">
            <img src={PIANQU_IMG} class="w-320px h-800px object-fill" />
          </RouterLink>
        </div>
      </>
    );
  },
});
