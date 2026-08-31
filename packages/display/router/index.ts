import type { RouteRecordRaw } from 'vue-router';

/**
 * /display 演示应用路由
 *
 * - 与后台（/a/**，后端菜单动态注册）完全解耦，静态注册，组件懒加载（异步 chunk）；
 * - meta.ignoreAuth = true 表示免登录公开访问（permissionGuard 放行）；
 * - 使用独立 layout（layouts/index.tsx），不挂载后台 DefaultLayout。
 */
export const displayRoutes: RouteRecordRaw[] = [
  {
    path: '/display',
    // 父级重定向：/display 与 /display/（含尾斜杠）都跳转到默认首页
    redirect: '/display/urban-health-check',
    component: () => import('../layouts/index'),
    meta: {
      title: '演示应用',
      ignoreAuth: true,
    },
    children: [
      {
        path: 'urban-health-check',
        name: 'DisplayUrbanHealthCheck',
        component: () => import('@jeesite/urban-health-check/views/urban-health-check/overview/index'),
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
      // 地图滑动对比页（@geoql/maplibre-gl-compare）
      {
        path: 'compare',
        name: 'DisplayCompare',
        component: () => import('../views/compare/index'),
        meta: {
          title: '地图对比',
        },
      },
      // reuseMaps 演示：两个路由共享复用同一个地图实例（验证图层 / marker / 视口保留）
      {
        path: 'reuse/a',
        name: 'DisplayReuseA',
        component: () => import('../views/reuse-maps/a'),
        meta: {
          title: 'ReuseMaps A',
        },
      },
      {
        path: 'reuse/b',
        name: 'DisplayReuseB',
        component: () => import('../views/reuse-maps/b'),
        meta: {
          title: 'ReuseMaps B',
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
