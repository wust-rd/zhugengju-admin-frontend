import { defineComponent } from 'vue';
import userProfileImg from '@jeesite/assets/images/display/user-profile.webp';

/**
 * 具名导出保证自动导入时变量名是 ExtraArea（PascalCase），
 * 否则匿名默认导出会让编辑器用文件名推导出小写 extraArea，
 * 在 JSX 中小写开头会被当成 HTML 原生元素而不渲染。
 */
export const UserProfile = defineComponent({
  setup() {
    return () => (
      <div class="w-280px h-full relative flex items-center justify-center ml-auto">
        <img src={userProfileImg} alt="" class="size-full" />
      </div>
    );
  },
});
