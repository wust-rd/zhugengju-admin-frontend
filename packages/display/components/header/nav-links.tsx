import { defineComponent } from 'vue';
import { LinkItem } from './link-item';

interface NavLink {
  label: string;
  icon: string;
  to: string;
  disabled?: boolean;
}

export const NavLinks = defineComponent({
  setup() {
    const navLinks: NavLink[] = [
      { label: '城市体检', icon: 'i-ri-focus-3-fill', to: '/urban-health-check/overview/index' },
      { label: '前期规划', icon: 'i-ri-route-fill rotate-90', to: '/display/plan' },
      { label: '投融建运', icon: 'i-famicons-folder-open', to: '/display/scheme' },
      { label: '征收管理', icon: 'i-ri-target-fill', to: '/display/project' },
      { label: '名城保护', icon: 'i-ri-ancient-gate-fill', to: '/display/evaluation' },
    ];

    return () => (
      <div class="flex items-center space-x-12px mx-auto">
        {navLinks.map((link) => (
          <LinkItem key={link.label} to={link.to} icon={link.icon} label={link.label} disabled={link.disabled} />
        ))}
      </div>
    );
  },
});
