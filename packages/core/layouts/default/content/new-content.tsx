import { computed, defineComponent } from 'vue';
import { useRoute } from 'vue-router';
import PageLayout from '@jeesite/core/layouts/page/index.vue';
import { useRootSetting } from '@jeesite/core/hooks/setting/useRootSetting';
import { useTransitionSetting } from '@jeesite/core/hooks/setting/useTransitionSetting';
import { isDisplayRoute } from '../header/nav-links';
import { useContentViewHeight } from './useContentViewHeight';

import './new-content.less';

/**
 * NewContent —— 内容区（沉浸式全屏版），供 new-layout.tsx 使用，不改动原始 content/index.vue
 *
 * 差异：immersive 成立时去掉 .jeesite-layout-content 的 padding，使内容占满整个屏幕
 *      （/模块/overview/ 大屏看板页；?__full__ 全屏内容模式不沉浸、保留 padding）。
 */
export default defineComponent({
  name: 'NewContent',
  setup() {
    const route = useRoute();
    // 沉浸式（去掉内容区 padding）按当前路由声明式判定：
    // 路径落在顶栏导航（动态一级菜单，见 nav-links.tsx）任一 to 的 /模块/overview/ 目录下即沉浸，
    // 首帧即生效（currentRoute 先于组件渲染更新），无需页面拨开关。
    // 全屏内容模式（外链 ?__full__）保留内容区 padding
    const immersive = computed(() => isDisplayRoute(route.path));
    const { getOpenPageLoading } = useTransitionSetting();
    const { getLayoutContentMode, getPageLoading } = useRootSetting();

    useContentViewHeight();

    return () => (
      <div
        class={['jeesite-layout-content', getLayoutContentMode.value, { immersive: immersive.value }]}
      >
        {getOpenPageLoading.value && getPageLoading.value && (
          <div class="absolute left-1/2 top-1/2 z-[2000] -translate-x-1/2 -translate-y-1/2 text-sm text-gray-500">
            加载中...
          </div>
        )}
        <PageLayout />
      </div>
    );
  },
});
