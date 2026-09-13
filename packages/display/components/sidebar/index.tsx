import { defineComponent, inject, ref, type SlotsType } from 'vue';
import { ProjectViewKey, type ProjectView } from '@jeesite/display/hooks/use-project-view';
import { NavItem } from './nav-item';

interface NavLink {
  icon: string;
  to: string;
  /**
   * 有值时：点击该图标驱动项目实施页视图（侧边栏不跳路由，保持页内切换）
   * - 具体视图名：切换到该视图
   * - `'reset'`：回到项目实施页的初始状态（总览底图 + 详情大图未展开）
   */
  projectAction?: ProjectView | 'reset';
}

export const Sidebar = defineComponent({
  slots: {} as SlotsType<{
    default: () => void;
  }>,
  setup(_, { slots }) {
    const navLinks: NavLink[] = [
      { icon: 'i-ri-todo-fill', to: '/display/inspection' },
      { icon: 'i-ri-map-2-fill', to: '/display/plan' },
      // 饼图：回到项目实施页的初始状态
      { icon: 'i-ri-pie-chart-2-fill', to: '/display/scheme', projectAction: 'reset' },
      // 人形：项目实施页的「名称保护」单图视图
      { icon: 'i-ri-user-fill', to: '/display/project', projectAction: 'nameProtect' },
    ];

    // 单选激活：点击的链接成为当前激活项
    const activeTo = ref(navLinks[0].to);

    // 项目实施页视图状态：由 layouts/index.tsx 受控初始化并 provide
    const { setProjectView, resetProjectView } = inject(ProjectViewKey)!;

    return () => (
      <div class="sticky z-50 relative flex w-80px h-full flex-col items-center shrink-0">
        {slots.default?.()}

        <div class="pt-32px space-y-20px">
          {navLinks.map((link) => (
            <NavItem
              key={link.icon}
              icon={link.icon}
              isActive={link.to === activeTo.value}
              onClick={() => {
                activeTo.value = link.to;
                if (link.projectAction === 'reset') {
                  resetProjectView();
                } else if (link.projectAction) {
                  setProjectView(link.projectAction);
                }
              }}
            />
          ))}
        </div>
      </div>
    );
  },
});
