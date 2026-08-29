import { computed, defineComponent, unref, type CSSProperties } from 'vue';

import LayoutHeader from './index.vue';
import MultipleTabs from '../tabs/index.vue';

import { useHeaderSetting } from '@jeesite/core/hooks/setting/useHeaderSetting';
import { useMenuSetting } from '@jeesite/core/hooks/setting/useMenuSetting';
import { useFullContent } from '@jeesite/core/hooks/web/useFullContent';
import { useMultipleTabSetting } from '@jeesite/core/hooks/setting/useMultipleTabSetting';
import { useAppInject } from '@jeesite/core/hooks/web/useAppInject';
import { useLayoutHeight } from '../content/useContentViewHeight';
import { useMultipleTabStore } from '@jeesite/core/store/modules/multipleTab';
import { useAppStore } from '@jeesite/core/store/modules/app';

import './new-multiple-header.less';

// 顶栏已换为 display 导航条（h-88px），与 @header-height 保持一致
const HEADER_HEIGHT = 88;
const TABS_HEIGHT = 32;
const TABS_HEIGHT_LARGE = 37;

/**
 * NewMultipleHeader —— 多页签头部（沉浸式全屏版），供 new-layout.tsx 使用，
 * 不改动原始 header/MultipleHeader.vue。
 *
 * 差异：当全局 store 的 immersive 为 true 时，隐藏顶部标签栏（tabs），用于大屏/看板页面。
 */
export default defineComponent({
  name: 'NewMultipleHeader',
  setup() {
    const { setHeaderHeight } = useLayoutHeight();

    const { getCalcContentWidth, getSplit } = useMenuSetting();
    const { getIsMobile } = useAppInject();
    const { getFixed, getShowInsetHeaderRef, getShowFullHeaderRef, getHeaderTheme, getShowHeader } = useHeaderSetting();

    const { getFullContent } = useFullContent();

    const { getShowMultipleTab, getTabsStyle } = useMultipleTabSetting();
    const tabStore = useMultipleTabStore();
    const appStore = useAppStore();

    const getShowTabs = computed(() => {
      return unref(getShowMultipleTab) && !unref(getFullContent) && !unref(appStore.getImmersive);
    });

    const getShowTabs2 = computed(() => {
      return tabStore.getTabList.length > 1;
    });

    const getIsShowPlaceholderDom = computed(() => {
      return unref(getFixed) || unref(getShowFullHeaderRef);
    });

    const getWrapStyle = computed<CSSProperties>(() => {
      const style: CSSProperties = {};
      if (unref(getFixed)) {
        style.width = unref(getIsMobile) ? '100%' : unref(getCalcContentWidth);
      }
      if (unref(getShowFullHeaderRef)) {
        style.top = `${HEADER_HEIGHT}px`;
      }
      return style;
    });

    const getIsFixed = computed(() => {
      return unref(getFixed) || unref(getShowFullHeaderRef);
    });

    const getPlaceholderDomStyle = computed<CSSProperties>(() => {
      let height = 0;
      if ((unref(getShowFullHeaderRef) || !unref(getSplit)) && unref(getShowHeader) && !unref(getFullContent)) {
        height += HEADER_HEIGHT;
      }
      if (unref(getShowMultipleTab) && !unref(getFullContent) && !unref(appStore.getImmersive) && unref(getShowTabs2)) {
        if (['3', '4', '5'].includes(unref(getTabsStyle))) {
          height += TABS_HEIGHT_LARGE;
        } else {
          height += TABS_HEIGHT;
        }
      }
      setHeaderHeight(height);
      return {
        height: `${height}px`,
      };
    });

    const getClass = computed(() => {
      return [
        'jeesite-layout-multiple-header',
        `jeesite-layout-multiple-header--${unref(getHeaderTheme)}`,
        { ['jeesite-layout-multiple-header--fixed']: unref(getIsFixed) },
      ];
    });

    return () => (
      <>
        {getIsShowPlaceholderDom.value && <div style={getPlaceholderDomStyle.value} />}
        <div style={getWrapStyle.value} class={getClass.value}>
          {getShowInsetHeaderRef.value && <LayoutHeader />}
          {getShowTabs.value && (
            <MultipleTabs style={{ display: getShowTabs2.value ? '' : 'none' }} />
          )}
        </div>
      </>
    );
  },
});
