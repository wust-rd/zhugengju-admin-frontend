import { defineComponent, ref } from 'vue';
import { ScrollArea } from '@jeesite/display/components/scroll-area';
import { LayerControls } from '@jeesite/display/components/layer-controls';

/** 项目底图 */
const MAP_IMAGE_URL = 'https://zhugengju-public.oss-cn-wuhan-lr.aliyuncs.com/项目实施/知音东院片.webp';

/** 内容图片地址 */
const BASE_IMAGE_URL = 'https://zhugengju-public.oss-cn-wuhan-lr.aliyuncs.com/项目实施/项目基本信息.webp';
const RENOVATION_IMAGE_URL = 'https://zhugengju-public.oss-cn-wuhan-lr.aliyuncs.com/项目实施/项目改造情况.webp';

export default defineComponent({
  name: 'DisplayExpropriationManagement',
  setup() {
    const activeTab = ref<'base' | 'renovation'>('base');
    const previewVisible = ref(false);

    return () => {
      const isBase = activeTab.value === 'base';

      return (
        <>
          <LayerControls />

          {/* 项目底图 */}
          <img src={MAP_IMAGE_URL} alt="项目地图" class="size-full object-cover bg-center" />

          {/* Tab 切换器 + 内容区（浮在地图上方右上角，宽度一致） */}
          <div class="absolute top-24px right-24px z-10 w-420px">
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

            {/* 内容区：与 tab 同宽，位于 tab 下方，ScrollArea 自绘滚动条使图片可滚动 */}
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
          </div>

          {/* 图片预览 Modal：点击图片弹出，居中显示（长 776 宽 548） */}
          {previewVisible.value && (
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
          )}
        </>
      );
    };
  },
});
