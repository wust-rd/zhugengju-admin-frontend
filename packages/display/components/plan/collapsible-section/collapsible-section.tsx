import { computed, defineComponent, type SlotsType } from 'vue';

import { useCollapse } from './use-collapse';

/**
 * 可折叠容器（纯操作逻辑，不含任何视觉样式）：
 * 点击 header 展开/收起 body，样式完全由使用方自行提供。
 *
 * - header 为作用域插槽，透出当前展开状态 `{ isOpen }`，可自行实现箭头等指示元素
 * - body 保留展开/收起高度过渡动画（grid-template-rows 0fr↔1fr），内容高度自适应
 *
 * 用法（TSX）：
 * - 非受控（组件内部自管状态）：
 *   <CollapsibleSection defaultOpen v-slots={{
 *     header: ({ isOpen }) => (
 *       <div class="flex cursor-pointer items-center">
 *         标题
 *         <span class={cn('transition-transform', { 'rotate-180': isOpen })}>▼</span>
 *       </div>
 *     ),
 *     body: () => <div>内容</div>,
 *   }} />
 * - 受控（父组件管理展开状态）：
 *   <CollapsibleSection v-model:open={open} v-slots={{ header: ..., body: ... }} />
 */
export const CollapsibleSection = defineComponent({
  // 输入约束
  props: {
    /** 受控展开状态（配合 v-model:open 使用）；不传则组件内部自管 */
    open: { type: Boolean, default: undefined },
    /** 非受控模式的初始展开状态 */
    defaultOpen: { type: Boolean, default: false },
  },
  // 输出约束
  emits: {
    /** 展开状态变化（点击 header 时触发） */
    'update:open': (_: boolean) => true,
  },
  // 插槽契约
  slots: {} as SlotsType<{
    /** header 为作用域插槽：透出当前展开状态，用于自定义箭头等指示元素 */
    header: { isOpen: boolean };
    body: () => void;
  }>,
  setup(props, { emit, slots }) {
    // Hook 优先：展开状态逻辑收进 Hook
    const collapse = useCollapse(props.defaultOpen);

    // 受控/非受控双模式：传入 open 时跟随外部，否则用内部状态
    const isOpen = computed({
      get: () => props.open ?? collapse.isOpen.value,
      set: (v) => {
        collapse.setOpen(v);
        emit('update:open', v);
      },
    });

    const toggle = () => {
      isOpen.value = !isOpen.value;
    };

    return () => (
      <div>
        {/* header：点击切换展开/收起（无样式，由使用方提供视觉） */}
        <div role="button" aria-expanded={isOpen.value} onClick={toggle} class="cursor-pointer w-full">
          {slots.header?.({ isOpen: isOpen.value })}
        </div>

        {/* body：展开/收起（grid-template-rows 0fr↔1fr 高度过渡动画，无样式） */}
        <div
          class="grid transition-[grid-template-rows] duration-300 ease-in-out motion-reduce:transition-none"
          style={{ gridTemplateRows: isOpen.value ? '1fr' : '0fr' }}
        >
          <div class="min-h-0 overflow-hidden">{slots.body?.()}</div>
        </div>
      </div>
    );
  },
});
