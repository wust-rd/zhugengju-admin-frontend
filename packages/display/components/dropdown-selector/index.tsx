import { computed, defineComponent, type PropType, type SlotsType } from 'vue';
import { Dropdown, type MenuItemType } from 'antdv-next';
import { cn, type ClassValue } from '@jeesite/core/libs';
import { CircleX } from 'lucide-vue-next';

/**
 * DropdownSelector —— 胶囊触发器下拉选择器
 *
 * 提取自「城市体检」页下拉的共性：
 * - 受控选中：activeKey 通过 v-model:activeKey 双向绑定（点击菜单项自动更新），
 *   无需手动监听选择事件；未传 activeKey 或匹配不到时显示 placeholder（默认「请选择」）。
 * - 左侧图标：通过具名插槽 #prefix 自由传入（lucide 图标 / svg / 任意元素，样式完全由
 *   调用方控制），不传则不渲染。
 * - 右侧后缀：具名插槽 #suffix——不传时显示默认圆形下拉箭头；传 null 则屏蔽箭头；
 *   也可传入任意元素自定义右侧内容。
 * - 清除：allowClear 开启且已有选中值时显示清除按钮（点击后置空 activeKey）；
 *   默认 X 图标，可用 #clearIcon 插槽自定义。
 *
 * 用法：
 * ```tsx
 * <DropdownSelector v-model:activeKey={yearKey.value} items={ratingData} class="w-136px" allowClear>
 *   {{
 *     prefix: () => <Funnel class="text-10px text-gray-400" />,
 *     suffix: () => null, // 屏蔽右侧箭头
 *     clearIcon: () => <div class="i-ri-close-circle-fill size-16px text-gray-400" />,
 *   }}
 * </DropdownSelector>
 * ```
 */

/**
 * 类型收窄：items 允许 null 占位与 divider/group 等无 label 类型（antdv-next 的
 * MenuItemType 是顶层联合类型），这里统一收窄为「带字符串 label 的菜单项」。
 */
const hasStringLabel = (item: unknown): item is MenuItemType & { label: string } =>
  !!item && typeof item === 'object' && 'label' in item && typeof item.label === 'string';

export const DropdownSelector = defineComponent({
  name: 'DropdownSelector',
  props: {
    /** 当前选中项的 key（v-model:activeKey 受控）；未传或匹配不到时显示 placeholder */
    activeKey: { type: [String, Number] as PropType<string | number | null>, default: null },
    /** 未选中/匹配不到时显示的占位文本，默认「请选择」 */
    placeholder: { type: String, default: '请选择' },
    /** 下拉菜单项（antdv-next MenuItemType） */
    items: { type: Array as PropType<MenuItemType[]>, default: () => [] },
    /** 清除开关：true 且已有选中值时显示清除按钮（点击置空 activeKey） */
    allowClear: { type: Boolean, default: false },
    /** 幽灵模式：去掉外圈描边与浅白底（b b-gray-500 bg-white/6），改用深色半透明底 bg-black/10；箭头同时去掉描边与底 */
    ghost: { type: Boolean, default: false },
    // ClassValue 是纯类型，运行时需用构造函数组合，编译期用 PropType 约束
    class: { type: [String, Object, Array] as PropType<ClassValue>, default: '' },
  },
  // 插槽：prefix 左侧图标 / suffix 右侧后缀（返回 null 屏蔽默认箭头）/ clearIcon 自定义清除图标
  slots: {} as SlotsType<{
    prefix?: () => unknown;
    suffix?: () => unknown;
    clearIcon?: () => unknown;
  }>,
  emits: {
    // v-model 的 emit 端：点击菜单项后更新选中项 key，清除时传 null，父组件 v-model:activeKey 自动接收
    'update:activeKey': (key: string | number | null) =>
      key === null || typeof key === 'string' || typeof key === 'number',
  },
  setup(props, { slots, emit }) {
    // 触发器显示文本：activeKey 匹配项的 label，未匹配时显示 placeholder
    const displayLabel = computed(() => {
      const item = props.items.find((i) => !!i && typeof i === 'object' && 'key' in i && i.key === props.activeKey);
      return item && hasStringLabel(item) ? item.label : props.placeholder;
    });

    // 是否已有选中值（决定清除按钮是否显示）
    const hasValue = computed(() => {
      const item = props.items.find((i) => !!i && typeof i === 'object' && 'key' in i && i.key === props.activeKey);
      return !!item;
    });

    /** 点击清除：置空选中值，并阻止冒泡避免触发下拉展开 */
    const handleClear = (e: MouseEvent) => {
      e.stopPropagation();
      emit('update:activeKey', null);
    };

    /** 点击菜单项：emit 到 v-model 绑定的外部状态 */
    const handleMenuClick = ({ key }: { key: string | number }) => {
      emit('update:activeKey', key);
    };

    // 左侧是否有前缀插槽（决定文字左边距）
    const hasPrefix = !!slots.prefix;

    return () => (
      <Dropdown menu={{ items: props.items, onClick: handleMenuClick }} trigger={['click']}>
        {/* 外圈：ghost 时去掉描边+浅白底，换深色半透明底 */}
        <div
          class={cn(
            'flex items-center rd-full p-4px h-40px cursor-pointer',
            props.ghost ? 'bg-black/10' : 'b b-gray-500 bg-white/6',
            props.class,
          )}
        >
          {slots.prefix?.()}

          <div class={cn('text-14px text-white whitespace-nowrap', hasPrefix ? 'ml-12px' : 'ml-16px')}>
            {displayLabel.value}
          </div>

          {/* 清除按钮：allowClear 且已有选中值时显示，点击置空 activeKey */}
          {props.allowClear && hasValue.value && (
            <div class="ml-auto flex items-center cursor-pointer" onClick={handleClear}>
              {slots.clearIcon?.() ?? <CircleX class="size-20px text-gray-400" />}
            </div>
          )}

          {/* 右侧后缀：#suffix 插槽——传入 null 屏蔽箭头；不传时显示默认箭头 */}
          {slots.suffix ? (
            slots.suffix()
          ) : (
            /* 默认箭头：ghost 时去掉描边与底，仅保留圆形图标 */
            <div
              class={cn(
                'ml-auto size-32px rd-full flex items-center justify-center cursor-pointer',
                props.ghost ? '' : 'b b-gray-500 bg-white/12',
              )}
            >
              <div class="i-ri-arrow-down-s-line size-20px text-gray-300"></div>
            </div>
          )}
        </div>
      </Dropdown>
    );
  },
});
