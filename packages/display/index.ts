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

  // app.use(router)（setupRouter 内）会立即触发一次初始导航，其路由解析发生在
  // 本函数注册路由之前，因此当前 URL 可能已被 404 catch-all 捕获（显示 ErrorPage）。
  // 这里基于浏览器实际 URL 重新导航一次，让 matcher 命中新注册的 display 路由。
  const currentRoute = router.currentRoute.value;
  if (currentRoute.matched.length === 0 || currentRoute.name === 'PageNotFound') {
    router.replace(window.location.pathname + window.location.search).catch(() => {});
  }
}
