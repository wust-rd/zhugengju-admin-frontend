import { cn } from '@jeesite/core/libs';
import { Switch } from 'antdv-next';
import { defineComponent, type PropType } from 'vue';
import type { LayerSwitchItem } from './types';

/**
 * LayerList —— 图层开关列表（「已打开图层 / 我的收藏」复用）
 *
 * 外层：定高 160px + 背景块（深色圆角）+ 隐藏滚动条式滚动；
 * 每行：Switch 开关 + 可点击 label + 星标（收藏）+ 删除占位。
 * 开关/星标直接作用于共享响应式 item（父级 categories/layers 深层响应式）。
 */
export const LayerList = defineComponent({
  name: 'LayerList',
  props: {
    items: { type: Array as PropType<LayerSwitchItem[]>, default: () => [] },
  },
  setup(props) {
    return () => (
      <div class="h-160px overflow-y-auto scrollbar-gutter-stable pr-0px -mr-12px">
        <div class="flex flex-col rd-6px bg-[#0c1c39]">
          {props.items.map((item) => (
            <div class="flex items-center min-h-36px shrink-0 px-12px py-8px">
              <Switch
                size="small"
                checked={item.on}
                onChange={(checked) => {
                  item.on = checked;
                }}
              />

              <label
                class="ml-12px flex-1 text-white text-14px cursor-pointer select-none"
                onClick={() => {
                  item.on = !item.on;
                }}
              >
                {item.label}
              </label>

              <div
                class={cn(
                  'ml-16px size-16px shrink-0 cursor-pointer',
                  item.starred ? 'i-ri-star-fill text-amber-400' : 'i-ri-star-fill text-gray-500',
                )}
                onClick={() => {
                  item.starred = !item.starred;
                }}
              />
              <div class="ml-8px i-ri-delete-bin-fill size-16px text-gray-500 shrink-0 cursor-pointer" />
            </div>
          ))}
        </div>
      </div>
    );
  },
});
