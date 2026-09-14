import { defineComponent } from 'vue';
import { LinkItem } from './link-item';

interface NavLink {
  label: string;
  icon: string;
  to: string;
  disabled?: boolean;
}

/** 五大业务模块的顶栏导航（to 指向各模块大屏 overview 首页） */
export const NAV_LINKS: NavLink[] = [
  { label: '城市体检', icon: 'i-ri-focus-3-fill', to: '/urban-health-check/overview/index' },
  { label: '前期规划', icon: 'i-ri-route-fill rotate-90', to: '/early-stage-planning/overview/index' },
  { label: '项目投融建运', icon: 'i-famicons-folder-open', to: '/ifco/overview/index' },
  { label: '征收管理', icon: 'i-ri-target-fill', to: '/expropriation-management/overview/index' },
  { label: '名城保护', icon: 'i-ri-ancient-gate-fill', to: '/urban-protection/overview/index' },
];

/**
 * 沉浸式大屏路由判定：当前路径落在任一导航 to 的目录前缀下。
 * to 形如 /模块/overview/index，取目录 /模块/overview/ 作前缀——
 * 同目录下的大屏页（如 /urban-protection/overview/relic-map/index）命中，
 * 模块下的管理页（如 /ifco/progress-fill/list）不命中。
 * 供 new-content / new-multiple-header 声明式判定沉浸态（首帧生效，无需页面拨开关）。
 */
export function isDisplayRoute(path: string): boolean {
  const p = path.endsWith('/') ? path : `${path}/`;
  return NAV_LINKS.some((link) => p.startsWith(link.to.slice(0, link.to.lastIndexOf('/') + 1)));
}

export const NavLinks = defineComponent({
  setup() {
    return () => (
      <div class="ml-32px flex items-center space-x-12px flex-1">
        {NAV_LINKS.map((link) => (
          <LinkItem key={link.label} to={link.to} icon={link.icon} label={link.label} disabled={link.disabled} />
        ))}
      </div>
    );
  },
});
