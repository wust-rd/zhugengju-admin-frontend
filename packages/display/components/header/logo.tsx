import logoBgImg from '@jeesite/assets/images/display/logo-bg.webp';
import { defineComponent } from 'vue';

export const Logo = defineComponent({
  setup() {
    return () => (
      <div class="w-420px h-full relative">
        <img src={logoBgImg} alt="" class="h-full absolute z-0 object-fill brightness-60" />

        <div class="absolute left-24px top-1/2 -translate-y-1/2 text-28px font-900 text-white whitespace-nowrap z-50">
          武汉市更新综合管理平台
        </div>
      </div>
    );
  },
});
