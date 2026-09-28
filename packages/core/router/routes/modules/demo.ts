/**
 * 开发演示路由（不进后台菜单，登录后直接访问 URL；组件演示等开发用途页面放这里）
 *
 * 注册机制同 early-stage-planning.ts：管理页菜单虽是 BACK 模式由后端注册，但
 * permissionStore.buildRoutesAction 的 BACK 分支会合并 routes/modules/ 下的前端路由
 * （routes = [...asyncRoutes, ...routeList]），所以这里声明的路由会被真实挂载，
 * 退出登录 resetRouter 移除后也会随下次登录的菜单构建重建。
 *
 * /demo/form-components —— core/components/Form/src/components 组件演示抽屉
 * 页面组件：modules/packages/ifco/views/ifco/_demo/form-components/index.vue
 */
import type { AppRouteModule } from '@jeesite/core/router/types';
import { LAYOUT } from '@jeesite/core/router/constant';

const demoRoutes: AppRouteModule = {
  // 顶层直接用完整路径 + LAYOUT，不与后端菜单记录重名（同 early-stage-planning.ts 手法）
  path: '/demo/form-components',
  name: 'DemoFormComponentsRoot',
  component: LAYOUT,
  meta: {
    title: '组件演示',
  },
  children: [
    {
      path: '',
      name: 'DemoFormComponents',
      component: () => import('@jeesite/ifco/views/ifco/_demo/form-components/index.vue'),
      meta: {
        title: 'Form 组件演示',
      },
    },
  ],
};

export default demoRoutes;
