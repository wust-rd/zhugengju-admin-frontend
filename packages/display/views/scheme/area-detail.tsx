import { defineComponent } from 'vue';
import { RightDrawer } from './right-drawer';

/** OSS 图片基础地址 */
const OSS_BASE = 'https://zhugengju-public.oss-cn-wuhan-lr.aliyuncs.com/片区策划';

/** 左侧大图（换图只改这一行） */
const DETAIL_IMG = `${OSS_BASE}/片区概况.webp`;

/**
 * 片区详情页：左右布局 —— 左侧大图 + 右侧真实抽屉组件
 *
 * 入口：地图上点片区面 → 右上角「片区概况」卡片 → 「查看详情」按钮（/display/scheme/area-detail）。
 * 右侧直接复用真实抽屉组件 RightDrawer（6 个 Tab + 点击/滚动联动的数据面板），
 * 与另一条链路的图片版详情页（/display/scheme/detail，detail.tsx）互不影响。
 *
 * 说明：页面本身是 RouterView 的内容，外层 display 布局已是 flex 行，所以这里直接返回
 * 「左 flex-1 + 右固定宽」两个兄弟节点即可，不需要再包一层 flex 容器。
 */
export default defineComponent({
  name: 'DisplaySchemeAreaDetail',
  setup() {
    return () => (
      <>
        {/* 左侧大图：object-contain 完整显示（留白与 display 布局的深色底一致） */}
        <div class="relative h-full min-w-0 flex-1 overflow-hidden">
          <img src={DETAIL_IMG} alt="片区概况" class="size-full object-contain" />
        </div>

        {/* 右侧：真实抽屉组件。RightDrawer 自身是 absolute right-0 top-0 + w-420px，
            用等尺寸的 relative 容器兜住它的尺寸（与片区策划页里的用法一致） */}
        <div class="relative h-full w-420px shrink-0">
          <RightDrawer />
        </div>
      </>
    );
  },
});
