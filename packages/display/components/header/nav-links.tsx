import { defineComponent } from 'vue';
import { LinkItem } from './link-item';

interface NavLink {
  label: string;
  icon: string;
  to: string;
}

export const NavLinks = defineComponent({
  setup() {
    const navLinks: NavLink[] = [
      { label: '城市体检', icon: 'i-ri-focus-3-fill', to: '/display/inspection' },
      { label: '更新规划', icon: 'i-ri-route-fill rotate-90', to: '/display/plan' },
      { label: '片区策划', icon: 'i-famicons-folder-open', to: '/display/scheme' },
      { label: '项目实施', icon: 'i-ri-target-fill', to: '/display/project' },
      { label: '成果评估', icon: 'i-carbon-result-draft', to: '/display/evaluation' },
    ];

    return () => (
      <div class="flex items-center space-x-12px mx-auto">
        {navLinks.map((link) => (
          <LinkItem key={link.label} to={link.to} icon={link.icon} label={link.label} />
        ))}
      </div>
    );
  },
});
