import { cn } from '@jeesite/core/libs';
import { computed, defineComponent, type CSSProperties, type PropType, type SlotsType } from 'vue';

type LabelPosition = 'top' | 'bottom';

/** 描边配置：true=默认白色描边，false=关闭，传对象则直接作为 style 替代 */
type StrokeProp = boolean | CSSProperties;

/**
 * VMarkerLabel —— 标注文字气泡（配合 VMarkerContent 使用）。
 *
 * 渲染在 Marker 上方/下方居中位置，默认字号 10px。
 */
export const VMarkerLabel = defineComponent({
  name: 'VMarkerLabel',

  props: {
    /** 追加到标签的 CSS 类 */
    class: { type: String as PropType<string> },
    /** 标签相对标注的位置（默认 "top"） */
    position: { type: String as PropType<LabelPosition>, default: 'top' },
    /** 描边：true=默认白色描边，false=关闭，传对象则直接作为 style 替代 */
    stroke: { type: [Boolean, Object] as PropType<StrokeProp>, default: true },
  },

  slots: {} as SlotsType<{
    default?: () => unknown;
  }>,

  setup(props, { slots }) {
    const labelClass = computed(() => {
      const positionClass = props.position === 'top' ? 'bottom-full mb-1' : 'top-full mt-1';
      return cn(
        'absolute left-1/2 -translate-x-1/2 whitespace-nowrap',
        'text-foreground text-14px font-500',
        positionClass,
        props.class,
      );
    });

    // 描边 style：true → 默认白色描边（paint-order 让描边在填充下方，避免小字号被侵蚀）；false → 无；对象 → 原样替代
    const strokeStyle = computed<CSSProperties | undefined>(() => {
      if (props.stroke === false) return undefined;
      if (props.stroke === true) return { WebkitTextStroke: '2px #fff', paintOrder: 'stroke fill' };
      return props.stroke;
    });

    return () => (
      <div class={labelClass.value} style={strokeStyle.value}>
        {slots.default?.()}
      </div>
    );
  },
});
