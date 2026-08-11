import { defineComponent, type PropType } from 'vue';
import { cn, type ClassValue } from '@jeesite/core/libs';

export const LayerControls = defineComponent({
  props: {
    // ClassValue 是纯类型，运行时需用构造函数组合，编译期用 PropType 约束
    class: { type: [String, Object, Array] as PropType<ClassValue>, default: 'left-32px' },
  },
  setup(props) {
    return () => (
      <div
        class={cn('absolute top-24px p-4px rd-6px bg-white/10 backdrop-blur-lg z-50 flex transition-all', props.class)}
      >
        <div class="rd-8px flex items-center w-152px h-48px bg-gradient-to-tr from-[#0d1733] to-[#3261a2] cursor-pointer px-8px">
          <div
            class="size-32px rd-4 flex items-center justify-center"
            style="linear-gradient(180deg, rgba(0, 184, 212, 0.10) 0%, rgba(8, 153, 226, 0.10) 100%)"
          >
            <div class="i-ri-menu-fill size-16px text-white" />
          </div>

          <div class="text-white font-500 text-16px">图层管理器</div>
        </div>
      </div>
    );
  },
});
