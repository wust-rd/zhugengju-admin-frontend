import chartSvg from '@jeesite/assets/svg/display/chart.svg';
import { DropdownSelector } from '@jeesite/display/components/dropdown-selector';
import type { MenuItemType } from 'antdv-next';
import { defineComponent, type PropType } from 'vue';

/**
 * TopFilter —— 顶部筛选行：年份下拉 + 指标分类下拉
 *
 * 左侧年份选择（buildYearItems 生成），右侧指标分类选择（带 chart 图标前缀）。
 *
 * props：
 * - yearItems: 年份下拉选项（MenuItemType[]）
 * - indicatorItems: 指标分类下拉选项
 * - yearKey: v-model:yearKey 年份选中项
 * - indicatorKey: v-model:indicatorKey 指标分类选中项
 */
export const TopFilter = defineComponent({
  name: 'TopFilter',
  props: {
    /** 年份下拉选项 */
    yearItems: { type: Array as PropType<MenuItemType[]>, default: () => [] },
    /** 指标分类下拉选项 */
    indicatorItems: { type: Array as PropType<MenuItemType[]>, default: () => [] },
    /** 年份选中项（v-model:yearKey） */
    yearKey: { type: [String, Number] as PropType<string | number | null>, default: null },
    /** 指标分类选中项（v-model:indicatorKey） */
    indicatorKey: { type: [String, Number] as PropType<string | number | null>, default: null },
  },
  emits: {
    'update:yearKey': (key: string | number | null) =>
      key === null || typeof key === 'string' || typeof key === 'number',
    'update:indicatorKey': (key: string | number | null) =>
      key === null || typeof key === 'string' || typeof key === 'number',
  },
  setup(props, { emit }) {
    return () => (
      <div class="flex items-center w-full">
        <DropdownSelector
          activeKey={props.yearKey}
          items={props.yearItems}
          class="w-120px"
          onUpdate:activeKey={(key) => emit('update:yearKey', key)}
        />

        <DropdownSelector
          activeKey={props.indicatorKey}
          items={props.indicatorItems}
          class="ml-auto w-208px"
          onUpdate:activeKey={(key) => emit('update:indicatorKey', key)}
        >
          {{
            prefix: () => <img src={chartSvg} alt="" class="size-32px" />,
          }}
        </DropdownSelector>
      </div>
    );
  },
});
