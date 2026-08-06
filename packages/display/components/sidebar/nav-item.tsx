import { defineComponent } from 'vue';
import { cva } from 'class-variance-authority';
import { cn } from '@jeesite/core/libs';

/**
 * 导航项容器：布局基线 + active 双态
 * 激活 = 蓝色渐变背景 + 绿色发光边框；未激活 = 绿色发光背景 + 半透明白边框
 */
const navItem = cva(
  'size-48px rd-8px backdrop-blur-md flex items-center justify-center border border-solid cursor-pointer',
  {
    variants: {
      active: {
        true: 'bg-[linear-gradient(1deg,rgba(2,137,255,0.21)_-20.88%,rgba(0,191,255,0.70)_54.05%,rgba(0,215,255,0.70)_93.49%)] border-[rgba(6,255,230,0.45)]',
        false:
          'bg-[radial-gradient(97.33%_97.33%_at_27.78%_12.96%,rgba(6,255,230,0.2)_0%,rgba(6,255,230,0.00)_100%)] border-[rgba(255,255,255,0.10)]',
      },
    },
  },
);

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
      <div class={navItem({ active: props.isActive })} onClick={() => emit('click')}>
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
