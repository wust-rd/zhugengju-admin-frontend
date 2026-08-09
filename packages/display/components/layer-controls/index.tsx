import { defineComponent, type PropType } from 'vue';
import { cn } from '@jeesite/core/libs';

/** cn 支持的所有 class 形式（字符串 / 条件对象 / 数组），供调用方控制按钮位置等 */
type ClassValue = Parameters<typeof cn>[0];

export const LayerControls = defineComponent({
  props: {
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
