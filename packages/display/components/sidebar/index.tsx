import { defineComponent, ref, type SlotsType } from 'vue';
import { NavItem } from './nav-item';

interface NavLink {
  icon: string;
  to: string;
}

export const Sidebar = defineComponent({
  slots: {} as SlotsType<{
    default: () => void;
  }>,
  setup(_, { slots }) {
    const navLinks: NavLink[] = [
      { icon: 'i-ri-todo-fill', to: '/display/urban-health-check' },
      { icon: 'i-ri-map-2-fill', to: '/display/early-stage-planning' },
      { icon: 'i-ri-pie-chart-2-fill', to: '/display/ifco' },
      { icon: 'i-ri-user-fill', to: '/display/expropriation-management' },
    ];

    // 单选激活：点击的链接成为当前激活项
    const activeTo = ref(navLinks[0].to);

    return () => (
      <div class="sticky z-50 relative flex w-80px h-full flex-col items-center shrink-0 bg-[#0f172a]">
        {slots.default?.()}

        <div class="pt-32px space-y-20px">
          {navLinks.map((link) => (
            <NavItem
              key={link.icon}
              icon={link.icon}
              isActive={link.to === activeTo.value}
              onClick={() => {
                activeTo.value = link.to;
              }}
            />
          ))}
        </div>
      </div>
    );
  },
});
