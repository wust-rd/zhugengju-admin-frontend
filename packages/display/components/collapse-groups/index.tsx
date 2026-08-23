import { defineComponent, Fragment, type PropType, type SlotsType } from 'vue';
import { CornerPanel } from '@jeesite/display/components/corner-panel';
import { GlowCollapse } from '@jeesite/display/components/glow-collapse';

/** 折叠分组数据：标题 + 徽章 + 行数据列表 */
export interface CollapseGroupItem<T = unknown> {
  /** 折叠面板标题（如 生态宜居 / 江岸区） */
  title: string;
  /** 头部徽章数值，不传则不显示 */
  badgeValue?: string | number;
  /** 行数据列表 */
  items: T[];
}

/**
 * CollapseGroups —— 折叠分组面板列表（业务组件）
 *
 * 多个 GlowCollapse（标题 + 徽章）列表，每个面板内为 CornerPanel 容器
 * + 行数据列表。行如何渲染由调用方通过 row 作用域插槽决定
 * （plan 传 XodRow、inspection 传 CornerPanelRow 等）。
 *
 * props：
 * - groups: 分组数据（{ title, badgeValue, items }[]）
 * - isRound: CornerPanel 圆角样式（isRound 时无四角装饰）
 * - panelClass: 透传给 CornerPanel 的 class（如 rd-8px）
 *
 * slots：
 * - row: (item) => 单行渲染；每行自动包 Fragment key（调用方无需再传 key）
 *
 * 用法：
 * ```tsx
 * <CollapseGroups
 *   groups={[
 *     { title: '生态宜居', badgeValue: 25, items: ecoItems },
 *   ]}
 *   isRound
 *   panelClass="rd-8px"
 * >
 *   {{
 *     row: (item) => <XodRow item={item as XodItem} />,
 *   }}
 * </CollapseGroups>
 * ```
 */
export const CollapseGroups = defineComponent({
  name: 'CollapseGroups',
  props: {
    /** 折叠分组数据（{ title, badgeValue, items }[]） */
    groups: { type: Array as PropType<CollapseGroupItem[]>, required: true },
    /** CornerPanel 圆角样式（isRound 时无四角装饰） */
    isRound: { type: Boolean, default: false },
    /** 透传给 CornerPanel 的 class（如 rd-8px） */
    panelClass: { type: String, default: '' },
  },
  slots: {} as SlotsType<{
    row: (item: unknown) => unknown;
  }>,
  setup(props, { slots }) {
    return () => (
      <div class="space-y-12px">
        {props.groups.map((group, groupIndex) => (
          <GlowCollapse key={`${groupIndex}-${group.title}`} title={group.title} badgeValue={group.badgeValue ?? ''}>
            <CornerPanel isRound={props.isRound} class={props.panelClass}>
              {group.items.map((item, i) => (
                <Fragment key={`${groupIndex}-${i}`}>{slots.row?.(item)}</Fragment>
              ))}
            </CornerPanel>
          </GlowCollapse>
        ))}
      </div>
    );
  },
});
