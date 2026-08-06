import type { Router } from 'vue-router';
import { displayRoutes } from './router';

export { displayRoutes };

/**
 * 注册演示应用（/display 前缀，独立 layout）
 *
 * 调用时机：必须在 setupRouter(app) 之后、setupRouterGuard(router) 之前调用，
 * 以保证路由守卫的 beforeEach 能识别到 /display 路由。
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
