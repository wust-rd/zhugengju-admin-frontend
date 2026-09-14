import { cn, withAlpha, type ClassValue } from '@jeesite/core/libs';
import { computed, defineComponent, inject, ref, type InjectionKey, type PropType, type Ref } from 'vue';

/**
 * 选中行 key 注入标识：CornerPanel 通过 provide 注入，
 * 插槽内行组件（如 CornerPanelRow）用 inject 读取以感知自身是否被选中
 */
export const CORNER_ACTIVE_KEY: InjectionKey<Ref<string>> = Symbol('corner-panel-active-key');

/** 指标行数据：序号 + 指标项名称 + 数值 + 评级 */
export interface CornerItem {
  /** 序号（如 01、02） */
  seq: string;
  /** 指标项名称 */
  label: string;
  /** 数值（如 77.8%、5个、7.03Km） */
  value: string;
  /** 评级（很好 / 较好 / 一般 / 较差） */
  rating: string;
}

/** 评级语义色（与「指标评价结果分布」色系一致） */
export const RATING_COLOR: Record<string, string> = {
  很好: '#22D3EE',
  较好: '#4ADE80',
  一般: '#FBBF24',
  较差: '#F472B6',
};

/**
 * CornerPanelRow —— CornerPanel 配套的指标行
 *
 * 自带 `data-corner-row` 行协议属性，放入 CornerPanel 的默认插槽后，
 * 点击该行即可触发面板的高亮动画（slide 滑块 / line 荧光线）。
 *
 * props：
 * - item: 指标数据（seq / label / value / rating）
 * - rowKey: 可选，用作高亮切换动画 key；不传默认用 item.seq
 * - activeClass: 选中时的附加样式类，默认文字变为亮青色（text-cyan-200）；
 *   传空字符串可关闭行级选中样式（仅保留面板的高亮动画层）
 * - class: 透传 UnoCSS 类
 *
 * 选中状态：在 CornerPanel 内点击某行后，该行文字自动高亮（provide/inject 感知）；
 * 若自定义行 div（不使用本组件），可通过 inject(CORNER_ACTIVE_KEY) 自行判断。
 *
 * 用法（配合 CornerPanel）：
 * ```tsx
 * <CornerPanel>
 *   {items.map((item) => <CornerPanelRow key={item.seq} item={item} />)}
 * </CornerPanel>
 * ```
 */
export const CornerPanelRow = defineComponent({
  name: 'CornerPanelRow',
  props: {
    item: { type: Object as PropType<CornerItem>, required: true },
    rowKey: { type: String, default: '' },
    /** 选中时的附加样式类，默认文字亮青色；传空字符串关闭行级选中样式 */
    activeClass: { type: String, default: '[&>div]:text-cyan-200' },
    // ClassValue 是纯类型，运行时需用构造函数组合，编译期用 PropType 约束
    class: { type: [String, Object, Array] as PropType<ClassValue>, default: '' },
  },
  setup(props, { slots }) {
    // 读取父容器（CornerPanel）注入的选中行 key；未在 CornerPanel 内使用时回退为永不选中
    const activeKey = inject(CORNER_ACTIVE_KEY, ref(''));
    // 行是否被选中：与 data-corner-key 相同的 key 判定
    const isActive = computed(() => activeKey.value !== '' && activeKey.value === (props.rowKey || props.item.seq));
    return () => {
      const { item, rowKey } = props;
      const ratingColor = RATING_COLOR[item.rating] ?? '#FFFFFF';
      return (
        <div
          data-corner-row
          data-corner-key={rowKey || item.seq}
          class={cn(
            'relative flex items-center gap-16px self-stretch py-10px px-16px cursor-pointer',
            // 选中态：行级视觉反馈（默认文字亮青色，可通过 activeClass 自定义或关闭）
            isActive.value && props.activeClass,
            props.class,
          )}
        >
          {/* 序号 */}
          <div class="relative z-10 text-14px text-white shrink-0">{item.seq}</div>

          {/* 指标项名称：固定 164px，超长自动换行 */}
          <div class="relative z-10 w-164px text-14px text-white">{item.label}</div>

          {/* 数值 */}
          <div class="relative z-10 w-84px text-center text-14px text-white shrink-0">{item.value}</div>

          {/* 评级胶囊：背景为评级色 0.1 透明度，边框 0.2 透明度，文字保持原色 */}
          <div
            class="b rd-full w-48px h-24px flex items-center justify-center"
            style={{
              background: withAlpha(ratingColor, 0.1),
              borderColor: withAlpha(ratingColor, 0.2),
              color: ratingColor,
            }}
          >
            {item.rating}
          </div>

          {slots.default?.()}
        </div>
      );
    };
  },
});
