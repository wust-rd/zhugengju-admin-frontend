import { defineComponent, inject, ref } from 'vue';
import { match } from 'ts-pattern';
import { ScrollArea } from '@jeesite/display/components/scroll-area';
import { LayerControls } from '@jeesite/display/components/layer-controls';
import { ProjectViewKey } from '@jeesite/display/hooks/use-project-view';

/** 项目底图 */
// const MAP_IMAGE_URL = 'https://zhugengju-public.oss-cn-wuhan-lr.aliyuncs.com/项目实施/知音东院片.webp';
const MAP_IMAGE_URL_LEFT = 'https://epile-dev.oss-cn-wulanchabu.aliyuncs.com/guihuaju/征收管理/总览-left.webp';

const MAP_IMAGE_URL_RIGHT = 'https://epile-dev.oss-cn-wulanchabu.aliyuncs.com/guihuaju/征收管理/总览-地图.webp';

/** 内容图片地址 */
const BASE_IMAGE_URL = 'https://zhugengju-public.oss-cn-wuhan-lr.aliyuncs.com/项目实施/项目基本信息.webp';
const RENOVATION_IMAGE_URL = 'https://zhugengju-public.oss-cn-wuhan-lr.aliyuncs.com/项目实施/项目改造情况.webp';

/** 点击红色热点后整页展示的图片（替换总览底图） */
const DETAIL_IMAGE_URL = 'https://epile-dev.oss-cn-wulanchabu.aliyuncs.com/guihuaju/征收管理/征收管理-总览页面2.webp';

/** 侧边栏「人形」图标对应的整页图片 */
const NAME_PROTECT_IMAGE_URL = 'https://epile-dev.oss-cn-wulanchabu.aliyuncs.com/guihuaju/征收管理/名称保护.webp';

export default defineComponent({
  name: 'DisplayProject',
  setup() {
    const activeTab = ref<'base' | 'renovation'>('base');
    const previewVisible = ref(false);
    /**
     * 项目实施页视图状态（由 layouts/index.tsx provide，Sidebar 写入）
     * - projectView：整页视图（overview = 总览底图，nameProtect = 名称保护单图）
     * - detailVisible：总览内是否展开详情大图（红色热点切换）
     */
    const { projectView, detailVisible } = inject(ProjectViewKey)!;

    return () => {
      const isBase = activeTab.value === 'base';

      /** 总览视图：左右两张底图拼接，红色热点切详情大图 */
      const overview = (
        <>
          {/* <LayerControls class="left-500px" /> */}

          {/* 项目底图：总览（左右两张拼接） ↔ 详情大图（点击红色热点整页切换） */}
          <div class="flex size-full relative">
            {detailVisible.value ? (
              <img src={DETAIL_IMAGE_URL} alt="项目详情" class="size-full object-fill" />
            ) : (
              <>
                <img src={MAP_IMAGE_URL_LEFT} alt="项目地图" class="w-460px h-full block" />

                <img src={MAP_IMAGE_URL_RIGHT} alt="项目地图" class="flex-1 object-fill" />
              </>
            )}

            {/* 红色热点：点击在「总览 ↔ 详情大图」之间切换（确认好位置后可删掉 bg-red/20） */}
            <div
              class="absolute top-124px right-700px z-10 size-100px cursor-pointer"
              onClick={() => (detailVisible.value = !detailVisible.value)}
            />
          </div>

          {/* Tab 切换器 + 内容区（浮在地图上方右上角，宽度一致） */}
          {/* <div class="absolute top-24px right-24px z-10 w-420px">
            <div class="flex h-52px rounded-full bg-[#1a3a5c] p-4px">
              <div
                class={
                  'flex h-full flex-1 cursor-pointer items-center justify-center rounded-full text-14px text-white transition-all duration-200 ' +
                  (isBase
                    ? 'bg-gradient-to-r from-[#0ea5e9]/20 to-[#0E83BD] font-500 shadow-lg'
                    : 'text-white/60 hover:text-white')
                }
                onClick={() => (activeTab.value = 'base')}
              >
                项目基本信息
              </div>
              <div
                class={
                  'flex h-full flex-1 cursor-pointer items-center justify-center rounded-full text-14px text-white transition-all duration-200 ' +
                  (!isBase
                    ? 'bg-gradient-to-r from-[#0ea5e9]/20 to-[#0E83BD] font-500 shadow-lg'
                    : 'text-white/60 hover:text-white')
                }
                onClick={() => (activeTab.value = 'renovation')}
              >
                项目改造情况
              </div>
            </div>

            {/* 内容区：与 tab 同宽，位于 tab 下方，ScrollArea 自绘滚动条使图片可滚动 * //}
            <ScrollArea className="mt-6px max-h-[calc(100vh_-_246px)]">
              {isBase ? (
                <img
                  src={BASE_IMAGE_URL}
                  alt="项目基本信息"
                  class="w-full cursor-pointer rounded-xl"
                  // onClick={() => (previewVisible.value = true)}
                />
              ) : (
                <img
                  src={RENOVATION_IMAGE_URL}
                  alt="项目改造情况"
                  class="w-full cursor-pointer rounded-xl"
                  onClick={() => (previewVisible.value = true)}
                />
              )}
            </ScrollArea>
          </div> */}

          {/* 图片预览 Modal：点击图片弹出，居中显示（长 776 宽 548） */}
          {/* {previewVisible.value && (
            <div
              class="fixed inset-0 z-50 flex items-center justify-center"
              onClick={() => (previewVisible.value = false)}
            >
              <img
                src="https://zhugengju-public.oss-cn-wuhan-lr.aliyuncs.com/项目实施/框.webp"
                alt="图片预览"
                class="w-776px h-548px bg-cover"
              />
            </div>
          )} */}
        </>
      );

      // 侧边栏点击切换：overview = 现有总览内容，nameProtect = 只展示「名称保护」一张图
      return match(projectView.value)
        .with('overview', () => overview)
        .with('nameProtect', () => <img src={NAME_PROTECT_IMAGE_URL} alt="名称保护" class="size-full object-fill" />)
        .exhaustive();
    };
  },
});
