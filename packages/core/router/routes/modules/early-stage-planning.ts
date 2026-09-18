/**
 * 前期规划：前端声明路由（大屏看板 → 片区详情）
 *
 * 为什么能在这里声明：管理页菜单是 BACK 模式由后端注册，但 permissionStore.buildRoutesAction
 * 的 BACK 分支同样会合并前端路由（`routes = [...asyncRoutes, ...routeList]`），所以
 * routes/modules/ 下的路由会被真实挂载（同 account / desktop），适合「不进菜单、只能从页面里
 * 跳进去」的页面。放在 asyncRoutes 里还有一层好处：退出登录 resetRouter 会移除动态路由，
 * 而这些路由会在下次登录 buildRoutesAction 时随菜单一起重建（直接 addRoute 的会被清掉不回来）。
 *
 * 沉浸式全屏：路径落在 /early-stage-planning/overview/ 目录前缀下，布局按
 * nav-links.tsx 的 isDisplayRoute 自动判定为沉浸式（内容区 padding 归零），无需任何开关。
 *
 * 页面组件：modules/packages/early-stage-planning/views/early-stage-planning/overview/area-detail/index.tsx
 * （:auid = 片区 A_UID，该页按 auid 自行取数，刷新/直接打开链接都可用）
 *
 * 参数名为什么用 :auid 而不是 :id：paramMenuGuard 会拿「当前路由的 params」去替换后台菜单里
 * 同名的 :xxx 占位（configureDynamicParamsMenu）。本模块的下钻页菜单就是 :id / :code 形式
 * （见 urban-renewal-expert-management/*\/_id/list.vue 读 params.id／params.code），
 * 若这里也叫 :id，进入本页时会把那些菜单的路径一并替换成片区编号。用专属参数名即互不干扰。
 *
 * 注意：若后端菜单之后也注册了同一路径，删掉本文件即可（避免两处重复注册）。
 */
import type { AppRouteModule } from '@jeesite/core/router/types';
import { LAYOUT } from '@jeesite/core/router/constant';

/**
 * 片区详情路径前缀（不含 `/:auid`）。
 * 页面内跳转拼 `${ESP_AREA_DETAIL_PATH}/${auid}` —— 与下方注册同源，避免两处各写一份路径。
 */
export const ESP_AREA_DETAIL_PATH = '/early-stage-planning/overview/area-detail';

const earlyStagePlanning: AppRouteModule = {
  // 顶层直接用完整路径 + LAYOUT：不与后端菜单的 /early-stage-planning 父记录重名，
  // 也不会影响该模块其它菜单页的匹配（同前缀的不同记录各自匹配自己的子路由）
  path: `${ESP_AREA_DETAIL_PATH}/:auid`,
  name: 'EarlyStagePlanningAreaDetailRoot',
  component: LAYOUT,
  meta: {
    title: '片区详情',
  },
  children: [
    {
      path: '',
      name: 'EarlyStagePlanningAreaDetail',
      component: () => import('@jeesite/early-stage-planning/views/early-stage-planning/overview/area-detail/index'),
      meta: {
        title: '片区详情',
        /**
         * 侧边栏「当前一级模块」与面包屑的判定依据：本页不在后台菜单树里，
         * 不指路就会走「找不到 → 取第一个模块」的兜底（new-sider 的 activeModule、
         * useLayoutMenu 的 getCurrentParentPath 都是这个兜底，表现成左侧导航变成城市体检）。
         * 指到该模块看板页这个真实菜单项：侧边栏显示前期规划并高亮看板项
         * —— 与内置 ERROR_LOG_ROUTE（currentActiveMenu: '/errorLog'）同一手法。
         * 若后台看板菜单路径不是 /early-stage-planning/overview/index，改成模块根路径
         * /early-stage-planning 同样能命中（只是不再高亮到具体菜单项）。
         */
        currentActiveMenu: '/early-stage-planning/overview/index',
      },
    },
  ],
};

export default earlyStagePlanning;
