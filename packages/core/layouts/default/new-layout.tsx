import { computed, defineComponent, unref, type CSSProperties } from 'vue';
import { Layout } from 'antdv-next';
import { createAsyncComponent } from '@jeesite/core/utils/factory/createAsyncComponent';

import NewHeader from './header/new-header';
import LayoutContent from './content/index.vue';
import LayoutSideBar from './sider/index.vue';
import NewSider from './sider/new-sider';
import LayoutMultipleHeader from './header/MultipleHeader.vue';

import { useHeaderSetting } from '@jeesite/core/hooks/setting/useHeaderSetting';
import { useMenuSetting } from '@jeesite/core/hooks/setting/useMenuSetting';
import { useLockPage } from '@jeesite/core/hooks/web/useLockPage';

import { useAppInject } from '@jeesite/core/hooks/web/useAppInject';
import { switchSkin } from '@jeesite/core/api/sys/login';

import './new-layout.less';

const LayoutFeatures = createAsyncComponent(() => import('@jeesite/core/layouts/default/feature/index.vue'));
const LayoutFooter = createAsyncComponent(() => import('@jeesite/core/layouts/default/footer/index.vue'));

/**
 * NewLayout —— 后台布局（display 导航条版）
 *
 * 组装逻辑与原 index.vue 完全一致（Features + Header + Sider + MultipleHeader/Tabs +
 * Content/Footer），差异：顶部以 NewHeader(display 导航条) 顶替旧 header/index.vue；
 * 左侧以 NewSider(display 发光收起态侧边栏) 顶替旧 sider/index.vue。
 * 原 index.vue 原样保留、不再被改写；程序入口经 router/constant.ts 的 LAYOUT 指向本文件。
 */
export default defineComponent({
  name: 'NewDefaultLayout',
  setup() {
    const { getIsMobile } = useAppInject();
    const { getShowFullHeaderRef } = useHeaderSetting();
    const { getShowSidebar, getIsMixSidebar, getShowMenu } = useMenuSetting();

    // NewHeader 为固定头部（占位 88px），sider 需在下方 sticky 并吸附到视口底部。
    // sticky 的 top 仅为滚动时的吸附位置，初始需要 marginTop 下移避开固定头部。
    const getSiderStyle = computed<CSSProperties>(() => {
      const headerOffset = unref(getShowFullHeaderRef) ? 88 : 0;
      return {
        position: 'sticky',
        top: `${headerOffset}px`,
        alignSelf: 'flex-start',
        marginTop: `${headerOffset}px`,
        height: headerOffset ? `calc(100vh - ${headerOffset}px)` : '100vh',
      };
    });

    switchSkin();

    const lockEvents = useLockPage();

    const layoutClass = computed(() => {
      const cls: string[] = ['ant-layout'];
      if (unref(getIsMixSidebar) || unref(getShowMenu)) {
        cls.push('ant-layout-has-sider');
      }
      return cls;
    });

    return () => (
      <Layout class="jeesite-default-layout" {...lockEvents}>
        <LayoutFeatures />
        {unref(getShowFullHeaderRef) && <NewHeader fixed />}
        <Layout class={layoutClass.value}>
          {(unref(getShowSidebar) || unref(getIsMobile)) && <NewSider style={getSiderStyle.value} />}
          <Layout class="ant-layout jeesite-default-layout-main">
            <LayoutMultipleHeader />
            <LayoutContent />
            <LayoutFooter />
          </Layout>
        </Layout>
      </Layout>
    );
  },
});
