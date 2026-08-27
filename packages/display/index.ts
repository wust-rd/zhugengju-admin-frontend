import type { Router } from 'vue-router';
import { displayRoutes } from './router';

// display 全局样式（.font-youshe / .scrollbar-none / .blue-bg / YouSheBiaoTiHei 字体）已迁移至
// packages/core/design/custom/（font.less / display.less），由 web/src/main.ts 全局加载，此处不再单独引入。
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

  // app.use(router)（setupRouter 内）会立即触发一次初始导航，其路由解析发生在
  // 本函数注册路由之前，因此当前 URL 可能已被 404 catch-all 捕获（显示 ErrorPage）。
  // 这里基于浏览器实际 URL 重新导航一次，让 matcher 命中新注册的 display 路由。
  const currentRoute = router.currentRoute.value;
  if (currentRoute.matched.length === 0 || currentRoute.name === 'PageNotFound') {
    // 全局 router 使用 strict: true（严格匹配），'/display/' 无法命中 path: '/display'，
    // 会再次落入 404。因此先归一化尾斜杠（保留根路径 '/'），再触发重新导航。
    const path = window.location.pathname;
    const normalized = path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
    router.replace(normalized + window.location.search).catch(() => {});
  }
}
