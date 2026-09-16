import { defineComponent } from 'vue';
import { LayerControls } from '@jeesite/display/components/layer-controls';
import { ProjectInfoTabs } from '@jeesite/display/components/ifco/project-info-tabs';

/** 项目底图（皮子街片区素材，原始链接为 percent-encoding，这里已解码） */
const MAP_IMAGE_URL = 'https://epile-dev.oss-cn-wulanchabu.aliyuncs.com/guihuaju/片区策划-皮子街/项目实施-背景图.webp';

/**
 * 项目实施页（/display/project）
 *
 * 结构：LayerControls（左上角图层按钮）+ 项目底图铺满 + 右上角项目信息 Tab 面板。
 * Tab 面板（切换器 + 内容区）用现成组件 ProjectInfoTabs，它自带：
 * 胶囊轨道 + 滑动高亮指示器、内容切换时的左右滑动淡入动画，以及两个 Tab 的内容。
 */
export default defineComponent({
  name: 'DisplayProject',
  setup() {
    return () => (
      <div class="size-full">
        <LayerControls />

        {/* 项目底图 */}
        <img src={MAP_IMAGE_URL} alt="项目地图" class="size-full object-cover bg-center" />

        {/* 项目信息 Tab 面板：Tab 切换器 + 内容区（浮在地图上方右上角） */}
        <ProjectInfoTabs class="absolute top-24px right-24px z-10" />
      </div>
    );
  },
});
