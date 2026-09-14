import { defineComponent, ref } from 'vue';
import { firstUsablePathIn, getMenus } from '@jeesite/core/router/menus';
import type { Menu } from '@jeesite/core/router/types';
import { LinkItem } from './link-item';

interface NavLink {
  label: string;
  icon: string;
  to: string;
}

/**
 * 系统管理子树判定：标题含「系统」或 path 以 /sys 开头。
 * 该入口由 system-action.tsx 单独渲染（超管门卫），NavLinks 排除同一棵子树——
 * 两处共用本口径，避免各自维护谓词后漂移。
 */
export function isSystemMenu(m: Menu): boolean {
  return String(m.meta?.title || '').includes('系统') || m.path.startsWith('/sys');
}

/** 一级 Menu → NavLink：to 取子树第一个能用的真实页面（firstUsablePathIn，
 *  管理角色下即各模块 overview 总览大屏）；小角色菜单顶层 redirect 指向
 *  LAYOUT 占位层而非真实页面，DFS 到叶子才能落地，同时保证 LinkItem 的
 *  模块前缀（to 首段）点亮正确；icon 用后端菜单 meta.icon，缺省兜底 */
function toNavLink(m: Menu): NavLink {
  const to = firstUsablePathIn(m) || m.path;
  return {
    label: String(m.meta?.title || m.name || ''),
    icon: m.icon ?? 'i-ri-apps-2-fill',
    to,
  };
}

/**
 * 一级导航（模块级单例）：getMenus() 动态拼接（同 system-action 数据源，读
 * permissionStore 缓存、随权限），排除系统管理子树后的全部一级菜单。
 * NavLinks 每次挂载都重取——登录/换账号布局重挂载后菜单随权限刷新。
 */
const navLinksRef = ref<NavLink[]>([]);

async function loadNavLinks() {
  try {
    const menus = await getMenus();
    navLinksRef.value = menus.filter((m) => !isSystemMenu(m)).map(toNavLink);
  } catch {
    navLinksRef.value = [];
  }
}

/**
 * 沉浸式大屏路由判定：当前路径落在任一导航 to 的 /模块/overview/ 目录前缀下。
 * 管理角色 to 即 overview 大屏（/模块/overview/index）——同目录下的大屏页
 * （如 /urban-protection/overview/relic-map/index）命中，模块下的管理页
 * （如 /ifco/progress-fill/list）不命中；小角色 to 是 DFS 出的管理页，
 * 目录不以 /overview/ 结尾，天然不构成沉浸前缀（管理页不该吃掉页签栏）。
 * 与 NavLinks 同源（navLinksRef）：在 computed 中调用时随菜单解析自动重算；
 * 路由守卫先填充菜单库再渲染布局，paint 晚于微任务回填，首帧即生效。
 */
export function isDisplayRoute(path: string): boolean {
  const p = path.endsWith('/') ? path : `${path}/`;
  return navLinksRef.value.some((link) => {
    const dir = link.to.slice(0, link.to.lastIndexOf('/') + 1);
    return dir.endsWith('/overview/') && p.startsWith(dir);
  });
}

export const NavLinks = defineComponent({
  name: 'DisplayNavLinks',
  setup() {
    loadNavLinks();

    return () => (
      <div class="ml-32px flex items-center space-x-12px flex-1">
        {navLinksRef.value.map((link) => (
          <LinkItem key={link.label} to={link.to} icon={link.icon} label={link.label} />
        ))}
      </div>
    );
  },
});
