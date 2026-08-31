import { DropdownSelector } from '@jeesite/display/components/dropdown-selector';
import type { MenuItemType } from 'antdv-next';
import { Input } from 'antdv-next';
import { CircleX, Funnel, Search } from 'lucide-vue-next';
import { defineComponent, type PropType } from 'vue';

/**
 * SearchFilter —— 搜索筛选行：指标搜索框 + 全部筛选下拉
 *
 * 搜索输入框（lucide 搜索前缀，清除按钮换为 lucide X）；
 * 右侧"全部"筛选下拉（允许清空）。
 *
 * props：
 * - items: 筛选下拉选项
 * - activeKey: v-model:activeKey 筛选选中项
 */
export const SearchFilter = defineComponent({
  name: 'SearchFilter',
  props: {
    /** 筛选下拉选项 */
    items: { type: Array as PropType<MenuItemType[]>, default: () => [] },
    /** 筛选选中项（v-model:activeKey） */
    activeKey: { type: [String, Number] as PropType<string | number | null>, default: null },
  },
  emits: {
    'update:activeKey': (key: string | number | null) =>
      key === null || typeof key === 'string' || typeof key === 'number',
  },
  setup(props, { emit }) {
    return () => (
      <div class="mt-20px flex items-center gap-x-12px h-40px">
        {/* 搜索输入框：前缀为 lucide-vue-next 搜索 icon；root 定制背景/边框，input 定制 placeholder 颜色
            （antdv cssinjs 运行时注入会覆盖普通类，故用 !important 前缀的 UnoCSS 类） */}
        <Input
          classes={{
            root: '!bg-white/6 !border-gray-500 focus-within:!border-cyan-500 w-280px h-40px text-white !rd-8px',
            input: 'placeholder:!text-gray-500 !pl-4px',
          }}
          prefix={<Search class="size-20px text-gray-400" />}
          placeholder="输入指标 / 类别名称"
          allowClear
        >
          {{
            // 清除按钮：替换 antdv 默认图标为 lucide 的 X
            clearIcon: () => <CircleX class="size-20px text-gray-400" />,
          }}
        </Input>

        <DropdownSelector
          activeKey={props.activeKey}
          items={props.items}
          placeholder="全部"
          class="w-136px rd-8px px-12px"
          allowClear
          onUpdate:activeKey={(key) => emit('update:activeKey', key)}
        >
          {{
            prefix: () => <Funnel class="size-20px text-gray-400" />,
            suffix: () => null,
          }}
        </DropdownSelector>
      </div>
    );
  },
});
