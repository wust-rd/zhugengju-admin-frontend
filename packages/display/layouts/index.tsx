import { defineComponent, onMounted, onUnmounted } from 'vue';
import { RouterLink, RouterView, useRouter } from 'vue-router';
import { Button } from 'antdv-next';
import { Header } from '../components/header';

/** /display 的全局 body 背景（路由进入时应用到 <body>，离开时恢复） */
const DISPLAY_BODY_STYLE: Partial<CSSStyleDeclaration> = {
  // background:
  // 'linear-gradient(270deg, rgba(37, 86, 126, 0.75) 0.27%, #0F172A 98.66%)',
  background: '#0f182a',
  backdropFilter: 'blur(10px)',
  color: 'white',
};

export default defineComponent({
  name: 'DisplayLayout',
  setup() {
    const router = useRouter();

    /** 进入后台登录页（后台业务保持 /a 前缀原样） */
    function goAdmin() {
      router.push('/login');
    }

    // 路由进入 /display（layout 挂载）时，body 应用渐变背景；离开（卸载）时恢复原样式
    let prevBackground = '';
    let prevBackdropFilter = '';
    onMounted(() => {
      prevBackground = document.body.style.background;
      prevBackdropFilter = document.body.style.backdropFilter;
      Object.assign(document.body.style, DISPLAY_BODY_STYLE);
    });
    onUnmounted(() => {
      document.body.style.background = prevBackground;
      document.body.style.backdropFilter = prevBackdropFilter;
    });

    return () => (
      <div class="flex min-h-screen flex-col">
        {/* 顶部导航：悬浮胶囊 Header（sticky，不占文档流） */}
        <Header />

        {/* 内容区：pt 预留悬浮 Header 空间 */}
        <main class="flex-1 px-8 pt-28 pb-16">
          <RouterView />
        </main>
      </div>
    );
  },
});
