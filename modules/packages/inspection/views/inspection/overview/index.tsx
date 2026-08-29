import { defineComponent, onBeforeUnmount } from 'vue';
import VueInspection from '@jeesite/display/views/inspection';
import { useAppStore } from '@jeesite/core/store/modules/app';

export default defineComponent({
  name: 'ViewsInspectionOverview',
  setup() {
    const appStore = useAppStore();
    // 沉浸式全屏：进入时隐藏顶部标签栏、去掉内容区 padding，让页面占据整个屏幕（保留侧边菜单）
    appStore.setImmersive(true);
    // 离开时恢复，避免影响其它页面
    onBeforeUnmount(() => {
      appStore.setImmersive(false);
    });
    return () => <VueInspection />;
  },
});
