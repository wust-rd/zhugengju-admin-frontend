import { defineComponent } from 'vue';
import { Header } from '@jeesite/display/components/header';

/**
 * NewHeader —— 后台顶栏的 display 导航条封装
 *
 * 与被保留的原版 header/index.vue 并存：使用 NewLayout 时以本组件顶替旧头部，
 * 原 index.vue 不再被改写。
 *
 * - 外壳保持与原 .jeesite-layout-header--fixed 相同的定位语义：
 *   fixed 顶部 / 通栏 / layout-header-fixed-z-index(500)；
 * - 内部渲染 display 的 <Header />（Logo + NavLinks + 搜索/通知/系统入口 + 用户下拉）；
 * - 高度 88px，由 @header-height=88px 与 MultipleHeader 的 HEADER_HEIGHT 联动占位。
 */
export default defineComponent({
  name: 'NewHeader',
  props: {
    /** 兼容原 LayoutHeader 的调用签名 */
    fixed: { type: Boolean, default: false },
  },
  setup() {
    return () => (
      <div class="fixed top-0 left-0 z-[500] w-full shrink-0">
        <Header />
      </div>
    );
  },
});
