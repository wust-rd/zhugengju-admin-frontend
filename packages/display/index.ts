import type { Router } from 'vue-router';
import { displayRoutes } from './router';

// 加载 display 全局样式（.font-youshe / .scrollbar-none / .blue-bg / YouSheBiaoTiHei 字体）
import '@jeesite/core/design/custom/index.less';

export { displayRoutes };

/**
 * 注册演示应用（/display 前缀，独立 layout）
 *
 * 调用时机：必须在 setupRouter(app) 之前调用。app.use(router)（setupRouter 内）会立即
 * 触发初始导航，其路由解析必须在 display 路由注册之后进行；否则 /display/* 会被 404
 * catch-all（component 为后台 DefaultLayout）捕获，短暂挂载后台布局并发出一批后台请求
 * （switchSkin / online/count / userInfo 等）。
 *
 * 职责：
 *  1. 覆盖 core 的 RootRoute（/ → /login），改为 / → /display，使打开站点默认进入演示应用；
 *  2. 注册 /display 前缀的全部静态路由（免登录，meta.ignoreAuth）。
 */
export function setupDisplay(router: Router) {
  // 根路由默认跳转演示应用（替换 core RootRoute 的 / → /login）
  router.removeRoute('Root');
  router.addRoute({
    path: '/',
    name: 'Root',
    redirect: '/display',
    meta: {
      title: 'Root',
    },
  });
  // 注册演示应用路由
  displayRoutes.forEach((route) => router.addRoute(route));
}
