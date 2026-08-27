import { defineComponent } from 'vue';
import logoBgImg from '@jeesite/assets/images/display/logo-bg.webp';

export const Logo = defineComponent({
  setup() {
    return () => (
      <div class="w-360px h-full relative flex items-center justify-center">
        <img src={logoBgImg} alt="" class="size-full absolute inset-0 z-0" />

        <div class="ml-28px text-28px font-900 text-white whitespace-nowrap z-50">武汉市更新综合管理平台</div>
      </div>
    );
  },
});
