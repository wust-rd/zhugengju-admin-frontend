import { defineComponent } from 'vue';
import { useRouter } from 'vue-router';
import { LayerControls } from '@jeesite/display/components/layer-controls';
import { ProjectInfoTabs } from '@jeesite/display/components/ifco/project-info-tabs';

/** 项目底图（皮子街片区素材，原始链接为 percent-encoding，这里已解码） */
const MAP_IMAGE_URL = 'https://epile-dev.oss-cn-wulanchabu.aliyuncs.com/guihuaju/片区策划-皮子街/项目实施-背景图.webp';

/** 「皮子街片」按钮的跳转目标：片区详情页 + 该页默认选中的 Tab（用 query 传，见 area-detail.tsx） */
const AREA_DETAIL_PATH = '/display/scheme/area-detail';
const AREA_DETAIL_TAB = '项目情况';

/**
 * 项目实施页（/display/project）
 *
 * 结构：LayerControls（左上角「图层管理器」+ 右侧「皮子街片」返回按钮）+ 项目底图铺满
 * + 右上角项目信息 Tab 面板。Tab 面板（切换器 + 内容区）用现成组件 ProjectInfoTabs，它自带：
 * 胶囊轨道 + 滑动高亮指示器、内容切换时的左右滑动淡入动画，以及两个 Tab 的内容。
 *
 * 「皮子街片」按钮：带 ?tab=项目情况 跳回片区详情页，靠 URL 传参而不是全局状态，
 * 这样刷新 / 前进后退也能回到同一个 Tab（子路由方案没必要，见 area-detail 的说明）。
 */
export default defineComponent({
  name: 'DisplayProject',
  setup() {
    const router = useRouter();

    /** 回到皮子街片区详情页，并让右侧抽屉默认停在「项目情况」Tab */
    const goAreaDetail = () => router.push({ path: AREA_DETAIL_PATH, query: { tab: AREA_DETAIL_TAB } });

    return () => (
      <div class="size-full">
        <LayerControls
          v-slots={{
            // 图层管理器右侧的「皮子街片」按钮（同一个毛玻璃条内）
            actions: () => (
              <div
                class="rd-8px ml-4px flex h-48px cursor-pointer items-center gap-8px bg-gradient-to-tr from-[#0d1733] to-[#3261a2] px-12px transition-all hover:brightness-110"
                onClick={goAreaDetail}
              >
                <div class="i-ri-map-pin-2-line size-16px text-white" />
                <div class="text-white font-500 text-16px">皮子街片</div>
              </div>
            ),
          }}
        />

        {/* 项目底图 */}
        <img src={MAP_IMAGE_URL} alt="项目地图" class="size-full object-cover bg-center" />

        {/* 项目信息 Tab 面板：Tab 切换器 + 内容区（浮在地图上方右上角） */}
        <ProjectInfoTabs class="absolute top-24px right-24px z-10" />
      </div>
    );
  },
});
