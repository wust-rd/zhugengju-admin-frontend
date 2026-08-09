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
      {
        path: 'scheme',
        name: 'DisplayScheme',
        component: () => import('../views/scheme/index'),
        meta: {
          title: '片区策划',
        },
      },
      // 片区策划详情（独立完整页面，路径 /display/scheme/detail）
      {
        path: 'scheme/detail',
        name: 'DisplaySchemeDetail',
        component: () => import('../views/scheme/detail'),
        meta: {
          title: '片区策划详情',
        },
      },
      {
        path: 'plan',
        name: 'DisplayPlan',
        component: () => import('../views/plan/index'),
        meta: {
          title: '更新规划',
        },
      },
      {
        path: 'project',
        name: 'DisplayProject',
        component: () => import('../views/project/index'),
        meta: {
          title: '项目实施',
        },
      },
      {
        path: 'evaluation',
        name: 'DisplayEvaluation',
        component: () => import('../views/evaluation/index'),
        meta: {
          title: '成果评估',
        },
      },
    ],
  },
];
