import { defineComponent, onBeforeUnmount, ref } from 'vue';
import { useAppStore } from '@jeesite/core/store/modules/app';
import { DisplayPageLayout } from '@jeesite/display/components/page-layout';
import { GlowTitle3 } from '@jeesite/display/components/glow-title/title3';

import { ExpropriationOverview } from './expropriation-overview';

export default defineComponent({
  name: 'DisplayExpropriationManagement',
  setup() {
    const appStore = useAppStore();
    // 沉浸式全屏：进入时隐藏顶部标签栏、去掉内容区 padding，让页面占据整个屏幕（保留侧边菜单）
    appStore.setImmersive(true);
    // 离开时恢复，避免影响其它页面
    onBeforeUnmount(() => {
      appStore.setImmersive(false);
    });

    return () => (
      <DisplayPageLayout>
        {{
          left: ({ toggle }) => (
            <div>
              <GlowTitle3 title="征收信息汇总" />

              {/* 征收数据总览：汇总卡 + 区域 tabs + 分区详情 */}
              <ExpropriationOverview />
            </div>
          ),
          right: () => <>123</>,
        }}
      </DisplayPageLayout>
    );
  },
});
