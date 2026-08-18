import { computed, defineComponent, type PropType } from 'vue';
import { Dropdown, type MenuItemType } from 'antdv-next';
import { cn, type ClassValue } from '@jeesite/core/libs';

/**
 * DropdownSelector —— 胶囊触发器下拉选择器
 *
 * 提取自「城市体检」页两个下拉（指标分类 / 年份）的共性：
 * - 胶囊触发器：可选图标 + 标签文字 + 右侧圆形下拉箭头，点击展开；
 * - 受控选中：activeKey 通过 v-model:activeKey 双向绑定（点击菜单项自动更新），
 *   无需手动监听选择事件；未传 activeKey 或匹配不到时显示「请选择」。
 *
 * 用法：
 * ```tsx
 * <DropdownSelector v-model:activeKey={indicatorKey.value} icon={chartSvg} items={items} />
 * <DropdownSelector v-model:activeKey={yearKey.value} width="w-120px" items={buildYearItems(2)} class="ml-auto" />
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
    /** 当前选中项的 key（v-model:activeKey 受控）；未传或匹配不到时显示「请选择」 */
    activeKey: { type: [String, Number] as PropType<string | number | null>, default: null },
    /** 可选图标（SVG import / 图片地址），为空时不渲染 */
    icon: { type: String, default: '' },
    /** 触发器宽度（UnoCSS class） */
    width: { type: String, default: 'w-208px' },
    /** 下拉菜单项（antdv-next MenuItemType） */
    items: { type: Array as PropType<MenuItemType[]>, default: () => [] },
    // ClassValue 是纯类型，运行时需用构造函数组合，编译期用 PropType 约束
    class: { type: [String, Object, Array] as PropType<ClassValue>, default: '' },
  },
  emits: {
    // v-model 的 emit 端：点击菜单项后更新选中项 key，父组件 v-model:activeKey 自动接收
    'update:activeKey': (key: string | number) => typeof key === 'string' || typeof key === 'number',
  },
  setup(props, { emit }) {
    // 触发器显示文本：activeKey 匹配项的 label，未匹配时显示「请选择」
    const displayLabel = computed(() => {
      const item = props.items.find(
        (i) => !!i && typeof i === 'object' && 'key' in i && i.key === props.activeKey,
      );
      return item && hasStringLabel(item) ? item.label : '请选择';
    });

    /** 点击菜单项：emit 到 v-model 绑定的外部状态 */
    const handleMenuClick = ({ key }: { key: string | number }) => {
      emit('update:activeKey', key);
    };

    return () => (
      <Dropdown menu={{ items: props.items, onClick: handleMenuClick }} trigger={['click']}>
        <div
          class={cn(
            'flex items-center rd-full p-4px h-40px b b-gray-500 bg-white/6 cursor-pointer',
            props.width,
            props.class,
          )}
        >
          {props.icon && <img src={props.icon} alt="" class="size-32px" />}

          <div class={cn('text-14px text-white whitespace-nowrap', props.icon ? 'ml-12px' : 'ml-16px')}>
            {displayLabel.value}
          </div>

          <div class="ml-auto b b-gray-500 size-32px rd-full flex items-center justify-center bg-white/6">
            <div class="i-ri-arrow-down-s-line size-20px text-gray-300"></div>
          </div>
        </div>
      </Dropdown>
    );
  },
});
