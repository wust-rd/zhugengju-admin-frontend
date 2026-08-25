import { cn } from '@jeesite/core/libs';
import { Checkbox } from 'antdv-next';
import { defineComponent, type PropType } from 'vue';
import type { LayerCategory, LayerChild } from './types';

/** 复选（方形）：选中/半选用青蓝；hover 不变色、不缩放；onChange 可选 */
const renderCheckbox = (checked: boolean, indeterminate: boolean, onChange?: () => void) => (
  <Checkbox
    checked={checked}
    indeterminate={indeterminate}
    class={indeterminate ? 'hover:!scale-100' : '!select-none hover:!scale-100'}
    classes={{ icon: 'hover:!border-gray-400 hover:!scale-100' }}
    onChange={onChange ? () => onChange() : undefined}
  />
);

/**
 * 分类行：圆点（选中=青+荧光，未选=灰+荧光）+ 文字（选中白/未选灰）+ 方形复选
 * 点击文本/圆点或 checkbox 均切换；checkbox 点击由自身 onChange 处理并阻止冒泡。
 */
export const CategoryLeafRow = defineComponent({
  name: 'CategoryLeafRow',
  props: {
    cat: { type: Object as PropType<LayerCategory>, required: true },
    checked: { type: Boolean, default: false },
  },
  emits: { toggle: (key: string) => typeof key === 'string' },
  setup(props, { emit }) {
    return () => (
      <div
        class="flex items-center gap-3 h-48px px-12px cursor-pointer hover:bg-white/5 rd-8px"
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('.ant-checkbox')) return;
          emit('toggle', props.cat.key);
        }}
      >
        <span class="flex size-16px items-center justify-center shrink-0">
          <span
            class={cn(
              'size-6px rd-full transition-all',
              props.checked
                ? 'bg-[#00b8d4] shadow-[0_0_8px_rgba(0,184,212,0.9)]'
                : 'bg-gray-500 shadow-[0_0_8px_rgba(107,114,128,0.7)]',
            )}
          />
        </span>
        <span class={cn('flex-1 text-14px transition-all', props.checked ? 'text-white' : 'text-gray-400')}>
          {props.cat.label}
        </span>
        {renderCheckbox(props.checked, false, () => emit('toggle', props.cat.key))}
      </div>
    );
  },
});

/**
 * 分组分类行（五改类型 / 国土空间规划…）：三角（展开=青荧光，收起=灰荧光）+ 文字
 * +（已选 n）+ 复选（状态由子项推导，点击全选/全不选并可联动展开/收起）。
 */
export const CategoryGroupRow = defineComponent({
  name: 'CategoryGroupRow',
  props: {
    cat: { type: Object as PropType<LayerCategory>, required: true },
  },
  emits: {
    expand: (cat: LayerCategory) => !!cat,
    check: (cat: LayerCategory) => !!cat,
  },
  setup(props, { emit }) {
    return () => {
      const children = props.cat.children ?? [];
      const someChecked = children.some((c) => c.checked);
      const allChecked = children.length > 0 && children.every((c) => c.checked);
      const checkedCount = children.filter((c) => c.checked).length;

      return (
        <div
          class="flex items-center gap-3 h-48px px-12px cursor-pointer hover:bg-white/5 rd-8px"
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('.ant-checkbox')) return;
            emit('expand', props.cat);
          }}
        >
          <span class="flex size-16px items-center justify-center shrink-0">
            <span
              class={cn(
                'i-codicon-triangle-down size-16px transition-all duration-200',
                props.cat.expanded ? '' : '-rotate-90',
                props.cat.expanded
                  ? 'text-[#00b8d4] [filter:drop-shadow(0_0_2px_#00b8d4)_drop-shadow(0_0_10px_rgba(0,184,212,0.85))]'
                  : 'text-gray-500 [filter:drop-shadow(0_0_2px_rgba(107,114,128,0.7))_drop-shadow(0_0_10px_rgba(107,114,128,0.6))]',
              )}
            />
          </span>
          <span class={cn('flex-1 text-14px', someChecked ? 'text-white' : 'text-gray-400')}>{props.cat.label}</span>
          {someChecked && <span class="text-12px text-[#00b8d4]">(已选 {checkedCount})</span>}
          {renderCheckbox(allChecked, someChecked && !allChecked, () => emit('check', props.cat))}
        </div>
      );
    };
  },
});

/** 分组展开的子项列表：点击文本或 checkbox 均切换；checkbox 由自身 onChange 处理 */
export const CategoryChildrenList = defineComponent({
  name: 'CategoryChildrenList',
  props: {
    cat: { type: Object as PropType<LayerCategory>, required: true },
  },
  emits: { toggleChild: (child: LayerChild) => !!child },
  setup(props, { emit }) {
    return () => (
      <div class="flex flex-col gap-1 pl-24px pb-2px">
        {(props.cat.children ?? []).map((child) => (
          <div
            class="flex items-center gap-2 h-42px px-3 rd-8px text-14px text-white/80 cursor-pointer hover:bg-white/10"
            onClick={(e) => {
              if ((e.target as HTMLElement).closest('.ant-checkbox')) return;
              emit('toggleChild', child);
            }}
          >
            <span class={cn('flex-1', child.checked ? 'text-white' : 'text-gray-400')}>{child.label}</span>
            {renderCheckbox(child.checked, false, () => emit('toggleChild', child))}
          </div>
        ))}
      </div>
    );
  },
});
