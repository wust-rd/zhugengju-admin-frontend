import { defineComponent } from 'vue';
import PageLayout from '@jeesite/core/layouts/page/index.vue';
import { useRootSetting } from '@jeesite/core/hooks/setting/useRootSetting';
import { useTransitionSetting } from '@jeesite/core/hooks/setting/useTransitionSetting';
import { useAppStore } from '@jeesite/core/store/modules/app';
import { useContentViewHeight } from './useContentViewHeight';

import './new-content.less';

/**
 * NewContent —— 内容区（沉浸式全屏版），供 new-layout.tsx 使用，不改动原始 content/index.vue
 *
 * 差异：当全局 store 的 immersive 为 true 时，去掉 .jeesite-layout-content 的 padding，
 *       使内容占据整个屏幕（用于大屏/看板页面）。
 */
export default defineComponent({
  name: 'NewContent',
  setup() {
    const appStore = useAppStore();
    const { getOpenPageLoading } = useTransitionSetting();
    const { getLayoutContentMode, getPageLoading } = useRootSetting();

    useContentViewHeight();

    return () => (
      <div
        class={['jeesite-layout-content', getLayoutContentMode.value, { immersive: appStore.getImmersive }]}
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
