import { computed, defineComponent, ref } from 'vue';
import { ProjectTabContent } from '../../components/project-tab-content';
import { RouterLink } from 'vue-router';
import { MapControls } from '@jeesite/display/components/map-controls';

/** 真实范围线（area）与项目地块（project）数据，?url 导入 + 运行时 fetch，不打进 bundle */

/** OSS 图片基础地址 */
const OSS_BASE = 'https://zhugengju-public.oss-cn-wuhan-lr.aliyuncs.com/片区策划';

/** 抽屉 Tab 配置：label（同时作为唯一标识）+ 内容图片 + 弹窗预览图（preview 为空表示不可点击预览） */
const DRAWER_TABS = [
  { label: '基本情况', image: `${OSS_BASE}/基本情况.webp`, preview: '' },
  { label: '体检情况', image: `${OSS_BASE}/体检情况.webp`, preview: `${OSS_BASE}/片区策划图册.webp` },
  { label: '功能策划', image: `${OSS_BASE}/功能策划.webp`, preview: `${OSS_BASE}/片区策划图册.webp` },
  { label: '项目情况', image: `${OSS_BASE}/项目情况.webp`, preview: `${OSS_BASE}/片区项目清单.webp` },
  {
    label: '实施后评估',
    image: `${OSS_BASE}/实施后评估.webp`,
    preview: `${OSS_BASE}/实施后评估-相册.webp`,
  },
] as const;
type DrawerTabLabel = (typeof DRAWER_TABS)[number]['label'];

/** 页面涉及的全部静态图片（返回按钮 + 各 Tab 背景图 + 抽屉内容图 + 预览图 + 资金图），组件加载时统一预加载 */
const PRELOAD_IMAGES = [
  `${OSS_BASE}/知音东苑片-返回.webp`,
  ...DRAWER_TABS.map((t) => `${OSS_BASE}/知音东苑片-${t.label}.webp`),
  ...DRAWER_TABS.flatMap((t) => [t.image, t.preview].filter(Boolean)),
  `${OSS_BASE}/片区资金情况.webp`,
];

export default defineComponent({
  name: 'DisplaySchemeDetail',
  setup() {
    // 组件加载即预加载所有图片（触发浏览器缓存，切换 Tab / 打开预览不再闪烁）
    PRELOAD_IMAGES.forEach((src) => {
      const img = new Image();
      img.src = src;
    });

    const drawerRef = ref<HTMLDivElement | null>(null);
    /** 右侧抽屉（地图点击打开） */
    const drawerVisible = ref(true);
    const activeTab = ref<DrawerTabLabel>('基本情况');
    const previewVisible = ref(false);
    /** 项目 tab 三个按钮点击后弹出的图片地址 */
    const projectPreviewSrc = ref('');

    /** 当前 Tab 配置（含内容图与预览图），单一数据源派生，避免重复查找 */
    const activeTabConfig = computed(() => DRAWER_TABS.find((t) => t.label === activeTab.value) ?? DRAWER_TABS[0]);
    /** project / evaluation tab 使用 ProjectTabContent 多按钮组件 */
    const isMultiButtonTab = computed(() => activeTab.value === '项目情况' || activeTab.value === '实施后评估');
    /** 预览弹窗的图片地址：多按钮 tab 用回调传入的地址，其余 tab 用配置的 preview */
    const previewImageSrc = computed(() =>
      isMultiButtonTab.value ? projectPreviewSrc.value : (activeTabConfig.value.preview ?? ''),
    );

    /** 关闭预览弹窗 */
    const closePreview = () => {
      previewVisible.value = false;
      projectPreviewSrc.value = '';
    };

    return () => (
      <>
        <div class="w-1430px h-full relative">
          <RouterLink to="/display/scheme">
            <img src={`${OSS_BASE}/知音东苑片-返回.webp`} class="absolute top-12px left-12px w-250px h-56px" />
          </RouterLink>

          <img src={`${OSS_BASE}/知音东苑片-${activeTab.value}.webp`} class="h-full object-fill" />

          {/* 地图控件：右下角 */}
          <div class="absolute right-24px bottom-24px z-10">
            <MapControls />
          </div>
        </div>

        {/* 右侧 Drawer：地图点击打开，Tab 切换内容 */}
        <div
          class={
            'fixed top-88px right-0 bottom-0 z-[60] flex w-420px flex-col bg-[#0f2b47] text-white shadow-2xl transition-transform duration-300 ' +
            (drawerVisible.value ? 'translate-x-0' : 'translate-x-full')
          }
        >
          {/* 顶部 Tab 切换器（5 等分胶囊样式） */}
          <div class="flex h-44px items-stretch bg-[#1a3a5c]">
            {DRAWER_TABS.map((tab) => (
              <div
                key={tab.label}
                class={
                  'flex flex-1 cursor-pointer items-center justify-center text-14px whitespace-nowrap transition-all duration-200 ' +
                  (activeTab.value === tab.label
                    ? 'border border-[#5fbfff]/60 bg-gradient-to-r from-[#0ea5e9]/20 to-[#0E83BD] font-500 text-white shadow-lg'
                    : 'border border-transparent text-white/60 hover:text-white')
                }
                onClick={() => (activeTab.value = tab.label)}
              >
                {tab.label}
              </div>
            ))}
          </div>

          {/* 内容区：多按钮 tab（project / evaluation）使用 ProjectTabContent，其余 tab 为单图点击预览 */}
          <div class="scrollbar-none flex-1 overflow-y-auto">
            {isMultiButtonTab.value ? (
              <ProjectTabContent
                bgImage={activeTabConfig.value.image}
                topImage={`${OSS_BASE}/片区项目清单.webp`}
                middleImage={`${OSS_BASE}/片区资金情况.webp`}
                bottomImage={`${OSS_BASE}/实施后评估-相册.webp`}
                onPreview={(src: string) => {
                  projectPreviewSrc.value = src;
                  previewVisible.value = true;
                }}
              />
            ) : (
              <img
                src={activeTabConfig.value.image}
                alt={activeTabConfig.value.label}
                class={'w-full rounded-lg ' + (activeTabConfig.value.preview ? 'cursor-pointer' : '')}
                onClick={() => {
                  if (activeTabConfig.value.preview) {
                    previewVisible.value = true;
                  }
                }}
              />
            )}
          </div>
        </div>

        {/* 预览 Modal：多按钮 tab 由 ProjectTabContent 的 onPreview 回调驱动，其余 tab 由 preview 配置驱动 */}
        {previewVisible.value && previewImageSrc.value && (
          <div class="fixed inset-0 z-[70] flex items-center justify-center bg-black/60" onClick={closePreview}>
            <div class="relative inline-block" onClick={(e: MouseEvent) => e.stopPropagation()}>
              <img
                src={previewImageSrc.value}
                alt="图片预览"
                class="max-h-[90vh] w-884px rounded-xl object-contain shadow-2xl"
              />
              {/* 右上角关闭按钮 */}
              <div class="absolute right-0px top-0px size-64px cursor-pointer" onClick={closePreview}></div>
            </div>
          </div>
        )}
      </>
    );
  },
});
