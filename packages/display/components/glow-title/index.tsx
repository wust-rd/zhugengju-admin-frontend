import logoTitle1Img from '@jeesite/assets/images/display/glow-title-1.webp';
import { cn, type ClassValue } from '@jeesite/core/libs';
import { defineComponent, type PropType, type SlotsType } from 'vue';

export const GlowTitle = defineComponent({
  props: {
    // ClassValue 是纯类型，运行时需用构造函数组合，编译期用 PropType 约束
    class: { type: [String, Object, Array] as PropType<ClassValue>, default: '' },
  },
  // 文本内容通过默认插槽传入（见 vue-tsx-best-practices skill）
  slots: {} as SlotsType<{ default: () => unknown }>,
  setup(props, { slots }) {
    return () => (
      <div class={cn('w-full h-28px flex items-center relative', props.class)}>
        <img src={logoTitle1Img} alt="" class="size-full absolute inset-0 px-12px" />

        {slots.default?.()}
      </div>
    );
  },
});
