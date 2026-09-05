import { defineComponent, onBeforeUnmount, ref } from 'vue';
import { useAppStore } from '@jeesite/core/store/modules/app';
import { DisplayPageLayout } from '@jeesite/display/components/page-layout';
import { GlowTitle3 } from '@jeesite/display/components/glow-title/title3';

import { ExpropriationOverview } from './expropriation-overview';
import { DistrictList } from './district-list';

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

    /** 左侧面板当前视图：main 总览页 / list 片区列表二级页 */
    const leftView = ref<'main' | 'list'>('main');

    return () => (
      <DisplayPageLayout>
        {{
          left: ({ toggle }) => (
            // 纵向弹性列：标题固定在顶部，下方内容超高时独立滚动
            <div class="h-full flex flex-col">
              {leftView.value === 'main' ? (
                <>
                  {/* 一级页：征收信息汇总（右侧「片区列表」按钮进入二级页） */}
                  <GlowTitle3 title="征收信息汇总" class="shrink-0" onButtonClick={() => (leftView.value = 'list')} />

                  {/* 征收数据总览：汇总卡 + 区域 tabs + 分区详情 + 各区完成情况 */}
                  <ExpropriationOverview />
                </>
              ) : (
                /* 二级页：片区列表 */
                <DistrictList onBack={() => (leftView.value = 'main')} />
              )}
            </div>
          ),
          right: () => <>123</>,
        }}
      </DisplayPageLayout>
    );
  },
});
