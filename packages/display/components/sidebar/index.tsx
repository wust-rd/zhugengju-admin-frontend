import { defineComponent, inject, ref, type SlotsType } from 'vue';
import { EvaluationViewKey, type EvaluationView } from '@jeesite/display/hooks/use-evaluation-view';
import { NavItem } from './nav-item';

interface NavLink {
  icon: string;
  to: string;
  /** 有值时：点击该图标切换成果评估模块的页面（侧边栏不跳路由，保持页内切换） */
  evaluationAction?: EvaluationView;
}

export const Sidebar = defineComponent({
  slots: {} as SlotsType<{
    default: () => void;
  }>,
  setup(_, { slots }) {
    const navLinks: NavLink[] = [
      // 待办：项目实施模块首页（/display/project 只有这一页）
      { icon: 'i-ri-todo-fill', to: '/display/inspection' },
      { icon: 'i-ri-map-2-fill', to: '/display/plan' },
      // 饼图：成果评估模块 —— 总览页面（原项目实施第三个页面）
      { icon: 'i-ri-pie-chart-2-fill', to: '/display/scheme', evaluationAction: 'overview' },
      // 人形：成果评估模块 —— 「名称保护」单图页面（原项目实施第四个页面）
      { icon: 'i-ri-user-fill', to: '/display/project', evaluationAction: 'nameProtect' },
    ];

    // 单选激活：点击的链接成为当前激活项
    const activeTo = ref(navLinks[0].to);

    // 成果评估模块页面状态：由 layouts/index.tsx 受控初始化并 provide
    const { setEvaluationView } = inject(EvaluationViewKey)!;

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
                if (link.evaluationAction) {
                  setEvaluationView(link.evaluationAction);
                }
              }}
            />
          ))}
        </div>
      </div>
    );
  },
});
