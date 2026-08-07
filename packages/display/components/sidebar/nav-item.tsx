import { defineComponent } from 'vue';
import { cn } from '@jeesite/core/libs';

/** 激活态：蓝色渐变背景 + 绿色发光边框 */
const activeStyle = {
  background:
    'linear-gradient(1deg, rgba(2, 137, 255, 0.21) -20.88%, rgba(0, 191, 255, 0.70) 54.05%, rgba(0, 215, 255, 0.70) 93.49%)',
  borderColor: 'rgba(6, 255, 230, 0.45)',
};

/** 未激活态：绿色发光背景 + 半透明白边框 */
const inactiveStyle = {
  background:
    'radial-gradient(97.33% 97.33% at 27.78% 12.96%, rgba(6, 255, 230, 0.20) 0%, rgba(6, 255, 230, 0.00) 100%)',
  borderColor: 'rgba(255, 255, 255, 0.10)',
};

/**
 * 导航项容器：布局基线 + active 双态
 * 激活 = 蓝色渐变背景 + 绿色发光边框；未激活 = 绿色发光背景 + 半透明白边框
 */
export const NavItem = defineComponent({
  props: {
    isActive: { type: Boolean, default: false },
    icon: { type: String, default: '' },
  },
  emits: {
    click: () => true,
  },
  setup(props, { emit }) {
    return () => (
      <div
        class="size-48px rd-8px backdrop-blur-md flex items-center justify-center border border-solid cursor-pointer"
        style={props.isActive ? activeStyle : inactiveStyle}
        onClick={() => emit('click')}
      >
        <div
          class={cn('size-24px', props.icon, {
            'text-white': props.isActive,
            'text-gray-500': !props.isActive,
          })}
        />
      </div>
    );
  },
});
