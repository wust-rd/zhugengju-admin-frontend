import { defineComponent } from 'vue';
import logoBgImg from '@jeesite/assets/images/display/logo-bg.webp';

export const Logo = defineComponent({
  setup() {
    return () => (
      <div class="w-420px h-full relative flex items-center justify-center">
        <img src={logoBgImg} alt="" class="size-full" />

        <div class="absolute text-24px font-900 text-white">武汉市更新综合管理平台</div>
      </div>
    );
  },
});
