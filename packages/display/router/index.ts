import type { RouteRecordRaw } from 'vue-router';

/**
 * /display 演示应用路由
 *
 * - 与后台（/a/**，后端菜单动态注册）完全解耦，静态注册、组件懒加载；
 * - meta.ignoreAuth = true 表示免登录公开访问（permissionGuard 放行）；
 * - 使用独立 layout（layouts/index.tsx），不挂载后台 DefaultLayout。
 */
export const displayRoutes: RouteRecordRaw[] = [
  {
    path: '/display',
    component: () => import('../layouts/index'),
    meta: {
      title: '演示应用',
      ignoreAuth: true,
    },
    children: [
      { path: '', name: 'DisplayRoot', redirect: '/display/inspection' },
      {
        path: 'inspection',
        name: 'DisplayInspection',
        component: () => import('../views/inspection/index'),
        meta: {
          title: '城市体检',
        },
      },
      // 新增演示页面示例：
      // {
      //   path: 'about',
      //   name: 'DisplayAbout',
      //   component: () => import('../views/about/index'),
      //   meta: { title: '关于', ignoreAuth: true },
      // },
    ],
  },
];
