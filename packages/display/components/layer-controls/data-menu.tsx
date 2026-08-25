import { cn } from '@jeesite/core/libs';
import { Divider, Input } from 'antdv-next';
import { CircleX, Search } from 'lucide-vue-next';
import { defineComponent } from 'vue';

/** 数据菜单标题（antdv Divider 居中），点击切换展开/收起 */
export const DataMenuTitle = defineComponent({
  name: 'DataMenuTitle',
  props: {
    expanded: { type: Boolean, default: true },
  },
  emits: { toggle: () => true },
  setup(props, { emit }) {
    return () => (
      <Divider class="!m-0 !mt-12px shrink-0" titlePlacement="center">
        <span
          class="inline-flex items-center gap-1 text-14px text-gray-400 cursor-pointer select-none"
          onClick={() => emit('toggle')}
        >
          数据菜单
          <span
            class={cn(
              'i-ri-arrow-down-s-line size-14px text-gray-400 transition-transform duration-200',
              props.expanded ? '-rotate-180' : '',
            )}
          />
        </span>
      </Divider>
    );
  },
});

/** 数据菜单搜索框（antdv Input + lucide 搜索前缀 / 清除图标），受控 value */
export const DataMenuSearch = defineComponent({
  name: 'DataMenuSearch',
  props: {
    value: { type: String, default: '' },
  },
  emits: { 'update:value': (value: string) => typeof value === 'string' },
  setup(props, { emit }) {
    return () => (
      <Input
        classes={{
          root: '!bg-white/6 !border-gray-500 focus-within:!border-cyan-500 w-full h-40px text-white !rd-8px mt-20px',
          input: 'placeholder:!text-gray-500 !pl-4px',
        }}
        value={props.value}
        onUpdate:value={(value) => emit('update:value', value)}
        prefix={<Search class="size-20px text-gray-400" />}
        placeholder="请输入图层名称"
        allowClear
      >
        {{ clearIcon: () => <CircleX class="size-20px text-gray-400" /> }}
      </Input>
    );
  },
});
