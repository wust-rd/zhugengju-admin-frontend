import { defineComponent, ref } from 'vue';
import { animate } from 'motion-v';
import expandBtnImg from '@jeesite/assets/images/display/expand-btn.webp';
import { MapControls } from '@jeesite/display/components/map-controls';
import { AreaOverviewModal } from '@jeesite/display/components/plan/area-overview-modal';
import { VMap, VMapControls } from '@jeesite/vmap';

/** OSS 图片基础地址 */
const OSS_BASE = 'https://zhugengju-public.oss-cn-wuhan-lr.aliyuncs.com/更新规划/';

/** 左侧抽屉内容图：图层管理 */
const DRAWER_IMAGE = `${OSS_BASE}更新规划-图层管理.webp`;
/** 右侧地图图 */
const MAP_IMAGE = `${OSS_BASE}更新规划图-地图.webp`;

export default defineComponent({
  name: 'DisplayPlan',
  setup() {
    const drawerRef = ref<HTMLDivElement | null>(null);
    /** 抽屉收起后显示圆形展开按钮 */
    const expandVisible = ref(false);
    let drawerWidth = 0;

    /** 隐藏抽屉 */
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

    /** 展开抽屉 */
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
      <div class="flex h-full w-full">
        {/* 左侧抽屉 */}
        <div
          ref={(el) => {
            drawerRef.value = el as HTMLDivElement | null;
          }}
          class="relative h-full shrink-0"
        >
          <img src={DRAWER_IMAGE} alt="图层管理" class="h-full object-fill" />

          {/* 图片右上角透明点击区：收起抽屉 */}
          <div
            class="absolute right-12px top-12px size-40px cursor-pointer bg-transparent z-100"
            onClick={hideDrawer}
          />
        </div>

        {/* 右侧：地图图片 */}
        <div class="relative min-w-0 flex-1 h-full">
          <img src={MAP_IMAGE} alt="地图" class="size-full object-cover bg-center" />

          {/* 右侧上方 Modal（区域 area-overview-modal 组件） */}
          {/* <AreaOverviewModal /> */}

          {/* 地图控件：右下角 */}
          <VMapControls class="absolute right-24px bottom-24px z-10" map={null} />

          {/* 抽屉收起后显示的圆形展开按钮 */}
          {expandVisible.value && (
            <img
              src={expandBtnImg}
              alt="展开"
              class="absolute left-32px top-32px size-40px z-50 cursor-pointer"
              onClick={showDrawer}
            />
          )}
        </div>
      </div>
    );
  },
});
