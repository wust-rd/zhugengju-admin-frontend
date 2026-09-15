import { defineComponent, type PropType } from 'vue';
import { cn, type ClassValue } from '@jeesite/core/libs';

/**
 * 查看详情按钮：蓝渐变底 + 左上 / 右上 / 底部三处光晕（三个 div 实现）
 *
 * 用法（TSX）：
 * <ViewDetailButton label="查看详情" class="ml-auto" onClick={() => ...} />
 */
export const ViewDetailButton = defineComponent({
  // 输出约束
  emits: {
    click: (_e: MouseEvent) => true,
  },
  // 输入约束
  props: {
    /** 按钮文字 */
    label: { type: String, default: '查看详情' },
    class: { type: [String, Object, Array] as PropType<ClassValue>, default: '' },
  },
  setup(props, { emit }) {
    return () => (
      <div
        role="button"
        class={cn(
          'relative flex h-32px cursor-pointer select-none items-center justify-center rd-4px overflow-hidden transition-all duration-400 hover:brightness-110 bg-[#143550]',
          props.class,
        )}
        style={{
          border: '0.5px solid rgba(140, 190, 240, 0.2)',
        }}
        onClick={(e) => emit('click', e)}
      >
        {/* 左上光晕：径向渐变平滑融入 */}
        <div
          class="pointer-events-none absolute -left-26px -top-26px size-60px rd-full"
          style={{
            background: 'radial-gradient(circle, #037EB765 0%, #037EB700 60%)',
          }}
        />
        {/* 右上光晕：径向渐变平滑融入 */}
        <div
          class="pointer-events-none absolute -right-26px -top-26px size-60px rd-full"
          style={{
            background: 'radial-gradient(circle, #037EB765 0%, #037EB700 60%)',
          }}
        />
        {/* 底部光晕：椭圆径向渐变平滑融入 */}
        <div
          class="pointer-events-none absolute -bottom-18px left-1/2 -translate-x-1/2 h-32px w-88px"
          style={{
            background:
              'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(90, 157, 240, 0.15) 0%, rgba(90, 157, 240, 0) 74%)',
          }}
        />
        {/* 文字 */}
        <div class="relative z-10 text-14px text-[#EDF5FF]">{props.label}</div>
      </div>
    );
  },
});
