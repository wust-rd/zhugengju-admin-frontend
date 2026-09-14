import type { Menu, MenuModule } from '@jeesite/core/router/types';
import type { RouteRecordNormalized } from 'vue-router';

import { useAppStoreWithOut } from '@jeesite/core/store/modules/app';
import { usePermissionStore } from '@jeesite/core/store/modules/permission';
import { transformMenuModule, getAllParentPath } from '@jeesite/core/router/helper/menuHelper';
import { filter } from '@jeesite/core/utils/helper/treeHelper';
import { isUrl } from '@jeesite/core/utils/is';
import { router } from '@jeesite/core/router';
import { PAGE_NOT_FOUND_NAME } from '@jeesite/core/router/constant';
import { PermissionModeEnum } from '@jeesite/core/enums/appEnum';
import { pathToRegexp } from 'path-to-regexp';

const modules = import.meta.glob('./modules/**/*.ts', { eager: true });

const menuModules: MenuModule[] = [];

Object.keys(modules).forEach((key) => {
  const mod = (modules as Recordable)[key].default || {};
  const modList = Array.isArray(mod) ? [...mod] : [mod];
  menuModules.push(...modList);
});

// ===========================
// ==========Helper===========
// ===========================

const getPermissionMode = () => {
  const appStore = useAppStoreWithOut();
  return appStore.getProjectConfig.permissionMode;
};
const isBackMode = () => {
  return getPermissionMode() === PermissionModeEnum.BACK;
};

const isRouteMappingMode = () => {
  return getPermissionMode() === PermissionModeEnum.ROUTE_MAPPING;
};

const isRoleMode = () => {
  return getPermissionMode() === PermissionModeEnum.ROLE;
};

const staticMenus: Menu[] = [];
(() => {
  menuModules.sort((a, b) => {
    return (a.orderNo || 0) - (b.orderNo || 0);
  });

  for (const menu of menuModules) {
    staticMenus.push(transformMenuModule(menu));
  }
})();

async function getAsyncMenus() {
  const permissionStore = usePermissionStore();
  if (isBackMode()) {
    // return permissionStore.getBackMenuList.filter((item) => !item.meta?.hideMenu && !item.hideMenu);
    return permissionStore.getBackMenuList;
  }
  if (isRouteMappingMode()) {
    // return permissionStore.getFrontMenuList.filter((item) => !item.hideMenu);
    return permissionStore.getFrontMenuList;
  }
  return staticMenus;
}

export const getMenus = async (): Promise<Menu[]> => {
  const menus = await getAsyncMenus();
  if (isRoleMode()) {
    const routes = router.getRoutes();
    return filter(menus, basicFilter(routes));
  }
  return menus;
};

// ===========================
// ====第一个能用的路由====
// ===========================

/** 后端菜单对象额外携带的字段（transformRouteToMenu 已拷贝进 Menu，类型上补声明） */
type UsableMenu = Menu & { url?: string | null };

/** path 是否能解析到真实注册路由（排除 404 兜底）；带 query/hash 的 path 一并支持 */
export function isRoutablePath(path: string): boolean {
  if (!path || isUrl(path)) return false;
  const resolved = router.resolve(path);
  return resolved.matched.length > 0 && resolved.matched[0]?.name !== PAGE_NOT_FOUND_NAME;
}

/**
 * 单棵菜单子树内深度优先找第一个「能用的」页面路由：优先下钻子节点，退回自身叶子。
 * 能用 = path 非空、不带 : 参数、非外链、菜单 url 非空（LAYOUT 占位层与空 component
 * 的占位叶子 url 均为空——前者会被 asyncImportRoute 注册成空壳 LAYOUT 路由，
 * 光看路由表分辨不出），且能解析到已注册路由。
 */
export function firstUsablePathIn(m: UsableMenu): string | undefined {
  for (const child of m.children || []) {
    const p = firstUsablePathIn(child);
    if (p) return p;
  }
  if (!isRoutablePath(m.path) || m.path.includes(':') || !m.url) return undefined;
  return m.path;
}

export async function getCurrentParentPath(currentPath: string) {
  const menus = await getAsyncMenus();
  const allParentPath = await getAllParentPath(menus, currentPath);
  return allParentPath?.[0];
}

// Get the level 1 menu, delete children
export async function getShallowMenus(): Promise<Menu[]> {
  const menus = await getAsyncMenus();
  const shallowMenuList = menus.map((item) => ({ ...item, children: undefined }));
  if (isRoleMode()) {
    const routes = router.getRoutes();
    return shallowMenuList.filter(basicFilter(routes));
  }
  return shallowMenuList;
}

// Get the children of the menu
export async function getChildrenMenus(parentPath: string) {
  const menus = await getMenus();
  const parent = menus.find((item) => item.path === parentPath);
  if (!parent || !parent.children || !!parent?.meta?.hideChildrenInMenu) {
    return [] as Menu[];
  }
  // console.log(menus, parent, parentPath);
  if (isRoleMode()) {
    const routes = router.getRoutes();
    return filter(parent.children, basicFilter(routes));
  }
  return parent.children;
}

function basicFilter(routes: RouteRecordNormalized[]) {
  return (menu: Menu) => {
    const matchRoute = routes.find((route) => {
      if (isUrl(menu.path)) return true;

      if (route.meta?.carryParam) {
        return pathToRegexp(route.path).regexp.test(menu.path);
      }
      const isSame = route.path === menu.path;
      if (!isSame) return false;

      if (route.meta?.ignoreAuth) return true;

      return isSame || pathToRegexp(route.path).regexp.test(menu.path);
    });

    if (!matchRoute) return false;
    menu.icon = (menu.icon || matchRoute.meta.icon) as string;
    menu.meta = matchRoute.meta;
    return true;
  };
}
