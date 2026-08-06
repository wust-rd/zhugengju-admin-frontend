import { defineComponent } from 'vue';
import { useRouter } from 'vue-router';
import { Button } from 'antdv-next';

const features = [
  {
    icon: '🧩',
    title: '独立布局',
    desc: '/display 使用专属 layout，不依赖后台侧边栏与登录态，可自由定制页面风格。',
  },
  {
    icon: '🚀',
    title: '路由解耦',
    desc: '静态注册、组件懒加载，与后台动态菜单路由互不影响，无需登录即可访问。',
  },
  {
    icon: '🛠',
    title: '复用基建',
    desc: '可复用 @jeesite/core 的组件、hooks 与主题体系，保持项目整体一致。',
  },
];

export default defineComponent({
  name: 'DisplayInspection',
  setup() {
    const router = useRouter();

    function goAdmin() {
      router.push('/login');
    }

    return () => (
      <div>
        Lorem, ipsum dolor sit amet consectetur adipisicing elit. Velit illum at debitis rem libero nemo rerum deserunt
        aliquam, explicabo exercitationem eos expedita non quo quos! Esse maxime fugiat sed praesentium.
      </div>
    );
  },
});
